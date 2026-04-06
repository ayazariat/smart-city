"""
Urgency Prediction Service (BL-24)
===================================
Predict urgency level (LOW/MEDIUM/HIGH/CRITICAL) at complaint submission time.
"""

from typing import Optional, Dict, Any
from datetime import datetime

# Try importing sklearn, but don't fail if not available
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    import joblib
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

from utils.text_preprocessor import (
    clean_text, 
    combine_fields, 
    extract_keywords_by_level,
    calculate_keyword_score
)
from utils.geo_utils import get_zone_bonus
from config.settings import (
    CATEGORY_BASE_SCORES,
    CITIZEN_URGENCY_MAP,
    URGENCY_THRESHOLDS,
    URGENCY_FEATURE_WEIGHTS,
    MIN_TRAINING_SAMPLES
)


class UrgencyPredictor:
    """Predict urgency level for complaints."""
    
    def __init__(self):
        self.model = None
        self.vectorizer = None
        self._load_models()
    
    def _load_models(self):
        """Load trained models if they exist."""
        if not SKLEARN_AVAILABLE:
            return
        try:
            from utils.model_manager import load_model
            self.model = load_model("urgency_model.pkl")
            self.vectorizer = load_model("urgency_vectorizer.pkl")
        except Exception:
            pass
    
    def _calculate_rule_based_score(self, title: str, description: str, 
                                     category: str, citizen_urgency: str,
                                     municipality: str, confirmation_count: int,
                                     submitted_at: datetime) -> Dict[str, Any]:
        """
        Calculate urgency score using rule-based approach.
        Used as fallback when no trained model exists.
        """
        text = combine_fields(title, description)
        text_score = calculate_keyword_score(text)
        
        keywords = extract_keywords_by_level(text)
        
        category_score = CATEGORY_BASE_SCORES.get(category.upper(), 0.3)
        
        citizen_score = CITIZEN_URGENCY_MAP.get(citizen_urgency.upper(), 0.2)
        
        community_score = min(confirmation_count / 20, 1.0)
        
        time_score = self._calculate_time_score(submitted_at)
        
        zone_bonus = get_zone_bonus(municipality)
        
        final_score = (
            text_score * URGENCY_FEATURE_WEIGHTS["textKeywords"] +
            citizen_score * URGENCY_FEATURE_WEIGHTS["citizenUrgency"] +
            category_score * URGENCY_FEATURE_WEIGHTS["categoryBase"] +
            community_score * URGENCY_FEATURE_WEIGHTS["communitySignal"] +
            time_score * URGENCY_FEATURE_WEIGHTS["timeFeatures"] +
            zone_bonus * URGENCY_FEATURE_WEIGHTS["sensitiveZone"]
        )
        
        # Ensure score is between 0 and 1
        final_score = max(0, min(1, final_score))
        
        predicted_urgency = self._score_to_urgency(final_score)
        
        return {
            "predictedUrgency": predicted_urgency,
            "confidenceScore": 0.65,  # Lower confidence for rule-based
            "breakdown": {
                "textScore": round(text_score, 3),
                "citizenUrgencyScore": round(citizen_score, 3),
                "categoryBaseScore": round(category_score, 3),
                "communityScore": round(community_score, 3),
                "timeScore": round(time_score, 3),
                "sensitiveZoneBonus": round(zone_bonus, 3),
                "keywordsDetected": keywords["critical"] + keywords["high"] + keywords["medium"],
                "citizenUrgencyInput": citizen_urgency.upper()
            },
            "isRuleBased": True
        }
    
    def _calculate_time_score(self, submitted_at: datetime) -> float:
        """Calculate urgency bonus based on submission time."""
        score = 0.0
        
        hour = submitted_at.hour
        
        # Night submissions (9pm - 6am) get slight boost
        if hour >= 21 or hour < 6:
            score += 0.05
        
        # Weekend submissions
        if submitted_at.weekday() >= 5:
            score += 0.03
        
        return score
    
    def _score_to_urgency(self, score: float) -> str:
        """Convert numerical score to urgency level."""
        if score < URGENCY_THRESHOLDS["LOW"]:
            return "LOW"
        elif score < URGENCY_THRESHOLDS["MEDIUM"]:
            return "MEDIUM"
        elif score < URGENCY_THRESHOLDS["HIGH"]:
            return "HIGH"
        else:
            return "CRITICAL"
    
    def _generate_explanation(self, prediction: Dict[str, Any]) -> str:
        """Generate human-readable explanation of prediction."""
        parts = []
        
        breakdown = prediction.get("breakdown", {})
        keywords = breakdown.get("keywordsDetected", [])
        
        urgency = prediction["predictedUrgency"]
        
        parts.append(f"{urgency} urgency predicted based on:")
        
        if breakdown.get("citizenUrgencyInput"):
            parts.append(f"citizen flagged {breakdown['citizenUrgencyInput']}")
        
        if keywords:
            keyword_str = ", ".join(keywords[:3])
            parts.append(f"keywords detected: {keyword_str}")
        
        category_score = breakdown.get("categoryBaseScore", 0)
        if category_score >= 0.6:
            parts.append(f"{category_score:.0%} category risk")
        
        return " ".join(parts)
    
    def predict(self, title: str, description: str, category: str,
                citizen_urgency: str, municipality: str,
                latitude: Optional[float] = None, longitude: Optional[float] = None,
                confirmation_count: int = 0,
                submitted_at: Optional[datetime] = None) -> Dict[str, Any]:
        """
        Predict urgency level for a complaint.
        
        Args:
            title: Complaint title
            description: Complaint description
            category: Category code
            citizen_urgency: User-selected urgency (LOW/MEDIUM/HIGH/URGENT)
            municipality: Municipality name
            latitude, longitude: Optional coordinates
            confirmation_count: Number of confirmations
            submitted_at: Submission timestamp
            
        Returns:
            Prediction result dictionary
        """
        if submitted_at is None:
            submitted_at = datetime.now()
        
        # Use rule-based approach if no trained model
        if self.model is None or self.vectorizer is None:
            result = self._calculate_rule_based_score(
                title, description, category, citizen_urgency,
                municipality, confirmation_count, submitted_at
            )
            result["explanation"] = self._generate_explanation(result)
            result["agentOverrideAllowed"] = True
            return result
        
        # ML-based prediction (future enhancement)
        # For now, fall back to rule-based
        result = self._calculate_rule_based_score(
            title, description, category, citizen_urgency,
            municipality, confirmation_count, submitted_at
        )
        result["explanation"] = self._generate_explanation(result)
        result["agentOverrideAllowed"] = True
        
        return result
    
    def train(self, training_data: list) -> Dict[str, Any]:
        """
        Train or retrain the urgency model.
        
        Args:
            training_data: List of training samples with features and labels
            
        Returns:
            Training result
        """
        if len(training_data) < MIN_TRAINING_SAMPLES:
            return {
                "success": False,
                "message": f"Not enough samples. Need {MIN_TRAINING_SAMPLES}, got {len(training_data)}"
            }
        
        if not SKLEARN_AVAILABLE:
            return {
                "success": False,
                "message": "scikit-learn not available"
            }
        
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.linear_model import LogisticRegression
            from utils.model_manager import save_model
            
            texts = [combine_fields(d["title"], d["description"]) for d in training_data]
            labels = [d["finalUrgency"] for d in training_data]
            
            # Create and fit vectorizer
            self.vectorizer = TfidfVectorizer(max_features=500, ngram_range=(1, 2))
            X = self.vectorizer.fit_transform(texts)
            
            # Train model
            self.model = LogisticRegression(max_iter=1000, random_state=42)
            self.model.fit(X, labels)
            
            # Save models
            save_model(self.model, "urgency_model.pkl")
            save_model(self.vectorizer, "urgency_vectorizer.pkl")
            
            return {
                "success": True,
                "samples": len(training_data),
                "accuracy": self.model.score(X, labels)
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": str(e)
            }


# Singleton instance
_predictor = None


def get_predictor() -> UrgencyPredictor:
    """Get singleton predictor instance."""
    global _predictor
    if _predictor is None:
        _predictor = UrgencyPredictor()
    return _predictor


def predict_urgency(**kwargs) -> Dict[str, Any]:
    """Convenience function for prediction."""
    return get_predictor().predict(**kwargs)


def train_urgency_model(training_data: list) -> Dict[str, Any]:
    """Convenience function for training."""
    return get_predictor().train(training_data)