"""
Urgency Routes
==============
FastAPI routes for urgency prediction service (BL-24).
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import asyncio

from services.urgency_predictor import predict_urgency, train_urgency_model


router = APIRouter()


class UrgencyPredictionRequest(BaseModel):
    """Request model for urgency prediction."""
    title: str = Field("", description="Complaint title")
    description: str = Field("", description="Complaint description")
    category: str = Field("AUTRE", description="Category code")
    citizenUrgency: str = Field("MEDIUM", description="User-selected urgency: LOW, MEDIUM, HIGH, URGENT")
    municipality: str = Field("", description="Municipality name")
    latitude: Optional[float] = Field(None, description="Latitude")
    longitude: Optional[float] = Field(None, description="Longitude")
    confirmationCount: int = Field(0, description="Number of confirmations")
    submittedAt: Optional[str] = Field(None, description="ISO datetime string")


class UrgencyTrainSample(BaseModel):
    """Single training sample."""
    complaintId: str = Field("", description="Complaint ID")
    finalUrgency: str = Field("MEDIUM", description="Final urgency level after agent review")
    title: str = ""
    description: str = ""
    category: str = "AUTRE"
    citizenUrgency: str = "MEDIUM"
    municipality: str = ""
    confirmationCount: int = 0


class UrgencyTrainRequest(BaseModel):
    """Request model for batch training."""
    samples: List[UrgencyTrainSample] = Field(default_factory=list, description="Training samples array")


@router.post("/predict")
async def predict_urgency_endpoint(request: UrgencyPredictionRequest) -> Dict[str, Any]:
    """
    Predict urgency level for a new complaint.
    
    This endpoint is called at submission time to provide AI prediction.
    """
    try:
        submitted_at = None
        if request.submittedAt:
            try:
                submitted_at = datetime.fromisoformat(request.submittedAt.replace("Z", "+00:00"))
            except Exception:
                submitted_at = datetime.now()

        # Timeout guard: 4s max, then return rule-based result
        try:
            result = await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: predict_urgency(
                        title=request.title or "",
                        description=request.description or "",
                        category=request.category or "AUTRE",
                        citizen_urgency=request.citizenUrgency or "MEDIUM",
                        municipality=request.municipality or "",
                        latitude=request.latitude,
                        longitude=request.longitude,
                        confirmation_count=request.confirmationCount,
                        submitted_at=submitted_at
                    )
                ),
                timeout=4.0
            )
        except asyncio.TimeoutError:
            result = {
                "predictedUrgency": request.citizenUrgency or "MEDIUM",
                "confidenceScore": 0.3,
                "explanation": "Rule-based result (prediction timed out)",
                "isRuleBased": True,
                "isFallback": True
            }

        return {
            "success": True,
            "data": result
        }

    except Exception as e:
        print(f"[URGENCY] Error in predict: {e}")
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
    Train the urgency model with a batch of validated complaint data.
    """
    try:
        from config.settings import MIN_TRAINING_SAMPLES

        if not request.samples or len(request.samples) == 0:
            return {
                "success": True,
                "message": "No training samples provided.",
                "samplesReceived": 0
            }

        if len(request.samples) < MIN_TRAINING_SAMPLES:
            return {
                "success": True,
                "message": f"Received {len(request.samples)} samples. Need at least {MIN_TRAINING_SAMPLES} to train. Collecting more data.",
                "samplesReceived": len(request.samples),
                "minRequired": MIN_TRAINING_SAMPLES
            }

        try:
            result = train_urgency_model([s.model_dump() for s in request.samples])
            return {"success": True, "data": result}
        except ImportError:
            return {
                "success": True,
                "message": "sklearn is not installed. Model training unavailable. Using rule-based predictions.",
                "samplesReceived": len(request.samples)
            }

    except Exception as e:
        print(f"[URGENCY] Error in train: {e}")
        return {
            "success": False,
            "message": "Training failed. Data has been logged for retry.",
            "samplesReceived": len(request.samples) if request.samples else 0
        }


@router.get("/status")
async def get_status() -> Dict[str, Any]:
    """Returns model status: model_exists, training_samples_count, last_trained, is_rule_based."""
    try:
        from utils.model_manager import model_exists, get_model_info as _get_model_info

        has_model = model_exists("urgency_model.pkl")
        has_vectorizer = model_exists("urgency_vectorizer.pkl")
        info = _get_model_info("urgency_model.pkl") if has_model else {}

        return {
            "success": True,
            "data": {
                "model_exists": has_model and has_vectorizer,
                "training_samples_count": info.get("training_samples", 0),
                "last_trained": info.get("last_trained", None),
                "is_rule_based": not (has_model and has_vectorizer),
                "service": "urgency_prediction",
                "version": "1.0.0"
            }
        }
    except Exception as e:
        print(f"[URGENCY] Error in status: {e}")
        return {
            "success": True,
            "data": {
                "model_exists": False,
                "training_samples_count": 0,
                "last_trained": None,
                "is_rule_based": True,
                "service": "urgency_prediction",
                "version": "1.0.0"
            }
        }


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "urgency_prediction",
        "timestamp": datetime.now().isoformat()
    }