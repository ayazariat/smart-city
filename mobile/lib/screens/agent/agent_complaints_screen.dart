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
  String _searchTerm = '';
  final TextEditingController _searchController = TextEditingController();
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

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
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

    // Calculate stats
    final total = state.complaints.length;
    final submitted = state.complaints
        .where((c) => c.status == 'SUBMITTED')
        .length;
    final inProgress = state.complaints
        .where((c) => c.status == 'IN_PROGRESS')
        .length;
    final resolved = state.complaints
        .where((c) => c.status == 'RESOLVED')
        .length;

    return Scaffold(
      body: Column(
        children: [
          // Stats Header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(13),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: _buildStatItem(
                        'Total',
                        '$total',
                        Icons.summarize,
                        const Color(0xFF3B82F6),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildStatItem(
                        'Pending',
                        '$submitted',
                        Icons.pending_actions,
                        const Color(0xFFF59E0B),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: _buildStatItem(
                        'In Progress',
                        '$inProgress',
                        Icons.engineering,
                        const Color(0xFFF97316),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildStatItem(
                        'Resolved',
                        '$resolved',
                        Icons.check_circle,
                        const Color(0xFF22C55E),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Search Bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search complaints...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchTerm.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchTerm = '');
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                filled: true,
                fillColor: Colors.grey.shade50,
              ),
              onChanged: (v) => setState(() => _searchTerm = v),
            ),
          ),

          // Filter Chips
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterChip('ALL', 'All'),
                  const SizedBox(width: 8),
                  _buildFilterChip('SUBMITTED', 'Submitted'),
                  const SizedBox(width: 8),
                  _buildFilterChip('VALIDATED', 'Validated'),
                  const SizedBox(width: 8),
                  _buildFilterChip('ASSIGNED', 'Assigned'),
                  const SizedBox(width: 8),
                  _buildFilterChip('IN_PROGRESS', 'In Progress'),
                  const SizedBox(width: 8),
                  _buildFilterChip('RESOLVED', 'Resolved'),
                ],
              ),
            ),
          ),

          const SizedBox(height: 8),

          // Complaints List
          Expanded(
            child: state.isLoading
                ? const Center(child: CircularProgressIndicator())
                : _getFilteredList(state.complaints).isEmpty
                ? _buildEmptyState()
                : RefreshIndicator(
                    onRefresh: _loadComplaints,
                    child: ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _getFilteredList(state.complaints).length,
                      itemBuilder: (ctx, i) => _buildComplaintCard(
                        _getFilteredList(state.complaints)[i],
                      ),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  List<Complaint> _getFilteredList(List<Complaint> complaints) {
    var filtered = complaints;
    if (_statusFilter != 'ALL') {
      filtered = filtered.where((c) => c.status == _statusFilter).toList();
    }
    if (_searchTerm.isNotEmpty) {
      final q = _searchTerm.toLowerCase();
      filtered = filtered
          .where(
            (c) =>
                c.title.toLowerCase().contains(q) ||
                c.description.toLowerCase().contains(q) ||
                c.category.toLowerCase().contains(q),
          )
          .toList();
    }
    return filtered;
  }

  Widget _buildStatItem(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withAlpha(26),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
              Text(
                label,
                style: TextStyle(fontSize: 11, color: Colors.grey[600]),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String status, String label) {
    final isSelected = _statusFilter == status;
    return FilterChip(
      label: Text(label),
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
      checkmarkColor: Colors.white,
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.inbox_outlined, size: 80, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(
            'No complaints found',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildComplaintCard(Complaint complaint) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ComplaintDetailScreen(complaintId: complaint.id),
          ),
        ).then((_) => _loadComplaints()),
        borderRadius: BorderRadius.circular(12),
        child: Container(
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
                  const SizedBox(width: 8),
                  _buildStatusChip(complaint.status),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                complaint.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: Colors.grey[600]),
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
                      color: _getPriorityColor(
                        complaint.priorityScore,
                      ).withAlpha(26),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'P${complaint.priorityScore}',
                      style: TextStyle(
                        fontSize: 11,
                        color: _getPriorityColor(complaint.priorityScore),
                      ),
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '${complaint.createdAt.day}/${complaint.createdAt.month}/${complaint.createdAt.year}',
                    style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                  ),
                ],
              ),
              if (complaint.canValidate ||
                  complaint.canReject ||
                  complaint.canAssign ||
                  complaint.status == 'RESOLVED') ...[
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
                if (mounted)
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Complaint validated'),
                      backgroundColor: AppColors.success,
                    ),
                  );
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
      return ElevatedButton.icon(
        onPressed: () async {
          await ref
              .read(agentComplaintsProvider.notifier)
              .assignDepartment(complaint.id, '');
          if (mounted)
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Complaint closed'),
                backgroundColor: AppColors.success,
              ),
            );
        },
        icon: const Icon(Icons.archive, size: 18),
        label: const Text('Close'),
        style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
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
              if (mounted)
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Complaint rejected'),
                    backgroundColor: AppColors.warning,
                  ),
                );
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
                    final deptId = dept is Map
                        ? (dept['_id'] ?? dept['id'] ?? '')
                        : '';
                    return ListTile(
                      title: Text(deptName),
                      onTap: () async {
                        Navigator.pop(ctx);
                        await ref
                            .read(agentComplaintsProvider.notifier)
                            .assignDepartment(complaint.id, deptId.toString());
                        if (mounted)
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Assigned to $deptName'),
                              backgroundColor: AppColors.success,
                            ),
                          );
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

  Color _getPriorityColor(int priority) {
    if (priority >= 15) return AppColors.error;
    if (priority >= 8) return AppColors.warning;
    return AppColors.success;
  }

  Widget _buildStatusChip(String status) {
    Color color;
    switch (status) {
      case 'SUBMITTED':
        color = const Color(0xFF3B82F6);
        break;
      case 'VALIDATED':
        color = const Color(0xFF8B5CF6);
        break;
      case 'ASSIGNED':
        color = const Color(0xFFF59E0B);
        break;
      case 'IN_PROGRESS':
        color = const Color(0xFFF97316);
        break;
      case 'RESOLVED':
        color = const Color(0xFF22C55E);
        break;
      case 'CLOSED':
        color = const Color(0xFF6B7280);
        break;
      case 'REJECTED':
        color = const Color(0xFFEF4444);
        break;
      default:
        color = Colors.grey;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withAlpha(26),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        status.replaceAll('_', ' '),
        style: TextStyle(
          color: color,
          fontSize: 11,
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
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(category, style: const TextStyle(fontSize: 11)),
    );
  }
}
