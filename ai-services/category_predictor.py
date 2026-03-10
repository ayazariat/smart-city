"""
Category Predictor Service
Predicts complaint category based on title and description using Claude Haiku
"""

import os
import json
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Category Predictor AI Service")

# Initialize Anthropic client
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
client = Anthropic(api_key=ANTHROPIC_API_KEY)

# Category definitions for SmartCity Tunisia
CATEGORIES = {
    "ROUTES": "Roads & Traffic - Potholes, sidewalks, signs, road markings",
    "DECHETS": "Waste & Cleanliness - Overflowing bins, illegal dumps, garbage collection",
    "EAU": "Water & Drainage - Leaks, blocked drains, sewage issues",
    "ECLAIRAGE": "Street Lighting - Broken lamps, dark streets, electrical issues",
    "SECURITE": "Public Safety - Hazards, accidents, noise complaints",
    "BIENS_PUBLICS": "Parks & Public Spaces - Parks, benches, monuments, fountains",
    "AUTRE": "Other - Anything that doesn't fit above categories"
}

# Fallback response
FALLBACK_RESPONSE = {
    "predicted": "AUTRE",
    "confidence": 0.0,
    "alternatives": [],
    "reasoning": "Unable to analyze. Please select category manually."
}


class CategoryRequest(BaseModel):
    title: str
    description: str


class CategoryResponse(BaseModel):
    predicted: str
    confidence: float
    alternatives: list
    reasoning: str


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.post("/ai/predict-category", response_model=CategoryResponse)
async def predict_category(request: CategoryRequest):
    """
    Predict complaint category based on title and description
    Uses Claude Haiku 4 model
    """
    try:
        # Build the prompt
        categories_text = "\n".join([f"- {k}: {v}" for k, v in CATEGORIES.items()])
        
        prompt = f"""You are an AI assistant for SmartCity Tunisia, helping classify citizen complaints.

Given the following complaint title and description, classify it into the most appropriate category.

Available categories:
{categories_text}

Complaint Title: {request.title}
Complaint Description: {request.description}

Respond with ONLY a JSON object in this exact format:
{{
    "predicted": "CATEGORY_CODE",
    "confidence": 0.0-1.0,
    "alternatives": ["other_possible_categories"],
    "reasoning": "brief explanation"
}}

Think step by step in your reasoning. Consider:
1. What is the main issue described?
2. Which category best fits the primary concern?
3. Are there secondary issues that might fit other categories?

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
        # Handle potential markdown code blocks
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        result = json.loads(response_text.strip())
        
        # Validate and normalize the response
        predicted = result.get("predicted", "AUTRE").upper()
        if predicted not in CATEGORIES:
            predicted = "AUTRE"
        
        confidence = float(result.get("confidence", 0.0))
        confidence = max(0.0, min(1.0, confidence))  # Clamp to 0-1
        
        alternatives = result.get("alternatives", [])
        if isinstance(alternatives, list):
            alternatives = [a.upper() for a in alternatives if a.upper() in CATEGORIES][:3]
        else:
            alternatives = []
        
        reasoning = result.get("reasoning", "")
        
        return CategoryResponse(
            predicted=predicted,
            confidence=confidence,
            alternatives=alternatives,
            reasoning=reasoning
        )
        
    except json.JSONDecodeError as e:
        # If JSON parsing fails, return fallback
        print(f"JSON decode error: {e}")
        return CategoryResponse(**FALLBACK_RESPONSE)
        
    except Exception as e:
        # On any error, return fallback (never crash)
        print(f"Error in predict_category: {e}")
        return CategoryResponse(**FALLBACK_RESPONSE)


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host=host, port=port)
