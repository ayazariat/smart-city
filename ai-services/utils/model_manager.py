"""
Model Manager Utilities
========================
Utility functions for model loading, saving, and retraining.
"""

import os
import pickle
import joblib
from pathlib import Path
from typing import Optional, Any


# Get base directory
BASE_DIR = Path(__file__).parent.parent


def get_model_path(model_name: str) -> Path:
    """
    Get full path to model file.
    
    Args:
        model_name: Name of the model file
        
    Returns:
        Full path to model
    """
    return BASE_DIR / "models" / model_name


def save_model(model: Any, filename: str) -> bool:
    """
    Save model to disk using joblib.
    
    Args:
        model: Scikit-learn model or other compatible object
        filename: Name of the file to save
        
    Returns:
        True if successful
    """
    try:
        models_dir = BASE_DIR / "models"
        models_dir.mkdir(exist_ok=True)
        
        filepath = models_dir / filename
        joblib.dump(model, filepath)
        return True
    except Exception as e:
        print(f"Error saving model {filename}: {e}")
        return False


def load_model(filename: str) -> Optional[Any]:
    """
    Load model from disk using joblib.
    
    Args:
        filename: Name of the model file
        
    Returns:
        Loaded model or None if failed
    """
    try:
        filepath = get_model_path(filename)
        if not filepath.exists():
            print(f"Model file not found: {filepath}")
            return None
        
        return joblib.load(filepath)
    except Exception as e:
        print(f"Error loading model {filename}: {e}")
        return None


def model_exists(filename: str) -> bool:
    """
    Check if model file exists.
    
    Args:
        filename: Name of the model file
        
    Returns:
        True if exists
    """
    filepath = get_model_path(filename)
    return filepath.exists()


def delete_model(filename: str) -> bool:
    """
    Delete model file.
    
    Args:
        filename: Name of the model file
        
    Returns:
        True if successful
    """
    try:
        filepath = get_model_path(filename)
        if filepath.exists():
            os.remove(filepath)
        return True
    except Exception as e:
        print(f"Error deleting model {filename}: {e}")
        return False


def check_retrain_needed(filename: str, min_samples: int = 20) -> bool:
    """
    Check if model needs retraining based on available data.
    
    Args:
        filename: Name of the model file
        min_samples: Minimum number of samples required
        
    Returns:
        True if model needs retraining or doesn't exist
    """
    if not model_exists(filename):
        return True
    
    # Check if we have training data
    # This is a simplified check - in production, you'd check your data source
    return False


def get_model_info(filename: str) -> dict:
    """
    Get information about a saved model.
    
    Args:
        filename: Name of the model file
        
    Returns:
        Dictionary with model info
    """
    filepath = get_model_path(filename)
    
    info = {
        "exists": filepath.exists(),
        "filename": filename,
        "path": str(filepath)
    }
    
    if filepath.exists():
        stat = filepath.stat()
        info["size_bytes"] = stat.st_size
        info["modified"] = stat.st_mtime
    
    return info


def list_models() -> list:
    """
    List all available model files.
    
    Returns:
        List of model filenames
    """
    models_dir = BASE_DIR / "models"
    
    if not models_dir.exists():
        return []
    
    return [f.name for f in models_dir.iterdir() if f.is_file() and f.suffix in ['.pkl', '.joblib']]


def save_vectorizer(vectorizer: Any, filename: str) -> bool:
    """
    Save TF-IDF vectorizer or other sklearn transformer.
    
    Args:
        vectorizer: Sklearn vectorizer
        filename: Name of the file to save
        
    Returns:
        True if successful
    """
    return save_model(vectorizer, filename)


def load_vectorizer(filename: str) -> Optional[Any]:
    """
    Load TF-IDF vectorizer or other sklearn transformer.
    
    Args:
        filename: Name of the vectorizer file
        
    Returns:
        Loaded vectorizer or None if failed
    """
    return load_model(filename)