"""
Root Cause Clustering Service (BL-1770032236)
==============================================
Clusters complaints to identify systemic urban problems.
Uses text embeddings and geographic clustering to group related issues.
"""

from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from collections import defaultdict
import re

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.cluster import KMeans, DBSCAN
    from sklearn.metrics.pairwise import cosine_similarity
    from sklearn.decomposition import PCA
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False

try:
    from transformers import AutoTokenizer, AutoModel
    import torch
    _cluster_model = None
    _cluster_tokenizer = None
    
    def get_cluster_model():
        global _cluster_model, _cluster_tokenizer
        if _cluster_model is None:
            model_name = "sentence-transformers/all-MiniLM-L6-v2"
            _cluster_tokenizer = AutoTokenizer.from_pretrained(model_name)
            _cluster_model = AutoModel.from_pretrained(model_name)
            _cluster_model.eval()
        return _cluster_model, _cluster_tokenizer
    
    def encode_for_clustering(texts: List[str]) -> np.ndarray:
        model, tokenizer = get_cluster_model()
        encoded = tokenizer(texts, padding=True, truncation=True, max_length=256, return_tensors="pt")
        with torch.no_grad():
            outputs = model(**encoded)
        attention_mask = encoded["attention_mask"]
        token_embeddings = outputs.last_hidden_state
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        embeddings = torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)
        return embeddings.numpy()
    
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False


@dataclass
class ClusterResult:
    cluster_id: int
    size: int
    main_issues: List[str]
    locations: List[str]
    categories: List[str]
    avg_resolution_days: float
    severity: str
    description: str
    recommendations: List[str]
    sample_complaints: List[Dict[str, Any]]
    trend: str


class RootCauseClusteringService:
    """Identify systemic urban problems by clustering related complaints."""
    
    def __init__(self):
        self.vectorizer = None
        
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text."""
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text
    
    def _extract_location_keywords(self, text: str, location: Optional[Dict]) -> List[str]:
        """Extract location-related keywords."""
        keywords = []
        
        location_texts = [
            location.get('address', '') if location else '',
            location.get('municipality', '') if location else '',
            location.get('governorate', '') if location else ''
        ]
        
        for loc in location_texts:
            if loc:
                words = loc.lower().split()
                keywords.extend([w for w in words if len(w) > 3])
        
        return keywords
    
    def _calculate_severity(self, complaints: List[Dict], avg_resolution: float) -> str:
        """Calculate cluster severity based on complaint characteristics."""
        if not complaints:
            return "LOW"
        
        urgent_count = sum(1 for c in complaints if c.get('urgency') in ['HIGH', 'URGENT', 'CRITICAL'])
        high_priority = sum(1 for c in complaints if c.get('priorityScore', 0) >= 15)
        
        if urgent_count > len(complaints) * 0.3 or high_priority > len(complaints) * 0.5:
            return "CRITICAL"
        elif urgent_count > len(complaints) * 0.1 or avg_resolution > 14:
            return "HIGH"
        elif avg_resolution > 7:
            return "MEDIUM"
        return "LOW"
    
    def _generate_recommendations(self, cluster: Dict, categories: List[str], locations: List[str]) -> List[str]:
        """Generate actionable recommendations for a cluster."""
        recommendations = []
        
        if 'ROAD' in categories or 'WASTE' in categories:
            recommendations.append("Planifier une inspection régulière de la zone")
        
        if 'WATER' in categories:
            recommendations.append("Vérifier l'état des canalisations et du réseau d'assainissement")
        
        if 'LIGHTING' in categories:
            recommendations.append("Programmer le remplacement des lampadaires défectueux")
        
        if 'SAFETY' in categories:
            recommendations.append("Prioriser l'intervention pour les problèmes de sécurité")
        
        if len(locations) > 2:
            recommendations.append("Coordonner avec plusieurs municipalités pour une solution régionale")
        
        if cluster['size'] > 10:
            recommendations.append("Allouer des ressources supplémentaires pour cette zone")
        
        if cluster.get('avg_resolution_days', 0) > 7:
            recommendations.append("Optimiser le processus de résolution pour réduire les délais")
        
        recommendations.append("Surveiller l'évolution des signalements dans cette zone")
        
        return recommendations[:5]
    
    def _describe_cluster(self, main_issues: List[str], categories: List[str], size: int) -> str:
        """Generate human-readable cluster description."""
        cat_labels = {
            'WASTE': 'gestion des déchets',
            'ROAD': 'infrastructures routières',
            'LIGHTING': 'éclairage public',
            'WATER': 'réseau d\'eau et assainissement',
            'SAFETY': 'sécurité publique',
            'PUBLIC_PROPERTY': 'domaine public',
            'GREEN_SPACE': 'espaces verts',
            'OTHER': 'autres problèmes'
        }
        
        cat_names = [cat_labels.get(c, c) for c in categories if c in cat_labels]
        
        if len(main_issues) == 1:
            issue = main_issues[0]
        else:
            issue = f"{len(main_issues)} problèmes différents"
        
        cat_str = ', '.join(cat_names) if cat_names else 'problèmes divers'
        
        return f"Cluster de {size} signalements concernant {cat_str} dans la zone: {issue}"
    
    def _calculate_trend(self, complaints: List[Dict]) -> str:
        """Determine trend based on complaint dates."""
        if len(complaints) < 2:
            return "STABLE"
        
        dates = []
        for c in complaints:
            try:
                d = c.get('createdAt', c.get('submittedAt'))
                if isinstance(d, str):
                    dates.append(datetime.fromisoformat(d.replace('Z', '+00:00')))
                elif isinstance(d, datetime):
                    dates.append(d)
            except:
                pass
        
        if len(dates) < 2:
            return "STABLE"
        
        dates.sort()
        first_half = dates[:len(dates)//2]
        second_half = dates[len(dates)//2:]
        
        first_count = sum(1 for d in dates if d <= first_half[-1])
        second_count = sum(1 for d in dates if d >= second_half[0])
        
        if second_count > first_count * 1.5:
            return "INCREASING"
        elif second_count < first_count * 0.5:
            return "DECREASING"
        return "STABLE"
    
    def _cluster_complaints(self, texts: List[str], n_clusters: Optional[int] = None) -> Tuple[np.ndarray, Optional[np.ndarray]]:
        """Cluster complaints using text embeddings."""
        if not texts:
            return np.array([]), None
        
        if n_clusters is None:
            n_clusters = min(10, len(texts) // 3 + 1)
        
        n_clusters = max(1, min(n_clusters, len(texts)))
        
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            try:
                embeddings = encode_for_clustering(texts)
                if embeddings.shape[0] < n_clusters:
                    return np.zeros(len(texts)), None
                kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
                return kmeans.fit_predict(embeddings), embeddings
            except Exception as e:
                print(f"Sentence-transformer clustering error: {e}")
        
        if SKLEARN_AVAILABLE:
            try:
                self.vectorizer = TfidfVectorizer(max_features=100, ngram_range=(1, 2))
                tfidf = self.vectorizer.fit_transform(texts)
                
                if tfidf.shape[0] < n_clusters:
                    return np.zeros(len(texts)), None
                    
                kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
                return kmeans.fit_predict(tfidf), tfidf.toarray()
            except Exception as e:
                print(f"TF-IDF clustering error: {e}")
        
        return np.zeros(len(texts)), None
    
    def analyze_clusters(self, complaints: List[Dict[str, Any]], 
                         governorate: Optional[str] = None,
                         municipality: Optional[str] = None,
                         category: Optional[str] = None,
                         days: int = 30) -> Dict[str, Any]:
        """
        Analyze complaints to identify root cause clusters.
        
        Args:
            complaints: List of complaint data
            governorate: Filter by governorate
            municipality: Filter by municipality
            category: Filter by category
            days: Number of days to look back
            
        Returns:
            Cluster analysis results
        """
        filtered = []
        cutoff = datetime.now() - timedelta(days=days)
        
        for c in complaints:
            created = c.get('createdAt', c.get('submittedAt'))
            if isinstance(created, str):
                try:
                    created = datetime.fromisoformat(created.replace('Z', '+00:00'))
                except:
                    continue
            elif not isinstance(created, datetime):
                continue
            
            if created < cutoff:
                continue
            
            if governorate and c.get('governorate') != governorate:
                continue
            if municipality and c.get('municipality') != municipality:
                continue
            if category and c.get('category') != category:
                continue
            
            filtered.append(c)
        
        if len(filtered) < 3:
            return {
                "success": True,
                "total_complaints": len(filtered),
                "clusters": [],
                "summary": "Pas assez de données pour former des clusters significatifs",
                "recommendations": []
            }
        
        texts = []
        for c in filtered:
            text = self._clean_text(f"{c.get('title', '')} {c.get('description', '')}")
            texts.append(text)
        
        cluster_labels, _ = self._cluster_complaints(texts, n_clusters=None)
        
        clusters_dict = defaultdict(list)
        for i, label in enumerate(cluster_labels):
            clusters_dict[int(label)].append(filtered[i])
        
        cluster_results = []
        
        for cluster_id, cluster_complaints in clusters_dict.items():
            if len(cluster_complaints) < 2:
                continue
            
            titles = [c.get('title', '') for c in cluster_complaints]
            descriptions = [c.get('description', '') for c in cluster_complaints]
            categories = list(set(c.get('category', 'OTHER') for c in cluster_complaints))
            locations = list(set(c.get('municipality', '') for c in cluster_complaints if c.get('municipality')))
            
            keywords = self._extract_keywords_from_titles(titles)
            main_issues = list(keywords.keys())[:5]
            
            resolution_days = []
            for c in cluster_complaints:
                created = c.get('createdAt', c.get('submittedAt'))
                resolved = c.get('resolvedAt')
                
                if isinstance(created, str):
                    try:
                        created = datetime.fromisoformat(created.replace('Z', '+00:00'))
                    except:
                        continue
                
                if resolved:
                    if isinstance(resolved, str):
                        try:
                            resolved = datetime.fromisoformat(resolved.replace('Z', '+00:00'))
                        except:
                            continue
                    
                    days_taken = (resolved - created).days
                    if days_taken >= 0:
                        resolution_days.append(days_taken)
            
            avg_resolution = sum(resolution_days) / len(resolution_days) if resolution_days else 0
            
            severity = self._calculate_severity(cluster_complaints, avg_resolution)
            recommendations = self._generate_recommendations(
                {'size': len(cluster_complaints), 'avg_resolution_days': avg_resolution},
                categories, locations
            )
            
            cluster_result = ClusterResult(
                cluster_id=cluster_id,
                size=len(cluster_complaints),
                main_issues=main_issues,
                locations=locations,
                categories=categories,
                avg_resolution_days=round(avg_resolution, 1),
                severity=severity,
                description=self._describe_cluster(main_issues, categories, len(cluster_complaints)),
                recommendations=recommendations,
                sample_complaints=cluster_complaints[:3],
                trend=self._calculate_trend(cluster_complaints)
            )
            
            cluster_results.append(cluster_result)
        
        cluster_results.sort(key=lambda x: x.size, reverse=True)
        
        severity_counts = {'CRITICAL': 0, 'HIGH': 0, 'MEDIUM': 0, 'LOW': 0}
        for c in cluster_results:
            severity_counts[c.severity] += 1
        
        all_recommendations = []
        for c in cluster_results:
            all_recommendations.extend(c.recommendations[:2])
        all_recommendations = list(dict.fromkeys(all_recommendations))[:10]
        
        return {
            "success": True,
            "total_complaints": len(filtered),
            "num_clusters": len(cluster_results),
            "clusters": [
                {
                    "id": c.cluster_id,
                    "size": c.size,
                    "percentage": round(c.size / len(filtered) * 100, 1),
                    "main_issues": c.main_issues,
                    "locations": c.locations,
                    "categories": c.categories,
                    "avg_resolution_days": c.avg_resolution_days,
                    "severity": c.severity,
                    "description": c.description,
                    "recommendations": c.recommendations,
                    "sample_titles": [s.get('title', '') for s in c.sample_complaints],
                    "trend": c.trend
                }
                for c in cluster_results
            ],
            "severity_distribution": severity_counts,
            "summary": self._generate_summary(cluster_results, len(filtered)),
            "recommendations": all_recommendations
        }
    
    def _extract_keywords_from_titles(self, titles: List[str]) -> Dict[str, int]:
        """Extract frequent keywords from titles."""
        stop_words = {'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'en', 'à', 'au', 'aux', 
                      'pour', 'dans', 'sur', 'avec', 'sans', 'est', 'sont', 'plus', 'que', 'qui', 'ce',
                      'cette', 'depuis', 'dans', 'il', 'elle', 'ne', 'se', 'pas', 'lieu', 'endroit'}
        
        word_freq = defaultdict(int)
        
        for title in titles:
            words = self._clean_text(title).split()
            for word in words:
                if len(word) > 3 and word not in stop_words:
                    word_freq[word] += 1
        
        sorted_words = dict(sorted(word_freq.items(), key=lambda x: x[1], reverse=True))
        return sorted_words
    
    def _generate_summary(self, clusters: List[ClusterResult], total: int) -> str:
        """Generate summary text of cluster analysis."""
        if not clusters:
            return "Aucun cluster significatif identifié."
        
        critical = [c for c in clusters if c.severity == 'CRITICAL']
        high = [c for c in clusters if c.severity == 'HIGH']
        
        lines = []
        lines.append(f"Analyse de {total} signalements effectuée.")
        lines.append(f"{len(clusters)} groupes de problèmes systémiques identifiés.")
        
        if critical:
            lines.append(f"⚠️ {len(critical)} cluster(s) critique(s) nécessitent une attention immédiate.")
        
        if high:
            lines.append(f"🔶 {len(high)} cluster(s) de haute priorité à traiter en priorité.")
        
        largest = clusters[0]
        lines.append(f"📍 Problème principal: {largest.main_issues[0] if largest.main_issues else 'Non identifié'} ({largest.size} signalements, {largest.size/total*100:.0f}%)")
        
        return " ".join(lines)


_clustering_service = None

def get_clustering_service() -> RootCauseClusteringService:
    """Get singleton clustering service instance."""
    global _clustering_service
    if _clustering_service is None:
        _clustering_service = RootCauseClusteringService()
    return _clustering_service

def analyze_root_causes(complaints: List[Dict], **kwargs) -> Dict:
    """Convenience function for root cause analysis."""
    return get_clustering_service().analyze_clusters(complaints, **kwargs)