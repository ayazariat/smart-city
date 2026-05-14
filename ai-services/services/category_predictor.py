

import os
import json
import re
from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import unicodedata
from difflib import SequenceMatcher

app = FastAPI(title="Category Predictor Service")


def normalize_text(text: str) -> str:
    """
    Normalize text for multilingual matching:
    - Remove accents (é -> e, à -> a)
    - Convert to lowercase
    - Remove repeated letters (dechetssssss -> dechets)
    - Remove extra whitespace
    - Handle Arabic diacritics
    - Handle common misspellings
    - Handle phonetic variations
    """
    # Normalize unicode (remove accents)
    text = unicodedata.normalize('NFKD', text)
    text = ''.join([c for c in text if not unicodedata.combining(c)])
    
    # Convert to lowercase
    text = text.lower()
    
    # Remove repeated letters (max 2 consecutive)
    text = re.sub(r'(.)\1{2,}', r'\1\1', text)
    
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Common misspellings and phonetic variations (French/Arabic/English)
    replacements = {
        # French variations
        'dechet': 'waste',
        'dechets': 'waste',
        'ordure': 'waste',
        'ordures': 'waste',
        'poubelle': 'waste',
        'poubelles': 'waste',
        'sale': 'dirty',
        'salete': 'dirty',
        'propete': 'clean',
        'proprete': 'clean',
        'eclairage': 'light',
        'eclairaje': 'light',
        'lampe': 'light',
        'lumiere': 'light',
        'lampadaire': 'light',
        'route': 'road',
        'rue': 'road',
        'chaussée': 'road',
        'chaussee': 'road',
        'trottoir': 'sidewalk',
        'nid de poule': 'pothole',
        'nid de poulles': 'pothole',
        'bitume': 'asphalt',
        'eau': 'water',
        'fuite': 'leak',
        'fuyte': 'leak',
        'inondation': 'flood',
        'innondation': 'flood',
        'canalisation': 'pipe',
        'canalisassion': 'pipe',
        'securite': 'safety',
        'securitee': 'safety',
        'danger': 'danger',
        'denger': 'danger',
        'bruit': 'noise',
        'bruiy': 'noise',
        'batiment': 'building',
        'bâtiment': 'building',
        'parc': 'park',
        'jardin': 'garden',
        'arbre': 'tree',
        'abre': 'tree',
        'circulation': 'traffic',
        'embouteillage': 'congestion',
        'embouteillage': 'congestion',
        'stationnement': 'parking',
        'ecole': 'school',
        'école': 'school',
        'signalisation': 'signs',
        'signal': 'signs',
        'citerne': 'water',
        'egout': 'sewer',
        'égout': 'sewer',
        'bouche': 'sewer',
        'gaz': 'safety',
        'incendie': 'safety',
        'feu': 'safety',
        'violence': 'safety',
        'casse': 'property',
        'bris': 'property',
        'vitre': 'property',
        'porte': 'property',
        'fenetre': 'property',

        # Arabic transliterations and variations
        'قمامة': 'waste',
        'نفايات': 'waste',
        'قذارة': 'waste',
        'وسخ': 'dirty',
        'انارة': 'light',
        'مصباح': 'light',
        'ضوء': 'light',
        'طريق': 'road',
        'شارع': 'road',
        'حفرة': 'pothole',
        'رصيف': 'sidewalk',
        'اسفلت': 'asphalt',
        'ماء': 'water',
        'تسرب': 'leak',
        'فيضان': 'flood',
        'مجاري': 'sewer',
        'سلامة': 'safety',
        'خطر': 'danger',
        'مبنى': 'building',
        'حديقة': 'park',
        'شجرة': 'tree',
        'مرور': 'traffic',
        'زحمة': 'congestion',
        
        # English variations
        'trash': 'waste',
        'trsh': 'waste',
        'garbage': 'waste',
        'garbaje': 'waste',
        'garbidge': 'waste',
        'rubbish': 'waste',
        'rubbich': 'waste',
        'litter': 'waste',
        'litr': 'waste',
        'lighting': 'light',
        'lightning': 'light',
        'streetlight': 'light',
        'street light': 'light',
        'traffic light': 'light',
        'pothole': 'pothole',
        'potholl': 'pothole',
        'pot hole': 'pothole',
        'sidewalk': 'sidewalk',
        'side walk': 'sidewalk',
        'pavement': 'sidewalk',
        'pavment': 'sidewalk',
        'asphalt': 'asphalt',
        'asfalt': 'asphalt',
        'leaking': 'leak',
        'leeking': 'leak',
        'flooded': 'flood',
        'flooding': 'flood',
        'fluding': 'flood',
        'dangerous': 'danger',
        'dangerus': 'danger',
        'unsafe': 'danger',
        'traffic jam': 'congestion',
        'congestion': 'traffic',
        'congestion': 'traffic',
        'parking': 'parking',
        'watter': 'water',
        'watr': 'water',
        'drainage': 'water',
        'dreinage': 'water',
        'drenage': 'water',
        'sewer': 'sewer',
        'sewage': 'sewer',
        'road': 'roads',
        'rood': 'roads',
        'street': 'roads',
        'streets': 'roads',
        'strret': 'roads',
        'security': 'safety',
        'securty': 'safety',
        'accident': 'safety',
        'accidnt': 'safety',
        'playground': 'parks',
        'play ground': 'parks',
        'playgroud': 'parks',
        'garden': 'parks',
        'gardn': 'parks',
        'building': 'property',
        'bilding': 'property',
        'buildin': 'property',
        'school': 'property',
        'skool': 'property',
        'bench': 'property',
        'bench': 'property',
        'benche': 'property',
        'monument': 'property',
        'monumnt': 'property',
        'equipment': 'property',
        'equipement': 'property',
    }
    
    # Apply replacements
    for old, new in replacements.items():
        text = text.replace(old, new)
    
    return text

# Try to import transformers for free zero-shot classification
try:
    from transformers import pipeline
    _classifier = None
    
    def get_classifier():
        global _classifier
        if _classifier is None:
            try:
                import torch
                device = 0 if torch.cuda.is_available() else -1
                _classifier = pipeline(
                    "zero-shot-classification",
                    model="facebook/bart-large-mnli",
                    device=device
                )
            except Exception as e:
                print(f"Error loading classifier with device: {e}, falling back to CPU")
                _classifier = pipeline(
                    "zero-shot-classification",
                    model="facebook/bart-large-mnli",
                    device=-1
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
    "waste",         
    "roads",         
    "lighting",      
    "water",         
    "safety",        
    "property",      
    "parks",         
    "other"          
]

CATEGORY_ALIASES = {
    "waste": "waste", "garbage": "waste", "trash": "waste", "trsh": "waste",
    "dechet": "waste", "dechets": "waste", "deche": "waste", "ordure": "waste",
    "ordures": "waste", "poubelle": "waste", "poubelles": "waste", "rubbish": "waste",
    "litter": "waste", "salete": "waste", "saleté": "waste", "proprete": "waste",
    "propreté": "waste", "dump": "waste", "dirty": "waste", "garbaje": "waste",
    "garbidge": "waste",
    "road": "roads", "roads": "roads", "street": "roads", "streets": "roads",
    "voirie": "roads", "traffic": "roads", "circulation": "roads",
    "route": "roads", "rue": "roads", "pothole": "roads", "potholl": "roads",
    "trottoir": "roads", "sidewalk": "roads", "pavement": "roads",
    "chaussee": "roads", "chaussée": "roads", "parking": "roads",
    "bitume": "roads", "asphalt": "roads", "signal": "roads",
    "signalisation": "roads", "nid de poule": "roads",
    "lighting": "lighting", "light": "lighting", "lamp": "lighting",
    "eclairage": "lighting", "éclairage": "lighting", "lampe": "lighting",
    "lumiere": "lighting", "lumière": "lighting", "lampadaire": "lighting",
    "streetlight": "lighting", "ampoule": "lighting",
    "water": "water", "eau": "water", "fuite": "water", "leak": "water",
    "inondation": "water", "flood": "water", "drainage": "water",
    "canalisation": "water", "egout": "water", "égout": "water",
    "fuyte": "water", "watr": "water", "watter": "water",
    "safety": "safety", "security": "safety", "securite": "safety",
    "sécurité": "safety", "danger": "safety", "bruit": "safety",
    "crime": "safety", "vol": "safety", "theft": "safety",
    "agression": "safety", "accident": "safety", "insecurite": "safety",
    "insécurité": "safety", "dangerus": "safety", "securty": "safety",
    "property": "property", "public_property": "property",
    "public property": "property", "equipment": "property",
    "equipement": "property", "batiment": "property", "bâtiment": "property",
    "building": "property", "bilding": "property",
    "ecole": "property", "école": "property", "school": "property",
    "playground": "property", "bench": "property", "benche": "property",
    "monument": "property", "monumnt": "property", "vitre": "property",
    "parks": "parks", "park": "parks", "jardin": "parks",
    "green_space": "parks", "green space": "parks", "garden": "parks",
    "arbre": "parks", "tree": "parks", "playgroud": "parks",
    "other": "other", "autre": "other",
}


def normalize_category_key(value: str) -> str:
    """Map model/provider category names to the app's stored lowercase keys."""
    if not value:
        return "other"
    normalized = unicodedata.normalize("NFKD", str(value))
    normalized = "".join(c for c in normalized if not unicodedata.combining(c))
    normalized = re.sub(r"[^a-zA-Z0-9]+", "_", normalized).strip("_").lower()
    return CATEGORY_ALIASES.get(normalized, "other")


def fuzzy_category_alias(word: str) -> Optional[str]:
    compact_word = re.sub(r'(.)\1+', r'\1', word.lower())
    best_alias = None
    best_score = 0.0
    for alias in CATEGORY_ALIASES:
        compact_alias = re.sub(r'(.)\1+', r'\1', alias.lower())
        score = SequenceMatcher(None, compact_word, compact_alias).ratio()
        if score > best_score:
            best_score = score
            best_alias = alias
    if best_alias and best_score >= 0.60:
        return CATEGORY_ALIASES[best_alias]
    return None

SYSTEM_PROMPT = """You are an expert in categorizing citizen complaints for a municipal government in Tunisia.

Your task is to analyze complaint descriptions and predict the most appropriate category from this list:
- waste: Déchets et Propreté (Poubelles, bennes débordantes, décharges illégales, nettoyage des rues, garbage, trash, نفايات، قمامة)
- roads: Routes et Circulation (Routes endommagées, trottoirs, stationnement, signalisation, road damage, potholes, sidewalks, traffic, طرق، طرق تالفة، حفر)
- lighting: Éclairage public (Lampadaires cassés, rues sombres, éclairage instable, street lights, broken lights, إنارة، مصابيح، إضاءة)
- water: Eau et Drainage (Fuites, zones inondées, canalisations bouchées, eaux usées, water leaks, flooding, drainage, مياه، تسرب، فيضانات)
- safety: Sécurité et Bruit (Situations dangereuses, accidents, bruit, zones à risque, safety, dangerous conditions, noise, danger, سلامة، خطر، ضوضاء)
- property: Propriété publique (Bâtiments municipaux, mobilier urbain, monuments, public buildings, facilities, مباني عامة، ممتلكات عامة)
- parks: Parcs et Espaces verts (Parcs, jardins, arbres, entretien des espaces verts, parks, green spaces, trees, حدائق، مساحات خضراء، أشجار)
- other: Autre (Tout ce qui ne correspond pas aux autres catégories, only use this as last resort)

IMPORTANT CONTEXT ANALYSIS RULES:
1. Consider the main subject/action in the complaint, not just keywords
2. Look for contextual clues about what needs to be fixed or addressed
3. Different languages describe the same issue differently - understand the intent
4. Writing variations (misspellings, repeated letters, slang) should not affect classification
5. Use the title and description together for better context

Examples:
- "dechetssssssss" → waste (repeated letters, same meaning)
- "poubelle pleine" → waste (French: full trash can)
- "قمامة" → waste (Arabic: garbage)
- "street has big hole" → roads (English description)
- "no light at night" → lighting (context: darkness)
- "water everywhere" → water (context: flooding/leak)
- "dangerous for kids" → safety (context: safety concern)
- "broken bench in park" → parks (context: park equipment)
- "building wall falling" → property (context: public building)

Respond with a JSON object containing:
{
  "predicted": "category_key",
  "confidence": 0.0-1.0,
  "alternatives": ["category1", "category2"],
  "reasoning": "Brief explanation"
}

Use lowercase category keys exactly as shown. Be strict with confidence (>0.85 only for clear matches)."""


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
    Predict complaint category using Claude API (if available) for best accuracy.
    Falls back to HuggingFace zero-shot classification, then to keyword-based matching.
    """
    text_to_analyze = f"{title}. {description}" if title else description
    
    # Strategy 1: Claude API (highest accuracy, used first when available)
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
            
            predicted = normalize_category_key(result.get("predicted", "other"))
            
            confidence = float(result.get("confidence", 0.0))
            confidence = max(0.0, min(1.0, confidence))
            
            alternatives = result.get("alternatives", [])
            alternatives = [
                normalize_category_key(a)
                for a in alternatives
                if normalize_category_key(a) in VALID_CATEGORIES and normalize_category_key(a) != predicted
            ][:3]
            
            return PredictionResponse(
                predicted=predicted,
                confidence=confidence,
                alternatives=alternatives,
                reasoning=result.get("reasoning", "Claude API prediction")
            )
        except Exception as e:
            print(f"Claude API error: {e}")
    
    # Strategy 2: Free HuggingFace zero-shot classification (local, no API key needed)
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
                "road damage, potholes, sidewalks, road signs": "roads",
                "street lighting, broken lights, traffic lights": "lighting",
                "garbage, waste, illegal dumping, dirty streets": "waste",
                "water supply, leaks, drainage, flooding": "water",
                "security, safety, unsafe conditions, crime": "safety",
                "damaged public buildings, playgrounds, public facilities": "property",
                "parks, trees, green spaces, gardens": "parks",
                "traffic signals, road markings, parking, congestion": "roads",
                "construction violations, building permits, urban planning": "property",
                "public benches, bus stops, kiosks, equipment": "property",
                "other, miscellaneous": "other"
            }
            
            result = classifier(text_to_analyze, candidate_labels, multi_label=False)
            
            top_label = result["labels"][0]
            top_score = result["scores"][0]
            predicted = label_to_category.get(top_label, "other")
            
            alternatives = []
            for label, score in zip(result["labels"][1:4], result["scores"][1:4]):
                cat = label_to_category.get(label, "other")
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
    
    # Strategy 3: Keyword-based fallback (always free, no dependencies)
    text_normalized = normalize_text(text_to_analyze)
    text_lower = text_normalized.lower()
    
    # 3a: Fuzzy match individual words against CATEGORY_ALIASES
    fuzzy_hits = [fuzzy_category_alias(word) for word in text_normalized.split()]
    fuzzy_hits = [hit for hit in fuzzy_hits if hit and hit != "other"]
    
    # 3b: Also fuzzy match n-grams (bigrams and trigrams) to catch multi-word aliases
    words = text_normalized.split()
    for n in [2, 3]:
        for i in range(len(words) - n + 1):
            ngram = " ".join(words[i:i+n])
            hit = fuzzy_category_alias(ngram)
            if hit and hit != "other":
                fuzzy_hits.append(hit)
    
    # 3c: Also check if any CATEGORY_ALIASES key is a substring of the text
    for alias_raw, alias_cat in CATEGORY_ALIASES.items():
        if alias_cat != "other" and alias_raw in text_lower:
            fuzzy_hits.append(alias_cat)
    
    if fuzzy_hits:
        predicted = max(set(fuzzy_hits), key=fuzzy_hits.count)
        confidence = min(0.74, 0.50 + 0.05 * fuzzy_hits.count(predicted))
        alternatives = [cat for cat in sorted(set(fuzzy_hits)) if cat != predicted][:3]
        return PredictionResponse(
            predicted=predicted,
            confidence=round(confidence, 2),
            alternatives=alternatives,
            reasoning="Fuzzy multilingual alias match"
        )
    
    keyword_map = {
        "roads": ["route", "road", "pothole", "trottoir", "sidewalk", "chaussee", "nid de poule", "bitume", "asphalt",
                 # Arabic keywords (normalized)
                 "طريق", "شارع", "حفرة", "نفق", "اسفلت", "رصيف", "طريق معطل", "تلف الطريق",
                 "circulation", "traffic", "stationnement", "parking", "embouteillage", "signal",
                 "مرور", "انتظار", "زحمة", "اشارة مرور", "توقيف", "ازدحام", "سير"],
        "lighting": ["eclairage", "lampadaire", "light", "ampoule", "feu", "traffic light", "lumiere",
                     # Arabic keywords (normalized)
                     "انارة", "عمود انارة", "مصباح", "ضوء", "ظلام", "انارة معطلة", "مصباح مكسور"],
        "waste": ["dechet", "poubelle", "garbage", "ordure", "waste", "dump", "sale", "dirty",
                  # Arabic keywords (normalized)
                  "قمامة", "نفايات", "قارورة", "وسخ", "قذارة", "قذارة الطريق", "نفايات غير مرمى"],
        "water": ["eau", "water", "fuite", "leak", "drainage", "inondation", "flood", "canalisation",
                  # Arabic keywords (normalized)
                  "ماء", "تسرب", "فيضان", "تصريف", "مجاري", "سائل", "مياه راكدة", "مياه ملوثة"],
        "safety": ["securite", "safety", "danger", "vol", "theft", "agression", "crime", "insecurite",
                   # Arabic keywords (normalized)
                   "سلامة", "خطر", "سرقة", "اعتداء", "جريمة", "تهديد", "عدم امان", "منطقة خطر"],
        "property": ["batiment", "building", "playground", "aire de jeu", "propriete publique", "ecole", "school",
                            # Arabic keywords (normalized)
                            "مبنى", "ملعب", "ممتلكات عامة", "مدرسة", "مرافق عامة", "مجمع سكني", "اثاث عام",
                            "construction", "permis", "permit", "urbanisme", "batir", "violation",
                            "بناء", "رخصة", "تعمير", "هدم", "انتهاك", "تشيد", "مشروع بناء",
                            "banc", "bench", "bus", "kiosque", "kiosk", "arret", "stop", "equipement",
                            "مقعد", "حافلة", "كيشك", "محطة", "توقف", "معدات", "اثاث شارع"],
        "parks": ["parc", "park", "arbre", "tree", "jardin", "garden", "espace vert", "pelouse",
                       # Arabic keywords (normalized)
                       "حديقة", "شجرة", "مساحة خضراء", "عشب", "منتزه", "حديقة عامة", "نباتات"],
    }
    
    # Normalize keywords for matching
    normalized_keyword_map = {}
    for category, keywords in keyword_map.items():
        normalized_keywords = [normalize_text(kw) for kw in keywords]
        normalized_keyword_map[category] = normalized_keywords
    
    scores = {}
    for category, normalized_keywords in normalized_keyword_map.items():
        score = sum(1 for kw in normalized_keywords if kw in text_lower)
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
    
    # 3d: Low-threshold catch-all — try every word against every alias with threshold 0.40
    low_hits = []
    for word in text_normalized.split():
        for alias in CATEGORY_ALIASES:
            if CATEGORY_ALIASES[alias] == "other":
                continue
            score = SequenceMatcher(None, word, alias).ratio()
            if score >= 0.40:
                low_hits.append(CATEGORY_ALIASES[alias])
    if low_hits:
        predicted = max(set(low_hits), key=low_hits.count)
        return PredictionResponse(
            predicted=predicted,
            confidence=round(min(0.55, 0.30 + 0.03 * low_hits.count(predicted)), 2),
            alternatives=[cat for cat in sorted(set(low_hits)) if cat != predicted][:3],
            reasoning="Low-threshold fuzzy catch-all"
        )
    
    return PredictionResponse(
        predicted="other",
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
