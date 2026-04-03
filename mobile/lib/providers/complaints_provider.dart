import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/complaint_service.dart';

// Complaints state
class ComplaintsState {
  final List<dynamic> complaints;
  final bool isLoading;
  final String? error;
  final int total;
  final int currentPage;
  final int totalPages;

  ComplaintsState({
    this.complaints = const [],
    this.isLoading = false,
    this.error,
    this.total = 0,
    this.currentPage = 1,
    this.totalPages = 1,
  });

  ComplaintsState copyWith({
    List<dynamic>? complaints,
    bool? isLoading,
    String? error,
    int? total,
    int? currentPage,
    int? totalPages,
  }) {
    return ComplaintsState(
      complaints: complaints ?? this.complaints,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      total: total ?? this.total,
      currentPage: currentPage ?? this.currentPage,
      totalPages: totalPages ?? this.totalPages,
    );
  }
}

// My complaints (citizen)
class MyComplaintsNotifier extends StateNotifier<ComplaintsState> {
  final ComplaintService _service;

  MyComplaintsNotifier(this._service) : super(ComplaintsState());

  Future<void> load() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final complaints = await _service.getMyComplaints();
      state = state.copyWith(complaints: complaints, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> create({
    required String title,
    required String description,
    required String category,
    String? municipality,
    String? governorate,
    double? latitude,
    double? longitude,
    List<String>? mediaUrls,
  }) async {
    state = state.copyWith(isLoading: true);
    try {
      final data = {
        'title': title,
        'description': description,
        'category': category,
        'municipality': ?municipality,
        'governorate': ?governorate,
        'latitude': ?latitude,
        'longitude': ?longitude,
        if (mediaUrls != null && mediaUrls.isNotEmpty) 'media': mediaUrls,
      };
      await _service.createComplaint(data);
      await load();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }
}

// Agent complaints
class AgentComplaintsNotifier extends StateNotifier<ComplaintsState> {
  final ComplaintService _service;

  AgentComplaintsNotifier(this._service) : super(ComplaintsState());

  Future<void> load({String status = 'ALL'}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final result = await _service.getAgentComplaints(status: status);
      state = state.copyWith(complaints: result, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> validate(String id) async {
    await _service.validateComplaint(id);
    await load();
  }

  Future<void> reject(String id, String reason) async {
    await _service.rejectComplaint(id, reason);
    await load();
  }

  Future<void> assignDepartment(String id, String departmentId) async {
    await _service.assignDepartment(id, departmentId);
    await load();
  }
}

// Technician tasks
class TechnicianTasksNotifier extends StateNotifier<ComplaintsState> {
  final ComplaintService _service;

  TechnicianTasksNotifier(this._service) : super(ComplaintsState());

  Future<void> load({String status = 'ASSIGNED,IN_PROGRESS,RESOLVED'}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final tasks = await _service.getTechnicianTasks(status: status);
      state = state.copyWith(complaints: tasks, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
    return;
  }

  Future<void> startTask(String id, {String? notes}) async {
    await _service.startTask(id);
    await load();
  }

  Future<void> completeTask(String id, {String? notes}) async {
    final data = {
      if (notes != null && notes.isNotEmpty) 'resolutionNotes': notes,
    };
    await _service.completeTask(id, data);
    await load();
  }
}

// Manager complaints
class ManagerComplaintsNotifier extends StateNotifier<ComplaintsState> {
  final ComplaintService _service;

  ManagerComplaintsNotifier(this._service) : super(ComplaintsState());

  Future<void> load({String status = 'ALL'}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final complaints = await _service.getManagerComplaints(status: status);
      state = state.copyWith(complaints: complaints, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> assignTechnician(String id, String technicianId) async {
    await _service.assignTechnician(id, technicianId);
    await load();
  }
}

// Public complaints
class PublicComplaintsNotifier extends StateNotifier<ComplaintsState> {
  final ComplaintService _service;

  PublicComplaintsNotifier(this._service) : super(ComplaintsState());

  Future<void> load({String? municipality, String? category}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final complaints = await _service.getPublicComplaints(
        governorate: municipality,
        category: category,
      );
      state = state.copyWith(complaints: complaints, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }
}

// Providers
final complaintServiceProvider = Provider<ComplaintService>(
  (ref) => ComplaintService(),
);

final myComplaintsProvider =
    StateNotifierProvider<MyComplaintsNotifier, ComplaintsState>(
      (ref) => MyComplaintsNotifier(ref.watch(complaintServiceProvider)),
    );

final agentComplaintsProvider =
    StateNotifierProvider<AgentComplaintsNotifier, ComplaintsState>(
      (ref) => AgentComplaintsNotifier(ref.watch(complaintServiceProvider)),
    );

final technicianTasksProvider =
    StateNotifierProvider<TechnicianTasksNotifier, ComplaintsState>(
      (ref) => TechnicianTasksNotifier(ref.watch(complaintServiceProvider)),
    );

final managerComplaintsProvider =
    StateNotifierProvider<ManagerComplaintsNotifier, ComplaintsState>(
      (ref) => ManagerComplaintsNotifier(ref.watch(complaintServiceProvider)),
    );

final publicComplaintsProvider =
    StateNotifierProvider<PublicComplaintsNotifier, ComplaintsState>(
      (ref) => PublicComplaintsNotifier(ref.watch(complaintServiceProvider)),
    );
