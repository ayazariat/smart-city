import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/main.dart' show AppColors;
import 'package:smart_city_app/providers/complaints_provider.dart';
import 'package:smart_city_app/models/complaint_model.dart';
import 'package:smart_city_app/screens/complaint_detail_screen.dart';

class TechnicianTasksScreen extends ConsumerStatefulWidget {
  const TechnicianTasksScreen({super.key});

  @override
  ConsumerState<TechnicianTasksScreen> createState() =>
      _TechnicianTasksScreenState();
}

class _TechnicianTasksScreenState extends ConsumerState<TechnicianTasksScreen> {
  String _statusFilter = 'ALL';
  String _searchTerm = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(technicianTasksProvider.notifier).loadWithStats();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadTasks() async {
    await ref
        .read(technicianTasksProvider.notifier)
        .loadWithStats(status: _statusFilter);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(technicianTasksProvider);
    final stats = state.stats;

    return Column(
      children: [
        // Stats Cards
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
                    child: _buildStatCard(
                      'Total',
                      '${stats?.total ?? 0}',
                      Icons.summarize,
                      const Color(0xFF6B7280),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildStatCard(
                      'Assigned',
                      '${stats?.submitted ?? stats?.pending ?? 0}',
                      Icons.assignment,
                      const Color(0xFF8B5CF6),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _buildStatCard(
                      'In Progress',
                      '${stats?.inProgress ?? 0}',
                      Icons.engineering,
                      const Color(0xFFF97316),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildStatCard(
                      'Resolved',
                      '${stats?.resolved ?? 0}',
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
              hintText: 'Search tasks...',
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
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
              filled: true,
              fillColor: Colors.grey.shade50,
            ),
            onChanged: (value) => setState(() => _searchTerm = value),
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

        // Tasks List
        Expanded(
          child: state.isLoading
              ? const Center(child: CircularProgressIndicator())
              : _buildFilteredTasks(state.complaints).isEmpty
              ? _buildEmptyState()
              : RefreshIndicator(
                  onRefresh: _loadTasks,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _buildFilteredTasks(state.complaints).length,
                    itemBuilder: (ctx, i) => _buildTaskCard(
                      _buildFilteredTasks(state.complaints)[i],
                    ),
                  ),
                ),
        ),
      ],
    );
  }

  List<Complaint> _buildFilteredTasks(List<Complaint> tasks) {
    if (_searchTerm.isEmpty) return tasks;
    final q = _searchTerm.toLowerCase();
    return tasks
        .where(
          (t) =>
              t.title.toLowerCase().contains(q) ||
              t.description.toLowerCase().contains(q) ||
              t.category.toLowerCase().contains(q) ||
              (t.location?['address']?.toString().toLowerCase().contains(q) ??
                  false),
        )
        .toList();
  }

  Widget _buildStatCard(
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
        _loadTasks();
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
          Icon(Icons.inbox_outlined, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text(
            _searchTerm.isNotEmpty
                ? 'No tasks match your search'
                : 'No tasks found',
            style: TextStyle(color: Colors.grey[600], fontSize: 16),
          ),
          const SizedBox(height: 8),
          Text(
            _searchTerm.isNotEmpty
                ? 'Try a different search term'
                : 'Check back later for new tasks',
            style: TextStyle(color: Colors.grey[400], fontSize: 14),
          ),
        ],
      ),
    );
  }

  Widget _buildTaskCard(Complaint task) {
    final priorityColor = task.priorityScore != null
        ? task.priorityScore >= 15
              ? AppColors.error
              : task.priorityScore >= 8
              ? AppColors.warning
              : AppColors.success
        : AppColors.success;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => ComplaintDetailScreen(complaintId: task.id),
            ),
          ).then(
            (_) => ref.read(technicianTasksProvider.notifier).loadWithStats(),
          );
        },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          decoration: BoxDecoration(
            border: Border(left: BorderSide(width: 4, color: priorityColor)),
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Row
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      '#${task.id.substring(0, task.id.length > 6 ? 6 : task.id.length)}',
                      style: TextStyle(
                        fontSize: 10,
                        color: Colors.grey[600],
                        fontFamily: 'monospace',
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  _buildStatusChip(task.status),
                  const Spacer(),
                  if (task.priorityScore != null)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: priorityColor.withAlpha(26),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.flag, size: 10, color: priorityColor),
                          const SizedBox(width: 2),
                          Text(
                            '${task.priorityScore}',
                            style: TextStyle(
                              fontSize: 10,
                              color: priorityColor,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),

              // Title
              Text(
                task.title ?? 'Untitled',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),

              // Description
              Text(
                task.description ?? '',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: Colors.grey[600], fontSize: 13),
              ),
              const SizedBox(height: 12),

              // Meta info
              _buildMetaInfo(task),
              const SizedBox(height: 12),

              // Action Button
              _buildActionButton(task),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetaInfo(Complaint task) {
    final locationAddress = task.location?['address']?.toString();
    final hasLocation = locationAddress != null && locationAddress.isNotEmpty;

    return Wrap(
      spacing: 12,
      runSpacing: 8,
      children: [
        if (hasLocation)
          _buildMetaChip(
            Icons.location_on,
            locationAddress!.length > 20
                ? '${locationAddress.substring(0, 20)}...'
                : locationAddress,
          ),
        _buildMetaChip(Icons.category, task.categoryLabel),
        _buildMetaChip(
          Icons.calendar_today,
          '${task.createdAt.day}/${task.createdAt.month}/${task.createdAt.year}',
        ),
      ],
    );
  }

  Widget _buildMetaChip(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: Colors.grey[500]),
        const SizedBox(width: 4),
        Text(text, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
      ],
    );
  }

  Widget _buildStatusChip(String? status) {
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
      case 'CLOSED':
        color = const Color(0xFF6B7280);
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
        status?.replaceAll('_', ' ') ?? '',
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildActionButton(Complaint task) {
    if (task.status == 'ASSIGNED') {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: () async {
            await ref.read(technicianTasksProvider.notifier).startTask(task.id);
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Task started successfully!'),
                  backgroundColor: AppColors.primary,
                ),
              );
            }
          },
          icon: const Icon(Icons.play_arrow, size: 18),
          label: const Text('Start Work'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            padding: const EdgeInsets.symmetric(vertical: 12),
          ),
        ),
      );
    } else if (task.status == 'IN_PROGRESS') {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: () => _showCompleteDialog(task),
          icon: const Icon(Icons.check, size: 18),
          label: const Text('Complete Task'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.success,
            padding: const EdgeInsets.symmetric(vertical: 12),
          ),
        ),
      );
    } else if (task.status == 'RESOLVED') {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.success.withAlpha(26),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.hourglass_empty, color: AppColors.success, size: 16),
            SizedBox(width: 8),
            Text(
              'Waiting for agent approval',
              style: TextStyle(
                color: AppColors.success,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      );
    }
    return const SizedBox.shrink();
  }

  void _showCompleteDialog(Complaint task) {
    final notesController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Complete Task'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Complete: ${task.title}'),
            const SizedBox(height: 16),
            TextField(
              controller: notesController,
              decoration: const InputDecoration(
                hintText: 'Enter work done notes (required, min 20 chars)...',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              if (notesController.text.length < 20) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Please enter at least 20 characters'),
                    backgroundColor: Colors.red,
                  ),
                );
                return;
              }
              Navigator.pop(ctx);
              ref
                  .read(technicianTasksProvider.notifier)
                  .completeTask(task.id, notes: notesController.text);
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Task completed!'),
                    backgroundColor: AppColors.success,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
            child: const Text('Complete'),
          ),
        ],
      ),
    );
  }
}
