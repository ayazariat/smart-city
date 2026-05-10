import 'package:flutter/material.dart';
import 'package:smart_city_app/core/constants/app_theme.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/widgets/empty_state.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final ComplaintService _complaintService = ComplaintService();
  List<dynamic> _notifications = [];
  bool _isLoading = true;
  int _unreadCount = 0;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    try {
      final notifications = await _complaintService.getNotifications();
      final unread = notifications.where((n) => n['isRead'] != true).length;
      setState(() {
        _notifications = notifications;
        _unreadCount = unread;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  List<dynamic> get _todayNotifications {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    return _notifications.where((n) {
      if (n['createdAt'] == null) return false;
      final date = DateTime.parse(n['createdAt']);
      return date.isAfter(today) || date.isAtSameMomentAs(today);
    }).toList();
  }

  List<dynamic> get _earlierNotifications {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    return _notifications.where((n) {
      if (n['createdAt'] == null) return false;
      final date = DateTime.parse(n['createdAt']);
      return date.isBefore(today);
    }).toList();
  }

  IconData _getNotificationIcon(String? type) {
    if (type == null) return Icons.notifications;
    final t = type.toLowerCase();
    if (t.contains('validated') || t.contains('resolved') || t.contains('closed') || t.contains('approved')) {
      return Icons.check_circle;
    }
    if (t.contains('rejected')) return Icons.cancel;
    if (t.contains('assigned')) return Icons.person;
    return Icons.notifications;
  }

  Color _getNotificationColor(String? type) {
    if (type == null) return AppTheme.primary;
    final t = type.toLowerCase();
    if (t.contains('validated') || t.contains('resolved') || t.contains('closed') || t.contains('approved')) {
      return AppTheme.statusResolved;
    }
    if (t.contains('rejected')) return AppTheme.statusRejected;
    if (t.contains('assigned')) return AppTheme.statusAssigned;
    return AppTheme.primary;
  }

  String _formatDate(String? dateString) {
    if (dateString == null) return '';
    final date = DateTime.parse(dateString);
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
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Notifications'),
        backgroundColor: AppTheme.surface,
        foregroundColor: AppTheme.textPrimary,
        elevation: 0,
        actions: [
          if (_unreadCount > 0)
            TextButton(
              onPressed: () async {
                await _complaintService.markAllAsRead();
                _loadNotifications();
              },
              child: const Text('Tout marquer comme lu'),
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : _notifications.isEmpty
              ? EmptyState(
                  icon: Icons.notifications_none,
                  title: 'Aucune notification',
                  subtitle: 'Vous êtes à jour avec toutes vos notifications',
                )
              : RefreshIndicator(
                  onRefresh: _loadNotifications,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (_todayNotifications.isNotEmpty) ...[
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8),
                          child: Text(
                            'Aujourd\'hui',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ),
                        ..._todayNotifications.map((n) => _buildNotificationCard(n)),
                        const SizedBox(height: 16),
                      ],
                      if (_earlierNotifications.isNotEmpty) ...[
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8),
                          child: Text(
                            'Plus tôt',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ),
                        ..._earlierNotifications.map((n) => _buildNotificationCard(n)),
                      ],
                    ],
                  ),
                ),
    );
  }

  Widget _buildNotificationCard(dynamic n) {
    final isRead = n['isRead'] == true;
    final type = n['type'] as String?;
    final icon = _getNotificationIcon(type);
    final color = _getNotificationColor(type);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isRead ? AppTheme.surface : AppTheme.primary.withOpacity(0.05),
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        border: Border.all(
          color: isRead ? AppTheme.border : AppTheme.primary.withOpacity(0.2),
          width: isRead ? 1 : 2,
        ),
      ),
      child: InkWell(
        onTap: () async {
          if (n['_id'] != null) {
            await _complaintService.markAsRead(n['_id']);
            _loadNotifications();
            // Navigate to related complaint if exists
            if (n['complaintId'] != null || n['relatedId'] != null) {
              // Navigate to complaint detail
            }
          }
        },
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(AppTheme.radiusMd),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    n['title'] ?? 'Notification',
                    style: TextStyle(
                      fontWeight: isRead ? FontWeight.normal : FontWeight.bold,
                      color: AppTheme.textPrimary,
                      fontSize: 15,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    n['message'] ?? '',
                    style: TextStyle(
                      color: AppTheme.textSecondary,
                      fontSize: 13,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _formatDate(n['createdAt']),
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            if (!isRead)
              Container(
                width: 8,
                height: 8,
                margin: const EdgeInsets.only(top: 4),
                decoration: BoxDecoration(
                  color: AppTheme.primary,
                  shape: BoxShape.circle,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
