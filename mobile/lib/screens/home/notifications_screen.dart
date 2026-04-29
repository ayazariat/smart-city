import 'package:flutter/material.dart';
import 'package:smart_city_app/core/constants/app_theme.dart';
import 'package:smart_city_app/services/complaint_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final ComplaintService _complaintService = ComplaintService();
  List<dynamic> _notifications = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    try {
      final notifications = await _complaintService.getNotifications();
      setState(() {
        _notifications = notifications;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
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
          TextButton(
            onPressed: () async {
              await _complaintService.markAllAsRead();
              _loadNotifications();
            },
            child: const Text('Tout marquer'),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : _notifications.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.notifications_none, size: 64, color: Colors.grey[300]),
                      const SizedBox(height: 16),
                      const Text('Aucune notification', style: TextStyle(color: AppTheme.textSecondary)),
                    ],
                  ),
                )
              : ListView.builder(
                  itemCount: _notifications.length,
                  itemBuilder: (context, index) {
                    final n = _notifications[index];
                    final isRead = n['isRead'] == true;
                    return ListTile(
                      leading: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: isRead ? AppTheme.background : AppTheme.primary.withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          isRead ? Icons.notifications_none : Icons.notifications,
                          color: isRead ? AppTheme.textMuted : AppTheme.primary,
                          size: 20,
                        ),
                      ),
                      title: Text(
                        n['title'] ?? 'Notification',
                        style: TextStyle(
                          fontWeight: isRead ? FontWeight.normal : FontWeight.w600,
                        ),
                      ),
                      subtitle: Text(n['message'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis),
                      trailing: Text(
                        n['createdAt'] != null 
                            ? '${DateTime.parse(n['createdAt']).day}/${DateTime.parse(n['createdAt']).month}'
                            : '',
                        style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                      ),
                      onTap: () async {
                        if (n['_id'] != null) {
                          await _complaintService.markAsRead(n['_id']);
                          _loadNotifications();
                        }
                      },
                    );
                  },
                ),
    );
  }
}
