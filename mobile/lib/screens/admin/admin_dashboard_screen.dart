import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/services/admin_service.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/core/constants/colors.dart';
import 'package:smart_city_app/models/complaint_model.dart';
import 'package:smart_city_app/screens/admin/admin_complaints_screen.dart';
import 'package:smart_city_app/screens/admin/admin_users_screen.dart';
import 'package:smart_city_app/screens/admin/admin_settings_screen.dart';
import 'package:smart_city_app/screens/dashboard/heatmap_screen.dart';
import 'package:smart_city_app/screens/complaint_detail_screen.dart';
import 'package:smart_city_app/widgets/charts.dart';

class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() =>
      _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen> {
  final AdminService _adminService = AdminService();
  final ComplaintService _complaintService = ComplaintService();

  Map<String, dynamic> _stats = {};
  List<Complaint> _complaints = [];
  bool _loading = true;
  bool _loadingComplaints = false;
  String? _error;
  Timer? _refreshTimer;
  String _statusFilter = '';
  String _searchQuery = '';
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadData();
    _refreshTimer = Timer.periodic(
      const Duration(seconds: 60),
      (_) => _loadData(showLoader: false),
    );
  }

  Future<void> _loadData({bool showLoader = true}) async {
    if (showLoader) setState(() => _loading = true);
    try {
      final stats = await _adminService.getStats();
      setState(() => _stats = stats);
      await _loadComplaints(showLoader: false);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _loadComplaints({bool showLoader = true}) async {
    if (showLoader) setState(() => _loadingComplaints = true);
    try {
      final data = await _complaintService.getAllComplaints(
        status: _statusFilter.isEmpty ? null : _statusFilter,
        search: _searchQuery.isEmpty ? null : _searchQuery,
        limit: 50,
      );
      setState(() => _complaints = data);
    } catch (e) {
      debugPrint('Error loading complaints: $e');
    } finally {
      setState(() => _loadingComplaints = false);
    }
  }

  int get _total => _stats['total'] ?? 0;
  int get _submitted => _stats['submitted'] ?? 0;
  int get _validated => _stats['validated'] ?? 0;
  int get _assigned => _stats['assigned'] ?? 0;
  int get _inProgress => _stats['inProgress'] ?? 0;
  int get _resolved => _stats['resolved'] ?? 0;
  int get _closed => _stats['closed'] ?? 0;
  int get _rejected => _stats['rejected'] ?? 0;
  int get _overdue => _stats['totalOverdue'] ?? 0;
  int get _atRisk => _stats['totalAtRisk'] ?? 0;

  double get _resolutionRate {
    final total = _total;
    final resolved = _resolved + _closed;
    return total > 0 ? (resolved / total * 100).roundToDouble() : 0;
  }

  Map<String, int> get _byCategory {
    final data = _stats['byCategory'];
    if (data is Map) {
      return data.map((k, v) => MapEntry(k.toString(), (v as num).toInt()));
    }
    return {};
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        title: const Text(
          'Tableau de bord Admin',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        elevation: 0,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadData),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _showLogoutDialog,
          ),
        ],
      ),
      body: _loading && _stats.isEmpty
          ? const Center(child: CircularProgressIndicator(color: Colors.white))
          : _error != null && _stats.isEmpty
          ? _buildError()
          : RefreshIndicator(
              onRefresh: _loadData,
              child: CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [AppColors.primary, AppColors.primaryDark],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.only(
                          bottomLeft: Radius.circular(24),
                          bottomRight: Radius.circular(24),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Vue d\'ensemble du système',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${_total} réclamations au total · ${_resolutionRate.toStringAsFixed(0)}% résolues',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildStatsGrid(),
                          const SizedBox(height: 24),
                          if (_overdue > 0) ...[
                            _buildOverdueAlert(),
                            const SizedBox(height: 24),
                          ],
                          _buildResolutionRate(),
                          const SizedBox(height: 24),
                          if (_byCategory.isNotEmpty) ...[
                            CategoryBarChart(data: _byCategory),
                            const SizedBox(height: 24),
                          ],
                          _buildTeamPerformance(),
                          const SizedBox(height: 24),
                          _buildQuickFilters(),
                          const SizedBox(height: 16),
                          _buildComplaintsList(),
                          const SizedBox(height: 24),
                          _buildNavigationGrid(),
                          const SizedBox(height: 32),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 48, color: Colors.red[400]),
          const SizedBox(height: 12),
          Text('Erreur: $_error'),
          const SizedBox(height: 12),
          ElevatedButton(onPressed: _loadData, child: const Text('Réessayer')),
        ],
      ),
    );
  }

  Widget _buildStatsGrid() {
    final stats = [
      {
        'label': 'Total',
        'value': _total.toString(),
        'color': const Color(0xFF3B82F6),
        'icon': Icons.summarize,
        'filter': '',
      },
      {
        'label': 'Résolus',
        'value': _resolved.toString(),
        'color': const Color(0xFF22C55E),
        'icon': Icons.check_circle,
        'filter': 'RESOLVED',
      },
      {
        'label': 'À risque',
        'value': _atRisk.toString(),
        'color': const Color(0xFFF59E0B),
        'icon': Icons.warning_amber,
        'filter': 'IN_PROGRESS',
      },
      {
        'label': 'En retard',
        'value': _overdue.toString(),
        'color': const Color(0xFFEF4444),
        'icon': Icons.error_outline,
        'filter': 'ASSIGNED',
      },
    ];

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.5,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      children: stats.map((item) {
        final isSelected = _statusFilter == item['filter'];
        return GestureDetector(
          onTap: () {
            setState(() => _statusFilter = item['filter'] as String);
            _loadComplaints();
          },
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: isSelected
                  ? Border.all(color: item['color'] as Color, width: 2)
                  : null,
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: (item['color'] as Color).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    item['icon'] as IconData,
                    color: item['color'] as Color,
                    size: 18,
                  ),
                ),
                const Spacer(),
                Text(
                  item['value'] as String,
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: item['color'] as Color,
                  ),
                ),
                Text(
                  item['label'] as String,
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildOverdueAlert() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.red.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.red.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.warning, color: Colors.red),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$_overdue réclamations en retard',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.red,
                    fontSize: 15,
                  ),
                ),
                Text(
                  'Nécessitent une attention immédiate',
                  style: TextStyle(color: Colors.red[700], fontSize: 13),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: () {
              setState(() => _statusFilter = 'ASSIGNED');
              _loadComplaints();
            },
            child: const Text('Voir'),
          ),
        ],
      ),
    );
  }

  Widget _buildResolutionRate() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFECFDF5), Color(0xFFD1FAE5)],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFA7F3D0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Taux de résolution',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF065F46),
                ),
              ),
              Text(
                '${_resolutionRate.toStringAsFixed(0)}%',
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF059669),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: _resolutionRate / 100,
              backgroundColor: const Color(0xFFA7F3D0),
              valueColor: const AlwaysStoppedAnimation<Color>(
                Color(0xFF10B981),
              ),
              minHeight: 8,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTeamPerformance() {
    final avgDays = _complaints.isNotEmpty
        ? (_complaints.fold<int>(
                    0,
                    (sum, c) =>
                        sum + DateTime.now().difference(c.createdAt).inDays,
                  ) /
                  _complaints.length)
              .toStringAsFixed(1)
        : '0';
    final highPriority = _complaints
        .where((c) => (c.priorityScore ?? 0) >= 15)
        .length;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Performance de l\'équipe',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildPerfItem(
                  'En cours',
                  _inProgress.toString(),
                  Icons.engineering,
                  const Color(0xFF3B82F6),
                  'En traitement',
                ),
              ),
              Expanded(
                child: _buildPerfItem(
                  'Jours moy.',
                  avgDays,
                  Icons.timer,
                  const Color(0xFF8B5CF6),
                  'Temps moyen',
                ),
              ),
              Expanded(
                child: _buildPerfItem(
                  'Taux rés.',
                  '${_resolutionRate.toStringAsFixed(0)}%',
                  Icons.trending_up,
                  const Color(0xFF10B981),
                  'Résolus/total',
                ),
              ),
              Expanded(
                child: _buildPerfItem(
                  'Urgent',
                  highPriority.toString(),
                  Icons.priority_high,
                  const Color(0xFFEF4444),
                  'Priorité haute',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPerfItem(
    String label,
    String value,
    IconData icon,
    Color color,
    String subtitle,
  ) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(label, style: TextStyle(fontSize: 11, color: Colors.grey[600])),
        Text(subtitle, style: TextStyle(fontSize: 9, color: Colors.grey[400])),
      ],
    );
  }

  Widget _buildQuickFilters() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 8,
                    ),
                  ],
                ),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Rechercher...',
                    prefixIcon: const Icon(Icons.search, color: Colors.grey),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                              _loadComplaints();
                            },
                          )
                        : null,
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                  ),
                  onChanged: (v) {
                    setState(() => _searchQuery = v);
                    _loadComplaints();
                  },
                ),
              ),
            ),
            const SizedBox(width: 8),
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
              child: IconButton(
                icon: const Icon(Icons.filter_list),
                onPressed: _showFilterSheet,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _buildFilterChip('', 'Tous'),
              const SizedBox(width: 8),
              _buildFilterChip('SUBMITTED', 'Soumis'),
              const SizedBox(width: 8),
              _buildFilterChip('VALIDATED', 'Validés'),
              const SizedBox(width: 8),
              _buildFilterChip('ASSIGNED', 'Assignés'),
              const SizedBox(width: 8),
              _buildFilterChip('IN_PROGRESS', 'En cours'),
              const SizedBox(width: 8),
              _buildFilterChip('RESOLVED', 'Résolus'),
              const SizedBox(width: 8),
              _buildFilterChip('CLOSED', 'Clôturés'),
              const SizedBox(width: 8),
              _buildFilterChip('REJECTED', 'Rejetés'),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFilterChip(String value, String label) {
    final isSelected = _statusFilter == value;
    return GestureDetector(
      onTap: () {
        setState(() => _statusFilter = value);
        _loadComplaints();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.primary : const Color(0xFFE2E8F0),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.grey[700],
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ),
    );
  }

  Widget _buildComplaintsList() {
    if (_loadingComplaints) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }
    if (_complaints.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          children: [
            Icon(Icons.inbox, size: 48, color: Colors.grey[400]),
            const SizedBox(height: 12),
            Text(
              'Aucun signalement',
              style: TextStyle(color: Colors.grey[700]),
            ),
          ],
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '${_complaints.length} résultats',
              style: TextStyle(color: Colors.grey[600], fontSize: 13),
            ),
            TextButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const AdminComplaintsScreen(),
                ),
              ),
              child: const Text('Voir tout'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ..._complaints.take(10).map((c) => _buildComplaintCard(c)),
      ],
    );
  }

  Widget _buildComplaintCard(Complaint complaint) {
    final statusColor = _getStatusColor(complaint.status);
    final isOverdue =
        ['ASSIGNED', 'IN_PROGRESS'].contains(complaint.status) &&
        DateTime.now().difference(complaint.createdAt).inDays > 7;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: isOverdue
            ? Border.all(color: Colors.red.withOpacity(0.3))
            : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => ComplaintDetailScreen(complaintId: complaint.id),
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        _getStatusLabel(complaint.status),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: statusColor,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF5F7FA),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        _getCategoryLabel(complaint.category),
                        style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                      ),
                    ),
                    if (isOverdue) ...[
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.red.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.warning,
                              size: 12,
                              color: Colors.red[600],
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'En retard',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: Colors.red[600],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  complaint.title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  complaint.description,
                  style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(Icons.person, size: 14, color: Colors.grey[400]),
                    const SizedBox(width: 4),
                    Text(
                      complaint.createdBy?.fullName ?? 'Anonyme',
                      style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                    ),
                    const SizedBox(width: 12),
                    Icon(
                      Icons.calendar_today,
                      size: 14,
                      color: Colors.grey[400],
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${complaint.createdAt.day}/${complaint.createdAt.month}/${complaint.createdAt.year}',
                      style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                    ),
                    const Spacer(),
                    Icon(
                      Icons.chevron_right,
                      size: 20,
                      color: AppColors.primary,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavigationGrid() {
    final navItems = [
      {
        'icon': Icons.feedback,
        'label': 'Réclamations',
        'color': Colors.blue,
        'screen': const AdminComplaintsScreen(),
        'badge': _total.toString(),
      },
      {
        'icon': Icons.people,
        'label': 'Utilisateurs',
        'color': Colors.green,
        'screen': const AdminUsersScreen(),
        'badge': null,
      },
      {
        'icon': Icons.settings,
        'label': 'Paramètres',
        'color': Colors.orange,
        'screen': const AdminSettingsScreen(),
        'badge': null,
      },
      {
        'icon': Icons.map,
        'label': 'Carte thermique',
        'color': Colors.red,
        'screen': const HeatmapScreen(),
        'badge': null,
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Navigation',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: 1.2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          children: navItems.map((item) {
            return GestureDetector(
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => item['screen'] as Widget),
              ),
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      item['color'] as Color,
                      (item['color'] as Color).withOpacity(0.7),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: (item['color'] as Color).withOpacity(0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Stack(
                  children: [
                    Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            item['icon'] as IconData,
                            color: Colors.white,
                            size: 36,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            item['label'] as String,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (item['badge'] != null)
                      Positioned(
                        top: 12,
                        right: 12,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            item['badge'] as String,
                            style: TextStyle(
                              color: item['color'] as Color,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
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
    );
  }

  void _showFilterSheet() {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Filtres avancés',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              const Text('Statut'),
              Wrap(
                spacing: 8,
                children: [
                  _buildSheetChip('', 'Tous'),
                  _buildSheetChip('SUBMITTED', 'Soumis'),
                  _buildSheetChip('IN_PROGRESS', 'En cours'),
                  _buildSheetChip('RESOLVED', 'Résolus'),
                  _buildSheetChip('CLOSED', 'Clôturés'),
                  _buildSheetChip('REJECTED', 'Rejetés'),
                ],
              ),
              const SizedBox(height: 16),
              const Text('Priorité'),
              Wrap(
                spacing: 8,
                children: [
                  _buildSheetChip('', 'Toutes', isPriority: true),
                  _buildSheetChip('HIGH', 'Haute', isPriority: true),
                  _buildSheetChip('MEDIUM', 'Moyenne', isPriority: true),
                  _buildSheetChip('LOW', 'Basse', isPriority: true),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSheetChip(
    String value,
    String label, {
    bool isPriority = false,
  }) {
    final isSelected = isPriority ? false : _statusFilter == value;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) {
        if (!isPriority) {
          setState(() => _statusFilter = value);
          _loadComplaints();
        }
        Navigator.pop(context);
      },
    );
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Déconnexion'),
        content: const Text('Voulez-vous vraiment vous déconnecter ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Déconnexion'),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
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

  String _getStatusLabel(String status) {
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

  String _getCategoryLabel(String cat) {
    const labels = {
      'WASTE': 'Déchets',
      'ROAD': 'Routes',
      'LIGHTING': 'Éclairage',
      'WATER': 'Eau',
      'SAFETY': 'Sécurité',
      'PUBLIC_PROPERTY': 'Domaine public',
      'GREEN_SPACE': 'Espaces verts',
      'NOISE': 'Bruit',
      'BUILDING': 'Bâtiment',
      'TRAFFIC': 'Circulation',
      'OTHER': 'Autre',
    };
    return labels[cat] ?? cat;
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }
}
