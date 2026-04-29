import 'api_client.dart';

class ManagerService {
  final ApiClient _apiClient = ApiClient();

  Future<List<dynamic>> getManagerComplaints({
    String? status,
    int page = 1,
    int limit = 50,
  }) async {
    String endpoint = '/manager/complaints?page=$page&limit=$limit';
    if (status != null && status.isNotEmpty && status != 'ALL') {
      endpoint += '&status=$status';
    }
    final response = await _apiClient.get(endpoint);
    final data = response?['data'];
    if (data is Map) return data['complaints'] ?? [];
    if (data is List) return data;
    return response?['complaints'] ?? [];
  }

  Future<void> assignTechnician(String complaintId, String technicianId) async {
    await _apiClient.put('/manager/complaints/$complaintId/assign-technician', {
      'technicianId': technicianId,
    });
  }

  Future<void> assignTeam(
    String complaintId,
    List<String> technicianIds,
  ) async {
    await _apiClient.put('/manager/complaints/$complaintId/assign-team', {
      'technicianIds': technicianIds,
    });
  }

  Future<void> reassignTechnician(
    String complaintId,
    String technicianId,
  ) async {
    await _apiClient.put(
      '/manager/complaints/$complaintId/reassign-technician',
      {'technicianId': technicianId},
    );
  }

  Future<void> updatePriority(
    String complaintId,
    Map<String, dynamic> data,
  ) async {
    await _apiClient.put('/manager/complaints/$complaintId/priority', data);
  }

  Future<List<dynamic>> getTechnicians() async {
    final response = await _apiClient.get('/manager/technicians');
    return response?['data'] ?? response?['technicians'] ?? [];
  }

  Future<Map<String, dynamic>> getStats() async {
    final response = await _apiClient.get('/manager/stats');
    return response?['data'] ?? {};
  }

  Future<void> validateComplaint(String id) async {
    await _apiClient.put('/manager/complaints/$id/validate', {});
  }

  Future<void> rejectComplaint(String id, String reason) async {
    await _apiClient.put('/manager/complaints/$id/reject', {'reason': reason});
  }

  Future<List<dynamic>> getTechnicianPerformance() async {
    final response = await _apiClient.get('/manager/technicians/performance');
    return response?['data'] ?? [];
  }
}
