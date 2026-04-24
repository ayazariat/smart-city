import 'package:flutter/material.dart';
import 'package:smart_city_app/models/complaint_model.dart';
import 'package:smart_city_app/services/api_client.dart';
import 'package:smart_city_app/core/constants/colors.dart';

class TransparencyScreen extends StatefulWidget {
  const TransparencyScreen({super.key});

  @override
  State<TransparencyScreen> createState() => _TransparencyScreenState();
}

class _TransparencyScreenState extends State<TransparencyScreen>
    with SingleTickerProviderStateMixin {
  final ApiClient _apiClient = ApiClient();
  late TabController _tabController;
  List<Complaint> _complaints = [];
  Map<String, dynamic> _stats = {};
  Map<String, dynamic> _allTimeStats = {};
  Map<String, dynamic> _categoryStats = {};
  List<dynamic> _monthlyTrends = [];
  List<dynamic> _municipalityStats = [];
  List<dynamic> _governorateStats = [];
  bool _isLoading = true;
  String _error = '';
  String _searchQuery = '';
  String _categoryFilter = '';
  String _selectedGovernorate = '';
  bool _isGridView = true;
  final _searchController = TextEditingController();
  bool _showHelp = false;

  static const _governoratePhotos = {
    'Tunis':
        'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Tunisia_Medina_of_Tunis.jpg/800px-Tunisia_Medina_of_Tunis.jpg',
    'Sfax':
        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Sfax_medina.jpg/800px-Sfax_medina.jpg',
    'Sousse':
        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Ribat_of_Sousse.jpg/800px-Ribat_of_Sousse.jpg',
    'Nabeul':
        'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Nabeul_pottery.jpg/800px-Nabeul_pottery.jpg',
    'Monastir':
        'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Monastir_Ribat.jpg/800px-Monastir_Ribat.jpg',
    'Bizerte':
        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Bizerte_harbor.jpg/800px-Bizerte_harbor.jpg',
  };

  static const _governorateList = [
    {
      'governorate': 'Tunis',
      'municipalities': [
        'Tunis',
        'Le Bardo',
        'Sidi Hassine',
        'Sijoumi',
        'El Omrane',
        'Carthage',
      ],
    },
    {
      'governorate': 'Sfax',
      'municipalities': [
        'Sfax',
        'Sidi Mansour',
        'Ezzahrouni',
        ' Gremda',
        'Tina',
      ],
    },
    {
      'governorate': 'Sousse',
      'municipalities': [
        'Sousse',
        'Msaken',
        'Sidi Bou Ali',
        'Kondar',
        'Hammam Sousse',
      ],
    },
    {
      'governorate': 'Nabeul',
      'municipalities': [
        'Nabeul',
        'Hammamet',
        'Menzel Temime',
        'Dar Chaabane',
        'Mornag',
      ],
    },
    {
      'governorate': 'Monastir',
      'municipalities': ['Monastir', 'Mahdia', 'Ksar Hellal', 'Mornag'],
    },
    {
      'governorate': 'Bizerte',
      'municipalities': ['Bizerte', 'Mateur', 'Ghar El Melh', 'Sejenane'],
    },
  ];

  static const _categoryColors = {
    'WASTE': Color(0xFF22C55E),
    'ROAD': Color(0xFF4B5563),
    'LIGHTING': Color(0xFFEAB308),
    'WATER': Color(0xFF3B82F6),
    'SAFETY': Color(0xFFEF4444),
    'PUBLIC_PROPERTY': Color(0xFFA855F7),
    'GREEN_SPACE': Color(0xFF10B981),
  };

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = '';
    });
    try {
      final statsRes = await _apiClient.get('/public/stats?period=month');
      final allTimeRes = await _apiClient.get('/public/stats?period=all');
      final catRes = await _apiClient.get(
        '/public/stats/by-category?period=month',
      );
      final munRes = await _apiClient.get(
        '/public/stats/by-municipality?period=month',
      );
      final trendsRes = await _apiClient.get(
        '/public/stats/monthly-trends?months=6',
      );
      final complaintsRes = await _apiClient.get('/public/complaints?limit=50');

      setState(() {
        _stats = statsRes is Map ? (statsRes['data'] ?? statsRes) : {};
        _allTimeStats = allTimeRes is Map
            ? (allTimeRes['data'] ?? allTimeRes)
            : {};
        _categoryStats = catRes is Map ? (catRes['data'] ?? catRes) : {};
        _municipalityStats = munRes is List
            ? munRes
            : (munRes is Map ? (munRes['data'] ?? []) : []);
        _monthlyTrends = trendsRes is List
            ? trendsRes
            : (trendsRes is Map ? (trendsRes['data'] ?? []) : []);

        final complaintData = complaintsRes;
        List<Complaint> found = [];
        if (complaintData is Map) {
          final data = complaintData['data'];
          if (data is Map && data['complaints'] != null) {
            found = (data['complaints'] as List)
                .map((c) => Complaint.fromJson(c))
                .toList();
          } else if (complaintData['complaints'] != null) {
            found = (complaintData['complaints'] as List)
                .map((c) => Complaint.fromJson(c))
                .toList();
          }
        } else if (complaintData is List) {
          found = complaintData.map((c) => Complaint.fromJson(c)).toList();
        }
        _complaints = found;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Erreur de connexion: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  List<Complaint> get _filteredComplaints {
    var filtered = List<Complaint>.from(_complaints);
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      filtered = filtered.where((c) {
        final title = c.title.toLowerCase();
        final desc = c.description.toLowerCase();
        final muni = (c.municipalityName ?? '').toLowerCase();
        return title.contains(q) || desc.contains(q) || muni.contains(q);
      }).toList();
    }
    if (_categoryFilter.isNotEmpty) {
      filtered = filtered.where((c) => c.category == _categoryFilter).toList();
    }
    return filtered;
  }

  String _categoryLabel(String? cat) {
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
        return cat ?? 'Autre';
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'SUBMITTED':
        return 'Soumis';
      case 'VALIDATED':
        return 'Validé';
      case 'ASSIGNED':
        return 'Assigné';
      case 'IN_PROGRESS':
        return 'En cours';
      case 'RESOLVED':
        return 'Résolu';
      case 'CLOSED':
        return 'Clôturé';
      case 'REJECTED':
        return 'Rejeté';
      default:
        return status;
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'SUBMITTED':
        return AppColors.statusSoumise;
      case 'VALIDATED':
        return AppColors.statusValidee;
      case 'ASSIGNED':
        return AppColors.statusAssignee;
      case 'IN_PROGRESS':
        return AppColors.statusEnCours;
      case 'RESOLVED':
        return AppColors.statusResolue;
      case 'CLOSED':
        return AppColors.statusCloturee;
      case 'REJECTED':
        return AppColors.statusRejetee;
      default:
        return Colors.grey;
    }
  }

  IconData _categoryIcon(String? cat) {
    switch (cat) {
      case 'WASTE':
        return Icons.delete_sweep;
      case 'ROAD':
        return Icons.add_road;
      case 'LIGHTING':
        return Icons.lightbulb;
      case 'WATER':
        return Icons.water_drop;
      case 'SAFETY':
        return Icons.shield;
      case 'PUBLIC_PROPERTY':
        return Icons.account_balance;
      case 'GREEN_SPACE':
        return Icons.park;
      default:
        return Icons.help_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        title: const Text('Tableau de bord public'),
        centerTitle: true,
        backgroundColor: AppColors.primary,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'Aperçu', icon: Icon(Icons.bar_chart, size: 18)),
            Tab(
              text: 'Gouvernorats',
              icon: Icon(Icons.location_city, size: 18),
            ),
            Tab(text: 'Signalements', icon: Icon(Icons.list_alt, size: 18)),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error.isNotEmpty
          ? _buildError()
          : TabBarView(
              controller: _tabController,
              children: [
                _buildOverview(),
                _buildGovernorates(),
                _buildComplaintsList(),
              ],
            ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 48, color: Colors.red.shade300),
          const SizedBox(height: 12),
          Text(_error, textAlign: TextAlign.center),
          const SizedBox(height: 12),
          ElevatedButton(onPressed: _loadData, child: const Text('Réessayer')),
        ],
      ),
    );
  }

  Widget _buildOverview() {
    final total = _stats['total'] ?? 0;
    final resolved = _stats['resolved'] ?? 0;
    final inProgress = _stats['inProgress'] ?? 0;
    final pending = _stats['pending'] ?? 0;
    final rate = total > 0 ? ((resolved / total) * 100).round() : 0;
    final avgDays = _stats['avgResolutionDays'] ?? 0;
    final slaRate = _stats['slaComplianceRate'] ?? 0;
    final allTimeTotal = _allTimeStats['total'] ?? total;
    final allTimeResolved = _allTimeStats['resolved'] ?? resolved;

    return RefreshIndicator(
      onRefresh: _loadData,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeroSection(allTimeTotal, allTimeResolved, slaRate),
            const SizedBox(height: 20),
            _buildKPICards(total, resolved, inProgress, rate, avgDays, slaRate),
            const SizedBox(height: 20),
            _buildResolutionPieChart(resolved, inProgress, pending, rate),
            const SizedBox(height: 20),
            _buildRecentResolutions(),
            const SizedBox(height: 20),
            _buildCategoriesSection(),
            const SizedBox(height: 20),
            _buildTrendsChart(),
            const SizedBox(height: 20),
            _buildCallToAction(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeroSection(int allTimeTotal, int allTimeResolved, int slaRate) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primary, AppColors.primaryDark],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withAlpha(76),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Signalez les problèmes\nde votre ville',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        height: 1.2,
                      ),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Participez à l\'amélioration de votre environnement',
                      style: TextStyle(color: Colors.white70, fontSize: 14),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withAlpha(25),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    Text(
                      '$allTimeTotal',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Text(
                      'Signalements',
                      style: TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withAlpha(25),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.check_circle, color: Colors.white, size: 24),
                      SizedBox(width: 8),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Problèmes résolus',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withAlpha(25),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.shield, color: Colors.white, size: 24),
                      const SizedBox(width: 8),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '$slaRate%',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const Text(
                            'dans les délais',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 10,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildKPICards(
    int total,
    int resolved,
    int inProgress,
    int rate,
    int avgDays,
    int slaRate,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Indicateurs clés',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Statistiques de la période',
          style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
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
            _buildStatCard(
              'Total',
              '$total',
              Icons.description,
              const Color(0xFF3B82F6),
            ),
            _buildStatCardWithTrend(
              'Résolus',
              '$resolved',
              Icons.check_circle,
              AppColors.primary,
              '$rate% sucès',
            ),
            _buildStatCard(
              'En cours',
              '$inProgress',
              Icons.schedule,
              const Color(0xFFF59E0B),
            ),
            _buildStatCard(
              'Délai moy.',
              '${avgDays}j',
              Icons.timer,
              const Color(0xFF8B5CF6),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStatCard(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(13),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textSecondary,
                ),
              ),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withAlpha(25),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
            ],
          ),
          const Spacer(),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCardWithTrend(
    String label,
    String value,
    IconData icon,
    Color color,
    String suffix,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(13),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textSecondary,
                ),
              ),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withAlpha(25),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
            ],
          ),
          const Spacer(),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            suffix,
            style: const TextStyle(fontSize: 11, color: AppColors.primary),
          ),
        ],
      ),
    );
  }

  Widget _buildResolutionPieChart(
    int resolved,
    int inProgress,
    int pending,
    int rate,
  ) {
    final total = resolved + inProgress + pending;
    if (total == 0) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(13),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'État des résolutions',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              SizedBox(
                width: 120,
                height: 120,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox(
                      width: 120,
                      height: 120,
                      child: CircularProgressIndicator(
                        value: rate / 100,
                        strokeWidth: 12,
                        backgroundColor: Colors.grey.shade200,
                        valueColor: const AlwaysStoppedAnimation(
                          AppColors.primary,
                        ),
                      ),
                    ),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '$rate%',
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                        const Text(
                          'résolu',
                          style: TextStyle(
                            fontSize: 10,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 24),
              Expanded(
                child: Column(
                  children: [
                    _buildLegendItem('Résolus', resolved, AppColors.primary),
                    const SizedBox(height: 8),
                    _buildLegendItem(
                      'En cours',
                      inProgress,
                      const Color(0xFFF59E0B),
                    ),
                    const SizedBox(height: 8),
                    _buildLegendItem(
                      'En attente',
                      pending,
                      const Color(0xFF3B82F6),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLegendItem(String label, int value, Color color) {
    return Row(
      children: [
        Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
        ),
        const Spacer(),
        Text(
          '$value',
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }

  Widget _buildRecentResolutions() {
    final resolvedComplaints = _complaints
        .where((c) => c.status == 'RESOLVED' || c.status == 'CLOSED')
        .take(6)
        .toList();
    if (resolvedComplaints.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Résolutions récentes',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            TextButton(
              onPressed: () => _tabController.animateTo(2),
              child: const Text('Voir tout'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 0.85,
          children: resolvedComplaints
              .map((c) => _buildResolvedCard(c))
              .toList(),
        ),
      ],
    );
  }

  Widget _buildResolvedCard(Complaint complaint) {
    final media = complaint.media;
    final hasPhoto = media.isNotEmpty && media[0].url.isNotEmpty;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(13),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 3,
            child: Container(
              width: double.infinity,
              color: AppColors.secondary,
              child: hasPhoto
                  ? Image.network(
                      media[0].url.startsWith('http')
                          ? media[0].url
                          : '${ApiClient.baseUrl.replaceAll('/api', '')}${media[0].url}',
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const Center(
                        child: Icon(Icons.image, color: Colors.grey),
                      ),
                    )
                  : const Center(child: Icon(Icons.image, color: Colors.grey)),
            ),
          ),
          Expanded(
            flex: 2,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withAlpha(25),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      _statusLabel(complaint.status),
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Expanded(
                    child: Text(
                      complaint.title,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (complaint.municipalityName != null)
                    Row(
                      children: [
                        const Icon(
                          Icons.location_on,
                          size: 10,
                          color: AppColors.textSecondary,
                        ),
                        const SizedBox(width: 2),
                        Text(
                          complaint.municipalityName!,
                          style: const TextStyle(
                            fontSize: 10,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoriesSection() {
    if (_categoryStats.isEmpty) return const SizedBox.shrink();

    final entries = _categoryStats.entries.toList()
      ..sort(
        (a, b) => ((b.value is Map) ? (b.value['total'] ?? 0) : 0).compareTo(
          (a.value is Map) ? (a.value['total'] ?? 0) : 0,
        ),
      );
    final maxVal = entries.isNotEmpty
        ? ((entries.first.value is Map)
              ? (entries.first.value['total'] ?? 1)
              : 1)
        : 1;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(13),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Par catégorie',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          ...entries.take(7).map((e) {
            final data = e.value is Map ? e.value : {};
            final total = data['total'] ?? 0;
            final rate = data['rate'] ?? 0;
            final pct = maxVal > 0 ? (total / maxVal) : 0.0;
            final color = _categoryColors[e.key] ?? AppColors.primary;

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(_categoryIcon(e.key), size: 16, color: color),
                          const SizedBox(width: 8),
                          Text(
                            _categoryLabel(e.key),
                            style: const TextStyle(fontSize: 13),
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          Text(
                            '$total',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: rate >= 70
                                  ? AppColors.primary.withAlpha(25)
                                  : Colors.orange.withAlpha(25),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              '$rate%',
                              style: TextStyle(
                                fontSize: 11,
                                color: rate >= 70
                                    ? AppColors.primary
                                    : Colors.orange,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: pct,
                      minHeight: 8,
                      backgroundColor: Colors.grey.shade200,
                      valueColor: AlwaysStoppedAnimation(color),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildTrendsChart() {
    if (_monthlyTrends.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(13),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Tendances mensuelles',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(height: 150, child: _buildSimpleChart()),
        ],
      ),
    );
  }

  Widget _buildSimpleChart() {
    if (_monthlyTrends.isEmpty) return const SizedBox.shrink();

    final maxVal = _monthlyTrends.fold<int>(0, (max, t) {
      final submitted = t['submitted'] ?? 0;
      return submitted > max ? submitted : max;
    });

    return LayoutBuilder(
      builder: (context, constraints) {
        return Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: _monthlyTrends.map<Widget>((t) {
            final submitted = t['submitted'] ?? 0;
            final resolved = t['resolved'] ?? 0;
            final month = t['month'] ?? '';
            final barHeight = maxVal > 0
                ? (submitted / maxVal * constraints.maxHeight * 0.9)
                : 0.0;
            final resolvedHeight = maxVal > 0
                ? (resolved / maxVal * constraints.maxHeight * 0.9)
                : 0.0;

            return Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Expanded(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Expanded(
                            child: Container(
                              height: barHeight,
                              decoration: BoxDecoration(
                                color: Colors.grey.shade300,
                                borderRadius: const BorderRadius.vertical(
                                  top: Radius.circular(4),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 2),
                          Expanded(
                            child: Container(
                              height: resolvedHeight,
                              decoration: BoxDecoration(
                                color: AppColors.primary,
                                borderRadius: const BorderRadius.vertical(
                                  top: Radius.circular(4),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      month.toString().substring(3, 5),
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        );
      },
    );
  }

  Widget _buildGovernorates() {
    return RefreshIndicator(
      onRefresh: _loadData,
      child: _selectedGovernorate.isEmpty
          ? _buildGovernoratesGrid()
          : _buildGovernorateDetail(),
    );
  }

  Widget _buildGovernoratesGrid() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Gouvernorats',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Sélectionnez un gouvernorat',
            style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 0.85,
            children: _governorateList.map((gov) {
              final name = gov['governorate'] as String;
              final photoUrl = _governoratePhotos[name];
              const rate = 65;

              return GestureDetector(
                onTap: () => setState(() => _selectedGovernorate = name),
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withAlpha(13),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 2,
                        child: Container(
                          width: double.infinity,
                          color: AppColors.secondary,
                          child: photoUrl != null
                              ? Image.network(
                                  photoUrl,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => const Center(
                                    child: Icon(
                                      Icons.location_city,
                                      color: Colors.grey,
                                    ),
                                  ),
                                )
                              : const Center(
                                  child: Icon(
                                    Icons.location_city,
                                    color: Colors.grey,
                                  ),
                                ),
                        ),
                      ),
                      Expanded(
                        flex: 1,
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name as String,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                              const Spacer(),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: rate >= 70
                                      ? AppColors.primary.withAlpha(25)
                                      : Colors.orange.withAlpha(25),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  '$rate% résolu',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: rate >= 70
                                        ? AppColors.primary
                                        : Colors.orange,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildGovernorateDetail() {
    final gov = _governorateList.firstWhere(
      (g) => g['governorate'] == _selectedGovernorate,
    );
    final municipalities = (gov['municipalities'] as List).cast<String>();
    final photoUrl = _governoratePhotos[_selectedGovernorate];
    final municipalityCount = municipalities.length;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => setState(() => _selectedGovernorate = ''),
              ),
              const Text(
                'Gouvernorat',
                style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
              ),
            ],
          ),
          Container(
            width: double.infinity,
            height: 180,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              color: AppColors.secondary,
            ),
            child: photoUrl != null
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Image.network(photoUrl, fit: BoxFit.cover),
                  )
                : const Center(
                    child: Icon(
                      Icons.location_city,
                      size: 48,
                      color: Colors.grey,
                    ),
                  ),
          ),
          const SizedBox(height: 16),
          Text(
            _selectedGovernorate,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.primary.withAlpha(25),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Column(
                  children: [
                    Text(
                      '65%',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                    Text('Résolution', style: TextStyle(fontSize: 11)),
                  ],
                ),
                Column(
                  children: [
                    Text(
                      '24',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                    Text('Signalements', style: TextStyle(fontSize: 11)),
                  ],
                ),
                Column(
                  children: [
                    Text(
                      '$municipalityCount',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                    Text('Municipalités', style: TextStyle(fontSize: 11)),
                  ],
                ),
              ],
            ),
          ),
          SizedBox(height: 20),
          Text(
            'Municipalités',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: municipalities.map((mun) {
              return Chip(
                label: Text(mun, style: const TextStyle(fontSize: 12)),
                backgroundColor: Colors.white,
                side: const BorderSide(color: AppColors.border),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildComplaintsList() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              TextField(
                controller: _searchController,
                onChanged: (v) => setState(() => _searchQuery = v),
                decoration: InputDecoration(
                  hintText: 'Rechercher un signalement...',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            _searchController.clear();
                            setState(() => _searchQuery = '');
                          },
                        )
                      : null,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  filled: true,
                  fillColor: Colors.white,
                ),
              ),
              const SizedBox(height: 12),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildCategoryChip(''),
                    _buildCategoryChip('WASTE'),
                    _buildCategoryChip('ROAD'),
                    _buildCategoryChip('LIGHTING'),
                    _buildCategoryChip('WATER'),
                    _buildCategoryChip('SAFETY'),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${_filteredComplaints.length} résultats',
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  Row(
                    children: [
                      IconButton(
                        icon: Icon(
                          Icons.grid_view,
                          color: _isGridView ? AppColors.primary : Colors.grey,
                        ),
                        onPressed: () => setState(() => _isGridView = true),
                      ),
                      IconButton(
                        icon: Icon(
                          Icons.list,
                          color: !_isGridView ? AppColors.primary : Colors.grey,
                        ),
                        onPressed: () => setState(() => _isGridView = false),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _loadData,
            child: _filteredComplaints.isEmpty
                ? const Center(child: Text('Aucun signalement trouvé'))
                : _isGridView
                ? GridView.builder(
                    padding: const EdgeInsets.all(12),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 12,
                          childAspectRatio: 0.75,
                        ),
                    itemCount: _filteredComplaints.length,
                    itemBuilder: (context, index) =>
                        _buildComplaintCardGrid(_filteredComplaints[index]),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: _filteredComplaints.length,
                    itemBuilder: (context, index) =>
                        _buildComplaintCardList(_filteredComplaints[index]),
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildCategoryChip(String cat) {
    final isSelected = _categoryFilter == cat;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(cat.isEmpty ? 'Tous' : _categoryLabel(cat)),
        selected: isSelected,
        onSelected: (_) => setState(() => _categoryFilter = cat),
        selectedColor: AppColors.primary.withAlpha(51),
        checkmarkColor: AppColors.primary,
        labelStyle: TextStyle(
          color: isSelected ? AppColors.primary : AppColors.textSecondary,
          fontSize: 12,
        ),
      ),
    );
  }

  Widget _buildComplaintCardGrid(Complaint complaint) {
    final media = complaint.media;
    final hasPhoto = media.isNotEmpty && media[0].url.isNotEmpty;
    final status = complaint.status;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(13),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 3,
            child: Stack(
              children: [
                Container(
                  width: double.infinity,
                  color: AppColors.secondary,
                  child: hasPhoto
                      ? Image.network(
                          media[0].url.startsWith('http')
                              ? media[0].url
                              : '${ApiClient.baseUrl.replaceAll('/api', '')}${media[0].url}',
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const Center(
                            child: Icon(Icons.image, color: Colors.grey),
                          ),
                        )
                      : const Center(
                          child: Icon(Icons.image, color: Colors.grey),
                        ),
                ),
                Positioned(
                  top: 8,
                  left: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: _statusColor(status),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      _statusLabel(status),
                      style: const TextStyle(
                        fontSize: 9,
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            flex: 2,
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    complaint.title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const Spacer(),
                  Row(
                    children: [
                      Icon(
                        Icons.location_on,
                        size: 10,
                        color: AppColors.textSecondary,
                      ),
                      const SizedBox(width: 2),
                      Expanded(
                        child: Text(
                          complaint.municipalityName ?? '',
                          style: const TextStyle(
                            fontSize: 10,
                            color: AppColors.textSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(
                        _categoryIcon(complaint.category),
                        size: 10,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 2),
                      Text(
                        _categoryLabel(complaint.category),
                        style: const TextStyle(
                          fontSize: 10,
                          color: AppColors.primary,
                        ),
                      ),
                      const Spacer(),
                      const Icon(
                        Icons.check_circle,
                        size: 10,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 2),
                      Text(
                        '${complaint.confirmationCount}',
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildComplaintCardList(Complaint complaint) {
    final media = complaint.media;
    final hasPhoto = media.isNotEmpty && media[0].url.isNotEmpty;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 70,
              height: 70,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                color: AppColors.secondary,
              ),
              child: hasPhoto
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(
                        media[0].url.startsWith('http')
                            ? media[0].url
                            : '${ApiClient.baseUrl.replaceAll('/api', '')}${media[0].url}',
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) =>
                            const Icon(Icons.image, color: Colors.grey),
                      ),
                    )
                  : const Icon(Icons.image, color: Colors.grey),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: _statusColor(complaint.status).withAlpha(25),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          _statusLabel(complaint.status),
                          style: TextStyle(
                            fontSize: 10,
                            color: _statusColor(complaint.status),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withAlpha(25),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          _categoryLabel(complaint.category),
                          style: const TextStyle(
                            fontSize: 10,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    complaint.title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(
                        Icons.location_on,
                        size: 10,
                        color: AppColors.textSecondary,
                      ),
                      const SizedBox(width: 2),
                      Text(
                        complaint.municipalityName ?? '',
                        style: const TextStyle(
                          fontSize: 10,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const Spacer(),
                      const Icon(
                        Icons.check_circle,
                        size: 10,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 2),
                      Text(
                        '${complaint.confirmationCount}',
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCallToAction() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primary, AppColors.primaryDark],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: const Column(
        children: [
          Text(
            'Signalez les problèmes',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          SizedBox(height: 8),
          Text(
            'Votre participation améliore votre ville',
            style: TextStyle(color: Colors.white70, fontSize: 14),
          ),
        ],
      ),
    );
  }
}
