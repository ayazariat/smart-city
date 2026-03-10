"""
SLA Calculator Service
Calculates SLA deadlines based on urgency level and category
"""

import os
import json
from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="SLA Calculator AI Service")

# SLA deadlines in hours by urgency level (as per task requirements)
SLA_DEADLINES = {
    "CRITICAL": 8,     # 8 hours
    "HIGH": 48,         # 48 hours (2 days)
    "MEDIUM": 168,     # 168 hours (7 days)
    "LOW": 336,        # 336 hours (14 days)
}

# Category-specific adjustments (multiply base SLA by this factor)
CATEGORY_ADJUSTMENTS = {
    "ROUTES": 1.0,       # Standard
    "DECHETS": 0.75,     # 25% less time (faster for health)
    "EAU": 0.5,         # 50% less time (critical infrastructure)
    "ECLAIRAGE": 1.0,   # Standard
    "SECURITE": 0.5,    # 50% less time (safety critical)
    "BIENS_PUBLICS": 1.5, # 50% more time (lower priority)
    "AUTRE": 1.0,       # Standard
}

# Default fallback
DEFAULT_SLA = 168  # 7 days

# Status thresholds (percentage of time used)
AT_RISK_THRESHOLD = 75  # At risk when 75% of time used


class SLARequest(BaseModel):
    urgency: str  # CRITICAL, HIGH, MEDIUM, LOW
    category: str = "AUTRE"
    created_at: Optional[str] = None  # ISO format, defaults to now


class SLAResponse(BaseModel):
    deadline: str  # ISO format datetime
    status: str    # ON_TRACK, AT_RISK, OVERDUE
    remaining_hours: float
    total_hours: float


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


def calculate_sla_hours(urgency: str, category: str) -> float:
    """Calculate SLA hours based on urgency and category"""
    # Get base hours from urgency
    base_hours = SLA_DEADLINES.get(urgency.upper(), DEFAULT_SLA)
    
    # Apply category adjustment
    adjustment = CATEGORY_ADJUSTMENTS.get(category.upper(), 1.0)
    
    # Calculate final SLA
    final_sla = base_hours * adjustment
    
    return final_sla


def get_status(remaining_hours: float, total_hours: float) -> str:
    """Determine SLA status based on remaining time"""
    if remaining_hours <= 0:
        return "OVERDUE"
    
    # Calculate percentage used
    percentage_used = ((total_hours - remaining_hours) / total_hours) * 100
    
    if percentage_used >= AT_RISK_THRESHOLD:
        return "AT_RISK"
    
    return "ON_TRACK"


@app.post("/ai/calculate-sla", response_model=SLAResponse)
async def calculate_sla(request: SLARequest):
    """
    Calculate SLA deadline based on urgency level and category
    
    Returns:
    - deadline: ISO format datetime when SLA expires
    - status: ON_TRACK, AT_RISK, or OVERDUE
    - remaining_hours: Hours remaining until deadline
    - total_hours: Total SLA hours for this complaint
    """
    try:
        # Parse created_at or use current time
        if request.created_at:
            created_at = datetime.fromisoformat(request.created_at.replace('Z', '+00:00'))
        else:
            created_at = datetime.utcnow()
        
        # Calculate SLA hours
        total_hours = calculate_sla_hours(request.urgency, request.category)
        
        # Calculate deadline
        deadline = created_at + timedelta(hours=total_hours)
        
        # Calculate remaining time
        now = datetime.utcnow()
        remaining = deadline - now
        remaining_hours = remaining.total_seconds() / 3600
        
        # Determine status
        status = get_status(remaining_hours, total_hours)
        
        return SLAResponse(
            deadline=deadline.isoformat(),
            status=status,
            remaining_hours=round(remaining_hours, 2),
            total_hours=round(total_hours, 2)
        )
        
    except Exception as e:
        print(f"Error in calculate_sla: {e}")
        # Return fallback on error
        now = datetime.utcnow()
        fallback_deadline = now + timedelta(hours=DEFAULT_SLA)
        return SLAResponse(
            deadline=fallback_deadline.isoformat(),
            status="ON_TRACK",
            remaining_hours=DEFAULT_SLA,
            total_hours=DEFAULT_SLA
        )


@app.get("/ai/sla-matrix")
async def get_sla_matrix():
    """Get the full SLA matrix for reference"""
    matrix = {}
    for urgency, hours in SLA_DEADLINES.items():
        matrix[urgency] = {}
        for category, adjustment in CATEGORY_ADJUSTMENTS.items():
            total = hours * adjustment
            matrix[urgency][category] = {
                "hours": total,
                "days": round(total / 24, 1)
            }
    
    return {
        "matrix": matrix,
        "at_risk_threshold": f"{AT_RISK_THRESHOLD}% of time elapsed"
    }


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8002))  # Different port
    uvicorn.run(app, host=host, port=port)
