"""
AI Services Main Entry Point
=============================

Smart City Tunisia AI Services using FastAPI.

Usage:
    python main.py

This starts a unified FastAPI server with:
- Urgency Prediction (BL-24): /ai/urgency/*
- Duplicate Detection (BL-25): /ai/duplicate/*
- Trend Prediction (BL-37): /ai/trend/*

Server runs on http://localhost:8000
"""

import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import time

# Import new routers
from routes.urgency_routes import router as urgency_router
from routes.duplicate_routes import router as duplicate_router
from routes.trend_routes import router as trend_router

# Import service functions for category, keyword, SLA
from services.category_predictor import predict_category, PredictionRequest as CategoryPredictionRequest
from services.keyword_extractor import extract_keywords, ExtractionRequest as KeywordExtractionRequest
from services.sla_calculator import calculate_sla, SLACalculationRequest

# Create FastAPI app
app = FastAPI(
    title="Smart City Tunisia AI Services",
    description="AI services for complaint urgency, duplicate detection, and trend prediction",
    version="1.0.0"
)

# Add CORS middleware
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5000,http://127.0.0.1:5000,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    try:
        response = await call_next(request)
    except Exception:
        duration = int((time.time() - start) * 1000)
        print(f"[AI] {request.method} {request.url.path} → 500 ({duration}ms)")
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content={"success": False, "message": "Internal error"})
    duration = int((time.time() - start) * 1000)
    print(f"[AI] {request.method} {request.url.path} → {response.status_code} ({duration}ms)")
    return response


# Include routers
app.include_router(urgency_router, prefix="/ai/urgency", tags=["Urgency AI (BL-24)"])
app.include_router(duplicate_router, prefix="/ai/duplicate", tags=["Duplicate AI (BL-25)"])
app.include_router(trend_router, prefix="/ai/trend", tags=["Trend AI (BL-37)"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Smart City Tunisia AI Services",
        "version": "1.0.0",
        "services": {
            "urgency_prediction": "/ai/urgency",
            "duplicate_detection": "/ai/duplicate",
            "trend_prediction": "/ai/trend"
        },
        "timestamp": datetime.now().isoformat()
    }


@app.get("/health")
async def health_check():
    """Overall health check."""
    from utils.model_manager import model_exists
    
    # Check free model availability
    models_status = {
        "urgency": model_exists("urgency_model.pkl"),
        "duplicate": False,
        "trend": False
    }
    
    free_models = {}
    try:
        from services.category_predictor import TRANSFORMERS_AVAILABLE as cat_tf
        free_models["category_classifier"] = "bart-large-mnli" if cat_tf else "keyword-fallback"
    except:
        free_models["category_classifier"] = "unavailable"
    
    try:
        from services.urgency_predictor import TRANSFORMERS_AVAILABLE as urg_tf
        free_models["urgency_classifier"] = "bart-large-mnli" if urg_tf else "rule-based"
    except:
        free_models["urgency_classifier"] = "rule-based"
    
    try:
        from services.keyword_extractor import TRANSFORMERS_AVAILABLE as kw_tf
        free_models["keyword_extractor"] = "bert-base-NER" if kw_tf else "nltk-fallback"
    except:
        free_models["keyword_extractor"] = "nltk-fallback"
    
    try:
        from services.duplicate_detector import SENTENCE_TRANSFORMERS_AVAILABLE as dup_st
        free_models["duplicate_embeddings"] = "all-MiniLM-L6-v2" if dup_st else "tfidf-cosine"
    except:
        free_models["duplicate_embeddings"] = "tfidf-cosine"
    
    free_models["trend_forecasting"] = "ridge-regression" if True else "linear-regression"
    free_models["sla_calculator"] = "rule-based"
    
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "models": models_status,
        "freeModels": free_models
    }


# ── Category Prediction (used by ai.service.js) ──
@app.post("/predict-category", tags=["Category Prediction"])
async def predict_category_endpoint(request: dict):
    """Predict complaint category from description."""
    text = request.get("text") or request.get("description", "")
    title = request.get("title")
    result = predict_category(text, title)
    return {
        "predicted": result.predicted,
        "confidence": result.confidence,
        "alternatives": result.alternatives,
        "reasoning": result.reasoning,
    }


# ── Keyword Extraction (used by ai.service.js) ──
@app.post("/extract-keywords", tags=["Keyword Extraction"])
async def extract_keywords_endpoint(request: dict):
    """Extract keywords from complaint text."""
    text = request.get("text") or request.get("description", "")
    result = extract_keywords(text)
    return {
        "keywords": result.keywords,
        "locationKeywords": result.locationKeywords,
        "urgencyKeywords": result.urgencyKeywords,
        "similarityHash": result.similarityHash,
    }


# ── SLA Calculation (used by ai.service.js) ──
@app.post("/calculate-sla", tags=["SLA Calculator"])
async def calculate_sla_endpoint(request: SLACalculationRequest):
    """Calculate SLA deadline based on urgency and category."""
    from datetime import datetime as dt
    created = dt.fromisoformat(request.createdAt) if request.createdAt else None
    result = calculate_sla(request.urgency, request.category, created)
    return {
        "deadline": result.deadline,
        "status": result.status,
        "remaining_h": result.remaining_h,
        "urgency": result.urgency,
        "hours_allocated": result.hours_allocated,
    }


if __name__ == "__main__":
    import uvicorn
    
    print("=" * 50)
    print("Smart City Tunisia - AI Services")
    print("=" * 50)
    print("\nStarting unified AI services on port 8000...")
    print("\nAvailable endpoints:")
    print("  - Urgency Prediction: http://localhost:8000/ai/urgency")
    print("  - Duplicate Detection: http://localhost:8000/ai/duplicate")
    print("  - Trend Prediction:   http://localhost:8000/ai/trend")
    print("  - Health Check:       http://localhost:8000/health")
    print("\nPress Ctrl+C to stop\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)