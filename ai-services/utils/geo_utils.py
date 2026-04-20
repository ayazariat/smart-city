"""
Geographic Utilities
====================
Utility functions for geographic calculations and zone detection.
"""

import math
from typing import Optional


def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate the great circle distance between two points in meters.
    
    Args:
        lat1: Latitude of first point
        lng1: Longitude of first point
        lat2: Latitude of second point
        lng2: Longitude of second point
        
    Returns:
        Distance in meters
    """
    R = 6371000  # Earth's radius in meters
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    
    a = math.sin(delta_phi / 2) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


def calculate_geo_score(lat1: Optional[float], lng1: Optional[float],
                       lat2: Optional[float], lng2: Optional[float]) -> float:
    """
    Calculate geographic proximity score (0-1).
    
    Args:
        lat1, lng1: Coordinates of first point
        lat2, lng2: Coordinates of second point
        
    Returns:
        Score from 0 to 1
    """
    # If no coordinates, use municipality fallback
    if lat1 is None or lng1 is None or lat2 is None or lng2 is None:
        return 0.3  # Municipality match fallback
    
    distance = haversine(lat1, lng1, lat2, lng2)
    
    if distance < 50:
        return 1.0
    elif distance < 150:
        return 0.8
    elif distance < 300:
        return 0.5
    elif distance < 500:
        return 0.2
    else:
        return 0.0


def is_sensitive_zone(municipality: str, zone_type: str = None) -> bool:
    """
    Check if municipality has sensitive zones.
    
    Args:
        municipality: Municipality name
        zone_type: Specific zone type to check (optional)
        
    Returns:
        True if sensitive zone exists
    """
    from config.settings import SENSITIVE_ZONES
    
    if municipality not in SENSITIVE_ZONES:
        return False
    
    if zone_type is None:
        return True  # Any sensitive zone
    
    return zone_type in SENSITIVE_ZONES[municipality]


def get_zone_bonus(municipality: str) -> float:
    """
    Get urgency bonus for sensitive zones.
    
    Args:
        municipality: Municipality name
        
    Returns:
        Bonus score (0-0.1)
    """
    if is_sensitive_zone(municipality):
        return 0.10
    
    return 0.0


def validate_coordinates(lat: float, lng: float) -> bool:
    """
    Validate latitude and longitude values.
    
    Args:
        lat: Latitude
        lng: Longitude
        
    Returns:
        True if valid
    """
    return -90 <= lat <= 90 and -180 <= lng <= 180


def format_distance(meters: float) -> str:
    """
    Format distance for display.
    
    Args:
        meters: Distance in meters
        
    Returns:
        Formatted string
    """
    if meters < 1000:
        return f"{int(meters)}m"
    else:
        return f"{meters/1000:.1f}km"