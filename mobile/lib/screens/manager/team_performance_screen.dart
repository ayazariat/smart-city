import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/main.dart';
import 'package:smart_city_app/services/complaint_service.dart';

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
      final data = await _complaintService.getManagerDashboard();
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
      appBar: AppBar(
        title: const Text('Team Performance'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadData),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.error_outline,
                    size: 64,
                    color: AppColors.error,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _error!,
                    style: const TextStyle(color: AppColors.error),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadData,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            )
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _buildOverviewCards(),
                  const SizedBox(height: 16),
                  _buildDepartmentStats(),
                  const SizedBox(height: 16),
                  _buildTechnicianPerformance(),
                  const SizedBox(height: 16),
                  _buildRecentActivity(),
                ],
              ),
            ),
    );
  }

  Widget _buildOverviewCards() {
    final stats = _dashboardData['stats'] ?? {};
    final total = stats['total'] ?? 0;
    final resolved = stats['resolved'] ?? 0;
    final inProgress = stats['inProgress'] ?? 0;
    final overdue = stats['overdue'] ?? 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Department Overview',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            _buildStatCard('Total', total, AppColors.primary),
            const SizedBox(width: 8),
            _buildStatCard('Active', inProgress, AppColors.inProgress),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            _buildStatCard('Resolved', resolved, AppColors.resolved),
            const SizedBox(width: 8),
            _buildStatCard('Overdue', overdue, AppColors.error),
          ],
        ),
      ],
    );
  }

  Widget _buildStatCard(String label, int value, Color color) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Text(
                '$value',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDepartmentStats() {
    final departments = _dashboardData['departments'] as List? ?? [];

    if (departments.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.domain, color: AppColors.primary),
                SizedBox(width: 8),
                Text(
                  'Department Breakdown',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...departments.map((dept) => _buildDepartmentRow(dept)),
          ],
        ),
      ),
    );
  }

  Widget _buildDepartmentRow(Map<String, dynamic> dept) {
    final name = dept['name'] ?? 'Unknown';
    final total = dept['total'] ?? 0;
    final resolved = dept['resolved'] ?? 0;
    final rate = total > 0 ? (resolved / total * 100) : 0;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                name,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                '$resolved / $total (${rate.toStringAsFixed(0)}%)',
                style: const TextStyle(color: AppColors.textSecondary),
              ),
            ],
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: rate / 100,
            backgroundColor: AppColors.surface,
            valueColor: AlwaysStoppedAnimation<Color>(
              rate >= 70
                  ? AppColors.success
                  : rate >= 40
                  ? AppColors.warning
                  : AppColors.error,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTechnicianPerformance() {
    final technicians = _dashboardData['technicians'] as List? ?? [];

    if (technicians.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.engineering, color: AppColors.primary),
                SizedBox(width: 8),
                Text(
                  'Technician Performance',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columns: const [
                  DataColumn(
                    label: Text(
                      'Name',
                      style: TextStyle(color: AppColors.textPrimary),
                    ),
                  ),
                  DataColumn(
                    label: Text(
                      'Assigned',
                      style: TextStyle(color: AppColors.textPrimary),
                    ),
                    numeric: true,
                  ),
                  DataColumn(
                    label: Text(
                      'Active',
                      style: TextStyle(color: AppColors.textPrimary),
                    ),
                    numeric: true,
                  ),
                  DataColumn(
                    label: Text(
                      'Resolved',
                      style: TextStyle(color: AppColors.textPrimary),
                    ),
                    numeric: true,
                  ),
                ],
                rows: technicians.map<DataRow>((tech) {
                  return DataRow(
                    cells: [
                      DataCell(
                        SizedBox(
                          width: 100,
                          child: Text(
                            tech['fullName'] ?? 'Unknown',
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ),
                      DataCell(
                        Text(
                          '${tech['assigned'] ?? 0}',
                          style: const TextStyle(color: AppColors.textPrimary),
                        ),
                      ),
                      DataCell(
                        Text(
                          '${tech['inProgress'] ?? 0}',
                          style: const TextStyle(color: AppColors.inProgress),
                        ),
                      ),
                      DataCell(
                        Text(
                          '${tech['resolved'] ?? 0}',
                          style: const TextStyle(color: AppColors.success),
                        ),
                      ),
                    ],
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentActivity() {
    final recentComplaints = _dashboardData['recentComplaints'] as List? ?? [];

    if (recentComplaints.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.history, color: AppColors.primary),
                SizedBox(width: 8),
                Text(
                  'Recent Activity',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...recentComplaints.take(5).map((complaint) {
              return _buildActivityItem(complaint);
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildActivityItem(Map<String, dynamic> complaint) {
    final title = complaint['title'] ?? 'Unknown';
    final status = complaint['status'] ?? 'UNKNOWN';
    final updatedAt = complaint['updatedAt'] ?? complaint['createdAt'] ?? '';
    DateTime? date;
    try {
      date = DateTime.parse(updatedAt);
    } catch (_) {}

    Color statusColor;
    switch (status) {
      case 'RESOLVED':
        statusColor = AppColors.resolved;
        break;
      case 'IN_PROGRESS':
        statusColor = AppColors.inProgress;
        break;
      case 'ASSIGNED':
        statusColor = AppColors.assigned;
        break;
      default:
        statusColor = AppColors.textSecondary;
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
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
                    '${date.day}/${date.month}/${date.year} ${date.hour}:${date.minute.toString().padLeft(2, '0')}',
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
              color: statusColor.withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              status.replaceAll('_', ' '),
              style: TextStyle(color: statusColor, fontSize: 10),
            ),
          ),
        ],
      ),
    );
  }
}
