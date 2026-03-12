"""
SLA Calculator Service
======================

Calculates SLA deadlines based on urgency and category.
- CRITICAL = 8 hours
- HIGH = 48 hours
- MEDIUM = 168 hours (7 days)
- LOW = 336 hours (14 days)

Returns deadline, status, and remaining hours.
"""

import json
from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Initialize FastAPI app
app = FastAPI(title="SLA Calculator Service")

# SLA hours by urgency level
SLA_HOURS = {
    "URGENT": 8,     # 8 hours
    "HIGH": 48,      # 2 days
    "MEDIUM": 168,   # 7 days
    "LOW": 336,      # 14 days
}

# SLA hours by category (can override urgency)
CATEGORY_SLA_HOURS = {
    "SAFETY": {
        "URGENT": 4,
        "HIGH": 24,
        "MEDIUM": 72,
        "LOW": 168,
    },
    "WATER": {
        "URGENT": 4,
        "HIGH": 24,
        "MEDIUM": 72,
        "LOW": 168,
    },
    "LIGHTING": {
        "URGENT": 8,
        "HIGH": 48,
        "MEDIUM": 120,
        "LOW": 240,
    }
}


class SLACalculationRequest(BaseModel):
    urgency: str  # URGENT, HIGH, MEDIUM, LOW
    category: Optional[str] = None
    createdAt: Optional[str] = None  # ISO date string, defaults to now


class SLACalculationResponse(BaseModel):
    deadline: str  # ISO date string
    status: str    # ON_TRACK, AT_RISK, OVERDUE
    remaining_h: float
    urgency: str
    hours_allocated: int


def calculate_sla(
    urgency: str,
    category: Optional[str] = None,
    created_at: Optional[datetime] = None
) -> SLACalculationResponse:
    """
    Calculate SLA deadline based on urgency and category.
    """
    # Normalize urgency
    urgency = urgency.upper()
    if urgency not in SLA_HOURS:
        urgency = "MEDIUM"  # Default
    
    # Determine hours based on category
    hours = SLA_HOURS.get(urgency, 168)
    
    # Check for category-specific overrides
    if category and category.upper() in CATEGORY_SLA_HOURS:
        category_urgency_hours = CATEGORY_SLA_HOURS[category.upper()]
        if urgency in category_urgency_hours:
            hours = category_urgency_hours[urgency]
    
    # Use provided timestamp or now
    if created_at is None:
        created_at = datetime.utcnow()
    
    # Calculate deadline
    deadline = created_at + timedelta(hours=hours)
    
    # Calculate remaining time
    now = datetime.utcnow()
    remaining = deadline - now
    remaining_h = remaining.total_seconds() / 3600
    
    # Determine status
    if remaining_h <= 0:
        status = "OVERDUE"
    elif remaining_h < 6:  # Less than 6 hours
        status = "AT_RISK"
    else:
        status = "ON_TRACK"
    
    return SLACalculationResponse(
        deadline=deadline.isoformat() + "Z",
        status=status,
        remaining_h=round(remaining_h, 2),
        urgency=urgency,
        hours_allocated=hours
    )


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "sla-calculator"}


@app.post("/calculate", response_model=SLACalculationResponse)
async def calculate_sla_endpoint(request: SLACalculationRequest):
    """
    Calculate SLA deadline based on urgency and category.
    
    - **urgency**: URGENT, HIGH, MEDIUM, or LOW
    - **category**: Optional category for category-specific SLA
    - **createdAt**: Optional creation timestamp (ISO format)
    """
    # Parse createdAt if provided
    created_at = None
    if request.createdAt:
        try:
            created_at = datetime.fromisoformat(request.createdAt.replace("Z", "+00:00"))
        except ValueError:
            pass
    
    result = calculate_sla(request.urgency, request.category, created_at)
    return result


@app.get("/urgency-levels")
async def get_urgency_levels():
    """Get all available urgency levels and their SLA hours"""
    return {
        "levels": SLA_HOURS,
        "category_overrides": CATEGORY_SLA_HOURS
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
