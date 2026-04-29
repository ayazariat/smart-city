import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/providers/notifications_provider.dart';
import 'package:smart_city_app/core/constants/colors.dart';
import 'package:smart_city_app/screens/complaint_detail_screen.dart';
import 'package:intl/intl.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifState = ref.watch(notificationsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: AppColors.textPrimary,
        title: const Text(
          'Notifications',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          if (notifState.unreadCount > 0)
            TextButton.icon(
              onPressed: () =>
                  ref.read(notificationsProvider.notifier).markAllAsRead(),
              icon: const Icon(Icons.done_all, size: 18),
              label: const Text('Marquer tout lu'),
            ),
        ],
      ),
      body: notifState.isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : notifState.notifications.isEmpty
          ? _buildEmpty()
          : ListView.builder(
              itemCount: notifState.notifications.length,
              itemBuilder: (_, index) {
                final n = notifState.notifications[index];
                return Container(
                  margin: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: n.isRead
                        ? Colors.white
                        : AppColors.primary.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: n.isRead
                          ? Colors.grey[200]!
                          : AppColors.primary.withOpacity(0.2),
                    ),
                  ),
                  child: ListTile(
                    leading: Icon(
                      n.isRead
                          ? Icons.notifications_none
                          : Icons.notifications_active,
                      color: n.isRead ? Colors.grey : AppColors.primary,
                    ),
                    title: Text(
                      n.title,
                      style: TextStyle(
                        fontWeight: n.isRead
                            ? FontWeight.normal
                            : FontWeight.bold,
                      ),
                    ),
                    subtitle: Text(
                      n.message,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    trailing: Text(
                      DateFormat('dd/MM HH:mm').format(n.createdAt),
                      style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                    ),
                    onTap: () {
                      if (!n.isRead) {
                        ref
                            .read(notificationsProvider.notifier)
                            .markAsRead(n.id);
                      }
                      if (n.relatedId != null && n.relatedId!.isNotEmpty) {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => ComplaintDetailScreen(
                              complaintId: n.relatedId!,
                            ),
                          ),
                        );
                      }
                    },
                  ),
                );
              },
            ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.notifications_off_outlined,
            size: 64,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          const Text(
            'Aucune notification',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            'Vous recevrez des notifications ici',
            style: TextStyle(color: Colors.grey[600]),
          ),
        ],
      ),
    );
  }
}
