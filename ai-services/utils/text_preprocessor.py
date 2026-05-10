"""
Text Preprocessing Utilities
============================
Utility functions for text cleaning and preprocessing.
"""

import re
import unicodedata


# Synonym mapping for common complaint-related terms
SYNONYM_MAP = {
    # English synonyms
    "waste": ["garbage", "trash", "rubbish", "debris", "refuse", "litter"],
    "road": ["street", "highway", "avenue", "boulevard", "lane"],
    "lighting": ["light", "lamp", "streetlight", "illumination"],
    "water": ["aqua", "plumbing", "pipe", "drainage"],
    "safety": ["security", "danger", "hazard", "risk"],
    "building": ["structure", "property", "house", "construction"],
    "park": ["garden", "green space", "recreation area"],
    "noise": ["sound", "loud", "disturbance"],
    "broken": ["damaged", "cracked", "ruined", "destroyed"],
    "leak": ["drip", "seep", "spill"],
    
    # French synonyms (common in Tunisia)
    "déchets": ["ordures", "détritus", "poubelle", "déchets ménagers"],
    "route": ["rue", "voie", "chaussée", "avenue"],
    "éclairage": ["lumière", "lampadaire", "illumination"],
    "eau": ["aqua", "plomberie", "tuyau", "drainage"],
    "sécurité": ["sûreté", "danger", "risque"],
    "bâtiment": ["immeuble", "propriété", "maison", "construction"],
    "parc": ["jardin", "espace vert", "aire de jeux"],
    "bruit": ["son", "fort", "perturbation"],
    "cassé": ["endommagé", "fêlé", "ruiné", "détruit"],
    "fuite": ["dégât", "fuite d'eau", "perturbation"],
}

# Reverse synonym map for lookup
REVERSE_SYNONYM_MAP = {}
for main_term, synonyms in SYNONYM_MAP.items():
    for synonym in synonyms:
        REVERSE_SYNONYM_MAP[synonym.lower()] = main_term.lower()
    REVERSE_SYNONYM_MAP[main_term.lower()] = main_term.lower()

def normalize_synonyms(text: str) -> str:
    """
    Replace words with their canonical synonyms.
    
    Args:
        text: Text to normalize
        
    Returns:
        Text with synonyms replaced by canonical forms
    """
    words = text.split()
    normalized_words = []
    
    for word in words:
        word_lower = word.lower()
        if word_lower in REVERSE_SYNONYM_MAP:
            normalized_words.append(REVERSE_SYNONYM_MAP[word_lower])
        else:
            normalized_words.append(word)
    
    return " ".join(normalized_words)


def remove_plural(text: str) -> str:
    """
    Simple plural removal for common English and French patterns.
    
    Args:
        text: Text to process
        
    Returns:
        Text with plurals converted to singular
    """
    words = text.split()
    singular_words = []
    
    for word in words:
        word_lower = word.lower()
        singular = word_lower
        
        # English plural patterns
        if word_lower.endswith('s') and not word_lower.endswith('ss'):
            # Remove trailing 's' for simple plurals
            if word_lower.endswith('ies'):
                singular = word_lower[:-3] + 'y'
            elif word_lower.endswith('ves'):
                singular = word_lower[:-3] + 'f'
            elif word_lower.endswith('es'):
                if word_lower.endswith('ches') or word_lower.endswith('shes') or word_lower.endswith('xes'):
                    singular = word_lower[:-2]
                else:
                    singular = word_lower[:-1]
            else:
                singular = word_lower[:-1]
        
        # French plural patterns
        elif word_lower.endswith('aux'):
            singular = word_lower[:-3] + 'al'
        elif word_lower.endswith('eux'):
            singular = word_lower[:-3] + 'eu'
        elif word_lower.endswith('oux'):
            singular = word_lower[:-3] + 'ou'
        
        singular_words.append(singular)
    
    return " ".join(singular_words)


def clean_text(text: str) -> str:
    """
    Clean and normalize text input.
    Now includes synonym normalization and plural removal.
    
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
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if not unicodedata.combining(c))
    text = unicodedata.normalize('NFC', text)
    
    # Remove accents from characters
    text = re.sub(r'[àáâãäå]', 'a', text)
    text = re.sub(r'[èéêë]', 'e', text)
    text = re.sub(r'[ìíîï]', 'i', text)
    text = re.sub(r'[òóôõö]', 'o', text)
    text = re.sub(r'[ùúûü]', 'u', text)
    text = re.sub(r'[ýÿ]', 'y', text)
    text = re.sub(r'[ç]', 'c', text)
    text = re.sub(r'[ñ]', 'n', text)
    
    # Normalize synonyms
    text = normalize_synonyms(text)
    
    # Remove plurals
    text = remove_plural(text)
    
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
    Title is repeated twice to give it higher TF-IDF weight.
    """
    parts = []

    if title:
        # Repeat title to boost its signal weight in TF-IDF
        parts.append(title)
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