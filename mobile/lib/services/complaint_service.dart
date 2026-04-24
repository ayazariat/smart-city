import 'api_client.dart';
import '../models/complaint_model.dart';

class ComplaintService {
  final ApiClient _apiClient = ApiClient();

  // ─── Citizen ───

  Future<List<Complaint>> getMyComplaints({
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _apiClient.get(
      '/citizen/complaints?page=$page&limit=$limit',
    );
    final list = response['complaints'] ?? [];
    return (list as List).map((c) => Complaint.fromJson(c)).toList();
  }

  Future<Complaint> getComplaintById(String id) async {
    final response = await _apiClient.get('/citizen/complaints/$id');
    return Complaint.fromJson(response['complaint'] ?? response['data'] ?? {});
  }

  Future<Map<String, dynamic>> createComplaint(
    Map<String, dynamic> data,
  ) async {
    final response = await _apiClient.post('/citizen/complaints', data);
    return response['complaint'] ?? response['data'] ?? {};
  }

  Future<Map<String, dynamic>> updateComplaint(
    String id,
    Map<String, dynamic> data,
  ) async {
    final response = await _apiClient.put('/citizen/complaints/$id', data);
    return response['complaint'] ?? {};
  }

  Future<void> deleteComplaint(String id) async {
    await _apiClient.delete('/citizen/complaints/$id');
  }

  Future<Map<String, dynamic>> getCitizenStats() async {
    final response = await _apiClient.get('/citizen/stats');
    return response['data'] ?? {};
  }

  // ─── Confirm / Upvote (public routes) ───

  Future<void> confirmComplaint(String id) async {
    await _apiClient.post('/public/complaints/$id/confirm', {});
  }

  Future<void> upvoteComplaint(String id) async {
    await _apiClient.post('/public/complaints/$id/upvote', {});
  }

  // ─── Agent ───

  Future<List<Complaint>> getAgentComplaints({
    String? status,
    int page = 1,
    int limit = 50,
  }) async {
    String endpoint = '/agent/complaints?page=$page&limit=$limit';
    if (status != null && status.isNotEmpty && status != 'ALL') {
      endpoint += '&status=$status';
    }
    final response = await _apiClient.get(endpoint);
    final data = response['data'];
    final list = data is Map
        ? (data['complaints'] ?? [])
        : (response['complaints'] ?? []);
    return (list as List).map((c) => Complaint.fromJson(c)).toList();
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

  Future<void> closeComplaint(String id) async {
    await _apiClient.put('/agent/complaints/$id/close', {});
  }

  Future<void> approveResolution(String id, {String? notes}) async {
    await _apiClient.post('/agent/complaints/$id/approve-resolution', {
      'notes': ?notes,
    });
  }

  Future<void> rejectResolution(String id, {String? reason}) async {
    await _apiClient.post('/agent/complaints/$id/reject-resolution', {
      'reason': ?reason,
    });
  }

  Future<List<dynamic>> getAgentDepartments() async {
    final response = await _apiClient.get('/agent/departments');
    return response['data'] ?? response['departments'] ?? [];
  }

  // ─── Technician ───

  Future<List<Complaint>> getTechnicianTasks({
    String? status,
    int page = 1,
    int limit = 50,
  }) async {
    String endpoint = '/technician/complaints?page=$page&limit=$limit';
    final response = await _apiClient.get(endpoint);
    final data = response['data'];
    final list = data is Map
        ? (data['complaints'] ?? [])
        : (response['complaints'] ?? []);
    return (list as List).map((c) => Complaint.fromJson(c)).toList();
  }

  Future<Complaint> getTaskById(String id) async {
    final response = await _apiClient.get('/technician/complaints/$id');
    return Complaint.fromJson(response['data'] ?? {});
  }

  Future<void> startTask(String id) async {
    await _apiClient.put('/technician/complaints/$id/start', {});
  }

  Future<void> completeTask(String id, Map<String, dynamic> data) async {
    await _apiClient.put('/technician/complaints/$id/complete', data);
  }

  Future<void> addBeforePhoto(String id, List<String> urls) async {
    await _apiClient.post('/technician/complaints/$id/before-photo', {
      'photos': urls,
    });
  }

  Future<void> addAfterPhoto(String id, List<String> urls) async {
    await _apiClient.post('/technician/complaints/$id/after-photo', {
      'photos': urls,
    });
  }

  Future<void> addTechnicianComment(String id, String text) async {
    await _apiClient.post('/technician/complaints/$id/comments', {
      'text': text,
      'type': 'NOTE',
    });
  }

  Future<Map<String, dynamic>> getTechnicianStats() async {
    final response = await _apiClient.get('/technician/stats');
    return response['data'] ?? {};
  }

  // ─── Manager ───

  Future<List<Complaint>> getManagerComplaints({
    String? status,
    int page = 1,
    int limit = 50,
  }) async {
    String endpoint = '/manager/complaints?page=$page&limit=$limit';
    if (status != null && status.isNotEmpty && status != 'ALL') {
      endpoint += '&status=$status';
    }
    final response = await _apiClient.get(endpoint);
    final data = response['data'];
    final list = data is Map
        ? (data['complaints'] ?? [])
        : (response['complaints'] ?? []);
    return (list as List).map((c) => Complaint.fromJson(c)).toList();
  }

  Future<void> updatePriority(String id, String urgency) async {
    await _apiClient.put('/manager/complaints/$id/priority', {
      'urgency': urgency,
    });
  }

  Future<Map<String, dynamic>> getManagerStats() async {
    final response = await _apiClient.get('/manager/stats');
    return response['data'] ?? {};
  }

  Future<void> assignTechnician(String complaintId, String technicianId) async {
    await _apiClient.put('/manager/complaints/$complaintId/assign-technician', {
      'technicianId': technicianId,
    });
  }

  Future<List<dynamic>> getDepartmentTechnicians() async {
    final response = await _apiClient.get('/manager/technicians');
    return response['data'] ?? response['technicians'] ?? [];
  }

  Future<List<dynamic>> getTechnicianPerformance() async {
    final response = await _apiClient.get('/manager/technicians/performance');
    return response['data'] ?? [];
  }

  // ─── Admin ───

  Future<List<Complaint>> getAllComplaints({
    String? status,
    String? category,
    String? priority,
    String? governorate,
    String? municipality,
    String? search,
    int page = 1,
    int limit = 50,
  }) async {
    String endpoint = '/complaints?page=$page&limit=$limit';
    if (status != null && status.isNotEmpty) endpoint += '&status=$status';
    if (category != null && category.isNotEmpty)
      endpoint += '&category=$category';
    if (priority != null && priority.isNotEmpty)
      endpoint += '&priority=$priority';
    if (governorate != null && governorate.isNotEmpty)
      endpoint += '&governorate=$governorate';
    if (municipality != null && municipality.isNotEmpty)
      endpoint += '&municipality=$municipality';
    if (search != null && search.isNotEmpty) endpoint += '&search=$search';
    final response = await _apiClient.get(endpoint);
    final data = response['data'];
    final list = data is Map
        ? (data['complaints'] ?? [])
        : (response['complaints'] ?? []);
    return (list as List).map((c) => Complaint.fromJson(c)).toList();
  }

  Future<Map<String, dynamic>> getAdminStats() async {
    final response = await _apiClient.get('/admin/users/stats');
    return response['data'] ?? response;
  }

  // ─── Archive ───

  Future<List<Complaint>> getArchivedComplaints({
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _apiClient.get(
      '/complaints/archived?page=$page&limit=$limit',
    );
    final list = response['complaints'] ?? [];
    return (list as List).map((c) => Complaint.fromJson(c)).toList();
  }

  // ─── Public / Transparency ───

  Future<Map<String, dynamic>> getPublicStats() async {
    final response = await _apiClient.get('/public/stats');
    return response['data'] ?? {};
  }

  Future<List<Complaint>> getPublicComplaints({
    String? governorate,
    String? category,
    int page = 1,
    int limit = 20,
  }) async {
    String endpoint = '/public/complaints?page=$page&limit=$limit';
    if (governorate != null && governorate.isNotEmpty) {
      endpoint += '&governorate=$governorate';
    }
    if (category != null && category.isNotEmpty) {
      endpoint += '&category=$category';
    }
    final response = await _apiClient.get(endpoint);
    final data = response['data'];
    final list = data is Map
        ? (data['complaints'] ?? [])
        : (response['complaints'] ?? []);
    return (list as List).map((c) => Complaint.fromJson(c)).toList();
  }

  // ─── Notifications ───

  Future<List<dynamic>> getNotifications({int page = 1, int limit = 50}) async {
    final response = await _apiClient.get(
      '/notifications?page=$page&limit=$limit',
    );
    return response['notifications'] ?? response['data'] ?? [];
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

  // Duplicate Detection (BL-25)
  Future<Map<String, dynamic>> checkDuplicate({
    required String title,
    required String description,
    required String category,
    required String municipality,
    double? latitude,
    double? longitude,
  }) async {
    final response = await _apiClient.post('/ai/duplicate/check', {
      'title': title,
      'description': description,
      'category': category,
      'municipality': municipality,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
    });
    return response;
  }

  Future<Map<String, dynamic>> confirmDuplicateDecision({
    required String newComplaintId,
    required String existingComplaintId,
    required String action,
  }) async {
    final response = await _apiClient.post('/ai/duplicate/confirm', {
      'newComplaintId': newComplaintId,
      'existingComplaintId': existingComplaintId,
      'action': action,
    });
    return response;
  }
}
