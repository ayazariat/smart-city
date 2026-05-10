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
    List<dynamic> list = [];
    if (response is Map) {
      final data = response['data'];
      if (data is Map) {
        list = (data['complaints'] as List?) ?? [];
      } else {
        list = (response['complaints'] as List?) ?? [];
      }
    }
    return list.map((c) => Complaint.fromJson(c as Map<String, dynamic>)).toList();
  }

  Future<Complaint> getComplaintById(String id) async {
    try {
      final response = await _apiClient.get('/citizen/complaints/$id');
      return Complaint.fromJson(response['complaint'] ?? response['data'] ?? {});
    } catch (_) {
      final publicResponse = await _apiClient.get('/public/complaints/$id');
      return Complaint.fromJson(
        publicResponse['complaint'] ?? publicResponse['data'] ?? {},
      );
    }
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
    return _extractData(response);
  }

  Future<Map<String, dynamic>> getAgentStats() async {
    final response = await _apiClient.get('/agent/stats');
    return _extractData(response);
  }

  Future<Map<String, dynamic>> getManagerStats() async {
    final response = await _apiClient.get('/manager/stats');
    return _extractData(response);
  }

  Future<Map<String, dynamic>> getTechnicianStats() async {
    final response = await _apiClient.get('/technician/stats');
    return _extractData(response);
  }

  Future<Map<String, dynamic>> getAdminStats() async {
    final response = await _apiClient.get('/admin/stats');
    return _extractData(response);
  }

  /// Safely extract data from an API response.
  Map<String, dynamic> _extractData(dynamic response) {
    if (response is Map) {
      final data = response['data'];
      if (data is Map<String, dynamic>) return data;
      if (data is Map) return Map<String, dynamic>.from(data);
      // Response itself might be the data
      if (response is Map<String, dynamic>) return response;
      return Map<String, dynamic>.from(response);
    }
    return {};
  }

  // ─── Confirm / Upvote ───

  Future<void> confirmComplaint(String id) async {
    await _apiClient.post('/complaints/$id/confirm', {});
  }

  Future<void> removeComplaintConfirmation(String id) async {
    await _apiClient.delete('/complaints/$id/confirm');
  }

  Future<void> upvoteComplaint(String id) async {
    await _apiClient.post('/public/complaints/$id/upvote', {});
  }

  Future<List<dynamic>> getPublicComments(String id) async {
    final response = await _apiClient.get('/public/complaints/$id/comments');
    return response['data'] ?? response['comments'] ?? [];
  }

  Future<void> addPublicComment(String id, String text, {bool anonymous = false}) async {
    await _apiClient.post('/public/complaints/$id/comment', {
      'text': text,
      'anonymous': anonymous,
    });
  }

  Future<void> submitRating(String id, int rating, String comment, bool resolvedCorrectly) async {
    await _apiClient.post('/citizen/complaints/$id/rating', {
      'rating': rating,
      'comment': comment,
      'resolvedCorrectly': resolvedCorrectly,
    });
  }

  Future<void> confirmResolution(String id) async {
    await _apiClient.post('/citizen/complaints/$id/confirm-resolution', {});
  }

  Future<Map<String, dynamic>> predictCategory(String description) async {
    final response = await _apiClient.post('/ai/predict-category', {
      'description': description,
    });
    return response['data'] ?? {};
  }

  Future<Map<String, dynamic>> checkDuplicates(Map<String, dynamic> data) async {
    final response = await _apiClient.post('/ai/check-duplicates', data);
    return response['data'] ?? {};
  }

  Future<Map<String, dynamic>> predictUrgency(Map<String, dynamic> data) async {
    final response = await _apiClient.post('/ai/predict-urgency', data);
    return response['data'] ?? {};
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
      if (notes != null && notes.trim().isNotEmpty) 'notes': notes,
    });
  }

  Future<void> rejectResolution(String id, {String? reason}) async {
    await _apiClient.post('/agent/complaints/$id/reject-resolution', {
      if (reason != null && reason.trim().isNotEmpty) 'reason': reason,
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
    if (category != null && category.isNotEmpty) {
      endpoint += '&category=$category';
    }
    if (priority != null && priority.isNotEmpty) {
      endpoint += '&priority=$priority';
    }
    if (governorate != null && governorate.isNotEmpty) {
      endpoint += '&governorate=$governorate';
    }
    if (municipality != null && municipality.isNotEmpty) {
      endpoint += '&municipality=$municipality';
    }
    if (search != null && search.isNotEmpty) endpoint += '&search=$search';
    final response = await _apiClient.get(endpoint);
    final data = response['data'];
    final list = data is Map
        ? (data['complaints'] ?? [])
        : (response['complaints'] ?? []);
    return (list as List).map((c) => Complaint.fromJson(c)).toList();
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
    if (response is Map) {
      // Try response['data'] first (standard API wrapper)
      final data = response['data'];
      if (data is Map<String, dynamic>) return data;
      if (data is Map) return Map<String, dynamic>.from(data);
      // Fallback: response itself might be the stats object
      if (response['total'] != null || response['resolved'] != null) {
        return Map<String, dynamic>.from(response);
      }
    }
    return {};
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
    List<dynamic> list = [];
    if (response is Map) {
      final data = response['data'];
      if (data is Map) {
        list = (data['complaints'] as List?) ?? [];
      } else if (data is List) {
        list = data;
      } else {
        list = (response['complaints'] as List?) ?? [];
      }
    } else if (response is List) {
      list = response;
    }
    return list.map((c) => Complaint.fromJson(c as Map<String, dynamic>)).toList();
  }

  // ─── Municipality & Public ───

  Future<List<Complaint>> getMunicipalityComplaints({int limit = 20}) async {
    final response = await _apiClient.get(
      '/public/my-municipality-complaints?limit=$limit&status=VALIDATED,ASSIGNED,IN_PROGRESS,RESOLVED',
    );
    final list = response['complaints'] ?? [];
    return (list as List).map((c) => Complaint.fromJson(c)).toList();
  }

  Future<List<Complaint>> getRecentResolutions({int limit = 6}) async {
    final response = await _apiClient.get(
      '/public/my-municipality-complaints?limit=$limit&status=RESOLVED&sort=-updatedAt',
    );
    final list = response['complaints'] ?? [];
    return (list as List).map((c) => Complaint.fromJson(c)).toList();
  }

  Future<List<dynamic>> getTrendAlerts() async {
    try {
      final response = await _apiClient.get('/ai/trend/alerts');
      return response['data'] ?? [];
    } catch (_) {
      return [];
    }
  }

  // ─── Upload Media ───

  Future<List<dynamic>> uploadMedia(List<String> filePaths) async {
    // Simulate upload - in real app use multipart
    final response = await _apiClient.post('/upload', {
      'files': filePaths,
    });
    return response['data'] ?? [];
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
    final body = <String, dynamic>{
      'title': title,
      'description': description,
      'category': category,
      'municipality': municipality,
    };
    if (latitude != null) body['latitude'] = latitude;
    if (longitude != null) body['longitude'] = longitude;
    final response = await _apiClient.post('/ai/duplicate/check', body);
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
