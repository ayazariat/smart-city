

import os
import json
import re
from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Category Predictor Service")

# Try to import transformers for free zero-shot classification
try:
    from transformers import pipeline
    _classifier = None
    
    def get_classifier():
        global _classifier
        if _classifier is None:
            _classifier = pipeline(
                "zero-shot-classification",
                model="facebook/bart-large-mnli",
                device=-1  # CPU
            )
        return _classifier
    
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

# Optional: Anthropic as fallback if key is set
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
anthropic_client = None
if ANTHROPIC_API_KEY:
    try:
        import anthropic
        anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    except ImportError:
        pass

VALID_CATEGORIES = [
    "ROAD",          
    "LIGHTING",      
    "WASTE",         
    "WATER",        
    "SAFETY",       
    "PUBLIC_PROPERTY", 
    "GREEN_SPACE",  
    "TRAFFIC",       
    "URBAN_PLANNING", 
    "EQUIPMENT",    
    "AUTRE",         
]

SYSTEM_PROMPT = """You are an expert in categorizing citizen complaints for a municipal government in Tunisia.

Your task is to analyze complaint descriptions and predict the most appropriate category from this list:
- ROAD: Road damage, potholes, sidewalks, road signs
- LIGHTING: Street light outages, broken traffic lights
- WASTE: Garbage collection, illegal dumping, dirty streets
- WATER: Water supply issues, leaks, drainage
- SAFETY: Security concerns, unsafe conditions
- PUBLIC_PROPERTY: Damaged public buildings, playgrounds
- GREEN_SPACE: Park maintenance, tree issues
- TRAFFIC: Traffic signals, road markings, parking
- URBAN_PLANNING: Construction violations, planning permits
- EQUIPMENT: Public benches, bus stops, kiosks
- AUTRE: Something that doesn't fit above

Respond with a JSON object containing:
{
  "predicted": "CATEGORY",
  "confidence": 0.0-1.0,
  "alternatives": ["CATEGORY1", "CATEGORY2"],
  "reasoning": "Brief explanation"
}

Be strict with confidence - only give high confidence (>0.85) when the description is very clear."""


class PredictionRequest(BaseModel):
    description: str
    title: Optional[str] = None


class PredictionResponse(BaseModel):
    predicted: str
    confidence: float
    alternatives: list[str]
    reasoning: str


def predict_category(description: str, title: Optional[str] = None) -> PredictionResponse:
    """
    Predict complaint category using free HuggingFace zero-shot classification.
    Falls back to Claude API if available, then to keyword-based matching.
    """
    text_to_analyze = f"{title}. {description}" if title else description
    
    # Strategy 1: Free HuggingFace zero-shot classification (local, no API key needed)
    if TRANSFORMERS_AVAILABLE:
        try:
            classifier = get_classifier()
            
            # Natural language labels for zero-shot
            candidate_labels = [
                "road damage, potholes, sidewalks, road signs",
                "street lighting, broken lights, traffic lights",
                "garbage, waste, illegal dumping, dirty streets",
                "water supply, leaks, drainage, flooding",
                "security, safety, unsafe conditions, crime",
                "damaged public buildings, playgrounds, public facilities",
                "parks, trees, green spaces, gardens",
                "traffic signals, road markings, parking, congestion",
                "construction violations, building permits, urban planning",
                "public benches, bus stops, kiosks, equipment",
                "other, miscellaneous"
            ]
            
            label_to_category = {
                "road damage, potholes, sidewalks, road signs": "ROAD",
                "street lighting, broken lights, traffic lights": "LIGHTING",
                "garbage, waste, illegal dumping, dirty streets": "WASTE",
                "water supply, leaks, drainage, flooding": "WATER",
                "security, safety, unsafe conditions, crime": "SAFETY",
                "damaged public buildings, playgrounds, public facilities": "PUBLIC_PROPERTY",
                "parks, trees, green spaces, gardens": "GREEN_SPACE",
                "traffic signals, road markings, parking, congestion": "TRAFFIC",
                "construction violations, building permits, urban planning": "URBAN_PLANNING",
                "public benches, bus stops, kiosks, equipment": "EQUIPMENT",
                "other, miscellaneous": "AUTRE"
            }
            
            result = classifier(text_to_analyze, candidate_labels, multi_label=False)
            
            top_label = result["labels"][0]
            top_score = result["scores"][0]
            predicted = label_to_category.get(top_label, "AUTRE")
            
            alternatives = []
            for label, score in zip(result["labels"][1:4], result["scores"][1:4]):
                cat = label_to_category.get(label, "AUTRE")
                if cat != predicted and score > 0.05:
                    alternatives.append(cat)
            
            return PredictionResponse(
                predicted=predicted,
                confidence=round(top_score, 3),
                alternatives=alternatives[:3],
                reasoning=f"Zero-shot classification (bart-large-mnli)"
            )
        except Exception as e:
            print(f"HuggingFace classification error: {e}")
    
    # Strategy 2: Claude API (if key is set)
    if anthropic_client:
        try:
            message = anthropic_client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=256,
                system=SYSTEM_PROMPT,
                messages=[
                    {
                        "role": "user",
                        "content": f"Analyze this complaint and predict its category:\n\n{text_to_analyze}"
                    }
                ]
            )
            
            response_text = message.content[0].text if message.content else ""
            
            try:
                result = json.loads(response_text)
            except json.JSONDecodeError:
                json_match = re.search(r'\{[^}]+\}', response_text, re.DOTALL)
                if json_match:
                    result = json.loads(json_match.group())
                else:
                    raise ValueError("Could not parse JSON from response")
            
            predicted = result.get("predicted", "AUTRE").upper()
            if predicted not in VALID_CATEGORIES:
                predicted = "AUTRE"
            
            confidence = float(result.get("confidence", 0.0))
            confidence = max(0.0, min(1.0, confidence))
            
            alternatives = result.get("alternatives", [])
            alternatives = [a.upper() for a in alternatives if a.upper() in VALID_CATEGORIES][:3]
            
            return PredictionResponse(
                predicted=predicted,
                confidence=confidence,
                alternatives=alternatives,
                reasoning=result.get("reasoning", "Claude API prediction")
            )
        except Exception as e:
            print(f"Claude API error: {e}")
    
    # Strategy 3: Keyword-based fallback (always free, no dependencies)
    text_lower = text_to_analyze.lower()
    
    keyword_map = {
        "ROAD": ["route", "road", "pothole", "trottoir", "sidewalk", "chaussée", "nid de poule", "bitume", "asphalt"],
        "LIGHTING": ["éclairage", "lampadaire", "light", "ampoule", "feu", "traffic light", "lumière"],
        "WASTE": ["déchet", "poubelle", "garbage", "ordure", "waste", "dump", "sale", "dirty"],
        "WATER": ["eau", "water", "fuite", "leak", "drainage", "inondation", "flood", "canalisation"],
        "SAFETY": ["sécurité", "safety", "danger", "vol", "theft", "agression", "crime", "insécurité"],
        "PUBLIC_PROPERTY": ["bâtiment", "building", "playground", "aire de jeu", "propriété publique", "école", "school"],
        "GREEN_SPACE": ["parc", "park", "arbre", "tree", "jardin", "garden", "espace vert", "pelouse"],
        "TRAFFIC": ["circulation", "traffic", "stationnement", "parking", "embouteillage", "signal"],
        "URBAN_PLANNING": ["construction", "permis", "permit", "urbanisme", "bâtir", "violation"],
        "EQUIPMENT": ["banc", "bench", "bus", "kiosque", "kiosk", "arrêt", "stop", "équipement"],
    }
    
    scores = {}
    for category, keywords in keyword_map.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            scores[category] = score
    
    if scores:
        sorted_cats = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        predicted = sorted_cats[0][0]
        max_score = sorted_cats[0][1]
        confidence = min(0.7, max_score * 0.2)
        alternatives = [cat for cat, _ in sorted_cats[1:4] if cat != predicted]
        
        return PredictionResponse(
            predicted=predicted,
            confidence=round(confidence, 2),
            alternatives=alternatives,
            reasoning="Keyword-based fallback prediction"
        )
    
    return PredictionResponse(
        predicted="AUTRE",
        confidence=0.0,
        alternatives=[],
        reasoning="No model or keywords matched"
    )


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "category-predictor"}


@app.post("/predict", response_model=PredictionResponse)
async def predict_category_endpoint(request: PredictionRequest):
    """
    Predict complaint category from description.
    
    - **description**: The complaint description text
    - **title**: Optional complaint title
    """
    result = predict_category(request.description, request.title)
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
