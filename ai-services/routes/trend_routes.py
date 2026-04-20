"""
Trend Routes
============
FastAPI routes for trend prediction service (BL-37).
"""

from fastapi import APIRouter, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from collections import defaultdict
from utils.db import get_db


router = APIRouter()


async def _fetch_historical_data(db, days_back: int = 90) -> List[Dict]:
    """Aggregate complaints by municipality + category + date from MongoDB."""
    try:
        cutoff = datetime.utcnow() - timedelta(days=days_back)
        pipeline = [
            {"$match": {"createdAt": {"$gte": cutoff}}},
            {"$group": {
                "_id": {
                    "municipality": "$municipalityName",
                    "category": "$category",
                    "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}}
                },
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id.date": 1}}
        ]
        results = []
        async for doc in db.complaints.aggregate(pipeline):
            results.append({
                "municipality": doc["_id"]["municipality"],
                "category": doc["_id"]["category"],
                "date": doc["_id"]["date"],
                "count": doc["count"]
            })
        return results
    except Exception as e:
        print(f"[TREND] Error fetching historical data: {e}")
        return []


async def _save_predictions(db, batch_result: Dict) -> None:
    """Save prediction results to MongoDB ai_trend_predictions collection."""
    try:
        if db is None:
            return
        col = db.ai_trend_predictions
        now = datetime.utcnow()
        # Upsert each prediction
        for pred in batch_result.get("predictions", []) + batch_result.get("_all_results", []):
            await col.update_one(
                {"municipality": pred.get("municipality"), "category": pred.get("category")},
                {"$set": {**pred, "updatedAt": now}},
                upsert=True
            )
        # Save batch summary
        await col.update_one(
            {"_type": "batch_summary"},
            {"$set": {
                "_type": "batch_summary",
                "processed": batch_result.get("processed", 0),
                "alerts": batch_result.get("alerts", 0),
                "duration_ms": batch_result.get("duration_ms", 0),
                "generatedAt": now
            }},
            upsert=True
        )
    except Exception as e:
        print(f"[TREND] Error saving predictions: {e}")


@router.post("/run-batch")
async def run_trend_batch_endpoint() -> Dict[str, Any]:
    """
    Run batch trend prediction. Fetches historical data from MongoDB directly.
    Called by backend cron job (e.g., at 02:00 daily).
    """
    try:
        from services.trend_predictor import run_trend_batch

        db = await get_db()
        if db is None:
            return {
                "success": True,
                "data": {
                    "status": "collecting_data",
                    "processed": 0, "alerts": 0, "duration_ms": 0,
                    "predictions": [], "allAlerts": [],
                    "message": "MongoDB unavailable. Cannot fetch historical data."
                }
            }

        historical_data = await _fetch_historical_data(db, days_back=90)

        if len(historical_data) < 5:
            return {
                "success": True,
                "data": {
                    "status": "collecting_data",
                    "processed": 0, "alerts": 0, "duration_ms": 0,
                    "predictions": [], "allAlerts": [],
                    "message": f"Only {len(historical_data)} data points found. Need at least 5 to generate predictions."
                }
            }

        result = run_trend_batch(historical_data)

        # Save predictions to MongoDB
        await _save_predictions(db, result)

        return {
            "success": True,
            "data": result
        }

    except Exception as e:
        print(f"[TREND] Error in run-batch: {e}")
        return {
            "success": True,
            "data": {
                "processed": 0, "alerts": 0, "duration_ms": 0,
                "predictions": [], "allAlerts": [],
                "message": "Batch processing failed. Will retry on next schedule."
            }
        }


@router.get("/forecast")
async def get_forecast_endpoint(
    municipality: str = Query("", description="Municipality name"),
    category: str = Query("", description="Category code"),
    period: int = Query(7, description="Forecast period: 7 or 30 days")
) -> Dict[str, Any]:
    """
    Get cached prediction from MongoDB ai_trend_predictions collection.
    If prediction older than 24h, returns it with stale: true.
    """
    try:
        # Try MongoDB first
        db = await get_db()
        if db is not None:
            query = {"_type": {"$exists": False}}
            if municipality:
                query["municipality"] = municipality
            if category:
                query["category"] = category

            prediction = await db.ai_trend_predictions.find_one(
                query, sort=[("updatedAt", -1)]
            )
            if prediction:
                prediction.pop("_id", None)
                stale = False
                updated_at = prediction.get("updatedAt") or prediction.get("generatedAt")
                if updated_at:
                    if isinstance(updated_at, str):
                        try:
                            updated_at = datetime.fromisoformat(updated_at)
                        except Exception:
                            updated_at = None
                    if updated_at and (datetime.utcnow() - updated_at) > timedelta(hours=24):
                        stale = True

                forecast_key = "forecast7Days" if period == 7 else "forecast30Days"
                forecast_data = prediction.get(forecast_key, prediction)

                return {
                    "success": True,
                    "data": forecast_data,
                    "stale": stale,
                    "generatedAt": prediction.get("generatedAt")
                }

        # Fallback to in-memory cache
        from services.trend_predictor import get_forecast
        forecast = get_forecast(municipality, category, period)

        if forecast is None:
            return {
                "success": True,
                "data": {"status": "no_data", "message": "Run batch first."},
                "stale": True
            }

        return {
            "success": True,
            "data": forecast
        }

    except Exception as e:
        print(f"[TREND] Error in forecast: {e}")
        return {
            "success": True,
            "data": {"status": "no_data", "message": "Unable to retrieve forecast."},
            "stale": True
        }


@router.get("/alerts")
async def get_alerts_endpoint() -> Dict[str, Any]:
    """Returns all HIGH severity alerts from latest batch, sorted by severity DESC."""
    try:
        all_alerts = []
        generated_at = None

        # Try MongoDB first
        db = await get_db()
        if db is not None:
            cursor = db.ai_trend_predictions.find(
                {"alerts": {"$exists": True, "$ne": []}, "_type": {"$exists": False}}
            )
            async for doc in cursor:
                for alert in doc.get("alerts", []):
                    alert["municipality"] = doc.get("municipality", "")
                    alert["category"] = doc.get("category", "")
                    all_alerts.append(alert)
                if not generated_at:
                    generated_at = doc.get("generatedAt")

        # Fallback to in-memory cache
        if not all_alerts:
            from services.trend_predictor import get_predictor
            predictor = get_predictor()
            if predictor.predictions_cache:
                for pred in predictor.predictions_cache.get("results", []):
                    all_alerts.extend(pred.get("alerts", []))
                generated_at = predictor.predictions_cache.get("generatedAt")

        # Sort: HIGH first, then MEDIUM, then LOW
        severity_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        all_alerts.sort(key=lambda a: severity_order.get(a.get("severity", "LOW"), 2))

        return {
            "success": True,
            "data": all_alerts,
            "generatedAt": generated_at
        }

    except Exception as e:
        print(f"[TREND] Error in alerts: {e}")
        return {
            "success": True,
            "data": [],
            "message": "Unable to retrieve alerts"
        }


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
