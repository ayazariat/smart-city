"""
Trend Routes
============
FastAPI routes for trend prediction service (BL-37).
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


router = APIRouter()


class TrendBatchRequest(BaseModel):
    """Request model for batch trend prediction."""
    historicalData: List[Dict[str, Any]] = Field(
        ..., 
        description="List of {municipality, category, date, count} objects"
    )


class HistoricalEntry(BaseModel):
    """Single historical data entry."""
    municipality: str
    category: str
    date: str  # ISO date string
    count: int


class TrendBatchResponse(BaseModel):
    """Response model for trend batch."""
    processed: int
    alerts: int
    duration_ms: int
    predictions: List[Dict[str, Any]]
    allAlerts: List[Dict[str, Any]]


@router.post("/run-batch")
async def run_trend_batch_endpoint(request: TrendBatchRequest) -> Dict[str, Any]:
    """
    Run batch trend prediction for all municipality+category combinations.
    
    This endpoint is called by the backend cron job (e.g., at 02:00 daily).
    """
    try:
        from services.trend_predictor import run_trend_batch
        
        result = run_trend_batch(request.historicalData)
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/forecast")
async def get_forecast_endpoint(
    municipality: str = Query(..., description="Municipality name"),
    category: str = Query(..., description="Category code"),
    period: int = Query(7, description="Forecast period: 7 or 30 days")
) -> Dict[str, Any]:
    """
    Get cached forecast for a specific municipality+category.
    
    Returns cached prediction from the last batch run.
    """
    try:
        from services.trend_predictor import get_forecast
        
        forecast = get_forecast(municipality, category, period)
        
        if forecast is None:
            return {
                "success": False,
                "message": "No cached forecast available. Run batch prediction first.",
                "stale": True
            }
        
        return {
            "success": True,
            "data": forecast
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts")
async def get_alerts_endpoint() -> Dict[str, Any]:
    """Get all current alerts from the last batch run."""
    try:
        from services.trend_predictor import get_predictor
        
        predictor = get_predictor()
        
        if not predictor.predictions_cache:
            return {
                "success": False,
                "message": "No predictions available. Run batch first."
            }
        
        all_alerts = []
        for pred in predictor.predictions_cache.get("results", []):
            all_alerts.extend(pred.get("alerts", []))
        
        return {
            "success": True,
            "data": all_alerts,
            "generatedAt": predictor.predictions_cache.get("generatedAt")
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "trend_prediction",
        "timestamp": datetime.now().isoformat()
    }


@router.get("/model-info")
async def get_model_info() -> Dict[str, Any]:
    """Get information about the trend prediction service."""
    from config.settings import TREND_MIN_HISTORY_DAYS
    
    return {
        "service": "trend_prediction",
        "version": "1.0.0",
        "description": "Linear regression with seasonal features for short-term forecasting",
        "minHistoryDays": TREND_MIN_HISTORY_DAYS,
        "forecastPeriods": [7, 30]
    }