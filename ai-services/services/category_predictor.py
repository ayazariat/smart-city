

import os
import json
from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import anthropic

# Initialize FastAPI app
app = FastAPI(title="Category Predictor Service")

# Get API key from environment
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# Valid complaint categories
VALID_CATEGORIES = [
    "ROAD",          # Roads and infrastructure
    "LIGHTING",      # Street lighting
    "WASTE",         # Waste management
    "WATER",         # Water and sanitation
    "SAFETY",        # Public safety
    "PUBLIC_PROPERTY", # Public buildings and property
    "GREEN_SPACE",   # Parks and green spaces
    "TRAFFIC",       # Traffic and signage
    "URBAN_PLANNING", # Urban planning issues
    "EQUIPMENT",     # Public equipment
    "AUTRE",         # Other
]

# System prompt for category prediction
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
    Predict complaint category using Claude AI.
    
    Falls back to AUTRE with 0 confidence on any error.
    """
    if not ANTHROPIC_API_KEY:
        print("Warning: ANTHROPIC_API_KEY not set, using fallback")
        return PredictionResponse(
            predicted="AUTRE",
            confidence=0.0,
            alternatives=[],
            reasoning="API key not configured"
        )
    
    try:
        # Combine title and description for analysis
        text_to_analyze = f"Title: {title}\n\nDescription: {description}" if title else description
        
        # Initialize Claude client
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        
        # Make request to Claude
        message = client.messages.create(
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
        
        # Extract response text
        response_text = message.content[0].text if message.content else ""
        
        # Parse JSON from response
        try:
            # Try to extract JSON from the response
            result = json.loads(response_text)
        except json.JSONDecodeError:
            # Try to find JSON in the text
            import re
            json_match = re.search(r'\{[^}]+\}', response_text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
            else:
                raise ValueError("Could not parse JSON from response")
        
        # Validate and normalize the response
        predicted = result.get("predicted", "AUTRE").upper()
        if predicted not in VALID_CATEGORIES:
            predicted = "AUTRE"
        
        confidence = float(result.get("confidence", 0.0))
        confidence = max(0.0, min(1.0, confidence))  # Clamp to 0-1
        
        alternatives = result.get("alternatives", [])
        alternatives = [a.upper() for a in alternatives if a.upper() in VALID_CATEGORIES][:3]
        
        reasoning = result.get("reasoning", "")
        
        return PredictionResponse(
            predicted=predicted,
            confidence=confidence,
            alternatives=alternatives,
            reasoning=reasoning
        )
        
    except Exception as e:
        print(f"Error in category prediction: {e}")
        # Always fallback to AUTRE on error
        return PredictionResponse(
            predicted="AUTRE",
            confidence=0.0,
            alternatives=[],
            reasoning=f"Error: {str(e)[:50]}"
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
