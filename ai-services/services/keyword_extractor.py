

import os
import json
import hashlib
import re
from typing import Optional
from fastapi import FastAPI
from pydantic import BaseModel
import anthropic

# Try to import NLTK, make it optional
try:
    import nltk
    from nltk.tokenize import word_tokenize
    from nltk.corpus import stopwords
    NLTK_AVAILABLE = True
    # Download required NLTK data
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        nltk.download('punkt', quiet=True)
    try:
        nltk.data.find('tokenizers/punkt_tab')
    except LookupError:
        nltk.download('punkt_tab', quiet=True)
    try:
        nltk.data.find('corpora/stopwords')
    except LookupError:
        nltk.download('stopwords', quiet=True)
except ImportError:
    NLTK_AVAILABLE = False

# Initialize FastAPI app
app = FastAPI(title="Keyword Extractor Service")

# Get API key from environment
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# Tunisian location keywords
TUNISIA_LOCATIONS = [
    "tunis", "ariana", "ben arous", "manouba", "nabeul", "zaghouan",
    "bizerte", "beja", "jendouba", "le kef", "siliana",
    "kairouan", "kasserine", "sidi bouzid", "sousse", "monastir", "mahdia",
    "sfax", "gabès", "medenine", "tataouine", "gafsa", "kébili", "tozeur"
]

# Urgency keywords
URGENCY_KEYWORDS = {
    "urgent": ["urgent", "immediately", "emergency", "danger", "dangerous", "hazard", "accident"],
    "high": ["serious", "critical", "important", "asap", "soon", "broken", "damaged"],
    "medium": ["soon", "needed", "should be fixed"],
    "low": ["when possible", "when convenient", "sometime"]
}

# Location-related keywords
LOCATION_TYPE_KEYWORDS = [
    "rue", "road", "street", "avenue", "boulevard", "place", "square",
    "quartier", "neighborhood", "area", "zone", "bloc", "building",
    "intersection", "crossroad", "stop"
]


class ExtractionRequest(BaseModel):
    description: str
    title: Optional[str] = None


class ExtractionResponse(BaseModel):
    keywords: list[str]
    locationKeywords: list[str]
    urgencyKeywords: list[str]
    similarityHash: str


def extract_keywords(description: str, title: Optional[str] = None) -> ExtractionResponse:
    """
    Extract keywords from complaint text using Claude + NLTK.
    """
    # Combine title and description
    full_text = f"{title}\n{description}" if title else description
    full_text_lower = full_text.lower()
    
    keywords = []
    location_keywords = []
    urgency_keywords = []
    
    # Use Claude for intelligent extraction if API key is available
    if ANTHROPIC_API_KEY:
        try:
            client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
            
            prompt = f"""Extract keywords from this complaint text. Return a JSON object:
{{
  "keywords": ["keyword1", "keyword2", ...],
  "location_indicators": ["rue", "quartier", etc],
  "urgency_indicators": ["urgent", "danger", etc]
}}

Complaint: {full_text}

Respond with ONLY valid JSON, no other text."""

            message = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=256,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_text = message.content[0].text if message.content else "{}"
            
            try:
                result = json.loads(response_text)
                keywords.extend(result.get("keywords", []))
                location_keywords.extend(result.get("location_indicators", []))
                urgency_keywords.extend(result.get("urgency_indicators", []))
            except json.JSONDecodeError:
                pass  # Fall back to basic extraction
                
        except Exception as e:
            print(f"Claude extraction error: {e}")
    
    # Use NLTK for basic extraction if available
    if NLTK_AVAILABLE:
        try:
            # Tokenize
            tokens = word_tokenize(full_text_lower)
            
            # Get stopwords
            try:
                stop_words = set(stopwords.words('french') + stopwords.words('english'))
            except:
                stop_words = set()
            
            # Extract meaningful tokens
            for token in tokens:
                if len(token) > 3 and token not in stop_words and token.isalpha():
                    if token not in keywords:
                        keywords.append(token)
                        
        except Exception as e:
            print(f"NLTK extraction error: {e}")
    
    # Extract Tunisia locations
    for location in TUNISIA_LOCATIONS:
        if location in full_text_lower:
            if location not in location_keywords:
                location_keywords.append(location)
    
    # Extract location-type keywords
    for loc_kw in LOCATION_TYPE_KEYWORDS:
        if loc_kw in full_text_lower:
            if loc_kw not in location_keywords:
                location_keywords.append(loc_kw)
    
    # Extract urgency keywords
    for level, words in URGENCY_KEYWORDS.items():
        for word in words:
            if word in full_text_lower:
                if word not in urgency_keywords:
                    urgency_keywords.append(word)
    
    # Generate similarity hash
    # Sort keywords and create a hash for finding similar complaints
    sorted_keywords = sorted(set(keywords))
    similarity_hash = hashlib.md5(
        " ".join(sorted_keywords).encode()
    ).hexdigest()[:8]
    
    return ExtractionResponse(
        keywords=list(set(keywords))[:20],  # Limit to 20
        locationKeywords=list(set(location_keywords))[:10],
        urgencyKeywords=list(set(urgency_keywords))[:5],
        similarityHash=similarity_hash
    )


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "keyword-extractor"}


@app.post("/extract", response_model=ExtractionResponse)
async def extract_keywords_endpoint(request: ExtractionRequest):
    """
    Extract keywords from complaint text.
    
    - **description**: The complaint description text
    - **title**: Optional complaint title
    """
    result = extract_keywords(request.description, request.title)
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
