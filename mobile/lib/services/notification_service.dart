import 'api_client.dart';
import '../models/complaint_model.dart';

class NotificationService {
  final ApiClient _apiClient = ApiClient();

  Future<List<Notification>> getNotifications({
    int page = 1,
    int limit = 50,
  }) async {
    final response = await _apiClient.get(
      '/notifications?page=$page&limit=$limit',
    );
    final list = response['notifications'] ?? response['data'] ?? [];
    return (list as List)
        .map((n) => Notification.fromJson(n as Map<String, dynamic>))
        .toList();
  }

  Future<int> getUnreadCount() async {
    final response = await _apiClient.get('/notifications/count');
    return response['unread'] ?? response['count'] ?? 0;
  }

  Future<void> markAsRead(String id) async {
    await _apiClient.put('/notifications/$id/read', {});
  }

  Future<void> markAllAsRead() async {
    await _apiClient.put('/notifications/read-all', {});
  }
}
