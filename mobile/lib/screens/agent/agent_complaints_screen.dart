import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/main.dart' show AppColors;
import 'package:smart_city_app/providers/complaints_provider.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/models/complaint_model.dart';
import 'package:smart_city_app/screens/complaint_detail_screen.dart';

class AgentComplaintsScreen extends ConsumerStatefulWidget {
  const AgentComplaintsScreen({super.key});

  @override
  ConsumerState<AgentComplaintsScreen> createState() =>
      _AgentComplaintsScreenState();
}

class _AgentComplaintsScreenState extends ConsumerState<AgentComplaintsScreen> {
  String _statusFilter = 'ALL';
  List<dynamic> _departments = [];
  bool _loadingDepts = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(agentComplaintsProvider.notifier).load(status: _statusFilter);
      _loadDepartments();
    });
  }

  void _loadDepartments() async {
    setState(() => _loadingDepts = true);
    try {
      final depts = await ComplaintService().getAgentDepartments();
      setState(() {
        _departments = depts;
        _loadingDepts = false;
      });
    } catch (e) {
      setState(() => _loadingDepts = false);
    }
  }

  Future<void> _loadComplaints() async {
    await ref
        .read(agentComplaintsProvider.notifier)
        .load(status: _statusFilter);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(agentComplaintsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Complaint Queue'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadComplaints,
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter chips
          Padding(
            padding: const EdgeInsets.all(12),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children:
                    [
                          'ALL',
                          'SUBMITTED',
                          'VALIDATED',
                          'ASSIGNED',
                          'IN_PROGRESS',
                          'RESOLVED',
                        ]
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

          // Complaints list
          Expanded(
            child: state.isLoading
                ? const Center(child: CircularProgressIndicator())
                : state.complaints.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.inbox_outlined,
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
                  )
                : RefreshIndicator(
                    onRefresh: _loadComplaints,
                    child: ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: state.complaints.length,
                      itemBuilder: (ctx, i) =>
                          _buildComplaintCard(state.complaints[i]),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String status) {
    final isSelected = _statusFilter == status;
    return FilterChip(
      label: Text(status),
      selected: isSelected,
      onSelected: (_) {
        setState(() => _statusFilter = status);
        _loadComplaints();
      },
      selectedColor: AppColors.primary,
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : null,
        fontSize: 12,
      ),
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
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: _getUrgencyColor(
                        complaint.priorityScore,
                      ).withAlpha(26),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'P${complaint.priorityScore}',
                      style: TextStyle(
                        fontSize: 11,
                        color: _getUrgencyColor(complaint.priorityScore),
                      ),
                    ),
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
              if (complaint.canValidate ||
                  complaint.canReject ||
                  complaint.canAssign) ...[
                const SizedBox(height: 12),
                _buildActionButtons(complaint),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionButtons(Complaint complaint) {
    if (complaint.canValidate) {
      return Row(
        children: [
          Expanded(
            child: ElevatedButton.icon(
              onPressed: () async {
                await ref
                    .read(agentComplaintsProvider.notifier)
                    .validate(complaint.id);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Complaint validated'),
                      backgroundColor: AppColors.success,
                    ),
                  );
                }
              },
              icon: const Icon(Icons.check, size: 18),
              label: const Text('Validate'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.validated,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton.icon(
              onPressed: () => _showRejectDialog(complaint),
              icon: const Icon(Icons.close, size: 18),
              label: const Text('Reject'),
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            ),
          ),
        ],
      );
    } else if (complaint.canAssign) {
      return ElevatedButton.icon(
        onPressed: () => _showAssignDialog(complaint),
        icon: const Icon(Icons.assignment, size: 18),
        label: const Text('Assign to Department'),
        style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
      );
    } else if (complaint.status == 'RESOLVED') {
      return Row(
        children: [
          Expanded(
            child: ElevatedButton.icon(
              onPressed: () async {
                await ref
                    .read(agentComplaintsProvider.notifier)
                    .assignDepartment(complaint.id, '');
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Complaint closed'),
                      backgroundColor: AppColors.success,
                    ),
                  );
                }
              },
              icon: const Icon(Icons.archive, size: 18),
              label: const Text('Close'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.success,
              ),
            ),
          ),
        ],
      );
    }
    return const SizedBox.shrink();
  }

  void _showRejectDialog(Complaint complaint) {
    final reasonController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reject Complaint'),
        content: TextField(
          controller: reasonController,
          decoration: const InputDecoration(
            hintText: 'Enter rejection reason...',
            border: OutlineInputBorder(),
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await ref
                  .read(agentComplaintsProvider.notifier)
                  .reject(complaint.id, reasonController.text);
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Complaint rejected'),
                    backgroundColor: AppColors.warning,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Reject'),
          ),
        ],
      ),
    );
  }

  void _showAssignDialog(Complaint complaint) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Assign to Department'),
        content: SizedBox(
          width: double.maxFinite,
          child: _loadingDepts
              ? const Center(child: CircularProgressIndicator())
              : ListView.builder(
                  shrinkWrap: true,
                  itemCount: _departments.length,
                  itemBuilder: (ctx, i) {
                    final dept = _departments[i];
                    final deptName = dept is Map
                        ? (dept['name'] ?? '')
                        : dept.toString();
                    final deptDesc = dept is Map
                        ? (dept['description'] ?? '')
                        : '';
                    final deptId = dept is Map
                        ? (dept['_id'] ?? dept['id'] ?? '')
                        : '';
                    return ListTile(
                      title: Text(deptName),
                      subtitle: deptDesc.isNotEmpty ? Text(deptDesc) : null,
                      onTap: () async {
                        Navigator.pop(ctx);
                        await ref
                            .read(agentComplaintsProvider.notifier)
                            .assignDepartment(complaint.id, deptId.toString());
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Assigned to $deptName'),
                              backgroundColor: AppColors.success,
                            ),
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
      ),
    );
  }

  Color _getUrgencyColor(int priority) {
    if (priority >= 15) return AppColors.error;
    if (priority >= 8) return AppColors.warning;
    return AppColors.success;
  }

  Widget _buildStatusChip(String status) {
    Color color;
    switch (status) {
      case 'SUBMITTED':
        color = AppColors.submitted;
        break;
      case 'VALIDATED':
        color = AppColors.validated;
        break;
      case 'ASSIGNED':
        color = AppColors.assigned;
        break;
      case 'IN_PROGRESS':
        color = AppColors.inProgress;
        break;
      case 'RESOLVED':
        color = AppColors.resolved;
        break;
      case 'CLOSED':
        color = AppColors.closed;
        break;
      case 'REJECTED':
        color = AppColors.rejected;
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
        status,
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
