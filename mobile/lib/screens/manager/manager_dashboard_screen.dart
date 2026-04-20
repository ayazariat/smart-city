import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/main.dart' show AppColors;
import 'package:smart_city_app/providers/complaints_provider.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/models/complaint_model.dart';
import 'package:smart_city_app/screens/complaint_detail_screen.dart';
import 'package:smart_city_app/screens/manager/team_performance_screen.dart';

class ManagerDashboardScreen extends ConsumerStatefulWidget {
  const ManagerDashboardScreen({super.key});

  @override
  ConsumerState<ManagerDashboardScreen> createState() =>
      _ManagerDashboardScreenState();
}

class _ManagerDashboardScreenState
    extends ConsumerState<ManagerDashboardScreen> {
  Map<String, dynamic> _stats = {};
  String _selectedFilter = 'ALL';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(managerComplaintsProvider.notifier).load();
      _loadStats();
    });
  }

  Future<void> _loadStats() async {
    try {
      final stats = await ComplaintService().getManagerStats();
      if (mounted) setState(() => _stats = stats);
    } catch (e) {}
  }

  Future<void> _loadData() async {
    await ref.read(managerComplaintsProvider.notifier).load();
    await _loadStats();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(managerComplaintsProvider);
    final total = state.complaints.length;
    final inProgress = state.complaints
        .where((c) => c.status == 'IN_PROGRESS')
        .length;
    final resolved = state.complaints
        .where((c) => c.status == 'RESOLVED')
        .length;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Column(
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [AppColors.primary, AppColors.primaryDark],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                    child: SafeArea(
                      bottom: false,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(
                                Icons.dashboard,
                                color: Colors.white,
                                size: 28,
                              ),
                              const SizedBox(width: 12),
                              const Expanded(
                                child: Text(
                                  'Manager Dashboard',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 22,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              IconButton(
                                icon: const Icon(
                                  Icons.bar_chart,
                                  color: Colors.white,
                                ),
                                onPressed: () => Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) =>
                                        const TeamPerformanceScreen(),
                                  ),
                                ),
                              ),
                              IconButton(
                                icon: const Icon(
                                  Icons.refresh,
                                  color: Colors.white,
                                ),
                                onPressed: _loadData,
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Manage your department complaints',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Container(
                    margin: const EdgeInsets.all(16),
                    padding: const EdgeInsets.all(16),
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
                        const Text(
                          'Department Overview',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: _buildStatCard(
                                'Total',
                                total,
                                Icons.summarize,
                                const Color(0xFF3B82F6),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _buildStatCard(
                                'Active',
                                inProgress,
                                Icons.engineering,
                                const Color(0xFFF97316),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: _buildStatCard(
                                'Resolved',
                                resolved,
                                Icons.check_circle,
                                const Color(0xFF22C55E),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _buildStatCard(
                                'Overdue',
                                _stats['overdue'] ?? 0,
                                Icons.warning,
                                const Color(0xFFEF4444),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  Container(
                    height: 40,
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: ['ALL', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED']
                          .map(
                            (s) => Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: FilterChip(
                                label: Text(
                                  s == 'ALL' ? 'All' : s.replaceAll('_', ' '),
                                ),
                                selected: _selectedFilter == s,
                                onSelected: (_) {
                                  setState(() => _selectedFilter = s);
                                  ref
                                      .read(managerComplaintsProvider.notifier)
                                      .load(status: s);
                                },
                                selectedColor: AppColors.primary,
                              ),
                            ),
                          )
                          .toList(),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
              ),
            ),
            if (state.isLoading)
              const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              )
            else if (state.complaints.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.inbox_outlined,
                        size: 64,
                        color: Colors.grey[400],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No complaints found',
                        style: TextStyle(color: Colors.grey[600], fontSize: 16),
                      ),
                    ],
                  ),
                ),
              )
            else
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (ctx, i) => _buildComplaintCard(state.complaints[i]),
                  childCount: state.complaints.length,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(String label, int value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withAlpha(13),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(
            '$value',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(label, style: TextStyle(fontSize: 11, color: Colors.grey[600])),
        ],
      ),
    );
  }

  Widget _buildComplaintCard(Complaint complaint) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(8),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => ComplaintDetailScreen(complaintId: complaint.id),
            ),
          ).then((_) => _loadData()),
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        complaint.title,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    _buildStatusChip(complaint.status),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  complaint.description,
                  style: TextStyle(color: Colors.grey[600], fontSize: 13),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _buildCategoryChip(complaint.categoryLabel),
                    if (complaint.assignedToName != null) ...[
                      const SizedBox(width: 8),
                      Text(
                        'Tech: ${complaint.assignedToName}',
                        style: TextStyle(fontSize: 12, color: AppColors.accent),
                      ),
                    ],
                    const Spacer(),
                    Text(
                      '${complaint.createdAt.day}/${complaint.createdAt.month}/${complaint.createdAt.year}',
                      style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                    ),
                  ],
                ),
                if (complaint.status == 'ASSIGNED' &&
                    complaint.assignedToName == null)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () => _showAssignTechnicianDialog(complaint),
                        icon: const Icon(Icons.person_add, size: 16),
                        label: const Text('Assign Technician'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.accent,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _showAssignTechnicianDialog(Complaint complaint) async {
    List<dynamic> technicians = [];
    bool loading = true;
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          if (loading) {
            ComplaintService()
                .getDepartmentTechnicians()
                .then(
                  (techs) => setDialogState(() {
                    technicians = techs;
                    loading = false;
                  }),
                )
                .catchError((_) => setDialogState(() => loading = false));
          }
          return AlertDialog(
            title: const Text('Assign Technician'),
            content: SizedBox(
              width: double.maxFinite,
              height: 300,
              child: loading
                  ? const Center(child: CircularProgressIndicator())
                  : technicians.isEmpty
                  ? const Center(child: Text('No technicians available'))
                  : ListView.builder(
                      itemCount: technicians.length,
                      itemBuilder: (_, i) {
                        final tech = technicians[i];
                        final name =
                            tech['fullName'] ?? tech['name'] ?? 'Unknown';
                        return ListTile(
                          leading: CircleAvatar(
                            backgroundColor: AppColors.accent.withAlpha(25),
                            child: const Icon(
                              Icons.engineering,
                              color: AppColors.accent,
                            ),
                          ),
                          title: Text(name),
                          subtitle: Text(
                            tech['email'] ?? '',
                            style: const TextStyle(fontSize: 12),
                          ),
                          onTap: () async {
                            Navigator.pop(ctx);
                            try {
                              final techId = tech['_id'] ?? tech['id'];
                              await ComplaintService().assignTechnician(
                                complaint.id,
                                techId.toString(),
                              );
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('Assigned to $name')),
                                );
                                _loadData();
                              }
                            } catch (e) {
                              if (mounted)
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('Failed: $e')),
                                );
                            }
                          },
                        );
                      },
                    ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel'),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    Color color;
    switch (status) {
      case 'ASSIGNED':
        color = const Color(0xFF8B5CF6);
        break;
      case 'IN_PROGRESS':
        color = const Color(0xFFF97316);
        break;
      case 'RESOLVED':
        color = const Color(0xFF22C55E);
        break;
      default:
        color = Colors.grey;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withAlpha(26),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        status.replaceAll('_', ' '),
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildCategoryChip(String category) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(category, style: const TextStyle(fontSize: 11)),
    );
  }
}
