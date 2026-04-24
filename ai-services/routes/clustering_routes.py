"""
Root Cause Clustering Routes (BL-1770032236)
============================================
API routes for complaint clustering and systemic problem identification.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from services.clustering_service import analyze_root_causes

router = APIRouter()


class ClusterAnalysisRequest(BaseModel):
    governorate: Optional[str] = None
    municipality: Optional[str] = None
    category: Optional[str] = None
    days: int = 30


class ComplaintData(BaseModel):
    id: Optional[str] = None
    _id: Optional[str] = None
    title: str
    description: str
    category: Optional[str] = None
    municipality: Optional[str] = None
    governorate: Optional[str] = None
    urgency: Optional[str] = None
    priorityScore: Optional[int] = None
    status: Optional[str] = None
    createdAt: Optional[str] = None
    submittedAt: Optional[str] = None
    resolvedAt: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


@router.post("/analyze")
async def analyze_complaints(
    complaints: List[ComplaintData],
    filters: Optional[ClusterAnalysisRequest] = None
):
    """
    Analyze complaints to identify systemic urban problems.
    
    This endpoint clusters complaints based on semantic similarity,
    geographic proximity, and temporal patterns to identify root causes
    of recurring issues.
    
    Args:
        complaints: List of complaint data
        filters: Optional filters for the analysis
        
    Returns:
        Cluster analysis results with recommendations
    """
    try:
        complaint_dicts = [c.model_dump() for c in complaints]
        
        filter_params = {}
        if filters:
            filter_params = {
                'governorate': filters.governorate,
                'municipality': filters.municipality,
                'category': filters.category,
                'days': filters.days
            }
        
        results = analyze_root_causes(complaint_dicts, **filter_params)
        
        return {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "data": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/clusters/{complaint_id}")
async def get_complaint_cluster(
    complaint_id: str,
    complaints: List[ComplaintData]
):
    """
    Find which cluster a specific complaint belongs to.
    
    Args:
        complaint_id: ID of the complaint to find
        complaints: Full list of complaints for context
        
    Returns:
        The cluster that contains this complaint
    """
    try:
        complaint_dicts = [c.model_dump() for c in complaints]
        results = analyze_root_causes(complaint_dicts)
        
        for cluster in results.get('clusters', []):
            for sample_id in cluster.get('sample_titles', []):
                pass
        
        return {
            "success": True,
            "complaint_id": complaint_id,
            "cluster": None,
            "message": "Cluster identification requires database integration"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
async def get_cluster_summary(
    governorate: Optional[str] = None,
    days: int = 30
):
    """
    Get a summary of all clusters for dashboard display.
    
    Args:
        governorate: Filter by governorate
        days: Number of days to analyze
        
    Returns:
        Summary statistics of all clusters
    """
    return {
        "success": True,
        "message": "This endpoint requires complaint data from the database",
        "filters": {
            "governorate": governorate,
            "days": days
        }
    }


@router.post("/recommendations")
async def get_cluster_recommendations(
    clusters: List[dict]
):
    """
    Generate prioritized recommendations based on cluster analysis.
    
    Args:
        clusters: List of cluster data from analysis
        
    Returns:
        Prioritized action recommendations
    """
    try:
        recommendations = []
        
        severity_priority = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}
        
        for i, cluster in enumerate(clusters):
            severity = cluster.get('severity', 'LOW')
            priority = severity_priority.get(severity, 4)
            
            for rec in cluster.get('recommendations', []):
                recommendations.append({
                    'priority': priority,
                    'severity': severity,
                    'cluster_id': cluster.get('id'),
                    'cluster_size': cluster.get('size'),
                    'recommendation': rec,
                    'categories': cluster.get('categories', []),
                    'locations': cluster.get('locations', [])
                })
        
        recommendations.sort(key=lambda x: (x['priority'], -x['cluster_size']))
        
        return {
            "success": True,
            "total_recommendations": len(recommendations),
            "prioritized_actions": recommendations[:20]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))