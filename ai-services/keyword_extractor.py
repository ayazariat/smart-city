"""
Keyword Extractor Service
Extracts keywords, location keywords, and urgency keywords from complaint text
Uses Claude Haiku + NLTK for stopwords
"""

import os
import json
import hashlib
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from anthropic import Anthropic
from dotenv import load_dotenv

# Try to import NLTK, but handle if not available
try:
    import nltk
    from nltk.corpus import stopwords
    NLTK_AVAILABLE = True
    # Download stopwords if not present
    try:
        nltk.data.find('corpora/stopwords')
    except LookupError:
        nltk.download('stopwords', quiet=True)
except ImportError:
    NLTK_AVAILABLE = False
    stopwords = []

load_dotenv()

app = FastAPI(title="Keyword Extractor AI Service")

# Initialize Anthropic client
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
client = Anthropic(api_key=ANTHROPIC_API_KEY)

# Fallback response
FALLBACK_RESPONSE = {
    "keywords": [],
    "locationKeywords": [],
    "urgencyKeywords": [],
    "similarityHash": "000000000000"
}


class KeywordRequest(BaseModel):
    title: str
    description: str
    category: str = "AUTRE"
    municipality: str = ""


class KeywordResponse(BaseModel):
    keywords: List[str]
    locationKeywords: List[str]
    urgencyKeywords: List[str]
    similarityHash: str


def get_stopwords() -> set:
    """Get stopwords set - tries NLTK first, then falls back to basic list"""
    if NLTK_AVAILABLE:
        try:
            french_stopwords = set(stopwords.words('french'))
            english_stopwords = set(stopwords.words('english'))
            return french_stopwords | english_stopwords
        except:
            pass
    
    # Fallback basic stopwords
    return {
        'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux',
        'et', 'ou', 'mais', 'donc', 'car', 'ni', 'que', 'qui', 'quoi',
        'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
        'être', 'avoir', 'faire', 'pouvoir', 'vouloir', 'devoir',
        'ce', 'cet', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes',
        'son', 'sa', 'ses', 'notre', 'votre', 'leur', 'leurs',
        'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'par', 'en', 'vers',
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare'
    }


def generate_similarity_hash(keywords: List[str], category: str, municipality: str) -> str:
    """Generate similarity hash for duplicate detection"""
    # Sort keywords for consistent hashing
    sorted_keywords = sorted(keywords)
    combined = f"{sorted_keywords}|{category}|{municipality}"
    hash_obj = hashlib.md5(combined.encode())
    return hash_obj.hexdigest()[:12]


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.post("/ai/extract-keywords", response_model=KeywordResponse)
async def extract_keywords(request: KeywordRequest):
    """
    Extract keywords, location keywords, and urgency keywords from complaint
    """
    try:
        # Build the prompt
        prompt = f"""You are an AI assistant for SmartCity Tunisia, analyzing citizen complaints.

Extract keywords from the following complaint:

Title: {request.title}
Description: {request.description}
Category: {request.category}
Municipality: {request.municipality}

Task:
1. Extract general keywords (important nouns, verbs, issues)
2. Extract location-related keywords (street names, areas, landmarks)
3. Extract urgency-related keywords (indicators of urgency/severity)

Respond with ONLY a JSON object in this exact format:
{{
    "keywords": ["keyword1", "keyword2", ...],
    "locationKeywords": ["street", "area", "landmark", ...],
    "urgencyKeywords": ["urgent", "dangerous", "immediate", ...]
}}

Rules:
- Return ONLY Arabic or French keywords (this is Tunisia)
- Be concise - 3-7 keywords maximum
- Location keywords should include street types (rue, avenue, place, quartier)
- Urgency keywords: danger, urgent, immédiatement, dangerous, accident, etc.
- If no location keywords found, return empty array
- If no urgency keywords found, return empty array

Start your response with {{ and end with }}."""

        # Call Claude Haiku
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=256,
            messages=[{"role": "user", "content": prompt}]
        )
        
        # Extract the response text
        response_text = message.content[0].text.strip()
        
        # Parse JSON from response
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        result = json.loads(response_text.strip())
        
        # Extract keywords
        keywords = result.get("keywords", [])
        if isinstance(keywords, list):
            # Filter out stopwords
            stopwords_set = get_stopwords()
            keywords = [k.lower().strip() for k in keywords 
                      if isinstance(k, str) and k.lower().strip() not in stopwords_set][:10]
        else:
            keywords = []
        
        location_keywords = result.get("locationKeywords", [])
        if isinstance(location_keywords, list):
            location_keywords = [k.lower().strip() for k in location_keywords 
                               if isinstance(k, str)][:5]
        else:
            location_keywords = []
        
        urgency_keywords = result.get("urgencyKeywords", [])
        if isinstance(urgency_keywords, list):
            urgency_keywords = [k.lower().strip() for k in urgency_keywords 
                              if isinstance(k, str)][:5]
        else:
            urgency_keywords = []
        
        # Generate similarity hash
        similarity_hash = generate_similarity_hash(
            keywords, 
            request.category.upper(), 
            request.municipality
        )
        
        return KeywordResponse(
            keywords=keywords,
            locationKeywords=location_keywords,
            urgencyKeywords=urgency_keywords,
            similarityHash=similarity_hash
        )
        
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        return KeywordResponse(**FALLBACK_RESPONSE)
        
    except Exception as e:
        print(f"Error in extract_keywords: {e}")
        return KeywordResponse(**FALLBACK_RESPONSE)


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8001))  # Different port
    uvicorn.run(app, host=host, port=port)
