"""
Duplicate Routes
================
FastAPI routes for duplicate detection service (BL-25).
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
from utils.db import get_db


router = APIRouter()


async def _fetch_candidates_from_db(municipality: str, category: str, days_back: int = 365, limit: int = 500) -> List[Dict]:
    """Fetch candidate complaints from MongoDB for duplicate comparison."""
    try:
        db = await get_db()
        if db is None:
            print("[DUPLICATE] ERROR: Database connection failed!")
            return []

        cutoff = datetime.now(timezone.utc) - timedelta(days=days_back)
        
        # Build query - search for ALL complaints (not filtered by user or municipality)
        # This ensures similar complaints are found regardless of who created them or where
        query = {
            "createdAt": {"$gte": cutoff},
            "status": {"$nin": ["REJECTED", "ARCHIVED"]},
            "isArchived": {"$ne": True},
            "isDuplicate": {"$ne": True}
        }
        
        # NOTE: Municipality filter removed to search across ALL municipalities
        # This ensures users see similar complaints from other areas as well
            
        print(f"[DUPLICATE] Query: {query}")
        
        # Get total count first
        total_count = await db.complaints.count_documents(query)
        print(f"[DUPLICATE] Total complaints matching query: {total_count}")
        
        cursor = db.complaints.find(
            query,
            {"_id": 1, "referenceId": 1, "title": 1, "description": 1,
             "category": 1, "municipalityName": 1, "latitude": 1, "longitude": 1,
             "location": 1, "media": 1, "photos": 1,
             "status": 1, "createdAt": 1, "submittedAt": 1}
        ).sort("createdAt", -1).limit(limit)

        candidates = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            if "createdAt" in doc and not doc.get("submittedAt"):
                # Ensure createdAt is timezone-aware before converting to ISO
                created_at = doc["createdAt"]
                if isinstance(created_at, datetime):
                    if created_at.tzinfo is None:
                        created_at = created_at.replace(tzinfo=timezone.utc)
                    doc["submittedAt"] = created_at.isoformat()
                else:
                    doc["submittedAt"] = created_at
            candidates.append(doc)
        return candidates
    except Exception as e:
        print(f"[DUPLICATE] Error fetching candidates: {e}")
        return []


class DuplicateCheckRequest(BaseModel):
    """Request model for duplicate checking."""
    complaintId: str = Field("", description="New complaint ID")
    title: str = Field("", description="Complaint title")
    description: str = Field("", description="Complaint description")
    category: str = Field("AUTRE", description="Category code")
    latitude: Optional[float] = Field(None, description="Latitude")
    longitude: Optional[float] = Field(None, description="Longitude")
    municipality: str = Field("", description="Municipality name")
    imageUrls: List[Any] = Field(default_factory=list, description="Complaint image URLs")
    submittedAt: Optional[str] = Field(None, description="ISO datetime string")


class DuplicateConfirmRequest(BaseModel):
    """Request model for confirming duplicate action."""
    newComplaintId: str = Field("", description="New complaint ID")
    existingComplaintId: str = Field("", description="Existing complaint ID")
    action: str = Field("keep_separate", description="Action: merge | keep_separate | not_duplicate")


@router.post("/check")
async def check_duplicate_endpoint(request: DuplicateCheckRequest) -> Dict[str, Any]:
    """
    Check if a new complaint is a duplicate of existing complaints.
    
    This endpoint is called after complaint submission to detect potential duplicates.
    In production, candidates would be fetched from MongoDB based on municipality.
    """
    try:
        submitted_at = None
        if request.submittedAt:
            try:
                submitted_at = datetime.fromisoformat(request.submittedAt.replace("Z", "+00:00"))
            except Exception:
                submitted_at = datetime.now(timezone.utc)

        new_complaint = {
            "complaintId": request.complaintId or "",
            "title": request.title or "",
            "description": request.description or "",
            "category": request.category or "AUTRE",
            "latitude": request.latitude,
            "longitude": request.longitude,
            "municipality": request.municipality or "",
            "media": request.imageUrls or [],
            "photos": request.imageUrls or [],
            "submittedAt": submitted_at
        }

        # Fetch candidates from MongoDB directly
        candidates = []
        try:
            candidates = await _fetch_candidates_from_db(
                municipality=request.municipality or "",
                category=request.category or "",
                days_back=365,  # Increased from 90 to 365 days to find more duplicates
                limit=500
            )
        except Exception as db_err:
            print(f"[DUPLICATE] DB Error: {db_err}")
        
        print(f"[DUPLICATE] Found {len(candidates)} candidates")
        
        # Always return test data for demo purposes

        # Use REAL duplicate detection with DB candidates
        from services.duplicate_detector import check_duplicate
        
        print(f"[DUPLICATE] Checking {len(candidates)} real DB candidates")
        
        new_complaint_data = {
            "complaintId": request.complaintId or "",
            "title": request.title,
            "description": request.description,
            "category": request.category,
            "latitude": request.latitude,
            "longitude": request.longitude,
            "municipality": request.municipality,
            "media": request.imageUrls or [],
            "photos": request.imageUrls or [],
            "submittedAt": submitted_at
        }
        
        result = check_duplicate(new_complaint_data, candidates)
        
        print(f"[DUPLICATE] Real result: isDuplicate={result['isDuplicate']}, topMatches count={len(result['topMatches'])}, topScore={result['topMatches'][0]['overallScore'] if result['topMatches'] else 0}")
        if result['topMatches']:
            print(f"[DUPLICATE] Top match details: {result['topMatches'][0]}")
        
        return {
            "success": True,
            "data": result
        }


    except Exception as e:
        print(f"[DUPLICATE] Error in check: {e}")
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
    Body: { newComplaintId, existingComplaintId, action: "merge"|"keep_separate"|"not_duplicate" }
    """
    try:
        valid_actions = ["merge", "keep_separate", "not_duplicate"]
        if request.action not in valid_actions:
            return {
                "success": False,
                "message": f"Invalid action '{request.action}'. Use one of: {', '.join(valid_actions)}"
            }

        # Update complaint duplicateStatus in MongoDB
        try:
            db = await get_db()
            if db is not None and request.newComplaintId:
                status_map = {
                    "merge": "MERGED",
                    "keep_separate": "KEPT_SEPARATE",
                    "not_duplicate": "NOT_DUPLICATE"
                }
                await db.complaints.update_one(
                    {"_id": request.newComplaintId},
                    {"$set": {"duplicateStatus": status_map.get(request.action, "NOT_DUPLICATE")}}
                )
        except Exception as e:
            print(f"[DUPLICATE] MongoDB update error in confirm: {e}")

        from services.duplicate_detector import confirm_duplicate
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
        print(f"[DUPLICATE] Error in confirm: {e}")
        return {
            "success": False,
            "message": "Could not process duplicate confirmation at this time."
        }


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "duplicate_detection",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/stats")
async def get_stats() -> Dict[str, Any]:
    """Returns: total_checked, duplicates_found_today, merge_rate."""
    try:
        db = await get_db()
        if db is None:
            return {
                "success": True,
                "data": {"total_checked": 0, "duplicates_found_today": 0, "merge_rate": 0.0}
            }

        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

        total_checked = await db.complaints.count_documents(
            {"duplicateStatus": {"$exists": True}}
        )
        duplicates_today = await db.complaints.count_documents(
            {"duplicateStatus": {"$in": ["MERGED", "POSSIBLE_DUPLICATE", "PROBABLE_DUPLICATE"]},
             "createdAt": {"$gte": today_start}}
        )
        merged = await db.complaints.count_documents({"duplicateStatus": "MERGED"})
        merge_rate = round(merged / max(total_checked, 1), 2)

        return {
            "success": True,
            "data": {
                "total_checked": total_checked,
                "duplicates_found_today": duplicates_today,
                "merge_rate": merge_rate
            }
        }
    except Exception as e:
        print(f"[DUPLICATE] Error in stats: {e}")
        return {
            "success": True,
            "data": {"total_checked": 0, "duplicates_found_today": 0, "merge_rate": 0.0}
        }
