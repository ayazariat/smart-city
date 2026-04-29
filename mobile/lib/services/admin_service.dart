import 'api_client.dart';

class AdminService {
  final ApiClient _apiClient = ApiClient();

  // ─── Users ───

  Future<Map<String, dynamic>> getUsers({
    int page = 1,
    int limit = 10,
    String? search,
  }) async {
    String endpoint = '/admin/users?page=$page&limit=$limit';
    if (search != null && search.isNotEmpty) endpoint += '&search=$search';
    final response = await _apiClient.get(endpoint);
    return response ?? {};
  }

  Future<Map<String, dynamic>> getUser(String id) async {
    final response = await _apiClient.get('/admin/users/$id');
    return response ?? {};
  }

  Future<Map<String, dynamic>> createUser(Map<String, dynamic> data) async {
    final response = await _apiClient.post('/admin/users', data);
    return response ?? {};
  }

  Future<Map<String, dynamic>> updateUser(
    String id,
    Map<String, dynamic> data,
  ) async {
    final response = await _apiClient.put('/admin/users/$id', data);
    return response ?? {};
  }

  Future<Map<String, dynamic>> updateUserRole(String id, String role) async {
    final response = await _apiClient.put('/admin/users/$id/role', {
      'role': role,
    });
    return response ?? {};
  }

  Future<Map<String, dynamic>> toggleUserActive(
    String id,
    bool isActive,
  ) async {
    final response = await _apiClient.put('/admin/users/$id/active', {
      'isActive': isActive,
    });
    return response ?? {};
  }

  Future<void> deleteUser(String id) async {
    await _apiClient.delete('/admin/users/$id');
  }

  Future<Map<String, dynamic>> getUserStats() async {
    final response = await _apiClient.get('/admin/users/stats');
    return response?['data'] ?? response ?? {};
  }

  // ─── Departments ───

  Future<List<dynamic>> getDepartments() async {
    final response = await _apiClient.get('/admin/departments');
    if (response is Map && response['departments'] != null) {
      return response['departments'] as List;
    }
    if (response is List) return response;
    return [];
  }

  Future<Map<String, dynamic>> createDepartment(
    Map<String, dynamic> data,
  ) async {
    final response = await _apiClient.post('/admin/departments', data);
    return response ?? {};
  }

  Future<Map<String, dynamic>> updateDepartment(
    String id,
    Map<String, dynamic> data,
  ) async {
    final response = await _apiClient.put('/admin/departments/$id', data);
    return response ?? {};
  }

  Future<void> deleteDepartment(String id) async {
    await _apiClient.delete('/admin/departments/$id');
  }

  // ─── SLA Rules ───

  Future<Map<String, dynamic>> getSlaRules() async {
    final response = await _apiClient.get('/admin/sla-rules');
    return response ?? {};
  }

  Future<Map<String, dynamic>> updateSlaRules(List<dynamic> rules) async {
    final response = await _apiClient.put('/admin/sla-rules', {'rules': rules});
    return response ?? {};
  }

  // ─── Stats ───

  Future<Map<String, dynamic>> getStats() async {
    final response = await _apiClient.get('/complaints/stats');
    return response?['data'] ?? response ?? {};
  }

  // ─── Geography ───

  Future<List<dynamic>> getGeography() async {
    final response = await _apiClient.get('/admin/geography');
    if (response is List) return response;
    if (response is Map && response['data'] != null)
      return response['data'] as List;
    return [];
  }
}
