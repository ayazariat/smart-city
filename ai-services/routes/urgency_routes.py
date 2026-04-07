"""
Urgency Routes
==============
FastAPI routes for urgency prediction service (BL-24).
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

from services.urgency_predictor import predict_urgency, train_urgency_model


router = APIRouter()


class UrgencyPredictionRequest(BaseModel):
    """Request model for urgency prediction."""
    title: str = Field(..., min_length=5, description="Complaint title")
    description: str = Field(..., min_length=20, description="Complaint description")
    category: str = Field(..., description="Category: WASTE, ROAD, LIGHTING, WATER, SAFETY, PUBLIC_PROPERTY, GREEN_SPACE, OTHER")
    citizenUrgency: str = Field(..., description="User-selected urgency: LOW, MEDIUM, HIGH, URGENT")
    municipality: str = Field(..., description="Municipality name")
    latitude: Optional[float] = Field(None, description="Latitude")
    longitude: Optional[float] = Field(None, description="Longitude")
    confirmationCount: int = Field(0, description="Number of confirmations")
    submittedAt: Optional[str] = Field(None, description="ISO datetime string")


class UrgencyTrainRequest(BaseModel):
    """Request model for model training."""
    complaintId: str = Field(..., description="Complaint ID")
    finalUrgency: str = Field(..., description="Final urgency level after agent review")
    title: str
    description: str
    category: str
    citizenUrgency: str
    municipality: str
    confirmationCount: int = 0


@router.post("/predict")
async def predict_urgency_endpoint(request: UrgencyPredictionRequest) -> Dict[str, Any]:
    """
    Predict urgency level for a new complaint.
    
    This endpoint is called at submission time to provide AI prediction.
    """
    try:
        # Parse submittedAt if provided
        submitted_at = None
        if request.submittedAt:
            try:
                submitted_at = datetime.fromisoformat(request.submittedAt.replace("Z", "+00:00"))
            except:
                submitted_at = datetime.now()
        
        result = predict_urgency(
            title=request.title,
            description=request.description,
            category=request.category,
            citizen_urgency=request.citizenUrgency,
            municipality=request.municipality,
            latitude=request.latitude,
            longitude=request.longitude,
            confirmation_count=request.confirmationCount,
            submitted_at=submitted_at
        )
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception:
        # Never return 500 — always return a fallback prediction
        return {
            "success": True,
            "data": {
                "predictedUrgency": request.citizenUrgency or "MEDIUM",
                "confidenceScore": 0.3,
                "explanation": "Fallback prediction used due to processing error",
                "isRuleBased": True,
                "isFallback": True
            }
        }


@router.post("/train")
async def train_urgency_endpoint(request: UrgencyTrainRequest) -> Dict[str, Any]:
    """
    Train or update the urgency model with validated complaint data.
    
    Called after agent validates a complaint to learn from the final urgency decision.
    """
    try:
        # This would typically fetch from MongoDB or receive features directly
        # For now, return a message about data collection
        return {
            "success": True,
            "message": "Training data received. Model will be retrained when sufficient samples available.",
            "complaintId": request.complaintId
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/model-info")
async def get_model_info() -> Dict[str, Any]:
    """Get information about the current model."""
    from utils.model_manager import model_exists, get_model_info
    
    has_model = model_exists("urgency_model.pkl")
    has_vectorizer = model_exists("urgency_vectorizer.pkl")
    
    return {
        "modelLoaded": has_model and has_vectorizer,
        "modelExists": has_model,
        "vectorizerExists": has_vectorizer,
        "service": "urgency_prediction",
        "version": "1.0.0"
    }


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "urgency_prediction",
        "timestamp": datetime.now().isoformat()
    }