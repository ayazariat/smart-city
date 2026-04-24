import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/core/constants/colors.dart';
import 'package:smart_city_app/screens/complaint_detail_screen.dart';

class TeamPerformanceScreen extends ConsumerStatefulWidget {
  const TeamPerformanceScreen({super.key});

  @override
  ConsumerState<TeamPerformanceScreen> createState() =>
      _TeamPerformanceScreenState();
}

class _TeamPerformanceScreenState extends ConsumerState<TeamPerformanceScreen> {
  final ComplaintService _complaintService = ComplaintService();

  Map<String, dynamic> _dashboardData = {};
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final data = await _complaintService.getManagerStats();
      setState(() {
        _dashboardData = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppColors.primary, AppColors.primary.withAlpha(204)],
          ),
        ),
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.arrow_back, color: Colors.white),
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'Performance de l\'équipe',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      onPressed: _loadData,
                      icon: const Icon(Icons.refresh, color: Colors.white),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Container(
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.vertical(
                      top: Radius.circular(24),
                    ),
                  ),
                  child: _isLoading
                      ? const Center(
                          child: CircularProgressIndicator(
                            color: AppColors.primary,
                          ),
                        )
                      : _error != null
                      ? _buildErrorState()
                      : RefreshIndicator(
                          onRefresh: _loadData,
                          color: AppColors.primary,
                          child: ListView(
                            padding: const EdgeInsets.all(20),
                            children: [
                              _buildOverviewCards(),
                              const SizedBox(height: 20),
                              _buildSLASection(),
                              const SizedBox(height: 20),
                              _buildTechnicianPerformance(),
                              const SizedBox(height: 20),
                              _buildCategoryBreakdown(),
                              const SizedBox(height: 20),
                              _buildRecentActivity(),
                            ],
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.red.shade50,
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.error_outline,
              size: 48,
              color: Colors.red.shade400,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            _error ?? 'Une erreur est survenue',
            style: TextStyle(color: Colors.red.shade700),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadData,
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            child: const Text('Réessayer'),
          ),
        ],
      ),
    );
  }

  Widget _buildOverviewCards() {
    final stats = _dashboardData['stats'] ?? _dashboardData;
    final total = stats['total'] ?? 0;
    final resolved = stats['resolved'] ?? 0;
    final inProgress = stats['inProgress'] ?? 0;
    final assigned = stats['assigned'] ?? 0;
    final closed = stats['closed'] ?? 0;
    final overdue = stats['overdue'] ?? stats['totalOverdue'] ?? 0;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(13),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.primary.withAlpha(26),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.dashboard, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              const Text(
                'Aperçu du département',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildStatCard(
                'Total',
                total,
                const Color(0xFF3B82F6),
                'Toutes les plaintes',
              ),
              const SizedBox(width: 8),
              _buildStatCard(
                'À assigner',
                assigned,
                const Color(0xFF8B5CF6),
                'Nécessite technician',
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _buildStatCard(
                'En cours',
                inProgress,
                const Color(0xFFF97316),
                'En cours de traitement',
              ),
              const SizedBox(width: 8),
              _buildStatCard(
                'Résolus',
                resolved,
                const Color(0xFF22C55E),
                'En attente de clôture',
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _buildStatCard(
                'Clôturés',
                closed,
                const Color(0xFF64748B),
                'Terminés',
              ),
              const SizedBox(width: 8),
              _buildStatCard(
                'En retard',
                overdue,
                overdue > 0 ? const Color(0xFFDC2626) : const Color(0xFF64748B),
                'Dépassés SLA',
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, int value, Color color, String subtitle) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [color.withAlpha(13), color.withAlpha(26)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withAlpha(51)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '$value',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
            Text(
              subtitle,
              style: TextStyle(fontSize: 10, color: Colors.grey.shade500),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSLASection() {
    final stats = _dashboardData['stats'] ?? _dashboardData;
    final resolutionRate = stats['resolutionRate'] ?? 0;

    if (resolutionRate <= 0) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.success.withAlpha(26), const Color(0xFFECFDF5)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.success.withAlpha(51)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.success.withAlpha(51),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.verified, color: AppColors.success),
              ),
              const SizedBox(width: 12),
              const Text(
                'Conformité SLA',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const Spacer(),
              Text(
                '$resolutionRate%',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: AppColors.success,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: resolutionRate / 100,
              minHeight: 10,
              backgroundColor: AppColors.success.withAlpha(51),
              valueColor: const AlwaysStoppedAnimation<Color>(
                AppColors.success,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                resolutionRate >= 80
                    ? 'Excellente performance!'
                    : resolutionRate >= 60
                    ? 'Bon - peut s\'améliorer'
                    : 'Nécessite attention',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
              ),
              Text(
                '${(100 - resolutionRate).toInt()}% écart',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTechnicianPerformance() {
    final technicians = _dashboardData['technicians'] as List? ?? [];

    if (technicians.isEmpty) {
      return _buildEmptyState(
        icon: Icons.engineering,
        title: 'Performance des techniciens',
        message: 'Aucune donnée disponible',
      );
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(13),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.primary.withAlpha(26),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.engineering, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              const Text(
                'Performance des techniciens',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...technicians.take(5).map((tech) => _buildTechnicianRow(tech)),
        ],
      ),
    );
  }

  Widget _buildTechnicianRow(Map<String, dynamic> tech) {
    final name = tech['fullName'] ?? tech['name'] ?? 'Inconnu';
    final assigned = tech['assigned'] ?? 0;
    final inProgress = tech['inProgress'] ?? 0;
    final resolved = tech['resolved'] ?? 0;
    final total = assigned + inProgress + resolved;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.secondary,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: AppColors.primary.withAlpha(25),
                child: Text(
                  name.isNotEmpty ? name[0].toUpperCase() : '?',
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  name,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: resolved > 0
                      ? AppColors.success.withAlpha(26)
                      : Colors.grey.withAlpha(26),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '$resolved résolus',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: resolved > 0 ? AppColors.success : Colors.grey,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildMiniStat('Assignés', assigned, const Color(0xFF8B5CF6)),
              const SizedBox(width: 16),
              _buildMiniStat('Actifs', inProgress, const Color(0xFFF97316)),
              const SizedBox(width: 16),
              _buildMiniStat('Total', total, const Color(0xFF3B82F6)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMiniStat(String label, int value, Color color) {
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(
          '$label: $value',
          style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
        ),
      ],
    );
  }

  Widget _buildCategoryBreakdown() {
    final byCategory =
        _dashboardData['byCategory'] as Map<String, dynamic>? ?? {};
    if (byCategory.isEmpty) return const SizedBox.shrink();

    final maxCount = byCategory.values.fold<int>(0, (max, v) {
      final val = v is int ? v : 0;
      return val > max ? val : max;
    });

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(13),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.orange.withAlpha(26),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.bar_chart, color: Colors.orange.shade700),
              ),
              const SizedBox(width: 12),
              const Text(
                'Par catégorie',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...byCategory.entries.take(6).map((entry) {
            final count = entry.value is int ? entry.value : 0;
            final barWidth = maxCount > 0 ? (count / maxCount) : 0.0;

            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        entry.key,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        '$count',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: barWidth,
                      minHeight: 8,
                      backgroundColor: AppColors.secondary,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        Colors.orange.shade400,
                      ),
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

  Widget _buildRecentActivity() {
    final recentComplaints = _dashboardData['recentComplaints'] as List? ?? [];
    if (recentComplaints.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(13),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.primary.withAlpha(26),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.history, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              const Text(
                'Activité récente',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...recentComplaints
              .take(5)
              .map((complaint) => _buildActivityItem(complaint)),
        ],
      ),
    );
  }

  Widget _buildActivityItem(Map<String, dynamic> complaint) {
    final title = complaint['title'] ?? 'Inconnu';
    final status = complaint['status'] ?? 'UNKNOWN';
    final updatedAt = complaint['updatedAt'] ?? complaint['createdAt'] ?? '';
    DateTime? date;
    try {
      date = DateTime.parse(updatedAt);
    } catch (_) {}

    Color statusColor;
    switch (status) {
      case 'RESOLVED':
        statusColor = AppColors.statusResolue;
        break;
      case 'IN_PROGRESS':
        statusColor = AppColors.statusEnCours;
        break;
      case 'ASSIGNED':
        statusColor = AppColors.statusAssignee;
        break;
      default:
        statusColor = AppColors.textSecondary;
    }

    return InkWell(
      onTap: () {
        final id = complaint['_id'] ?? complaint['id'];
        if (id != null) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => ComplaintDetailScreen(complaintId: id.toString()),
            ),
          );
        }
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.secondary,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: statusColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (date != null)
                    Text(
                      '${date.day}/${date.month}/${date.year}',
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: statusColor.withAlpha(26),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                status.replaceAll('_', ' '),
                style: TextStyle(
                  color: statusColor,
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState({
    required IconData icon,
    required String title,
    required String message,
  }) {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(13),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 48, color: Colors.grey.shade300),
          ),
          const SizedBox(height: 12),
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            message,
            style: TextStyle(fontSize: 13, color: Colors.grey.shade500),
          ),
        ],
      ),
    );
  }
}
