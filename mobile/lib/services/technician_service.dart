import 'api_client.dart';

class TechnicianService {
  final ApiClient _apiClient = ApiClient();

  Future<List<dynamic>> getTasks({
    String? status,
    int page = 1,
    int limit = 50,
  }) async {
    String endpoint = '/technician/complaints?page=$page&limit=$limit';
    if (status != null && status.isNotEmpty && status != 'ALL') {
      endpoint += '&status=$status';
    }
    final response = await _apiClient.get(endpoint);
    final data = response?['data'];
    if (data is Map) return data['complaints'] ?? data['tasks'] ?? [];
    if (data is List) return data;
    return response?['complaints'] ?? [];
  }

  Future<Map<String, dynamic>> getTaskById(String id) async {
    final response = await _apiClient.get('/technician/complaints/$id');
    return response?['data'] ?? {};
  }

  Future<void> startWork(String id) async {
    await _apiClient.put('/technician/complaints/$id/start', {});
  }

  Future<void> completeTask(
    String id,
    String notes,
    List<String>? photoUrls,
  ) async {
    await _apiClient.put('/technician/complaints/$id/complete', {
      'notes': notes,
      if (photoUrls != null && photoUrls.isNotEmpty)
        'afterPhotos': photoUrls
            .map((url) => {'type': 'photo', 'url': url})
            .toList(),
    });
  }

  Future<void> addComment(
    String id,
    String text, {
    String type = 'NOTE',
  }) async {
    await _apiClient.post('/technician/complaints/$id/comments', {
      'content': text,
      'type': type,
    });
  }

  Future<void> reportBlocker(String id, String reason) async {
    await addComment(id, reason, type: 'BLOCAGE');
  }

  Future<void> updateLocation(
    String id,
    double latitude,
    double longitude,
  ) async {
    await _apiClient.put('/technician/complaints/$id/location', {
      'latitude': latitude,
      'longitude': longitude,
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  Future<Map<String, dynamic>> getStats() async {
    final response = await _apiClient.get('/technician/stats');
    return response?['data'] ?? {};
  }
}
