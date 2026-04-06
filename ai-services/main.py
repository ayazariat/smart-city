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

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

# Import new routers
from routes.urgency_routes import router as urgency_router
from routes.duplicate_routes import router as duplicate_router
from routes.trend_routes import router as trend_router

# Create FastAPI app
app = FastAPI(
    title="Smart City Tunisia AI Services",
    description="AI services for complaint urgency, duplicate detection, and trend prediction",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "models": {
            "urgency": model_exists("urgency_model.pkl"),
            "duplicate": False,
            "trend": False
        }
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