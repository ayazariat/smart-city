import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/core/constants/colors.dart';
import 'package:smart_city_app/services/api_client.dart';
import 'package:smart_city_app/providers/complaints_provider.dart';

class ClusteringScreen extends ConsumerStatefulWidget {
  final String? governorate;
  final String? municipality;
  final int days;

  const ClusteringScreen({
    super.key,
    this.governorate,
    this.municipality,
    this.days = 30,
  });

  @override
  ConsumerState<ClusteringScreen> createState() => _ClusteringScreenState();
}

class _ClusteringScreenState extends ConsumerState<ClusteringScreen> {
  final ApiClient _apiClient = ApiClient();
  Map<String, dynamic>? _clusterData;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadClusterData();
  }

  Future<void> _loadClusterData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final state = ref.read(myComplaintsProvider);
      final complaints = state.complaints;

      final complaintDicts = complaints
          .map(
            (c) => {
              'id': c.id,
              'title': c.title,
              'description': c.description,
              'category': c.category,
              'municipality': c.municipalityName,
              'governorate': c.governorate,
              'urgency': c.urgency,
              'priorityScore': c.priorityScore,
              'status': c.status,
              'createdAt': c.createdAt.toIso8601String(),
              'resolvedAt': c.resolvedAt?.toIso8601String(),
            },
          )
          .toList();

      final response = await _apiClient.post('/ai/clustering/analyze', {
        'complaints': complaintDicts,
        'filters': {
          'governorate': widget.governorate,
          'municipality': widget.municipality,
          'days': widget.days,
        },
      });

      setState(() {
        _clusterData = response;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Color _severityColor(String severity) {
    switch (severity) {
      case 'CRITICAL':
        return const Color(0xFFEF4444);
      case 'HIGH':
        return const Color(0xFFF97316);
      case 'MEDIUM':
        return const Color(0xFFEAB308);
      case 'LOW':
        return const Color(0xFF22C55E);
      default:
        return Colors.grey;
    }
  }

  IconData _severityIcon(String severity) {
    switch (severity) {
      case 'CRITICAL':
        return Icons.warning;
      case 'HIGH':
        return Icons.error;
      case 'MEDIUM':
        return Icons.info;
      case 'LOW':
        return Icons.check_circle;
      default:
        return Icons.help;
    }
  }

  String _categoryLabel(String cat) {
    switch (cat) {
      case 'WASTE':
        return 'Déchets';
      case 'ROAD':
        return 'Routes';
      case 'LIGHTING':
        return 'Éclairage';
      case 'WATER':
        return 'Eau';
      case 'SAFETY':
        return 'Sécurité';
      case 'PUBLIC_PROPERTY':
        return 'Domaine public';
      case 'GREEN_SPACE':
        return 'Espaces verts';
      default:
        return 'Autre';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        title: const Text(
          'Analyse des problèmes',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadClusterData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : _error != null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 48, color: Colors.red[400]),
                  const SizedBox(height: 12),
                  Text('Erreur: $_error'),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: _loadClusterData,
                    child: const Text('Réessayer'),
                  ),
                ],
              ),
            )
          : _buildContent(),
    );
  }

  Widget _buildContent() {
    final data = _clusterData?['data'] ?? {};
    final clusters = data['clusters'] as List? ?? [];
    final summary = data['summary'] as String? ?? '';
    final total = data['total_complaints'] as int? ?? 0;
    final severityDist =
        data['severity_distribution'] as Map<String, dynamic>? ?? {};

    return RefreshIndicator(
      onRefresh: _loadClusterData,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primary, AppColors.primaryDark],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.insights,
                          color: Colors.white,
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Analyse des causes racines',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '$total signalements analysés',
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    summary,
                    style: const TextStyle(color: Colors.white, fontSize: 14),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            _buildSeverityOverview(severityDist),
            const SizedBox(height: 20),
            const Text(
              'Problèmes systémiques identifiés',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            if (clusters.isEmpty)
              Container(
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 8,
                    ),
                  ],
                ),
                child: const Center(
                  child: Column(
                    children: [
                      Icon(Icons.search_off, size: 48, color: Colors.grey),
                      SizedBox(height: 12),
                      Text(
                        'Aucun cluster significatif',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Pas assez de données pour identifier des problèmes systémiques',
                      ),
                    ],
                  ),
                ),
              )
            else
              ...clusters.map((c) => _buildClusterCard(c)),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildSeverityOverview(Map<String, dynamic> severityDist) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 8),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Vue d\'ensemble de la gravité',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildSeverityBadge(
                'CRITIQUE',
                severityDist['CRITICAL'] ?? 0,
                const Color(0xFFEF4444),
              ),
              const SizedBox(width: 8),
              _buildSeverityBadge(
                'HAUTE',
                severityDist['HIGH'] ?? 0,
                const Color(0xFFF97316),
              ),
              const SizedBox(width: 8),
              _buildSeverityBadge(
                'MOYENNE',
                severityDist['MEDIUM'] ?? 0,
                const Color(0xFFEAB308),
              ),
              const SizedBox(width: 8),
              _buildSeverityBadge(
                'BASSE',
                severityDist['LOW'] ?? 0,
                const Color(0xFF22C55E),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSeverityBadge(String label, int count, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Text(
              '$count',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildClusterCard(Map<String, dynamic> cluster) {
    final severity = cluster['severity'] as String? ?? 'LOW';
    final color = _severityColor(severity);
    final size = cluster['size'] as int? ?? 0;
    final percentage = cluster['percentage'] as double? ?? 0;
    final mainIssues = (cluster['main_issues'] as List?)?.cast<String>() ?? [];
    final categories = (cluster['categories'] as List?)?.cast<String>() ?? [];
    final locations = (cluster['locations'] as List?)?.cast<String>() ?? [];
    final avgDays = cluster['avg_resolution_days'] as double? ?? 0;
    final recommendations =
        (cluster['recommendations'] as List?)?.cast<String>() ?? [];
    final trend = cluster['trend'] as String? ?? 'STABLE';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(16),
              ),
              border: Border(
                bottom: BorderSide(color: color.withValues(alpha: 0.3)),
              ),
            ),
            child: Row(
              children: [
                Icon(_severityIcon(severity), color: color, size: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '$size signalements',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: color,
                        ),
                      ),
                      Text(
                        '$percentage% du total',
                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: color,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    severity,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (mainIssues.isNotEmpty) ...[
                  const Text(
                    'Problèmes principaux:',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: mainIssues
                        .map(
                          (issue) => Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF5F7FA),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              issue,
                              style: const TextStyle(fontSize: 12),
                            ),
                          ),
                        )
                        .toList(),
                  ),
                  const SizedBox(height: 16),
                ],
                Row(
                  children: [
                    if (categories.isNotEmpty) ...[
                      Expanded(
                        child: _buildInfoChip(
                          'Catégories',
                          categories.map(_categoryLabel).take(2).join(', '),
                        ),
                      ),
                    ],
                    if (locations.isNotEmpty) ...[
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildInfoChip(
                          'Zones',
                          locations.take(2).join(', '),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(Icons.timer, size: 16, color: Colors.grey[500]),
                    const SizedBox(width: 4),
                    Text(
                      'Délai moyen: ${avgDays.toStringAsFixed(1)}j',
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    ),
                    const Spacer(),
                    if (trend == 'INCREASING')
                      Row(
                        children: [
                          Icon(
                            Icons.trending_up,
                            size: 16,
                            color: Colors.red[400],
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'En hausse',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.red[400],
                            ),
                          ),
                        ],
                      )
                    else if (trend == 'DECREASING')
                      Row(
                        children: [
                          Icon(
                            Icons.trending_down,
                            size: 16,
                            color: Colors.green[400],
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'En baisse',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.green[400],
                            ),
                          ),
                        ],
                      )
                    else
                      Row(
                        children: [
                          Icon(
                            Icons.trending_flat,
                            size: 16,
                            color: Colors.grey[400],
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Stable',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
                if (recommendations.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  const Divider(),
                  const SizedBox(height: 8),
                  const Text(
                    'Recommandations:',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  const SizedBox(height: 8),
                  ...recommendations
                      .take(3)
                      .map(
                        (rec) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(
                                Icons.lightbulb_outline,
                                size: 16,
                                color: AppColors.primary,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  rec,
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.grey[700],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoChip(String label, String value) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF5F7FA),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 11, color: Colors.grey[500])),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
