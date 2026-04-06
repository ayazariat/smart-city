"""
Trend Prediction Service (BL-37)
==================================
Forecast complaint volumes by category and municipality for the next 7 and 30 days.
Runs as a nightly batch job.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import numpy as np
from collections import defaultdict

from config.settings import (
    TREND_MIN_HISTORY_DAYS,
    TREND_FORECAST_DAYS,
    IS_SUMMER_MONTHS,
    IS_RAINY_SEASON_MONTHS,
    ALERT_THRESHOLDS
)


class TrendPredictor:
    """Predict complaint trends for municipalities and categories."""
    
    def __init__(self):
        self.predictions_cache = {}
    
    def _get_seasonal_features(self, date: datetime) -> Dict[str, Any]:
        """Extract seasonal features from date."""
        month = date.month
        
        return {
            "month": month,
            "week_of_year": date.isocalendar()[1],
            "day_of_week": date.weekday(),
            "is_weekend": date.weekday() >= 5,
            "is_summer": month in IS_SUMMER_MONTHS,
            "is_rainy_season": month in IS_RAINY_SEASON_MONTHS,
            "is_ramadan": self._is_ramadan(date),
            "is_holiday": self._is_holiday(date)
        }
    
    def _is_ramadan(self, date: datetime) -> bool:
        """Check if date falls in Ramadan (approximate)."""
        from config.settings import RAMADAN_PERIODS
        
        date_str = date.strftime("%Y-%m-%d")
        
        for period in RAMADAN_PERIODS:
            if period["start"] <= date_str <= period["end"]:
                return True
        
        return False
    
    def _is_holiday(self, date: datetime) -> bool:
        """Check if date is a Tunisian public holiday."""
        tunisian_holidays = [
            "01-01",  # New Year
            "01-14",  # Revolution
            "03-20",  # Independence
            "04-09",  # Martyrs
            "05-01",  # Labour
            "08-13",  # Women
            "10-15",  # Liberation
            "11-07",  # Ch国庆
            "12-17"   # Uprising
        ]
        
        date_str = date.strftime("%m-%d")
        return date_str in tunisian_holidays
    
    def _calculate_moving_average(self, data: List[float], window: int = 7) -> List[float]:
        """Calculate moving average."""
        if len(data) < window:
            return data
        
        result = []
        for i in range(len(data)):
            start = max(0, i - window + 1)
            result.append(np.mean(data[start:i+1]))
        
        return result
    
    def _detect_outliers(self, data: List[float]) -> List[int]:
        """Detect outliers (>3x moving average)."""
        if len(data) < 7:
            return []
        
        moving_avg = self._calculate_moving_average(data, 7)
        outliers = []
        
        for i in range(7, len(data)):
            avg = moving_avg[i]
            if avg > 0 and data[i] > avg * 3:
                outliers.append(i)
        
        return outliers
    
    def _linear_regression_forecast(self, daily_counts: List[int], days_ahead: int) -> Dict[str, Any]:
        """Simple linear regression for short-term forecast."""
        n = len(daily_counts)
        x = list(range(n))
        y = daily_counts
        
        # Calculate means
        x_mean = sum(x) / n
        y_mean = sum(y) / n
        
        # Calculate slope and intercept
        numerator = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
        
        if denominator == 0:
            slope = 0
        else:
            slope = numerator / denominator
        
        intercept = y_mean - slope * x_mean
        
        # Forecast
        forecast = [max(0, int(intercept + slope * (n + i))) for i in range(days_ahead)]
        
        return {
            "expectedTotal": sum(forecast),
            "dailyForecast": forecast,
            "trend": "INCREASING" if slope > 0.1 else "DECREASING" if slope < -0.1 else "STABLE"
        }
    
    def _calculate_change_percentage(self, forecast: List[int], historical_avg: float) -> str:
        """Calculate percentage change vs historical average."""
        if historical_avg == 0:
            return "+0%"
        
        forecast_avg = sum(forecast) / len(forecast)
        change = ((forecast_avg - historical_avg) / historical_avg) * 100
        
        sign = "+" if change >= 0 else ""
        return f"{sign}{int(change)}%"
    
    def _generate_alerts(self, municipality: str, category: str,
                          forecast_7d: Dict, historical_avg: float) -> List[Dict]:
        """Generate alerts based on forecast."""
        alerts = []
        
        expected = forecast_7d.get("expectedTotal", 0)
        trend = forecast_7d.get("trend", "STABLE")
        
        # Rising trend alert
        if trend == "INCREASING" and historical_avg > 0:
            change_pct = ((expected / 7) - historical_avg) / historical_avg * 100
            if change_pct > ALERT_THRESHOLDS["RISING_TREND_THRESHOLD"] * 100:
                alerts.append({
                    "type": "RISING_TREND",
                    "severity": "HIGH",
                    "message": f"{category} complaints expected to rise {int(change_pct)}% next week in {municipality}",
                    "recommendation": "Consider allocating extra resources"
                })
        
        # Spike prediction
        daily = forecast_7d.get("dailyForecast", [])
        if daily and historical_avg > 0:
            peak = max(daily)
            if peak > historical_avg * ALERT_THRESHOLDS["SPIKE_THRESHOLD"]:
                alerts.append({
                    "type": "SPIKE_PREDICTED",
                    "severity": "MEDIUM",
                    "message": f"Peak of {peak} complaints expected on {daily.index(peak) + 1} day(s) in {municipality}",
                    "recommendation": "Plan for high volume"
                })
        
        return alerts
    
    def _create_prediction(self, municipality: str, category: str,
                            daily_counts: List[int]) -> Dict[str, Any]:
        """Create a complete prediction for municipality+category."""
        if len(daily_counts) < TREND_MIN_HISTORY_DAYS:
            return {
                "municipality": municipality,
                "category": category,
                "status": "insufficient_data",
                "message": f"Not enough history. Need {TREND_MIN_HISTORY_DAYS} days, have {len(daily_counts)}",
                "dataQuality": "INSUFFICIENT"
            }
        
        # Calculate historical average
        historical_avg = sum(daily_counts) / len(daily_counts)
        
        # 7-day forecast
        forecast_7d = self._linear_regression_forecast(daily_counts, 7)
        change_7d = self._calculate_change_percentage(forecast_7d["dailyForecast"], historical_avg)
        
        # 30-day forecast
        forecast_30d = self._linear_regression_forecast(daily_counts, 30)
        change_30d = self._calculate_change_percentage(forecast_30d["dailyForecast"], historical_avg)
        
        # Calculate confidence interval (simple std dev approach)
        std_dev = np.std(daily_counts) if len(daily_counts) > 1 else 1
        confidence_low = max(0, int(forecast_7d["expectedTotal"] - std_dev * 1.5))
        confidence_high = int(forecast_7d["expectedTotal"] + std_dev * 1.5)
        
        # Generate alerts
        alerts = self._generate_alerts(municipality, category, forecast_7d, historical_avg / 7)
        
        # Determine data quality
        outliers = self._detect_outliers(daily_counts)
        data_quality = "GOOD" if len(outliers) < len(daily_counts) * 0.1 else "NEEDS_CLEANING"
        
        return {
            "municipality": municipality,
            "category": category,
            "generatedAt": datetime.now().isoformat(),
            "forecast7Days": {
                "expectedTotal": forecast_7d["expectedTotal"],
                "dailyForecast": forecast_7d["dailyForecast"],
                "changeVsLastWeek": change_7d,
                "trend": forecast_7d["trend"],
                "confidenceInterval": {
                    "low": confidence_low,
                    "high": confidence_high
                }
            },
            "forecast30Days": {
                "expectedTotal": forecast_30d["expectedTotal"],
                "changeVsLastMonth": change_30d,
                "trend": forecast_30d["trend"]
            },
            "alerts": alerts,
            "historicalAvg7Days": round(historical_avg / 7, 1),
            "dataQuality": data_quality
        }
    
    def run_batch(self, historical_data: List[Dict]) -> Dict[str, Any]:
        """
        Run batch prediction for all municipality+category combinations.
        
        Args:
            historical_data: List of {municipality, category, date, count} objects
            
        Returns:
            Batch results summary
        """
        start_time = datetime.now()
        
        # Group data by municipality + category
        grouped = defaultdict(lambda: defaultdict(list))
        
        for entry in historical_data:
            municipality = entry.get("municipality", "UNKNOWN")
            category = entry.get("category", "UNKNOWN")
            date = entry.get("date", "")
            count = entry.get("count", 0)
            
            grouped[municipality][category].append({
                "date": date,
                "count": count
            })
        
        # Sort by date and extract counts
        results = []
        alerts = []
        
        for municipality, categories in grouped.items():
            for category, entries in categories.items():
                # Sort by date
                entries.sort(key=lambda x: x.get("date", ""))
                
                # Extract counts
                daily_counts = [e["count"] for e in entries]
                
                # Create prediction
                prediction = self._create_prediction(municipality, category, daily_counts)
                
                if prediction.get("status") != "insufficient_data":
                    results.append(prediction)
                    alerts.extend(prediction.get("alerts", []))
        
        end_time = datetime.now()
        duration_ms = int((end_time - start_time).total_seconds() * 1000)
        
        # Cache results
        self.predictions_cache = {
            "results": results,
            "generatedAt": start_time.isoformat(),
            "duration_ms": duration_ms
        }
        
        return {
            "processed": len(results),
            "alerts": len(alerts),
            "duration_ms": duration_ms,
            "predictions": results[:5],  # Return first 5 for summary
            "allAlerts": alerts
        }
    
    def get_forecast(self, municipality: str, category: str, 
                     period: int = 7) -> Optional[Dict[str, Any]]:
        """
        Get cached forecast for municipality+category.
        
        Args:
            municipality: Municipality name
            category: Category code
            period: 7 or 30 days
            
        Returns:
            Cached prediction or None
        """
        if not self.predictions_cache:
            return None
        
        for pred in self.predictions_cache.get("results", []):
            if pred.get("municipality") == municipality and pred.get("category") == category:
                if period == 7:
                    return pred.get("forecast7Days")
                else:
                    return pred.get("forecast30Days")
        
        return None


# Singleton instance
_predictor = None


def get_predictor() -> TrendPredictor:
    """Get singleton predictor instance."""
    global _predictor
    if _predictor is None:
        _predictor = TrendPredictor()
    return _predictor


def run_trend_batch(historical_data: List[Dict]) -> Dict[str, Any]:
    """Convenience function for running batch prediction."""
    return get_predictor().run_batch(historical_data)


def get_forecast(municipality: str, category: str, period: int = 7) -> Optional[Dict]:
    """Convenience function for getting cached forecast."""
    return get_predictor().get_forecast(municipality, category, period)