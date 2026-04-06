"""
Text Preprocessing Utilities
============================
Utility functions for text cleaning and preprocessing.
"""

import re
import unicodedata


def clean_text(text: str) -> str:
    """
    Clean and normalize text input.
    
    Args:
        text: Raw text string
        
    Returns:
        Cleaned text string
    """
    if not text:
        return ""
    
    # Convert to lowercase
    text = text.lower()
    
    # Normalize unicode (French/Arabic accents)
    text = unicodedata.normalize('NFKD', text)
    
    # Remove punctuation except spaces
    text = re.sub(r'[^\w\s]', ' ', text)
    
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text


def detect_keywords(text: str, keyword_list: list) -> list:
    """
    Detect keywords from a list in the given text.
    
    Args:
        text: Text to search in
        keyword_list: List of keywords to detect
        
    Returns:
        List of matched keywords
    """
    text_lower = text.lower()
    detected = []
    
    for keyword in keyword_list:
        if keyword.lower() in text_lower:
            detected.append(keyword)
    
    return detected


def combine_fields(title: str, description: str = "") -> str:
    """
    Combine title and description fields for vectorization.
    
    Args:
        title: Complaint title
        description: Complaint description
        
    Returns:
        Combined text string
    """
    parts = []
    
    if title:
        parts.append(title)
    
    if description:
        # Take first 500 chars of description to avoid very long texts
        parts.append(description[:500])
    
    return " ".join(parts)


def extract_keywords_by_level(text: str) -> dict:
    """
    Extract keywords by urgency level from text.
    
    Args:
        text: Text to analyze
        
    Returns:
        Dictionary with keywords grouped by level
    """
    from config.settings import CRITICAL_KEYWORDS, HIGH_KEYWORDS, MEDIUM_KEYWORDS
    
    text_lower = text.lower()
    
    result = {
        "critical": [],
        "high": [],
        "medium": []
    }
    
    for kw in CRITICAL_KEYWORDS:
        if kw.lower() in text_lower:
            result["critical"].append(kw)
    
    for kw in HIGH_KEYWORDS:
        if kw.lower() in text_lower:
            result["high"].append(kw)
    
    for kw in MEDIUM_KEYWORDS:
        if kw.lower() in text_lower:
            result["medium"].append(kw)
    
    return result


def calculate_keyword_score(text: str) -> float:
    """
    Calculate keyword-based urgency score.
    
    Args:
        text: Text to analyze
        
    Returns:
        Score from 0 to 1 based on keywords detected
    """
    keywords = extract_keywords_by_level(text)
    
    score = 0.0
    
    # Critical keywords: +0.4 each
    score += len(keywords["critical"]) * 0.4
    
    # High keywords: +0.25 each
    score += len(keywords["high"]) * 0.25
    
    # Medium keywords: +0.15 each
    score += len(keywords["medium"]) * 0.15
    
    # Cap at 1.0
    return min(score, 1.0)


def is_empty_text(text: str) -> bool:
    """
    Check if text is empty or only whitespace.
    
    Args:
        text: Text to check
        
    Returns:
        True if empty, False otherwise
    """
    return not text or not text.strip()


def truncate_text(text: str, max_length: int = 500) -> str:
    """
    Truncate text to maximum length.
    
    Args:
        text: Text to truncate
        max_length: Maximum length
        
    Returns:
        Truncated text
    """
    if len(text) <= max_length:
        return text
    
    return text[:max_length] + "..."