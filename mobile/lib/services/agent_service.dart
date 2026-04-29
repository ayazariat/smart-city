import 'api_client.dart';

class AgentService {
  final ApiClient _apiClient = ApiClient();

  Future<List<dynamic>> getAgentComplaints({
    String? status,
    int page = 1,
    int limit = 50,
  }) async {
    String endpoint = '/agent/complaints?page=$page&limit=$limit';
    if (status != null && status.isNotEmpty && status != 'ALL') {
      endpoint += '&status=$status';
    }
    final response = await _apiClient.get(endpoint);
    final data = response?['data'];
    if (data is Map) return data['complaints'] ?? [];
    if (data is List) return data;
    return response?['complaints'] ?? [];
  }

  Future<void> validateComplaint(String id) async {
    await _apiClient.put('/agent/complaints/$id/validate', {});
  }

  Future<void> rejectComplaint(String id, String reason) async {
    await _apiClient.put('/agent/complaints/$id/reject', {'reason': reason});
  }

  Future<void> assignDepartment(String id, String departmentId) async {
    await _apiClient.put('/agent/complaints/$id/assign-department', {
      'departmentId': departmentId,
    });
  }

  Future<Map<String, dynamic>> predictDepartment(
    String category,
    String description,
    String municipality,
  ) async {
    final response = await _apiClient.post('/ai/predict-department', {
      'category': category,
      'description': description,
      'municipality': municipality,
    });
    return response ?? {};
  }

  Future<void> approveResolution(String id, {String? notes}) async {
    await _apiClient.post('/agent/complaints/$id/approve-resolution', {
      if (notes != null && notes.trim().isNotEmpty) 'notes': notes,
    });
  }

  Future<void> rejectResolution(String id, {String? reason}) async {
    await _apiClient.post('/agent/complaints/$id/reject-resolution', {
      if (reason != null && reason.trim().isNotEmpty) 'reason': reason,
    });
  }

  Future<List<dynamic>> getDepartments() async {
    final response = await _apiClient.get('/agent/departments');
    return response?['data'] ?? response?['departments'] ?? [];
  }

  Future<Map<String, dynamic>> getStats() async {
    final response = await _apiClient.get('/agent/stats');
    return response?['data'] ?? {};
  }
}
