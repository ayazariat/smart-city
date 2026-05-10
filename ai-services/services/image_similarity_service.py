"""
Image Similarity Service for Duplicate Detection
===============================================
Uses computer vision techniques to detect visually similar complaints.
Compares images based on visual features to improve duplicate detection accuracy.
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import numpy as np
from PIL import Image
import io
import base64
import requests

try:
    from transformers import AutoImageProcessor, AutoModel
    import torch
    _image_model = None
    _image_processor = None
    
    def get_image_model():
        global _image_model, _image_processor
        if _image_model is None:
            # Use CLIP model for image similarity (multilingual support)
            model_name = "openai/clip-vit-base-patch32"
            _image_processor = AutoImageProcessor.from_pretrained(model_name)
            _image_model = AutoModel.from_pretrained(model_name)
            _image_model.eval()
        return _image_model, _image_processor
    
    def encode_images(images: List) -> np.ndarray:
        """Encode images using CLIP model for similarity comparison."""
        model, processor = get_image_model()
        inputs = processor(images=images, return_tensors="pt")
        with torch.no_grad():
            outputs = model.get_image_features(**inputs)
        return outputs.numpy()
    
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

try:
    import cv2
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False


@dataclass
class ImageSimilarityResult:
    similarity_score: float
    is_similar: bool
    method_used: str
    features: Dict[str, float]


class ImageSimilarityService:
    """Detect visually similar complaints using image analysis."""
    
    def __init__(self):
        self.threshold = 0.85  # Similarity threshold for considering images as duplicates
        
    def load_image_from_url(self, url: str) -> Optional[Image.Image]:
        """Load image from URL."""
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                return Image.open(io.BytesIO(response.content))
        except Exception as e:
            print(f"Failed to load image from URL: {e}")
        return None
    
    def load_image_from_base64(self, base64_str: str) -> Optional[Image.Image]:
        """Load image from base64 string."""
        try:
            if base64_str.startswith('data:image'):
                base64_str = base64_str.split(',')[1]
            image_data = base64.b64decode(base64_str)
            return Image.open(io.BytesIO(image_data))
        except Exception as e:
            print(f"Failed to load image from base64: {e}")
        return None
    
    def calculate_similarity_clip(self, image1: Image.Image, image2: Image.Image) -> ImageSimilarityResult:
        """Calculate image similarity using CLIP model (most accurate)."""
        if not TRANSFORMERS_AVAILABLE:
            raise RuntimeError("Transformers library not available for CLIP model")
        
        try:
            embeddings = encode_images([image1, image2])
            # Calculate cosine similarity
            similarity = np.dot(embeddings[0], embeddings[1]) / (
                np.linalg.norm(embeddings[0]) * np.linalg.norm(embeddings[1])
            )
            
            return ImageSimilarityResult(
                similarity_score=float(similarity),
                is_similar=similarity >= self.threshold,
                method_used="CLIP",
                features={"embedding_similarity": float(similarity)}
            )
        except Exception as e:
            print(f"CLIP similarity calculation failed: {e}")
            raise
    
    def calculate_similarity_opencv(self, image1: Image.Image, image2: Image.Image) -> ImageSimilarityResult:
        """Calculate image similarity using OpenCV (fallback method)."""
        if not OPENCV_AVAILABLE:
            raise RuntimeError("OpenCV not available")
        
        try:
            # Convert PIL images to OpenCV format
            img1_cv = cv2.cvtColor(np.array(image1), cv2.COLOR_RGB2BGR)
            img2_cv = cv2.cvtColor(np.array(image2), cv2.COLOR_RGB2BGR)
            
            # Resize to same size
            size = (256, 256)
            img1_cv = cv2.resize(img1_cv, size)
            img2_cv = cv2.resize(img2_cv, size)
            
            # Calculate histogram similarity
            hist1 = cv2.calcHist([img1_cv], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
            hist2 = cv2.calcHist([img2_cv], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
            
            hist1 = cv2.normalize(hist1, hist1).flatten()
            hist2 = cv2.normalize(hist2, hist2).flatten()
            
            correlation = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
            
            # Calculate structural similarity
            gray1 = cv2.cvtColor(img1_cv, cv2.COLOR_BGR2GRAY)
            gray2 = cv2.cvtColor(img2_cv, cv2.COLOR_BGR2GRAY)
            
            # Calculate SSIM-like metric
            mse = np.mean((gray1 - gray2) ** 2)
            ssim_score = 1 - (mse / (gray1.max() ** 2))
            
            # Combine metrics
            similarity = (correlation * 0.7) + (ssim_score * 0.3)
            
            return ImageSimilarityResult(
                similarity_score=float(similarity),
                is_similar=similarity >= self.threshold,
                method_used="OpenCV",
                features={"histogram_correlation": float(correlation), "ssim_score": float(ssim_score)}
            )
        except Exception as e:
            print(f"OpenCV similarity calculation failed: {e}")
            raise
    
    def calculate_similarity_basic(self, image1: Image.Image, image2: Image.Image) -> ImageSimilarityResult:
        """Calculate image similarity using basic pixel comparison (last resort)."""
        try:
            # Resize to same size
            size = (64, 64)
            img1_resized = image1.resize(size)
            img2_resized = image2.resize(size)
            
            # Convert to numpy arrays
            arr1 = np.array(img1_resized)
            arr2 = np.array(img2_resized)
            
            # Calculate MSE
            mse = np.mean((arr1 - arr2) ** 2)
            
            # Convert to similarity score (lower MSE = higher similarity)
            max_mse = 255 * 255 * 3  # Maximum possible MSE for RGB
            similarity = 1 - (mse / max_mse)
            
            return ImageSimilarityResult(
                similarity_score=float(similarity),
                is_similar=similarity >= self.threshold,
                method_used="Basic",
                features={"mse": float(mse)}
            )
        except Exception as e:
            print(f"Basic similarity calculation failed: {e}")
            raise
    
    def compare_images(self, image1: Image.Image, image2: Image.Image) -> ImageSimilarityResult:
        """Compare two images and return similarity result."""
        # Try CLIP first (most accurate)
        try:
            return self.calculate_similarity_clip(image1, image2)
        except Exception:
            pass
        
        # Fallback to OpenCV
        try:
            return self.calculate_similarity_opencv(image1, image2)
        except Exception:
            pass
        
        # Last resort: basic comparison
        return self.calculate_similarity_basic(image1, image2)
    
    def compare_complaint_images(
        self,
        complaint1_images: List[str],
        complaint2_images: List[str]
    ) -> Dict[str, any]:
        """Compare images from two complaints and return overall similarity."""
        if not complaint1_images or not complaint2_images:
            return {
                "has_images": False,
                "similarity_score": 0.0,
                "is_similar": False,
                "method_used": "No images"
            }
        
        similarities = []
        methods_used = []
        
        # Load and compare images
        for img1_url in complaint1_images[:3]:  # Limit to first 3 images per complaint
            img1 = self.load_image_from_url(img1_url)
            if not img1:
                continue
            
            for img2_url in complaint2_images[:3]:
                img2 = self.load_image_from_url(img2_url)
                if not img2:
                    continue
                
                try:
                    result = self.compare_images(img1, img2)
                    similarities.append(result.similarity_score)
                    methods_used.append(result.method_used)
                except Exception as e:
                    print(f"Failed to compare images: {e}")
                    continue
        
        if not similarities:
            return {
                "has_images": True,
                "similarity_score": 0.0,
                "is_similar": False,
                "method_used": "Comparison failed"
            }
        
        avg_similarity = np.mean(similarities)
        max_similarity = np.max(similarities)
        
        return {
            "has_images": True,
            "similarity_score": float(avg_similarity),
            "max_similarity": float(max_similarity),
            "is_similar": max_similarity >= self.threshold,
            "method_used": methods_used[0] if methods_used else "Unknown",
            "comparisons_made": len(similarities)
        }


# Singleton instance
_image_similarity_service = None

def get_image_similarity_service():
    global _image_similarity_service
    if _image_similarity_service is None:
        _image_similarity_service = ImageSimilarityService()
    return _image_similarity_service
