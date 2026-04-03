import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/main.dart';
import 'package:smart_city_app/models/complaint_model.dart';
import 'package:smart_city_app/providers/complaints_provider.dart';
import 'package:smart_city_app/services/complaint_service.dart';

class TechnicianTaskDetailScreen extends ConsumerStatefulWidget {
  final String taskId;

  const TechnicianTaskDetailScreen({super.key, required this.taskId});

  @override
  ConsumerState<TechnicianTaskDetailScreen> createState() =>
      _TechnicianTaskDetailScreenState();
}

class _TechnicianTaskDetailScreenState
    extends ConsumerState<TechnicianTaskDetailScreen> {
  final ComplaintService _complaintService = ComplaintService();
  Complaint? _task;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadTask();
  }

  Future<void> _loadTask() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final taskJson = await _complaintService.getTaskById(widget.taskId);
      if (!mounted) return;
      setState(() {
        _task = Complaint.fromJson(taskJson);
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _startTask() async {
    try {
      await ref.read(technicianTasksProvider.notifier).startTask(widget.taskId);
      await _loadTask();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Task started successfully'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to start task: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<void> _completeTask(String notes) async {
    try {
      await ref
          .read(technicianTasksProvider.notifier)
          .completeTask(widget.taskId, notes: notes);
      await _loadTask();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Task completed successfully'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to complete task: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  void _showCompleteDialog() {
    final notesController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Complete Task'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Enter work done notes (required)'),
            const SizedBox(height: 12),
            TextField(
              controller: notesController,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: const InputDecoration(
                hintText: 'Describe the work completed...',
                border: OutlineInputBorder(),
              ),
              maxLines: 4,
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
              if (notesController.text.trim().isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Please enter work notes'),
                    backgroundColor: AppColors.error,
                  ),
                );
                return;
              }
              Navigator.pop(ctx);
              _completeTask(notesController.text.trim());
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
            child: const Text('Complete'),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'ASSIGNED':
        return AppColors.assigned;
      case 'IN_PROGRESS':
        return AppColors.inProgress;
      case 'RESOLVED':
        return AppColors.resolved;
      case 'CLOSED':
        return AppColors.closed;
      default:
        return Colors.grey;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year} ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Task Details'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadTask),
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
                    onPressed: _loadTask,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            )
          : _task == null
          ? const Center(child: Text('Task not found'))
          : RefreshIndicator(
              onRefresh: _loadTask,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _buildHeader(),
                  const SizedBox(height: 16),
                  _buildDescription(),
                  const SizedBox(height: 16),
                  _buildTaskInfo(),
                  const SizedBox(height: 16),
                  _buildLocation(),
                  const SizedBox(height: 16),
                  _buildMedia(),
                  const SizedBox(height: 24),
                  _buildActionButtons(),
                ],
              ),
            ),
    );
  }

  Widget _buildHeader() {
    final task = _task!;
    final statusColor = _getStatusColor(task.status);

    return Card(
      child: Padding(
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
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: statusColor,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    task.status.replaceAll('_', ' '),
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _buildCategoryChip(task.categoryLabel),
                const SizedBox(width: 12),
                _buildPriorityChip(task.priorityScore),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryChip(String category) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.2),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.category, size: 14, color: AppColors.primary),
          const SizedBox(width: 4),
          Text(
            category,
            style: const TextStyle(color: AppColors.primary, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildPriorityChip(int priority) {
    Color color;
    String label;
    if (priority >= 15) {
      color = AppColors.error;
      label = 'High Priority';
    } else if (priority >= 8) {
      color = AppColors.warning;
      label = 'Medium Priority';
    } else {
      color = AppColors.success;
      label = 'Low Priority';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.priority_high, size: 14, color: color),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(color: color, fontSize: 12)),
        ],
      ),
    );
  }

  Widget _buildDescription() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.description, color: AppColors.primary),
                SizedBox(width: 8),
                Text(
                  'Description',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              _task!.description,
              style: const TextStyle(
                color: AppColors.textSecondary,
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTaskInfo() {
    final task = _task!;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.info_outline, color: AppColors.primary),
                SizedBox(width: 8),
                Text(
                  'Task Information',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildInfoRow('Created', _formatDate(task.createdAt)),
            if (task.validatedAt != null)
              _buildInfoRow('Validated', _formatDate(task.validatedAt!)),
            if (task.resolvedAt != null)
              _buildInfoRow('Resolved', _formatDate(task.resolvedAt!)),
            if (task.closedAt != null)
              _buildInfoRow('Closed', _formatDate(task.closedAt!)),
            _buildInfoRow('Municipality', task.municipalityName ?? 'N/A'),
            if (task.assignedToName != null)
              _buildInfoRow('Assigned To', task.assignedToName ?? 'N/A'),
            if (task.assignedDepartmentName != null)
              _buildInfoRow('Department', task.assignedDepartmentName ?? 'N/A'),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 13,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLocation() {
    return const SizedBox.shrink();
  }

  Widget _buildMedia() {
    if (_task!.media.isEmpty) {
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
                Icon(Icons.attach_file, color: AppColors.primary),
                SizedBox(width: 8),
                Text(
                  'Attachments',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 100,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: _task!.media.length,
                itemBuilder: (ctx, i) {
                  return Container(
                    width: 100,
                    height: 100,
                    margin: const EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: _task!.media[i].type == 'photo'
                          ? Image.network(
                              _task!.media[i].url,
                              fit: BoxFit.cover,
                              errorBuilder: (ctx, error, stack) => const Center(
                                child: Icon(
                                  Icons.image_not_supported,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            )
                          : const Center(
                              child: Icon(
                                Icons.videocam,
                                color: AppColors.textSecondary,
                                size: 32,
                              ),
                            ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons() {
    final task = _task!;

    if (task.status == 'ASSIGNED') {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: _startTask,
          icon: const Icon(Icons.play_arrow),
          label: const Text('Start Work'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            padding: const EdgeInsets.symmetric(vertical: 16),
          ),
        ),
      );
    } else if (task.status == 'IN_PROGRESS') {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: _showCompleteDialog,
          icon: const Icon(Icons.check_circle),
          label: const Text('Mark as Complete'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.success,
            padding: const EdgeInsets.symmetric(vertical: 16),
          ),
        ),
      );
    } else if (task.status == 'RESOLVED') {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.resolved.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.resolved.withOpacity(0.3)),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.hourglass_empty, color: AppColors.resolved),
            SizedBox(width: 12),
            Text(
              'Waiting for agent approval',
              style: TextStyle(
                color: AppColors.resolved,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      );
    } else if (task.status == 'CLOSED') {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.closed.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.closed.withOpacity(0.3)),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle, color: AppColors.closed),
            SizedBox(width: 12),
            Text(
              'Task Completed & Closed',
              style: TextStyle(
                color: AppColors.closed,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      );
    }

    return const SizedBox.shrink();
  }
}
