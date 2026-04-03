import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/main.dart' show AppColors;
import 'package:smart_city_app/providers/complaints_provider.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/models/complaint_model.dart';
import 'package:smart_city_app/screens/complaint_detail_screen.dart';

class ManagerDashboardScreen extends ConsumerStatefulWidget {
  const ManagerDashboardScreen({super.key});

  @override
  ConsumerState<ManagerDashboardScreen> createState() =>
      _ManagerDashboardScreenState();
}

class _ManagerDashboardScreenState
    extends ConsumerState<ManagerDashboardScreen> {
  Map<String, dynamic> _stats = {};

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
      final stats = await ComplaintService().getManagerDashboard();
      if (mounted) {
        setState(() {
          _stats = stats;
        });
      }
    } catch (e) {
      // Silently handle error
    }
  }

  Future<void> _loadData() async {
    await ref.read(managerComplaintsProvider.notifier).load();
    await _loadStats();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(managerComplaintsProvider);

    // Calculate stats
    final total = state.complaints.length;
    final inProgress = state.complaints
        .where((c) => c.status == 'IN_PROGRESS')
        .length;
    final resolved = state.complaints
        .where((c) => c.status == 'RESOLVED')
        .length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Manager Dashboard'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadData),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Stats overview
              Container(
                padding: const EdgeInsets.all(16),
                color: AppColors.surface,
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
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        _buildStatCard('Total', total, AppColors.primary),
                        const SizedBox(width: 8),
                        _buildStatCard(
                          'Active',
                          inProgress,
                          AppColors.inProgress,
                        ),
                        const SizedBox(width: 8),
                        _buildStatCard(
                          'Resolved',
                          resolved,
                          AppColors.resolved,
                        ),
                        const SizedBox(width: 8),
                        _buildStatCard(
                          'Overdue',
                          _stats['overdue'] ?? 0,
                          AppColors.error,
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Filter chips
              Padding(
                padding: const EdgeInsets.all(12),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: ['ALL', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED']
                        .map(
                          (s) => Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: _buildFilterChip(s),
                          ),
                        )
                        .toList(),
                  ),
                ),
              ),

              // Complaints needing attention
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: const Text(
                  'Complaints',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 8),

              // Complaints list
              if (state.isLoading)
                const Center(child: CircularProgressIndicator())
              else if (state.complaints.isEmpty)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      children: [
                        Icon(
                          Icons.check_circle_outline,
                          size: 64,
                          color: AppColors.textSecondary,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'No complaints found',
                          style: TextStyle(color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                )
              else
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(12),
                  itemCount: state.complaints.length,
                  itemBuilder: (ctx, i) =>
                      _buildComplaintCard(state.complaints[i]),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatCard(String label, int value, Color color) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              Text(
                '$value',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
              Text(
                label,
                style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFilterChip(String status) {
    return FilterChip(
      label: Text(status),
      selected: false,
      onSelected: (_) {
        ref.read(managerComplaintsProvider.notifier).load(status: status);
      },
      labelStyle: const TextStyle(fontSize: 12),
    );
  }

  Widget _buildComplaintCard(Complaint complaint) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => ComplaintDetailScreen(complaintId: complaint.id),
            ),
          );
        },
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
                        fontSize: 16,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  _buildStatusChip(complaint.status),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                complaint.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  _buildCategoryChip(complaint.categoryLabel),
                  const SizedBox(width: 8),
                  if (complaint.assignedToName != null)
                    Text(
                      'Tech: ${complaint.assignedToName}',
                      style: TextStyle(fontSize: 12, color: AppColors.accent),
                    ),
                  const Spacer(),
                  Text(
                    '${complaint.createdAt.day}/${complaint.createdAt.month}/${complaint.createdAt.year}',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
              if (complaint.status == 'ASSIGNED' &&
                  complaint.assignedToName == null) ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _showAssignTechnicianDialog(complaint),
                    icon: const Icon(Icons.person_add, size: 16),
                    label: const Text('Assign Technician'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accent,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                  ),
                ),
              ],
            ],
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
                .then((techs) {
                  setDialogState(() {
                    technicians = techs;
                    loading = false;
                  });
                })
                .catchError((_) {
                  setDialogState(() => loading = false);
                });
          }

          return AlertDialog(
            title: const Text('Assign Technician'),
            content: SizedBox(
              width: double.maxFinite,
              child: loading
                  ? const Center(child: CircularProgressIndicator())
                  : technicians.isEmpty
                  ? const Text('No technicians available')
                  : ListView.builder(
                      shrinkWrap: true,
                      itemCount: technicians.length,
                      itemBuilder: (_, i) {
                        final tech = technicians[i];
                        final name =
                            tech['fullName'] ?? tech['name'] ?? 'Unknown';
                        final email = tech['email'] ?? '';
                        return ListTile(
                          leading: CircleAvatar(
                            backgroundColor: AppColors.accent.withAlpha(25),
                            child: const Icon(
                              Icons.engineering,
                              color: AppColors.accent,
                            ),
                          ),
                          title: Text(name),
                          subtitle: email.isNotEmpty
                              ? Text(
                                  email,
                                  style: const TextStyle(fontSize: 12),
                                )
                              : null,
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
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('Failed: $e')),
                                );
                              }
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
        color = AppColors.assigned;
        break;
      case 'IN_PROGRESS':
        color = AppColors.inProgress;
        break;
      case 'RESOLVED':
        color = AppColors.resolved;
        break;
      default:
        color = Colors.grey;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        status.replaceAll('_', ' '),
        style: const TextStyle(color: Colors.white, fontSize: 10),
      ),
    );
  }

  Widget _buildCategoryChip(String category) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(category, style: const TextStyle(fontSize: 11)),
    );
  }
}
