"""
Duplicate Routes
================
FastAPI routes for duplicate detection service (BL-25).
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


router = APIRouter()


class DuplicateCheckRequest(BaseModel):
    """Request model for duplicate checking."""
    complaintId: str = Field(..., description="New complaint ID")
    title: str = Field(..., min_length=5, description="Complaint title")
    description: str = Field(..., min_length=20, description="Complaint description")
    category: str = Field(..., description="Category code")
    latitude: Optional[float] = Field(None, description="Latitude")
    longitude: Optional[float] = Field(None, description="Longitude")
    municipality: str = Field(..., description="Municipality name")
    submittedAt: Optional[str] = Field(None, description="ISO datetime string")


class DuplicateCheckResponse(BaseModel):
    """Response model for duplicate check."""
    isDuplicate: bool
    duplicateLevel: str
    topMatches: List[Dict[str, Any]]
    recommendation: str
    humanReviewRequired: bool


class DuplicateConfirmRequest(BaseModel):
    """Request model for confirming duplicate action."""
    newComplaintId: str
    existingComplaintId: str
    action: str = Field(..., description="Action: 'merge' or 'keep_separate'")


@router.post("/check")
async def check_duplicate_endpoint(request: DuplicateCheckRequest) -> Dict[str, Any]:
    """
    Check if a new complaint is a duplicate of existing complaints.
    
    This endpoint is called after complaint submission to detect potential duplicates.
    In production, candidates would be fetched from MongoDB based on municipality.
    """
    try:
        # Parse submittedAt
        submitted_at = None
        if request.submittedAt:
            try:
                submitted_at = datetime.fromisoformat(request.submittedAt.replace("Z", "+00:00"))
            except:
                submitted_at = datetime.now()
        
        # Build new complaint object
        new_complaint = {
            "title": request.title,
            "description": request.description,
            "category": request.category,
            "latitude": request.latitude,
            "longitude": request.longitude,
            "municipality": request.municipality,
            "submittedAt": submitted_at
        }
        
        # In production, fetch candidates from MongoDB:
        # candidates = await fetch_candidates_from_db(
        #     municipality=request.municipality,
        #     category=request.category,
        #     days_back=30
        # )
        # For now, return a placeholder response
        candidates = []
        
        # Import the detector
        from services.duplicate_detector import check_duplicate
        
        result = check_duplicate(new_complaint, candidates)
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception:
        # Never return 500 — always return safe response
        return {
            "success": True,
            "data": {
                "isDuplicate": False,
                "duplicateLevel": "NOT_DUPLICATE",
                "topMatches": [],
                "recommendation": "Could not check duplicates at this time.",
                "humanReviewRequired": False
            }
        }


@router.post("/confirm")
async def confirm_duplicate_endpoint(request: DuplicateConfirmRequest) -> Dict[str, Any]:
    """
    Confirm or dismiss a duplicate suggestion.
    
    Called by agent after reviewing duplicate suggestions.
    """
    try:
        from services.duplicate_detector import confirm_duplicate
        
        if request.action not in ["merge", "keep_separate"]:
            raise HTTPException(status_code=400, detail="Invalid action. Use 'merge' or 'keep_separate'")
        
        result = confirm_duplicate(
            request.newComplaintId,
            request.existingComplaintId,
            request.action
        )
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "duplicate_detection",
        "timestamp": datetime.now().isoformat()
    }


@router.get("/model-info")
async def get_model_info() -> Dict[str, Any]:
    """Get information about the duplicate detection service."""
    return {
        "service": "duplicate_detection",
        "version": "1.0.0",
        "description": "Hybrid scoring using text similarity, geographic proximity, category match, and temporal proximity"
    }