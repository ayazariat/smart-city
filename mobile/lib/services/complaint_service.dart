import 'api_client.dart';

class ComplaintService {
  final ApiClient _apiClient = ApiClient();

  // Citizen: Get my complaints
  Future<List<dynamic>> getMyComplaints({int page = 1, int limit = 20}) async {
    final response = await _apiClient.get(
      '/citizen/complaints?page=$page&limit=$limit',
    );
    return response['complaints'] ?? [];
  }

  // Citizen: Get complaint by ID
  Future<Map<String, dynamic>> getComplaintById(String id) async {
    final response = await _apiClient.get('/citizen/complaints/$id');
    return response['data'] ?? {};
  }

  // Citizen: Create complaint
  Future<Map<String, dynamic>> createComplaint(
    Map<String, dynamic> data,
  ) async {
    final response = await _apiClient.post('/citizen/complaints', data);
    return response['data'] ?? {};
  }

  // Citizen: Confirm complaint
  Future<void> confirmComplaint(String id) async {
    await _apiClient.post('/citizen/complaints/$id/confirm', {});
  }

  // Citizen: Vote complaint
  Future<void> voteComplaint(String id) async {
    await _apiClient.post('/citizen/complaints/$id/vote', {});
  }

  // Agent: Get assigned complaints
  Future<List<dynamic>> getAgentComplaints({
    String? status,
    int page = 1,
    int limit = 50,
  }) async {
    String endpoint = '/agent/complaints?page=$page&limit=$limit';
    if (status != null && status.isNotEmpty) {
      endpoint += '&status=$status';
    }
    final response = await _apiClient.get(endpoint);
    return response['complaints'] ?? [];
  }

  // Agent: Validate complaint
  Future<void> validateComplaint(String id) async {
    await _apiClient.post('/agent/complaints/$id/validate', {});
  }

  // Agent: Reject complaint
  Future<void> rejectComplaint(String id, String reason) async {
    await _apiClient.post('/agent/complaints/$id/reject', {'reason': reason});
  }

  // Agent: Assign department
  Future<void> assignDepartment(String id, String departmentId) async {
    await _apiClient.put('/agent/complaints/$id/assign', {
      'departmentId': departmentId,
    });
  }

  // Agent: Update status
  Future<void> updateComplaintStatus(
    String id,
    String status, {
    String? notes,
  }) async {
    await _apiClient.put('/agent/complaints/$id', {
      'status': status,
      'resolutionNotes': notes,
    });
  }

  // Agent: Verify technician report
  Future<void> verifyReport(String id, String action, {String? notes}) async {
    await _apiClient.post('/agent/complaints/$id/verify-report', {
      'action': action,
      'notes': notes,
    });
  }

  // Technician: Get tasks
  Future<List<dynamic>> getTechnicianTasks({
    String? status,
    int page = 1,
    int limit = 50,
  }) async {
    String endpoint = '/technician/tasks?page=$page&limit=$limit';
    final response = await _apiClient.get(endpoint);
    return response['complaints'] ?? [];
  }

  // Technician: Get task by ID
  Future<Map<String, dynamic>> getTaskById(String id) async {
    final response = await _apiClient.get('/technician/complaints/$id');
    return response['data'] ?? {};
  }

  // Technician: Start task
  Future<void> startTask(String id) async {
    await _apiClient.put('/technician/complaints/$id/start', {});
  }

  // Technician: Complete task
  Future<void> completeTask(String id, Map<String, dynamic> data) async {
    await _apiClient.put('/technician/complaints/$id/complete', data);
  }

  // Manager: Get complaints
  Future<List<dynamic>> getManagerComplaints({
    String? status,
    int page = 1,
    int limit = 50,
  }) async {
    String endpoint = '/manager/complaints?page=$page&limit=$limit';
    final response = await _apiClient.get(endpoint);
    return response['complaints'] ?? [];
  }

  // Manager: Update priority
  Future<void> updatePriority(String id, String urgency) async {
    await _apiClient.put('/manager/complaints/$id/priority', {
      'urgency': urgency,
    });
  }

  // Manager: Get dashboard stats
  Future<Map<String, dynamic>> getManagerDashboard() async {
    final response = await _apiClient.get('/manager/dashboard');
    return response['data'] ?? {};
  }

  // Admin: Get all complaints
  Future<List<dynamic>> getAllComplaints({
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
    return response['complaints'] ?? [];
  }

  // Admin: Get dashboard stats
  Future<Map<String, dynamic>> getAdminDashboard() async {
    final response = await _apiClient.get('/admin/dashboard');
    return response['data'] ?? {};
  }

  // Archive: Get archived complaints
  Future<List<dynamic>> getArchivedComplaints({
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _apiClient.get(
      '/complaints/archived?page=$page&limit=$limit',
    );
    return response['complaints'] ?? [];
  }

  // Public: Get stats
  Future<Map<String, dynamic>> getPublicStats() async {
    final response = await _apiClient.get('/public/stats');
    return response['data'] ?? {};
  }

  // Public: Get public complaints
  Future<List<dynamic>> getPublicComplaints({
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
    return response['complaints'] ?? [];
  }

  // Notifications
  Future<List<dynamic>> getNotifications({int page = 1, int limit = 50}) async {
    final response = await _apiClient.get(
      '/notifications?page=$page&limit=$limit',
    );
    return response['notifications'] ?? response['data'] ?? [];
  }

  Future<int> getUnreadCount() async {
    final response = await _apiClient.get('/notifications/count');
    return response['count'] ?? response['unreadCount'] ?? 0;
  }

  Future<void> markAsRead(String id) async {
    await _apiClient.put('/notifications/$id/read', {});
  }

  Future<void> markAllAsRead() async {
    await _apiClient.put('/notifications/read-all', {});
  }

  // Agent: Get departments
  Future<List<dynamic>> getAgentDepartments() async {
    final response = await _apiClient.get('/agent/departments');
    return response['departments'] ?? response['data'] ?? [];
  }

  // Manager: Assign technician
  Future<void> assignTechnician(String complaintId, String technicianId) async {
    await _apiClient.put('/manager/complaints/$complaintId/assign-technician', {
      'technicianId': technicianId,
    });
  }

  // Manager: Get department technicians
  Future<List<dynamic>> getDepartmentTechnicians() async {
    final response = await _apiClient.get('/manager/technicians');
    return response['technicians'] ?? response['data'] ?? [];
  }
}
