"""
Duplicate Detection Service (BL-25)
====================================
Detect if a new complaint is likely a duplicate of an existing open complaint.
Uses HuggingFace sentence-transformers (free) for semantic similarity when available,
falls back to TF-IDF cosine similarity.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta, timezone

# Try importing sklearn, but don't fail if not available
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False

# Try importing sentence-transformers for better semantic similarity (free)
try:
    from transformers import AutoTokenizer, AutoModel
    import torch
    _sentence_model = None
    _sentence_tokenizer = None
    
    def get_sentence_model():
        global _sentence_model, _sentence_tokenizer
        if _sentence_model is None:
            model_name = "sentence-transformers/all-MiniLM-L6-v2"
            try:
                device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
                _sentence_tokenizer = AutoTokenizer.from_pretrained(model_name)
                _sentence_model = AutoModel.from_pretrained(model_name)
                _sentence_model = _sentence_model.to(device)
                _sentence_model.eval()
            except Exception as e:
                print(f"Error loading sentence model with device: {e}, falling back to CPU")
                _sentence_tokenizer = AutoTokenizer.from_pretrained(model_name)
                _sentence_model = AutoModel.from_pretrained(model_name)
                _sentence_model.eval()
        return _sentence_model, _sentence_tokenizer
    
    def encode_texts(texts: List[str]) -> np.ndarray:
        """Encode texts to embeddings using sentence-transformers."""
        model, tokenizer = get_sentence_model()
        encoded = tokenizer(texts, padding=True, truncation=True, max_length=256, return_tensors="pt")
        # Move to the same device as the model
        device = next(model.parameters()).device
        encoded = {k: v.to(device) for k, v in encoded.items()}
        with torch.no_grad():
            outputs = model(**encoded)
        # Mean pooling
        attention_mask = encoded["attention_mask"]
        token_embeddings = outputs.last_hidden_state
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        embeddings = torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)
        return embeddings.cpu().numpy()
    
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False

from utils.text_preprocessor import clean_text, combine_fields
from utils.geo_utils import calculate_geo_score
from config.settings import (
    DUPLICATE_WEIGHTS,
    DUPLICATE_THRESHOLD,
    DUPLICATE_THRESHOLD_REVIEW,  # Deprecated but kept for compatibility
    DUPLICATE_THRESHOLD_PROBABLE,  # Deprecated but kept for compatibility
    RELATED_CATEGORIES,
    TEMPORAL_PROXIMITY
)


class DuplicateDetector:
    """Detect duplicate complaints using hybrid scoring."""
    
    def __init__(self):
        self.vectorizer = None
        self.version = "duplicate-detector-2026-05-12-v2"

    def _coerce_score(self, value: Any, default: float = 0.0) -> float:
        """Return a numeric score even when upstream helpers return rich objects."""
        if isinstance(value, dict):
            for key in ("score", "similarity", "value", "overallScore"):
                if key in value:
                    value = value[key]
                    break
            else:
                return default
        try:
            score = float(value)
        except (TypeError, ValueError):
            return default
        return max(0.0, min(1.0, score))

    def _weight(self, key: str, default: float) -> float:
        """Read score weights defensively even if settings are edited to nested objects."""
        value = DUPLICATE_WEIGHTS.get(key, default)
        if isinstance(value, dict):
            value = value.get("weight", value.get("value", default))
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    def _extract_coordinates(self, complaint: Dict[str, Any]) -> tuple[Optional[float], Optional[float]]:
        """Support both flat lat/lng fields and Mongo GeoJSON location objects."""
        lat = complaint.get("latitude")
        lng = complaint.get("longitude")
        location = complaint.get("location")
        if (lat is None or lng is None) and isinstance(location, dict):
            coordinates = location.get("coordinates")
            if isinstance(coordinates, list) and len(coordinates) >= 2:
                lng = coordinates[0]
                lat = coordinates[1]
            else:
                lat = location.get("latitude", lat)
                lng = location.get("longitude", lng)
        try:
            lat = float(lat) if lat is not None else None
            lng = float(lng) if lng is not None else None
        except (TypeError, ValueError):
            return None, None
        return lat, lng

    def _normalize_photo_refs(self, photos: List[Any]) -> List[str]:
        """Accept URL strings or Mongo media objects and return comparable URL strings."""
        refs: List[str] = []
        for item in photos or []:
            if isinstance(item, str):
                ref = item
            elif isinstance(item, dict):
                ref = item.get("url") or item.get("secure_url") or item.get("path") or ""
            else:
                ref = ""
            if ref:
                refs.append(str(ref).strip().lower())
        return refs
    
    def _calculate_text_similarity(self, new_text: str, 
                                     candidates: List[Dict]) -> List[float]:
        """Calculate text similarity scores.
        Strategy: Sentence-transformers (free, semantic) → TF-IDF (free, lexical) → Simple matching
        """
        if not candidates:
            return []
        
        candidate_texts = [combine_fields(c.get("title", ""), c.get("description", "")) 
                           for c in candidates]
        
        # Strategy 1: Free sentence-transformers for semantic similarity
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            try:
                all_texts = [new_text] + candidate_texts
                embeddings = encode_texts(all_texts)
                
                # Cosine similarity between new text and each candidate
                from sklearn.metrics.pairwise import cosine_similarity as cos_sim
                similarities = cos_sim(embeddings[0:1], embeddings[1:])[0]
                return similarities.tolist()
            except Exception as e:
                print(f"Sentence-transformer error: {e}")
        
        # Strategy 2: TF-IDF cosine similarity (free, lexical)
        try:
            all_texts = [new_text] + candidate_texts
            self.vectorizer = TfidfVectorizer(max_features=500, ngram_range=(1, 2))
            tfidf_matrix = self.vectorizer.fit_transform(all_texts)
            
            similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0]
            return similarities.tolist()
            
        except Exception as e:
            print(f"TF-IDF error: {e}")
            # Strategy 3: Simple substring matching
            return self._simple_text_match(new_text, candidates)
    
    def _simple_text_match(self, new_text: str, candidates: List[Dict]) -> List[float]:
        """Simple substring matching as fallback."""
        scores = []
        new_lower = new_text.lower()
        
        for candidate in candidates:
            cand_text = combine_fields(candidate.get("title", ""), candidate.get("description", "")).lower()
            
            # Check for exact substring
            if new_lower in cand_text or cand_text in new_lower:
                scores.append(0.8)
            # Check for word overlap
            else:
                new_words = set(new_lower.split())
                cand_words = set(cand_text.split())
                overlap = len(new_words & cand_words) / max(len(new_words), 1)
                scores.append(overlap * 0.5)
        
        return scores
    
    def _calculate_category_score(self, new_category: str, 
                                   candidate_category: str) -> float:
        """Calculate category match score."""
        new_category = (new_category or "").lower()
        candidate_category = (candidate_category or "").lower()

        if new_category == candidate_category:
            return 1.0
        
        # Check related categories
        related = RELATED_CATEGORIES.get(new_category.upper(), [])
        if candidate_category.upper() in related:
            return 0.5
        
        return 0.0
    
    def _calculate_temporal_score(self, new_date: datetime, 
                                   candidate_date: datetime) -> float:
        """Calculate temporal proximity score."""
        if new_date is None or candidate_date is None:
            return 0.0
        
        diff_days = abs((new_date - candidate_date).total_seconds()) / 86400

        if isinstance(TEMPORAL_PROXIMITY, dict):
            if diff_days <= TEMPORAL_PROXIMITY.get("sameDay", 0):
                return 1.0
            if diff_days <= TEMPORAL_PROXIMITY.get("veryClose", 3):
                return 0.8
            if diff_days <= TEMPORAL_PROXIMITY.get("close", 7):
                return 0.5
            if diff_days <= TEMPORAL_PROXIMITY.get("near", 14):
                return 0.2
            return 0.0

        proximity_hours = float(TEMPORAL_PROXIMITY)
        time_diff = diff_days * 24
        if time_diff < proximity_hours:
            return 1.0 - (time_diff / proximity_hours)
        return 0.0
    
    def _calculate_photo_score(self, new_photos: List[str], 
                                candidate_photos: List[str]) -> float:
        """
        Calculate photo similarity score.
        Compares presence of photos and photo URLs for potential duplicates.
        """
        # If neither has photos, neutral score
        new_photos = self._normalize_photo_refs(new_photos)
        candidate_photos = self._normalize_photo_refs(candidate_photos)

        if not new_photos and not candidate_photos:
            return 0.5
        
        # If both have photos, higher likelihood of being related
        if new_photos and candidate_photos:
            # Check for exact URL matches (same photo uploaded)
            new_urls = set(new_photos)
            candidate_urls = set(candidate_photos)
            common_urls = new_urls & candidate_urls
            
            if common_urls:
                return 1.0  # Same photo uploaded - strong duplicate indicator
            
            # Different photos but both have images - moderate boost
            return 0.6
        
        # Only one has photos - slight penalty (could be same issue reported differently)
        return 0.34
    
    def _calculate_final_score(self, text_score: float, geo_score: float,
                                category_score: float, temporal_score: float, photo_score: float = 0.5) -> float:
        """Calculate weighted final score."""
        return (
            self._coerce_score(text_score) * self._weight("textSimilarity", 0.70) +
            self._coerce_score(geo_score) * self._weight("geographicProximity", 0.15) +
            self._coerce_score(category_score) * self._weight("categoryMatch", 0.10) +
            self._coerce_score(temporal_score) * self._weight("temporalProximity", 0.05) +
            self._coerce_score(photo_score, default=0.5) * self._weight("photoMatch", 0.0)
        )
    
    def _determine_duplicate_level(self, score: float) -> str:
        """Determine duplicate level based on unified threshold."""
        if score >= DUPLICATE_THRESHOLD:
            return "PROBABLE_DUPLICATE"
        else:
            return "NOT_DUPLICATE"
    
    def check_duplicate(self, new_complaint: Dict[str, Any], 
                        candidates: List[Dict]) -> Dict[str, Any]:
        """
        Check if new complaint is a duplicate of any candidate.
        
        Args:
            new_complaint: New complaint data
            candidates: List of existing complaints to check against
            
        Returns:
            Duplicate analysis result
        """
        if not candidates:
            return {
                "isDuplicate": False,
                "duplicateLevel": "NOT_DUPLICATE",
                "topMatches": [],
                "recommendation": "No candidate complaints to compare against.",
                "humanReviewRequired": False
            }

        print(f"[DUPLICATE] Detector version: {self.version}")
        
        new_text = combine_fields(
            new_complaint.get("title", ""),
            new_complaint.get("description", "")
        )
        new_text = clean_text(new_text)
        
        new_lat, new_lng = self._extract_coordinates(new_complaint)
        new_category = new_complaint.get("category", "")
        new_date = new_complaint.get("submittedAt")
        new_photos = new_complaint.get("media", []) or new_complaint.get("photos", []) or []
        
        if isinstance(new_date, str):
            try:
                new_date = datetime.fromisoformat(new_date.replace("Z", "+00:00"))
            except:
                new_date = datetime.now(timezone.utc)
        elif new_date is None:
            new_date = datetime.now(timezone.utc)
        elif new_date.tzinfo is None:
            new_date = new_date.replace(tzinfo=timezone.utc)
        
        # Calculate text similarities
        text_scores = self._calculate_text_similarity(new_text, candidates)
        
        matches = []
        
        for i, candidate in enumerate(candidates):
            if str(candidate.get("_id", "")) and str(candidate.get("_id", "")) == str(new_complaint.get("complaintId", "")):
                continue

            # Text score
            text_score = self._coerce_score(text_scores[i] if i < len(text_scores) else 0)
            
            # Check for exact title match bonus
            title_bonus = 0.0
            if new_complaint.get("title", "").lower() in candidate.get("title", "").lower():
                title_bonus = 0.20
            
            # Geographic score
            cand_lat, cand_lng = self._extract_coordinates(candidate)
            geo_score = self._coerce_score(calculate_geo_score(
                new_lat, new_lng,
                cand_lat, cand_lng
            ), default=0.3)
            
            # Category score
            category_score = self._coerce_score(self._calculate_category_score(
                new_category, candidate.get("category", "")
            ))
            
            # Temporal score
            cand_date = candidate.get("submittedAt")
            if isinstance(cand_date, str):
                try:
                    cand_date = datetime.fromisoformat(cand_date.replace("Z", "+00:00"))
                except:
                    cand_date = datetime.now(timezone.utc)
            elif cand_date is None:
                cand_date = datetime.now(timezone.utc)
            elif cand_date.tzinfo is None:
                cand_date = cand_date.replace(tzinfo=timezone.utc)
            
            temporal_score = self._coerce_score(self._calculate_temporal_score(new_date, cand_date))
            
            # Photo score
            candidate_photos = candidate.get("media", []) or candidate.get("photos", []) or []
            photo_score = self._coerce_score(self._calculate_photo_score(new_photos, candidate_photos), default=0.5)
            
            # Calculate final score
            final_score = self._calculate_final_score(
                self._coerce_score(text_score + title_bonus), geo_score, category_score, temporal_score, photo_score
            )
            
            matches.append({
                "complaintId": str(candidate.get("_id", "")),
                "referenceId": candidate.get("referenceId", ""),
                "title": candidate.get("title", ""),
                "description": candidate.get("description", ""),
                "overallScore": round(final_score, 2),
                "textScore": round(text_score, 2),
                "geoScore": round(geo_score, 2),
                "categoryScore": round(category_score, 2),
                "temporalScore": round(temporal_score, 2),
                "photoScore": round(photo_score, 2),
                "submittedAt": candidate.get("submittedAt"),
                "status": candidate.get("status", "UNKNOWN"),
                "category": candidate.get("category", ""),
                "latitude": candidate.get("latitude"),
                "longitude": candidate.get("longitude")
            })
        
        # Sort by score descending
        matches.sort(key=lambda x: x["overallScore"], reverse=True)
        
        # Return only strong, reviewable matches.
        top_matches = [m for m in matches if m["overallScore"] >= DUPLICATE_THRESHOLD][:3]
        
        # Determine duplicate level
        if top_matches and top_matches[0]["overallScore"] > 0:
            duplicate_level = self._determine_duplicate_level(top_matches[0]["overallScore"])
            is_duplicate = duplicate_level != "NOT_DUPLICATE"
        else:
            duplicate_level = "NOT_DUPLICATE"
            is_duplicate = False
        
        # Generate recommendation
        if is_duplicate:
            best_match = top_matches[0]
            if duplicate_level == "PROBABLE_DUPLICATE":
                recommendation = f"This complaint resembles {best_match['referenceId']} at {best_match['overallScore']:.0%} similarity. Strongly consider merging."
            else:
                recommendation = f"This complaint may be similar to {best_match['referenceId']} at {best_match['overallScore']:.0%} similarity. Agent review suggested."
        else:
            recommendation = "No significant duplicates found. This appears to be a new complaint."
        
        return {
            "isDuplicate": is_duplicate,
            "duplicateLevel": duplicate_level,
            "topMatches": top_matches,
            "recommendation": recommendation,
            "humanReviewRequired": is_duplicate
        }
    
    def confirm_duplicate(self, new_complaint_id: str, 
                          existing_complaint_id: str, 
                          action: str) -> Dict[str, Any]:
        """
        Process agent's decision on duplicate suggestion.
        
        Args:
            new_complaint_id: ID of the new complaint
            existing_complaint_id: ID of the existing complaint
            action: "merge" or "keep_separate"
            
        Returns:
            Confirmation result
        """
        if action == "merge":
            # In a real implementation, this would update the database
            return {
                "success": True,
                "message": f"Complaint {new_complaint_id} merged with {existing_complaint_id}",
                "action": "merged"
            }
        else:
            return {
                "success": True,
                "message": f"Complaint {new_complaint_id} kept separate from {existing_complaint_id}",
                "action": "kept_separate"
            }


# Singleton instance
_detector = None


def get_detector() -> DuplicateDetector:
    """Get singleton detector instance."""
    global _detector
    if _detector is None:
        _detector = DuplicateDetector()
    return _detector


def check_duplicate(new_complaint: Dict, candidates: List[Dict]) -> Dict:
    """Convenience function for duplicate checking."""
    return get_detector().check_duplicate(new_complaint, candidates)


def confirm_duplicate(new_id: str, existing_id: str, action: str) -> Dict:
    """Convenience function for confirming duplicate decision."""
    return get_detector().confirm_duplicate(new_id, existing_id, action)
