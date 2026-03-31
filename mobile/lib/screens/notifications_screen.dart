import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/main.dart' show AppColors;
import 'package:smart_city_app/providers/notifications_provider.dart';
import 'package:smart_city_app/models/complaint_model.dart' as models;

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(notificationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (state.unreadCount > 0)
            TextButton(
              onPressed: () =>
                  ref.read(notificationsProvider.notifier).markAllAsRead(),
              child: const Text('Mark all read'),
            ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.notifications.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.notifications_none,
                    size: 64,
                    color: AppColors.textSecondary,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No notifications yet',
                    style: TextStyle(color: AppColors.textSecondary),
                  ),
                ],
              ),
            )
          : ListView.builder(
              itemCount: state.notifications.length,
              itemBuilder: (ctx, i) =>
                  _buildNotificationItem(ref, state.notifications[i]),
            ),
    );
  }

  Widget _buildNotificationItem(
    WidgetRef ref,
    models.Notification notification,
  ) {
    return Dismissible(
      key: Key(notification.id),
      background: Container(color: AppColors.error),
      onDismissed: (_) {
        ref.read(notificationsProvider.notifier).markAsRead(notification.id);
      },
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: notification.isRead
              ? AppColors.surface
              : AppColors.primary,
          child: Icon(
            _getIcon(notification.type),
            color: notification.isRead ? AppColors.textSecondary : Colors.white,
          ),
        ),
        title: Text(
          notification.title,
          style: TextStyle(
            fontWeight: notification.isRead
                ? FontWeight.normal
                : FontWeight.bold,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              notification.message,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            Text(
              _formatTime(notification.createdAt),
              style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
            ),
          ],
        ),
        isThreeLine: true,
        onTap: () {
          if (!notification.isRead) {
            ref
                .read(notificationsProvider.notifier)
                .markAsRead(notification.id);
          }
          // Navigate to complaint if relatedId exists
          if (notification.relatedId != null) {
            // Navigator.push(context, MaterialPageRoute(builder: (_) => ComplaintDetailScreen(complaintId: notification.relatedId!)));
          }
        },
      ),
    );
  }

  IconData _getIcon(String type) {
    switch (type) {
      case 'submitted':
        return Icons.send;
      case 'validated':
        return Icons.check_circle;
      case 'rejected':
        return Icons.cancel;
      case 'assigned':
        return Icons.assignment;
      case 'in_progress':
        return Icons.hourglass_empty;
      case 'resolved':
        return Icons.task_alt;
      case 'closed':
        return Icons.archive;
      default:
        return Icons.notifications;
    }
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}
