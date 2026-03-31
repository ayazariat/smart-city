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
  String _statusFilter = 'ASSIGNED,IN_PROGRESS,RESOLVED';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(technicianTasksProvider.notifier).load(status: _statusFilter);
    });
  }

  Future<void> _loadTasks() async {
    await ref
        .read(technicianTasksProvider.notifier)
        .load(status: _statusFilter);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(technicianTasksProvider);

    // Calculate stats
    final total = state.complaints.length;
    final inProgress = state.complaints
        .where((c) => c.status == 'IN_PROGRESS')
        .length;
    final assigned = state.complaints
        .where((c) => c.status == 'ASSIGNED')
        .length;
    final resolved = state.complaints
        .where((c) => c.status == 'RESOLVED')
        .length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Tasks'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadTasks),
        ],
      ),
      body: Column(
        children: [
          // Stats row
          Container(
            padding: const EdgeInsets.all(12),
            color: AppColors.surface,
            child: Row(
              children: [
                _buildStatItem('Total', total, AppColors.primary),
                _buildStatItem('Assigned', assigned, AppColors.assigned),
                _buildStatItem('Active', inProgress, AppColors.inProgress),
                _buildStatItem('Resolved', resolved, AppColors.resolved),
              ],
            ),
          ),

          // Filter chips
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterChip('ASSIGNED,IN_PROGRESS,RESOLVED', 'All'),
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

          // Tasks list
          Expanded(
            child: state.isLoading
                ? const Center(child: CircularProgressIndicator())
                : state.complaints.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.build_outlined,
                          size: 64,
                          color: AppColors.textSecondary,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'No tasks found',
                          style: TextStyle(color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: _loadTasks,
                    child: ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: state.complaints.length,
                      itemBuilder: (ctx, i) =>
                          _buildTaskCard(state.complaints[i]),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, int count, Color color) {
    return Expanded(
      child: Column(
        children: [
          Text(
            '$count',
            style: TextStyle(
              fontSize: 20,
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
    );
  }

  Widget _buildTaskCard(Complaint task) {
    final slaColor = task.priorityScore >= 15
        ? AppColors.error
        : task.priorityScore >= 8
        ? AppColors.warning
        : AppColors.success;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => ComplaintDetailScreen(complaintId: task.id),
            ),
          );
        },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          decoration: BoxDecoration(
            border: Border(left: BorderSide(width: 4, color: slaColor)),
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      task.title,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  _buildStatusChip(task.status),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                task.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  _buildCategoryChip(task.categoryLabel),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: slaColor.withAlpha(26),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'Priority: ${task.priorityScore}',
                      style: TextStyle(fontSize: 11, color: slaColor),
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '${task.createdAt.day}/${task.createdAt.month}/${task.createdAt.year}',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _buildActionButtons(task),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionButtons(Complaint task) {
    if (task.status == 'ASSIGNED') {
      return ElevatedButton.icon(
        onPressed: () async {
          await ref.read(technicianTasksProvider.notifier).startTask(task.id);
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Task started'),
                backgroundColor: AppColors.success,
              ),
            );
          }
        },
        icon: const Icon(Icons.play_arrow, size: 18),
        label: const Text('Start Work'),
        style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
      );
    } else if (task.status == 'IN_PROGRESS') {
      return ElevatedButton.icon(
        onPressed: () => _showCompleteDialog(task),
        icon: const Icon(Icons.check, size: 18),
        label: const Text('Complete'),
        style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
      );
    } else if (task.status == 'RESOLVED') {
      return Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: AppColors.success.withAlpha(26),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle, color: AppColors.success, size: 16),
            SizedBox(width: 8),
            Text(
              'Waiting for agent approval',
              style: TextStyle(color: AppColors.success),
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
        content: TextField(
          controller: notesController,
          decoration: const InputDecoration(
            hintText: 'Enter work done notes (required)...',
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
                  .read(technicianTasksProvider.notifier)
                  .completeTask(
                    task.id,
                    notes: notesController.text.isNotEmpty
                        ? notesController.text
                        : 'Work completed',
                  );
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Task completed'),
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
