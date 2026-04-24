import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/providers/notifications_provider.dart';
import 'package:smart_city_app/models/complaint_model.dart' as models;
import 'package:smart_city_app/screens/complaint_detail_screen.dart';
import 'package:smart_city_app/core/constants/colors.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(notificationsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        title: const Text(
          'Notifications',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          if (state.unreadCount > 0)
            TextButton.icon(
              onPressed: () =>
                  ref.read(notificationsProvider.notifier).markAllAsRead(),
              icon: const Icon(Icons.done_all, size: 18),
              label: const Text('Tout lire'),
            ),
        ],
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppColors.primary, AppColors.primaryDark],
                    ),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.notifications,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${state.notifications.length}',
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      'Notifications totales',
                      style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                    ),
                  ],
                ),
                const Spacer(),
                if (state.unreadCount > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.urgent.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: AppColors.urgent.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: AppColors.urgent,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${state.unreadCount} non lues',
                          style: const TextStyle(
                            color: AppColors.urgent,
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: state.isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: AppColors.primary),
                  )
                : state.notifications.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF5F7FA),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.notifications_none,
                            size: 64,
                            color: Colors.grey[400],
                          ),
                        ),
                        const SizedBox(height: 20),
                        Text(
                          'Aucune notification',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: Colors.grey[700],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Les mises à jour de vos signalements apparaîtront ici',
                          style: TextStyle(color: Colors.grey[500]),
                        ),
                      ],
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: () =>
                        ref.read(notificationsProvider.notifier).load(),
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      itemCount: state.notifications.length,
                      itemBuilder: (ctx, i) => _buildNotificationItem(
                        ctx,
                        ref,
                        state.notifications[i],
                      ),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationItem(
    BuildContext context,
    WidgetRef ref,
    models.Notification notification,
  ) {
    return Dismissible(
      key: Key(notification.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        color: AppColors.primary,
        child: const Icon(Icons.check, color: Colors.white),
      ),
      onDismissed: (_) =>
          ref.read(notificationsProvider.notifier).markAsRead(notification.id),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        decoration: BoxDecoration(
          color: notification.isRead
              ? Colors.white
              : AppColors.primary.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: notification.isRead
                ? const Color(0xFFE2E8F0)
                : AppColors.primary.withValues(alpha: 0.2),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(16),
          child: InkWell(
            onTap: () {
              if (!notification.isRead) {
                ref
                    .read(notificationsProvider.notifier)
                    .markAsRead(notification.id);
              }
              if (notification.relatedId != null) {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ComplaintDetailScreen(
                      complaintId: notification.relatedId!,
                    ),
                  ),
                );
              }
            },
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: _getIconBackground(
                        notification.type,
                        notification.isRead,
                      ),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(
                      _getIcon(notification.type),
                      color: _getIconColor(
                        notification.type,
                        notification.isRead,
                      ),
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                notification.title,
                                style: TextStyle(
                                  fontWeight: notification.isRead
                                      ? FontWeight.w500
                                      : FontWeight.w600,
                                  fontSize: 15,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                            ),
                            if (!notification.isRead)
                              Container(
                                width: 10,
                                height: 10,
                                decoration: const BoxDecoration(
                                  color: AppColors.primary,
                                  shape: BoxShape.circle,
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          notification.message,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey[600],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Icon(
                              Icons.access_time,
                              size: 14,
                              color: Colors.grey[400],
                            ),
                            const SizedBox(width: 4),
                            Text(
                              _formatTime(notification.createdAt),
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[500],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(Icons.chevron_right, color: Colors.grey[300], size: 22),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  IconData _getIcon(String type) {
    switch (type.toLowerCase()) {
      case 'submitted':
        return Icons.send;
      case 'validated':
        return Icons.check_circle;
      case 'rejected':
        return Icons.cancel;
      case 'assigned':
        return Icons.assignment_ind;
      case 'in_progress':
        return Icons.engineering;
      case 'resolved':
        return Icons.task_alt;
      case 'closed':
        return Icons.archive;
      case 'confirmed':
        return Icons.thumb_up;
      case 'upvoted':
        return Icons.favorite;
      default:
        return Icons.notifications;
    }
  }

  Color _getIconBackground(String type, bool isRead) {
    if (isRead) return const Color(0xFFF5F7FA);
    switch (type.toLowerCase()) {
      case 'submitted':
        return const Color(0xFF3B82F6).withValues(alpha: 0.1);
      case 'validated':
        return const Color(0xFF22C55E).withValues(alpha: 0.1);
      case 'rejected':
        return const Color(0xFFEF4444).withValues(alpha: 0.1);
      case 'assigned':
        return const Color(0xFF8B5CF6).withValues(alpha: 0.1);
      case 'in_progress':
        return const Color(0xFFF97316).withValues(alpha: 0.1);
      case 'resolved':
        return const Color(0xFF22C55E).withValues(alpha: 0.1);
      case 'closed':
        return const Color(0xFF6B7280).withValues(alpha: 0.1);
      case 'confirmed':
        return const Color(0xFF22C55E).withValues(alpha: 0.1);
      case 'upvoted':
        return const Color(0xFFEF4444).withValues(alpha: 0.1);
      default:
        return AppColors.primary.withValues(alpha: 0.1);
    }
  }

  Color _getIconColor(String type, bool isRead) {
    if (isRead) return Colors.grey;
    switch (type.toLowerCase()) {
      case 'submitted':
        return const Color(0xFF3B82F6);
      case 'validated':
        return const Color(0xFF22C55E);
      case 'rejected':
        return const Color(0xFFEF4444);
      case 'assigned':
        return const Color(0xFF8B5CF6);
      case 'in_progress':
        return const Color(0xFFF97316);
      case 'resolved':
        return const Color(0xFF22C55E);
      case 'closed':
        return const Color(0xFF6B7280);
      case 'confirmed':
        return const Color(0xFF22C55E);
      case 'upvoted':
        return const Color(0xFFEF4444);
      default:
        return AppColors.primary;
    }
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);
    if (diff.inMinutes < 1) return 'À l\'instant';
    if (diff.inHours < 1) return 'Il y a ${diff.inMinutes}m';
    if (diff.inDays < 1) return 'Il y a ${diff.inHours}h';
    if (diff.inDays < 7) return 'Il y a ${diff.inDays}j';
    return '${time.day}/${time.month}/${time.year}';
  }
}
