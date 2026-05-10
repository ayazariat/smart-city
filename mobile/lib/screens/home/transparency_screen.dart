import 'package:flutter/material.dart';
import 'package:smart_city_app/core/constants/app_theme.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/models/complaint_model.dart';
import 'package:smart_city_app/services/api_client.dart';
import 'package:smart_city_app/data/tunisia_geography.dart';

class TransparencyScreen extends StatefulWidget {
  const TransparencyScreen({super.key});

  @override
  State<TransparencyScreen> createState() => _TransparencyScreenState();
}

class _TransparencyScreenState extends State<TransparencyScreen> {
  final ComplaintService _complaintService = ComplaintService();
  Map<String, dynamic> _stats = {};
  List<Complaint> _complaints = [];
  List<dynamic> _categoryStats = [];
  List<dynamic> _municipalityStats = [];
  List<dynamic> _monthlyTrends = [];
  Map<String, dynamic> _byGovernorate = {};
  bool _isLoading = true;
  String? _error;
  String _searchQuery = '';
  String _categoryFilter = '';
  String? _selectedGovernorate;
  final TextEditingController _searchController = TextEditingController();

  static const Map<String, String> _categoryLabels = {
    'ROAD': 'Routes & Infrastructure',
    'LIGHTING': 'Éclairage Public',
    'WASTE': 'Déchets & Propreté',
    'WATER': 'Eau & Drainage',
    'SAFETY': 'Sécurité Publique',
    'PUBLIC_PROPERTY': 'Domaine Public',
    'GREEN_SPACE': 'Espaces Verts',
    'OTHER': 'Autre',
  };

  static const Map<String, Color> _categoryColors = {
    'WASTE': Color(0xFF22C55E),
    'ROAD': Color(0xFF4B5563),
    'LIGHTING': Color(0xFFEAB308),
    'WATER': Color(0xFF3B82F6),
    'SAFETY': Color(0xFFEF4444),
    'PUBLIC_PROPERTY': Color(0xFFA855F7),
    'GREEN_SPACE': Color(0xFF10B981),
    'OTHER': Color(0xFF64748B),
  };

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    if (mounted) setState(() { _isLoading = true; _error = null; });
    try {
      final stats = await _complaintService.getPublicStats();
      final complaints = await _complaintService.getPublicComplaints(limit: 50);
      if (mounted) {
        setState(() {
          _stats = stats;
          _complaints = complaints;
          // Extract consolidated data from stats response
          if (stats['byCategory'] is List) {
            _categoryStats = stats['byCategory'] as List;
          }
          if (stats['byMunicipality'] is List) {
            _municipalityStats = stats['byMunicipality'] as List;
          }
          if (stats['monthlyTrends'] is List) {
            _monthlyTrends = stats['monthlyTrends'] as List;
          }
          if (stats['byGovernorate'] is Map) {
            _byGovernorate = Map<String, dynamic>.from(stats['byGovernorate'] as Map);
          }
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  List<Complaint> get _filteredComplaints {
    var list = List<Complaint>.from(_complaints);
    if (_categoryFilter.isNotEmpty) {
      list = list.where((c) => c.category == _categoryFilter).toList();
    }
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list.where((c) =>
        c.title.toLowerCase().contains(q) ||
        c.description.toLowerCase().contains(q) ||
        (c.municipalityName ?? '').toLowerCase().contains(q)
      ).toList();
    }
    return list;
  }

  String _categoryLabel(String cat) => _categoryLabels[cat] ?? cat;

  String _statusLabel(String status) {
    switch (status) {
      case 'SUBMITTED': return 'Soumis';
      case 'VALIDATED': return 'Validé';
      case 'ASSIGNED': return 'Assigné';
      case 'IN_PROGRESS': return 'En cours';
      case 'RESOLVED': return 'Résolu';
      case 'CLOSED': return 'Clôturé';
      case 'REJECTED': return 'Rejeté';
      default: return status;
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'SUBMITTED': return AppTheme.statusPending;
      case 'VALIDATED': return AppTheme.statusValidated;
      case 'ASSIGNED': return AppTheme.statusAssigned;
      case 'IN_PROGRESS': return AppTheme.statusInProgress;
      case 'RESOLVED': return AppTheme.statusResolved;
      case 'CLOSED': return AppTheme.statusClosed;
      case 'REJECTED': return AppTheme.statusRejected;
      default: return AppTheme.textMuted;
    }
  }

  int _asInt(dynamic v) {
    if (v is int) return v;
    if (v is double) return v.round();
    if (v is String) return int.tryParse(v) ?? 0;
    return 0;
  }

  double _asDouble(dynamic v) {
    if (v is double) return v;
    if (v is int) return v.toDouble();
    if (v is String) return double.tryParse(v) ?? 0;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final total = _asInt(_stats['total']);
    final resolved = _asInt(_stats['resolved']);
    final inProgress = _asInt(_stats['inProgress']);
    final pending = _asInt(_stats['pending']);
    final rate = total > 0 ? (resolved / total * 100).round() : _asInt(_stats['resolutionRate']);
    final avgDays = _asDouble(_stats['avgResolutionDays'] ?? _stats['avgFixTime']);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Tableau de bord public'),
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: _loadData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : _error != null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 48, color: Colors.red[400]),
                  const SizedBox(height: 12),
                  Text('Erreur: $_error', textAlign: TextAlign.center,
                    style: const TextStyle(color: AppTheme.textSecondary)),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: _loadData,
                    style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
                    child: const Text('Réessayer', style: TextStyle(color: Colors.white)),
                  ),
                ],
              ),
            )
          : RefreshIndicator(
              onRefresh: _loadData,
              color: AppTheme.primary,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Hero section
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [AppTheme.primary, AppTheme.primaryDark],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.primary.withOpacity(0.3),
                            blurRadius: 12,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Signalez les problèmes\nde votre ville',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              height: 1.3,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Participez à l\'amélioration de votre environnement',
                            style: TextStyle(color: Colors.white70, fontSize: 14),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              _heroStat('$total', 'Signalements', Icons.description),
                              const SizedBox(width: 12),
                              _heroStat('$resolved', 'Résolus', Icons.check_circle),
                              const SizedBox(width: 12),
                              _heroStat('$rate%', 'Taux', Icons.trending_up),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // KPI Cards
                    const Text(
                      'Indicateurs clés',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1.5,
                      children: [
                        _buildStatCard('Total', '$total', Icons.summarize, AppTheme.primary),
                        _buildStatCard('Résolus', '$resolved', Icons.check_circle, AppTheme.success),
                        _buildStatCard('En cours', '$inProgress', Icons.engineering, const Color(0xFFF97316)),
                        _buildStatCard('En attente', '$pending', Icons.pending, const Color(0xFFF59E0B)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    // Resolution rate bar
                    if (total > 0) ...[
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppTheme.surface,
                          borderRadius: BorderRadius.circular(AppTheme.radiusXl),
                          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Taux de résolution',
                                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                                Text('$rate%',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 18,
                                    color: AppTheme.success,
                                  )),
                              ],
                            ),
                            const SizedBox(height: 8),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: rate / 100,
                                minHeight: 10,
                                backgroundColor: Colors.grey.shade200,
                                valueColor: const AlwaysStoppedAnimation(AppTheme.success),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text('$resolved / $total signalements résolus',
                              style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],

                    // Category performance section
                    if (_categoryStats.isNotEmpty) ...[
                      _buildSectionHeader('Par catégorie', Icons.bar_chart),
                      const SizedBox(height: 12),
                      _buildCategorySection(),
                      const SizedBox(height: 20),
                    ],

                    // Municipality leaderboard
                    if (_municipalityStats.isNotEmpty) ...[
                      _buildSectionHeader('Classement des municipalités', Icons.emoji_events),
                      const SizedBox(height: 12),
                      _buildMunicipalityLeaderboard(),
                      const SizedBox(height: 20),
                    ],

                    // Monthly trends
                    if (_monthlyTrends.isNotEmpty) ...[
                      _buildSectionHeader('Tendances mensuelles', Icons.trending_up),
                      const SizedBox(height: 12),
                      _buildMonthlyTrends(),
                      const SizedBox(height: 20),
                    ],

                    // Governorate overview
                    if (_byGovernorate.isNotEmpty) ...[
                      _buildSectionHeader('Vue par gouvernorat', Icons.map),
                      const SizedBox(height: 12),
                      _buildGovernorateOverview(),
                      const SizedBox(height: 20),
                    ],

                    // Search & filter
                    const Text(
                      'Signalements publics',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      decoration: BoxDecoration(
                        color: AppTheme.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: TextField(
                        controller: _searchController,
                        onChanged: (v) => setState(() => _searchQuery = v),
                        decoration: InputDecoration(
                          hintText: 'Rechercher un signalement...',
                          prefixIcon: const Icon(Icons.search, color: AppTheme.textSecondary),
                          suffixIcon: _searchQuery.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear),
                                  onPressed: () {
                                    _searchController.clear();
                                    setState(() => _searchQuery = '');
                                  },
                                )
                              : null,
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    // Category filter chips
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _filterChip('', 'Tous'),
                          ..._categoryLabels.entries.map((e) => _filterChip(e.key, e.value)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      '${_filteredComplaints.length} résultats',
                      style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                    ),
                    const SizedBox(height: 8),
                    if (_filteredComplaints.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(32),
                        decoration: BoxDecoration(
                          color: AppTheme.surface,
                          borderRadius: BorderRadius.circular(AppTheme.radiusXl),
                        ),
                        child: const Center(
                          child: Column(
                            children: [
                              Icon(Icons.inbox, size: 48, color: AppTheme.textMuted),
                              SizedBox(height: 12),
                              Text('Aucun signalement trouvé',
                                style: TextStyle(color: AppTheme.textSecondary)),
                            ],
                          ),
                        ),
                      )
                    else
                      ..._filteredComplaints.map((c) => _buildComplaintCard(c)),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _heroStat(String value, String label, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.15),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(icon, color: Colors.white, size: 20),
            const SizedBox(height: 4),
            Text(value, style: const TextStyle(
              color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
            Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11)),
          ],
        ),
      ),
    );
  }

  Widget _filterChip(String value, String label) {
    final isSelected = _categoryFilter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label, style: TextStyle(
          fontSize: 12,
          color: isSelected ? AppTheme.primary : AppTheme.textSecondary,
        )),
        selected: isSelected,
        onSelected: (_) => setState(() => _categoryFilter = value),
        selectedColor: AppTheme.primary.withOpacity(0.15),
        checkmarkColor: AppTheme.primary,
        backgroundColor: AppTheme.surface,
        side: BorderSide(color: isSelected ? AppTheme.primary : AppTheme.border),
      ),
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusXl),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const Spacer(),
          Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
          Text(label, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
        ],
      ),
    );
  }

  Widget _buildComplaintCard(Complaint c) {
    final statusColor = _statusColor(c.status);
    final photoUrl = c.media.isNotEmpty && c.media[0].url.isNotEmpty
        ? (c.media[0].url.startsWith('http')
            ? c.media[0].url
            : '${ApiClient.serverBaseUrl}${c.media[0].url}')
        : null;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Photo
          if (photoUrl != null)
            SizedBox(
              height: 160,
              width: double.infinity,
              child: Image.network(
                photoUrl,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  height: 160,
                  color: AppTheme.background,
                  child: const Center(child: Icon(Icons.image, color: AppTheme.textMuted, size: 40)),
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        _statusLabel(c.status),
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: statusColor),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        _categoryLabel(c.category),
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.primary),
                      ),
                    ),
                    const Spacer(),
                    Text(
                      '${c.createdAt.day}/${c.createdAt.month}/${c.createdAt.year}',
                      style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  c.title,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: AppTheme.textPrimary),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Text(
                  c.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    if (c.municipalityName != null) ...[
                      const Icon(Icons.location_on, size: 14, color: AppTheme.textMuted),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          c.municipalityName!,
                          style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                    const Spacer(),
                    if (c.confirmationCount > 0) ...[
                      const Icon(Icons.check_circle, size: 14, color: AppTheme.primary),
                      const SizedBox(width: 4),
                      Text('${c.confirmationCount}',
                        style: const TextStyle(fontSize: 12, color: AppTheme.primary, fontWeight: FontWeight.w600)),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─── Section header ───────────────────────────────────────────────────────
  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: AppTheme.primary, size: 20),
        const SizedBox(width: 8),
        Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
      ],
    );
  }

  // ─── Category performance bars ────────────────────────────────────────────
  Widget _buildCategorySection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusXl),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)],
      ),
      child: Column(
        children: _categoryStats.map<Widget>((cat) {
          final category = (cat['category'] ?? '').toString();
          final label = (cat['label'] ?? _categoryLabel(category)).toString();
          final total = _asInt(cat['total']);
          final rate = _asDouble(cat['rate']);
          final color = _categoryColors[category.toUpperCase()] ?? AppTheme.primary;
          final rateColor = rate >= 70 ? AppTheme.success : rate >= 40 ? const Color(0xFFF59E0B) : Colors.red;
          return Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(children: [
                      Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                      const SizedBox(width: 8),
                      Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                    ]),
                    Row(children: [
                      Text('$total', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(color: rateColor.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                        child: Text('${rate.toStringAsFixed(1)}%', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: rateColor)),
                      ),
                    ]),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: total > 0 ? (rate / 100).clamp(0.0, 1.0) : 0,
                    minHeight: 8,
                    backgroundColor: Colors.grey.shade200,
                    valueColor: AlwaysStoppedAnimation(color),
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  // ─── Municipality leaderboard ─────────────────────────────────────────────
  Widget _buildMunicipalityLeaderboard() {
    final top = _municipalityStats.take(10).toList();
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusXl),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: AppTheme.primary.withOpacity(0.05),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: const Row(children: [
              SizedBox(width: 32, child: Text('#', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.primary))),
              Expanded(child: Text('Municipalité', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.primary))),
              SizedBox(width: 50, child: Text('Total', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.primary), textAlign: TextAlign.right)),
              SizedBox(width: 60, child: Text('Taux', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.primary), textAlign: TextAlign.right)),
            ]),
          ),
          ...top.asMap().entries.map((entry) {
            final idx = entry.key;
            final mun = entry.value;
            final name = (mun['name'] ?? 'Inconnu').toString();
            final total = _asInt(mun['total']);
            final rate = _asDouble(mun['rate']);
            final rateColor = rate >= 70 ? AppTheme.success : rate >= 50 ? const Color(0xFFF59E0B) : Colors.red;
            final rankColor = idx == 0 ? const Color(0xFFD97706) : idx == 1 ? Colors.grey : idx == 2 ? const Color(0xFFB45309) : AppTheme.textMuted;
            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(border: Border(bottom: BorderSide(color: AppTheme.border.withOpacity(0.5)))),
              child: Row(children: [
                SizedBox(width: 32, child: Container(
                  width: 24, height: 24,
                  decoration: BoxDecoration(color: rankColor.withOpacity(0.1), shape: BoxShape.circle),
                  child: Center(child: Text('${idx + 1}', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: rankColor))),
                )),
                Expanded(child: Text(name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500))),
                SizedBox(width: 50, child: Text('$total', style: const TextStyle(fontSize: 13), textAlign: TextAlign.right)),
                SizedBox(width: 60, child: Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(color: rateColor.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                    child: Text('${rate.toStringAsFixed(0)}%', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: rateColor)),
                  ),
                ])),
              ]),
            );
          }),
        ],
      ),
    );
  }

  // ─── Monthly trends bar chart ─────────────────────────────────────────────
  Widget _buildMonthlyTrends() {
    if (_monthlyTrends.isEmpty) return const SizedBox.shrink();
    final maxVal = _monthlyTrends.fold<int>(0, (max, t) {
      final s = _asInt(t['submitted']);
      return s > max ? s : max;
    });
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusXl),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)],
      ),
      child: Column(children: [
        Row(children: [
          _legendDot(const Color(0xFF3B82F6), 'Soumis'),
          const SizedBox(width: 16),
          _legendDot(AppTheme.success, 'Résolus'),
        ]),
        const SizedBox(height: 16),
        SizedBox(
          height: 120,
          child: LayoutBuilder(builder: (context, constraints) {
            return Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: _monthlyTrends.map<Widget>((t) {
                final submitted = _asInt(t['submitted']);
                final resolved = _asInt(t['resolved']);
                final month = (t['month'] ?? '').toString();
                final barH = maxVal > 0 ? (submitted / maxVal * 90) : 0.0;
                final resolvedH = maxVal > 0 ? (resolved / maxVal * 90) : 0.0;
                return Expanded(child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 3),
                  child: Column(mainAxisAlignment: MainAxisAlignment.end, children: [
                    Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                      Expanded(child: Container(height: barH, decoration: BoxDecoration(color: const Color(0xFF3B82F6).withOpacity(0.7), borderRadius: const BorderRadius.vertical(top: Radius.circular(3))))),
                      const SizedBox(width: 2),
                      Expanded(child: Container(height: resolvedH, decoration: BoxDecoration(color: AppTheme.success, borderRadius: const BorderRadius.vertical(top: Radius.circular(3))))),
                    ]),
                    const SizedBox(height: 4),
                    Text(month.length >= 3 ? month.substring(0, 3) : month, style: const TextStyle(fontSize: 9, color: AppTheme.textMuted), textAlign: TextAlign.center),
                  ]),
                ));
              }).toList(),
            );
          }),
        ),
      ]),
    );
  }

  Widget _legendDot(Color color, String label) {
    return Row(children: [
      Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
      const SizedBox(width: 4),
      Text(label, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
    ]);
  }

  // ─── Governorate overview grid ────────────────────────────────────────────
  Widget _buildGovernorateOverview() {
    final entries = _byGovernorate.entries.toList()
      ..sort((a, b) => _asInt((b.value as Map)['total']) - _asInt((a.value as Map)['total']));
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 1.6,
      children: entries.take(12).map((entry) {
        final gov = entry.key;
        final data = entry.value as Map;
        final total = _asInt(data['total']);
        final rate = _asInt(data['resolutionRate'] ?? 0);
        final rateColor = rate >= 70 ? AppTheme.success : rate >= 50 ? const Color(0xFFF59E0B) : total > 0 ? Colors.red : AppTheme.textMuted;
        final borderColor = rate >= 70 ? AppTheme.success.withOpacity(0.3) : rate >= 50 ? const Color(0xFFF59E0B).withOpacity(0.3) : total > 0 ? Colors.red.withOpacity(0.3) : AppTheme.border;
        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: borderColor),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 6)],
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Expanded(child: Text(gov, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textPrimary), overflow: TextOverflow.ellipsis)),
              if (total > 0) Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                decoration: BoxDecoration(color: rateColor.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                child: Text('$rate%', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: rateColor)),
              ),
            ]),
            const Spacer(),
            Text('$total signalements', style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
            if (total > 0) ...[
              const SizedBox(height: 4),
              ClipRRect(
                borderRadius: BorderRadius.circular(2),
                child: LinearProgressIndicator(
                  value: (rate / 100).clamp(0.0, 1.0),
                  minHeight: 4,
                  backgroundColor: Colors.grey.shade200,
                  valueColor: AlwaysStoppedAnimation(rateColor),
                ),
              ),
            ],
          ]),
        );
      }).toList(),
    );
  }
}
