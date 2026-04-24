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
DUPLICATE_THRESHOLD_REVIEW = 0.15
DUPLICATE_THRESHOLD_PROBABLE = 0.30

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
    # French
    "inondation", "incendie", "accident", "électrocution", "explosion",
    "effondrement", "blessé", "mort", "urgence", "danger", "fuite gaz",
    "rupture", "danger public",
    # Arabic
    "فيضان", "حريق", "حادث", "انهيار", "جريح", "وفاة", "خطر", "تسرب غاز", "طوارئ",
    # English
    "flood", "fire", "accident", "collapse", "injured", "death", "danger", "gas leak", "emergency",
    "explosion", "electrocution", "critical"
]

HIGH_KEYWORDS = [
    # French
    "canalisation", "fuite eau", "panne totale", "route coupée",
    "décharge", "eau stagnante", "égout bouché", "inondation", "fuite importante",
    "câble électrique", "poteau tombé", "chaussée effondrée",
    # Arabic
    "قناة مياه", "تسرب ماء", "انقطاع كامل", "طريق مغلق", "مياه راكدة",
    "مجرى مسدود", "كابل كهربائي", "عمود ساقط",
    # English
    "burst pipe", "total blackout", "road closed", "sewage overflow", "fallen pole",
    "collapsed road", "major leak"
]

MEDIUM_KEYWORDS = [
    # French
    "nid de poule", "lampadaire", "ordures", "dégradé", "cassé",
    "trottoir abîmé", "bac débordant", "feux de signalisation", "graffiti",
    "éclairage défaillant", "déchets accumulés",
    # Arabic
    "حفرة", "عمود إنارة", "نفايات", "تدهور", "مكسور",
    "رصيف تالف", "حاوية ممتلئة", "إشارات مرور", "نفايات متراكمة",
    # English
    "pothole", "streetlight", "garbage", "broken", "damaged",
    "cracked pavement", "overflowing bin", "graffiti", "littering"
]

# Category Keywords for better category prediction
CATEGORY_KEYWORDS = {
    "DECHETS": ["garbage", "waste", "bins", "ordures", "poubelle", "déchets", "نفايات", "قمامة", "زبالة"],
    "ROUTES": ["pothole", "road", "nid de poule", "route", "chaussée", "trottoir", "طريق", "حفرة", "رصيف"],
    "EAU": ["water", "fuite", "canalisation", "égout", "assainissement", "ماء", "تسرب", "مياه", "صرف"],
    "ECLAIRAGE": ["light", "lamp", "éclairage", "lampadaire", "ampoule", "نور", "إنارة", "مصباح"],
    "SECURITE": ["danger", "unsafe", "accident", "vol", "agression", "خطر", "حادث", "سرقة"],
    "BIENS_PUBLICS": ["graffiti", "damage", "vandalisme", "banc", "clôture", "تلف", "تخريب"],
    "AUTRE": []
}

# Sensitive Zones (municipality → list of zone types)
# Every municipality with school, hospital, or main road gets zone_bonus = 0.10
SENSITIVE_ZONES = {
    # Nabeul Governorate
    "Béni Khiar": ["school_zone", "hospital_zone", "main_road"],
    "Nabeul": ["school_zone", "hospital_zone", "main_road"],
    "Hammamet": ["school_zone", "hospital_zone", "main_road"],
    "Dar Chaâbane": ["school_zone", "main_road"],
    "Kélibia": ["school_zone", "hospital_zone", "main_road"],
    "Korba": ["school_zone", "main_road"],
    "Menzel Temime": ["school_zone", "hospital_zone"],
    "Grombalia": ["school_zone", "main_road"],
    "Soliman": ["school_zone", "main_road"],
    # Tunis Governorate
    "Tunis": ["school_zone", "hospital_zone", "main_road"],
    "La Marsa": ["school_zone", "hospital_zone", "main_road"],
    "Carthage": ["school_zone", "main_road"],
    "Le Bardo": ["school_zone", "hospital_zone", "main_road"],
    "Le Kram": ["school_zone", "main_road"],
    "La Goulette": ["school_zone", "main_road"],
    # Ariana Governorate
    "Ariana": ["school_zone", "hospital_zone", "main_road"],
    "La Soukra": ["school_zone", "main_road"],
    "Raoued": ["school_zone", "main_road"],
    "Mnihla": ["school_zone", "main_road"],
    # Ben Arous Governorate
    "Ben Arous": ["school_zone", "hospital_zone", "main_road"],
    "Hammam Lif": ["school_zone", "hospital_zone", "main_road"],
    "Hammam Chott": ["school_zone", "main_road"],
    "Radès": ["school_zone", "main_road"],
    "Mohamedia": ["school_zone", "main_road"],
    "Mégrine": ["school_zone", "main_road"],
    # Manouba Governorate
    "Manouba": ["school_zone", "hospital_zone", "main_road"],
    "Den Den": ["school_zone", "main_road"],
    "Douar Hicher": ["school_zone", "main_road"],
    # Sousse Governorate
    "Sousse": ["school_zone", "hospital_zone", "main_road"],
    "Msaken": ["school_zone", "hospital_zone", "main_road"],
    "Kalâa Kebira": ["school_zone", "main_road"],
    "Hammam Sousse": ["school_zone", "main_road"],
    "Akouda": ["school_zone", "main_road"],
    # Sfax Governorate
    "Sfax": ["school_zone", "hospital_zone", "main_road"],
    "Sakiet Ezzit": ["school_zone", "main_road"],
    "Sakiet Eddaïer": ["school_zone", "main_road"],
    "Thyna": ["school_zone", "main_road"],
    # Monastir Governorate
    "Monastir": ["school_zone", "hospital_zone", "main_road"],
    "Moknine": ["school_zone", "hospital_zone"],
    "Jemmal": ["school_zone", "main_road"],
    "Ksar Hellal": ["school_zone", "main_road"],
    # Mahdia Governorate
    "Mahdia": ["school_zone", "hospital_zone", "main_road"],
    "Ksour Essef": ["school_zone", "main_road"],
    # Kairouan Governorate
    "Kairouan": ["school_zone", "hospital_zone", "main_road"],
    # Bizerte Governorate
    "Bizerte": ["school_zone", "hospital_zone", "main_road"],
    "Menzel Bourguiba": ["school_zone", "hospital_zone"],
    # Gabès Governorate
    "Gabès": ["school_zone", "hospital_zone", "main_road"],
    # Médenine Governorate
    "Médenine": ["school_zone", "hospital_zone", "main_road"],
    "Djerba": ["school_zone", "hospital_zone", "main_road"],
    "Zarzis": ["school_zone", "main_road"],
    # Gafsa Governorate
    "Gafsa": ["school_zone", "hospital_zone", "main_road"],
    # Tozeur Governorate
    "Tozeur": ["school_zone", "hospital_zone", "main_road"],
    # Kébili Governorate
    "Kébili": ["school_zone", "hospital_zone"],
    # Kasserine Governorate
    "Kasserine": ["school_zone", "hospital_zone", "main_road"],
    # Sidi Bouzid Governorate
    "Sidi Bouzid": ["school_zone", "hospital_zone", "main_road"],
    # Béja Governorate
    "Béja": ["school_zone", "hospital_zone", "main_road"],
    # Jendouba Governorate
    "Jendouba": ["school_zone", "hospital_zone", "main_road"],
    # Le Kef Governorate
    "Le Kef": ["school_zone", "hospital_zone", "main_road"],
    # Siliana Governorate
    "Siliana": ["school_zone", "hospital_zone"],
    # Zaghouan Governorate
    "Zaghouan": ["school_zone", "hospital_zone"],
    # Tataouine Governorate
    "Tataouine": ["school_zone", "hospital_zone"],
}

# Duplicate Detection Weights
DUPLICATE_WEIGHTS = {
    "textSimilarity": 0.70,
    "geographicProximity": 0.15,
    "categoryMatch": 0.10,
    "temporalProximity": 0.05
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
TREND_MIN_HISTORY_DAYS = 10
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
MONGODB_URI = "mongodb://localhost:27017/smart-city"

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