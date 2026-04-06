"""
Duplicate Detection Service (BL-25)
====================================
Detect if a new complaint is likely a duplicate of an existing open complaint.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

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

from utils.text_preprocessor import clean_text, combine_fields
from utils.geo_utils import calculate_geo_score
from config.settings import (
    DUPLICATE_WEIGHTS,
    DUPLICATE_THRESHOLD_REVIEW,
    DUPLICATE_THRESHOLD_PROBABLE,
    RELATED_CATEGORIES,
    TEMPORAL_PROXIMITY
)


class DuplicateDetector:
    """Detect duplicate complaints using hybrid scoring."""
    
    def __init__(self):
        self.vectorizer = None
    
    def _calculate_text_similarity(self, new_text: str, 
                                     candidates: List[Dict]) -> List[float]:
        """Calculate TF-IDF cosine similarity scores."""
        if not candidates:
            return []
        
        # Fit vectorizer on all texts
        all_texts = [new_text] + [combine_fields(c.get("title", ""), c.get("description", "")) 
                                   for c in candidates]
        
        try:
            self.vectorizer = TfidfVectorizer(max_features=500, ngram_range=(1, 2))
            tfidf_matrix = self.vectorizer.fit_transform(all_texts)
            
            # Calculate similarity between new complaint and each candidate
            similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0]
            
            return similarities.tolist()
            
        except Exception as e:
            print(f"Vectorization error: {e}")
            # Fallback to simple substring matching
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
        days_diff = abs((new_date - candidate_date).days)
        
        if days_diff == 0:
            return 1.0
        elif days_diff <= TEMPORAL_PROXIMITY["veryClose"]:
            return 0.7
        elif days_diff <= TEMPORAL_PROXIMITY["close"]:
            return 0.4
        elif days_diff <= TEMPORAL_PROXIMITY["near"]:
            return 0.2
        else:
            return 0.0
    
    def _calculate_final_score(self, text_score: float, geo_score: float,
                                category_score: float, temporal_score: float) -> float:
        """Calculate weighted final score."""
        return (
            text_score * DUPLICATE_WEIGHTS["textSimilarity"] +
            geo_score * DUPLICATE_WEIGHTS["geographicProximity"] +
            category_score * DUPLICATE_WEIGHTS["categoryMatch"] +
            temporal_score * DUPLICATE_WEIGHTS["temporalProximity"]
        )
    
    def _determine_duplicate_level(self, score: float) -> str:
        """Determine duplicate level based on score."""
        if score >= DUPLICATE_THRESHOLD_PROBABLE:
            return "PROBABLE_DUPLICATE"
        elif score >= DUPLICATE_THRESHOLD_REVIEW:
            return "POSSIBLE_DUPLICATE"
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
        
        new_text = combine_fields(
            new_complaint.get("title", ""),
            new_complaint.get("description", "")
        )
        new_text = clean_text(new_text)
        
        new_lat = new_complaint.get("latitude")
        new_lng = new_complaint.get("longitude")
        new_category = new_complaint.get("category", "")
        new_date = new_complaint.get("submittedAt")
        
        if isinstance(new_date, str):
            try:
                new_date = datetime.fromisoformat(new_date.replace("Z", "+00:00"))
            except:
                new_date = datetime.now()
        
        # Calculate text similarities
        text_scores = self._calculate_text_similarity(new_text, candidates)
        
        matches = []
        
        for i, candidate in enumerate(candidates):
            # Text score
            text_score = text_scores[i] if i < len(text_scores) else 0
            
            # Check for exact title match bonus
            title_bonus = 0.0
            if new_complaint.get("title", "").lower() in candidate.get("title", "").lower():
                title_bonus = 0.20
            
            # Geographic score
            geo_score = calculate_geo_score(
                new_lat, new_lng,
                candidate.get("latitude"), candidate.get("longitude")
            )
            
            # Category score
            category_score = self._calculate_category_score(
                new_category, candidate.get("category", "")
            )
            
            # Temporal score
            cand_date = candidate.get("submittedAt")
            if isinstance(cand_date, str):
                try:
                    cand_date = datetime.fromisoformat(cand_date.replace("Z", "+00:00"))
                except:
                    cand_date = datetime.now()
            else:
                cand_date = datetime.now()
            
            temporal_score = self._calculate_temporal_score(new_date, cand_date)
            
            # Calculate final score
            final_score = self._calculate_final_score(
                text_score + title_bonus, geo_score, category_score, temporal_score
            )
            
            matches.append({
                "complaintId": str(candidate.get("_id", "")),
                "referenceId": candidate.get("referenceId", ""),
                "title": candidate.get("title", ""),
                "overallScore": round(final_score, 2),
                "textScore": round(text_score, 2),
                "geoScore": round(geo_score, 2),
                "categoryScore": round(category_score, 2),
                "temporalScore": round(temporal_score, 2),
                "submittedAt": candidate.get("submittedAt"),
                "status": candidate.get("status", "UNKNOWN")
            })
        
        # Sort by score descending
        matches.sort(key=lambda x: x["overallScore"], reverse=True)
        
        # Take top 3
        top_matches = matches[:3]
        
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