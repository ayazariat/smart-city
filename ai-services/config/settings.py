"""
AI Services Configuration
==========================
Configuration settings for Smart City Tunisia AI services.
"""

# Service Configuration
AI_SERVICE_PORT = 8000

# Model Settings
MIN_TRAINING_SAMPLES = 20

# Duplicate Detection Thresholds
DUPLICATE_THRESHOLD_REVIEW = 0.55      # POSSIBLE_DUPLICATE
DUPLICATE_THRESHOLD_PROBABLE = 0.75    # PROBABLE_DUPLICATE

# Urgency Score Thresholds
URGENCY_THRESHOLDS = {
    "LOW": 0.25,
    "MEDIUM": 0.50,
    "HIGH": 0.75
}

# Category Base Urgency Scores
CATEGORY_BASE_SCORES = {
    "EAU": 0.7,           # Water leaks often critical
    "SECURITE": 0.75,     # Security issues
    "ROUTES": 0.5,
    "DECHETS": 0.4,       # Waste
    "ECLAIRAGE": 0.35,    # Lighting
    "BIENS_PUBLICS": 0.3, # Public property
    "AUTRE": 0.2          # Other
}

# Citizen Urgency Mapping (from user input to numeric score)
CITIZEN_URGENCY_MAP = {
    "LOW": 0.1,
    "MEDIUM": 0.35,
    "HIGH": 0.65,
    "URGENT": 0.9
}

# Feature Weights for Urgency Prediction
URGENCY_FEATURE_WEIGHTS = {
    "citizenUrgency": 0.30,  # Strongest single feature
    "textKeywords": 0.25,
    "categoryBase": 0.20,
    "communitySignal": 0.10,
    "timeFeatures": 0.10,
    "sensitiveZone": 0.05
}

# Critical Keywords (dangerous terms that raise urgency)
CRITICAL_KEYWORDS = [
    "inondation", "incendie", "accident", "électrocution", "explosion",
    "effondrement", "blessé", "mort", "urgence", "danger", "fuite gaz",
    "rupture", " effondrement", "urgence", "danger public"
]

HIGH_KEYWORDS = [
    "canalisation", "fuite eau", "panne totale", "route coupée",
    "décharge", "eau stagnante", "danger public"
]

MEDIUM_KEYWORDS = [
    "nid de poule", "lampadaire", "ordures", "dégradé", "cassé"
]

# Sensitive Zones (municipality → list of zone types)
SENSITIVE_ZONES = {
    "Béni Khiar": ["school_zone", "hospital_zone", "main_road"],
    "Sousse": ["school_zone", "hospital_zone", "main_road"],
    "Tunis": ["school_zone", "hospital_zone", "main_road"],
    "Sfax": ["school_zone", "hospital_zone"],
    "Kairouan": ["school_zone", "main_road"],
}

# Duplicate Detection Weights
DUPLICATE_WEIGHTS = {
    "textSimilarity": 0.40,
    "geographicProximity": 0.30,
    "categoryMatch": 0.20,
    "temporalProximity": 0.10
}

# Geographic Proximity Scoring (in meters)
GEO_PROXIMITY_DISTANCES = {
    "exact": 50,       # < 50m = 1.0
    "veryClose": 150,  # 50-150m = 0.8
    "close": 300,      # 150-300m = 0.5
    "near": 500,       # 300-500m = 0.2
    "far": 500         # > 500m = 0.0
}

# Related Categories for Duplicate Detection
RELATED_CATEGORIES = {
    "EAU": ["SECURITE"],
    "SECURITE": ["EAU", "ROUTES"],
    "ROUTES": ["BIENS_PUBLICS", "SECURITE"],
    "BIENS_PUBLICS": ["ROUTES"],
    "DECHETS": [],
    "ECLAIRAGE": [],
    "GREEN_SPACE": [],
    "OTHER": []
}

# Temporal Proximity Scoring (in days)
TEMPORAL_PROXIMITY = {
    "sameDay": 0,
    "veryClose": 3,
    "close": 7,
    "near": 14,
    "far": 14
}

# Trend Prediction Settings
TREND_MIN_HISTORY_DAYS = 30
TREND_FORECAST_DAYS = [7, 30]

# Seasonal Features
IS_SUMMER_MONTHS = [6, 7, 8]  # June-August
IS_RAINY_SEASON_MONTHS = [10, 11, 12, 1, 2, 3]  # October-March

# Ramadan dates (approximate - should be updated yearly)
RAMADAN_PERIODS = [
    {"start": "2024-03-10", "end": "2024-04-09"},
    {"start": "2025-02-28", "end": "2025-03-30"},
    {"start": "2026-02-17", "end": "2026-03-19"}
]

# Tunisian Public Holidays
TUNISIAN_HOLIDAYS = [
    "2024-01-01",  # New Year's Day
    "2024-01-14",  # Revolution Day
    "2024-03-20",  # Independence Day
    "2024-04-09",  # Martyrs' Day
    "2024-05-01",  # Labour Day
    "2024-06-25",  # Eid al-Fitr
    "2024-07-15",  # Eid al-Adha
    "2024-08-13",  # Women's Day
    "2024-09-15",  # Commemoration of Martyr Mohamed Ali
    "2024-10-15",  # Liberation Day
    "2024-11-07",  # Ch国庆
    "2024-12-17",  # Uprising Day
]

# Model Paths
MODEL_PATHS = {
    "urgency_model": "models/urgency_model.pkl",
    "urgency_vectorizer": "models/urgency_vectorizer.pkl",
    "duplicate_model": "models/duplicate_model.pkl",
    "trend_model": "models/trend_model.pkl"
}

# Data Paths
DATA_PATHS = {
    "training_cache": "data/training_cache.json",
    "predictions_cache": "data/predictions_cache.json",
    "history_cache": "data/history_cache.json"
}

# MongoDB Connection (for AI services)
MONGODB_URI = "mongodb://localhost:27017/smartcity"

# HTTP Timeout Settings (in seconds)
HTTP_TIMEOUT = {
    "urgency_predict": 5,
    "duplicate_check": 10,
    "trend_batch": 30
}

# Alert Severity Thresholds
ALERT_THRESHOLDS = {
    "RISING_TREND_THRESHOLD": 0.20,  # 20% increase
    "SPIKE_THRESHOLD": 2.0            # 2x daily average
}