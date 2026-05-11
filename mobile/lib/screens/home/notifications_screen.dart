import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/core/constants/app_theme.dart';
import 'package:smart_city_app/providers/notifications_provider.dart';
import 'package:smart_city_app/models/complaint_model.dart' as models;
import 'package:smart_city_app/screens/home/complaint_detail_screen.dart';
import 'package:smart_city_app/widgets/empty_state.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(notificationsProvider.notifier).load();
    });
  }

  IconData _getNotificationIcon(String? type) {
    if (type == null) return Icons.notifications;
    final t = type.toLowerCase();
    if (t.contains('validated') || t.contains('resolved') || t.contains('closed') || t.contains('approved')) {
      return Icons.check_circle;
    }
    if (t.contains('rejected')) return Icons.cancel;
    if (t.contains('assigned') || t.contains('in_progress')) return Icons.engineering;
    if (t.contains('duplicate')) return Icons.content_copy;
    if (t.contains('upvot') || t.contains('confirm')) return Icons.thumb_up;
    if (t.contains('welcome')) return Icons.waving_hand;
    return Icons.notifications;
  }

  Color _getNotificationColor(String? type) {
    if (type == null) return AppTheme.primary;
    final t = type.toLowerCase();
    if (t.contains('validated') || t.contains('resolved') || t.contains('closed') || t.contains('approved')) {
      return AppTheme.statusResolved;
    }
    if (t.contains('rejected')) return AppTheme.statusRejected;
    if (t.contains('assigned') || t.contains('in_progress')) return AppTheme.statusAssigned;
    if (t.contains('duplicate')) return const Color(0xFFF59E0B);
    if (t.contains('upvot') || t.contains('confirm')) return const Color(0xFF22C55E);
    return AppTheme.primary;
  }

  String _formatDate(DateTime? date) {
    if (date == null) return '';
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inMinutes < 1) return 'À l\'instant';
    if (diff.inMinutes < 60) return 'Il y a ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'Il y a ${diff.inHours} h';
    if (diff.inDays < 7) return 'Il y a ${diff.inDays} j';
    return '${date.day}/${date.month}/${date.year}';
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(notificationsProvider);
    final notifications = state.notifications;
    final unreadCount = state.unreadCount;

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final todayNotifs = notifications.where((n) => n.createdAt.isAfter(today)).toList();
    final earlierNotifs = notifications.where((n) => !n.createdAt.isAfter(today)).toList();

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Row(
          children: [
            const Text('Notifications'),
            if (unreadCount > 0) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.red,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '$unreadCount',
                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ],
        ),
        backgroundColor: AppTheme.surface,
        foregroundColor: AppTheme.textPrimary,
        elevation: 0,
        actions: [
          if (unreadCount > 0)
            TextButton(
              onPressed: () => ref.read(notificationsProvider.notifier).markAllAsRead(),
              child: const Text('Tout lire', style: TextStyle(fontSize: 13)),
            ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : notifications.isEmpty
              ? EmptyState(
                  icon: Icons.notifications_none,
                  title: 'Aucune notification',
                  subtitle: 'Vous êtes à jour avec toutes vos notifications',
                )
              : RefreshIndicator(
                  onRefresh: () => ref.read(notificationsProvider.notifier).load(),
                  color: AppTheme.primary,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (todayNotifs.isNotEmpty) ...[
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8),
                          child: Text(
                            'Aujourd\'hui',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textSecondary),
                          ),
                        ),
                        ...todayNotifs.map((n) => _buildNotificationCard(n)),
                        const SizedBox(height: 8),
                      ],
                      if (earlierNotifs.isNotEmpty) ...[
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8),
                          child: Text(
                            'Plus tôt',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textSecondary),
                          ),
                        ),
                        ...earlierNotifs.map((n) => _buildNotificationCard(n)),
                      ],
                    ],
                  ),
                ),
    );
  }

  Widget _buildNotificationCard(dynamic n) {
    // Handle both Notification objects and raw Maps
    final String id;
    final String type;
    final String title;
    final String message;
    final bool isRead;
    final DateTime? createdAt;
    final String? relatedId;

    if (n is models.Notification) {
      id = n.id;
      type = n.type;
      title = n.title;
      message = n.message;
      isRead = n.isRead;
      createdAt = n.createdAt;
      relatedId = n.relatedId;
    } else if (n is Map) {
      id = (n['_id'] ?? n['id'] ?? '').toString();
      type = (n['type'] ?? '').toString();
      title = (n['title'] ?? 'Notification').toString();
      message = (n['message'] ?? '').toString();
      isRead = n['isRead'] == true || n['read'] == true;
      final dateStr = n['createdAt']?.toString();
      createdAt = dateStr != null ? DateTime.tryParse(dateStr) : null;
      relatedId = (n['relatedId'] ?? n['complaintId'])?.toString();
    } else {
      return const SizedBox.shrink();
    }

    final icon = _getNotificationIcon(type);
    final color = _getNotificationColor(type);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: isRead ? AppTheme.surface : AppTheme.primary.withOpacity(0.04),
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        border: Border.all(
          color: isRead ? AppTheme.border : AppTheme.primary.withOpacity(0.2),
          width: isRead ? 1 : 1.5,
        ),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 6, offset: const Offset(0, 2)),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
          onTap: () async {
            // Mark as read
            if (!isRead && id.isNotEmpty) {
              ref.read(notificationsProvider.notifier).markAsRead(id);
            }
            // Navigate to related complaint
            if (relatedId != null && relatedId.isNotEmpty) {
              final rid = relatedId;
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => ComplaintDetailScreen(complaintId: rid),
                ),
              );
            }
          },
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                  ),
                  child: Icon(icon, color: color, size: 22),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontWeight: isRead ? FontWeight.w500 : FontWeight.bold,
                          color: AppTheme.textPrimary,
                          fontSize: 14,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 3),
                      Text(
                        message,
                        style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Text(
                            _formatDate(createdAt),
                            style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                          ),
                          if (relatedId != null && relatedId.isNotEmpty) ...[
                            const SizedBox(width: 8),
                            const Text('·', style: TextStyle(color: AppTheme.textMuted)),
                            const SizedBox(width: 8),
                            const Text(
                              'Voir le signalement',
                              style: TextStyle(fontSize: 11, color: AppTheme.primary, fontWeight: FontWeight.w500),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
                if (!isRead)
                  Container(
                    width: 8,
                    height: 8,
                    margin: const EdgeInsets.only(top: 4, left: 4),
                    decoration: const BoxDecoration(color: AppTheme.primary, shape: BoxShape.circle),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
