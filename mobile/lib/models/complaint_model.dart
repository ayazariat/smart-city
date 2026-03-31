class Complaint {
  final String id;
  final String title;
  final String description;
  final String category;
  final String status;
  final int priorityScore;
  final String? urgency;
  final String? municipalityName;
  final String? governorate;
  final String? rejectionReason;
  final String? resolutionNotes;
  final DateTime createdAt;
  final DateTime? validatedAt;
  final DateTime? resolvedAt;
  final DateTime? closedAt;
  final List<ComplaintMedia> media;
  final List<StatusHistoryItem> statusHistory;
  final UserInfo? createdBy;
  final String? assignedToName;
  final String? assignedDepartmentName;
  final int confirmationCount;
  final int upvoteCount;
  final List<dynamic> confirmations;
  final List<dynamic> upvotes;

  Complaint({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.status,
    required this.priorityScore,
    this.urgency,
    this.municipalityName,
    this.governorate,
    this.rejectionReason,
    this.resolutionNotes,
    required this.createdAt,
    this.validatedAt,
    this.resolvedAt,
    this.closedAt,
    this.media = const [],
    this.statusHistory = const [],
    this.createdBy,
    this.assignedToName,
    this.assignedDepartmentName,
    this.confirmationCount = 0,
    this.upvoteCount = 0,
    this.confirmations = const [],
    this.upvotes = const [],
  });

  factory Complaint.fromJson(Map<String, dynamic> json) {
    return Complaint(
      id: json['_id'] ?? json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      category: json['category'] ?? 'OTHER',
      status: json['status'] ?? 'SUBMITTED',
      priorityScore: json['priorityScore'] ?? 0,
      urgency: json['urgency'],
      municipalityName: json['municipalityName'],
      governorate: json['governorate'],
      rejectionReason: json['rejectionReason'],
      resolutionNotes: json['resolutionNotes'],
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      validatedAt: json['validatedAt'] != null
          ? DateTime.tryParse(json['validatedAt'])
          : null,
      resolvedAt: json['resolvedAt'] != null
          ? DateTime.tryParse(json['resolvedAt'])
          : null,
      closedAt: json['closedAt'] != null
          ? DateTime.tryParse(json['closedAt'])
          : null,
      media:
          (json['media'] as List<dynamic>?)
              ?.map((m) => ComplaintMedia.fromJson(m))
              .toList() ??
          [],
      statusHistory:
          (json['statusHistory'] as List<dynamic>?)
              ?.map((s) => StatusHistoryItem.fromJson(s))
              .toList() ??
          [],
      createdBy: json['createdBy'] != null
          ? UserInfo.fromJson(json['createdBy'])
          : null,
      assignedToName: json['assignedTo'] is Map
          ? json['assignedTo']['fullName']
          : null,
      assignedDepartmentName: json['assignedDepartment'] is Map
          ? json['assignedDepartment']['name']
          : null,
      confirmationCount: json['confirmationCount'] ?? 0,
      upvoteCount: json['upvoteCount'] ?? 0,
      confirmations: json['confirmations'] ?? [],
      upvotes: json['upvotes'] ?? [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'category': category,
      'status': status,
      'priorityScore': priorityScore,
      'urgency': urgency,
      'municipalityName': municipalityName,
      'governorate': governorate,
      'rejectionReason': rejectionReason,
      'resolutionNotes': resolutionNotes,
      'createdAt': createdAt.toIso8601String(),
      'media': media.map((m) => m.toJson()).toList(),
    };
  }

  bool get canValidate => status == 'SUBMITTED';
  bool get canReject => status == 'SUBMITTED';
  bool get canAssign => status == 'VALIDATED';
  bool get canStart => status == 'ASSIGNED';
  bool get canComplete => status == 'IN_PROGRESS';
  bool get canClose => status == 'RESOLVED';

  String get statusLabel {
    switch (status) {
      case 'SUBMITTED':
        return 'Submitted';
      case 'VALIDATED':
        return 'Validated';
      case 'ASSIGNED':
        return 'Assigned';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'RESOLVED':
        return 'Resolved';
      case 'CLOSED':
        return 'Closed';
      case 'REJECTED':
        return 'Rejected';
      default:
        return status;
    }
  }

  String get categoryLabel {
    switch (category) {
      case 'ROAD':
        return 'Roads';
      case 'LIGHTING':
        return 'Lighting';
      case 'WASTE':
        return 'Waste';
      case 'WATER':
        return 'Water';
      case 'SAFETY':
        return 'Safety';
      case 'PUBLIC_PROPERTY':
        return 'Public Property';
      case 'GREEN_SPACE':
        return 'Green Space';
      default:
        return 'Other';
    }
  }
}

class ComplaintMedia {
  final String type;
  final String url;

  ComplaintMedia({required this.type, required this.url});

  factory ComplaintMedia.fromJson(Map<String, dynamic> json) {
    return ComplaintMedia(
      type: json['type'] ?? 'photo',
      url: json['url'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {'type': type, 'url': url};
}

class StatusHistoryItem {
  final String status;
  final String? updatedBy;
  final DateTime updatedAt;
  final String? notes;

  StatusHistoryItem({
    required this.status,
    this.updatedBy,
    required this.updatedAt,
    this.notes,
  });

  factory StatusHistoryItem.fromJson(Map<String, dynamic> json) {
    return StatusHistoryItem(
      status: json['status'] ?? '',
      updatedBy: json['updatedBy'],
      updatedAt: DateTime.tryParse(json['updatedAt'] ?? '') ?? DateTime.now(),
      notes: json['notes'],
    );
  }
}

class UserInfo {
  final String id;
  final String fullName;
  final String? email;
  final String? phone;

  UserInfo({required this.id, required this.fullName, this.email, this.phone});

  factory UserInfo.fromJson(Map<String, dynamic> json) {
    return UserInfo(
      id: json['_id'] ?? json['id'] ?? '',
      fullName: json['fullName'] ?? '',
      email: json['email'],
      phone: json['phone'],
    );
  }
}

class Department {
  final String id;
  final String name;
  final String? description;
  final String? municipalityName;

  Department({
    required this.id,
    required this.name,
    this.description,
    this.municipalityName,
  });

  factory Department.fromJson(Map<String, dynamic> json) {
    return Department(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'],
      municipalityName: json['municipalityName'],
    );
  }
}

class Notification {
  final String id;
  final String type;
  final String title;
  final String message;
  final String? relatedId;
  final bool isRead;
  final DateTime createdAt;

  Notification({
    required this.id,
    required this.type,
    required this.title,
    required this.message,
    this.relatedId,
    required this.isRead,
    required this.createdAt,
  });

  factory Notification.fromJson(Map<String, dynamic> json) {
    return Notification(
      id: json['_id'] ?? json['id'] ?? '',
      type: json['type'] ?? '',
      title: json['title'] ?? '',
      message: json['message'] ?? '',
      relatedId: json['relatedId'] ?? json['complaintId'],
      isRead: json['isRead'] ?? false,
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
    );
  }
}

class StatsData {
  final int total;
  final int resolved;
  final int inProgress;
  final int pending;
  final int overdue;
  final double resolutionRate;
  final double avgResolutionDays;
  final Map<String, int> byCategory;
  final Map<String, int> byMonth;

  StatsData({
    required this.total,
    required this.resolved,
    required this.inProgress,
    required this.pending,
    required this.overdue,
    required this.resolutionRate,
    required this.avgResolutionDays,
    this.byCategory = const {},
    this.byMonth = const {},
  });

  factory StatsData.fromJson(Map<String, dynamic> json) {
    return StatsData(
      total: json['total'] ?? 0,
      resolved: json['resolved'] ?? 0,
      inProgress: json['inProgress'] ?? 0,
      pending: json['pending'] ?? 0,
      overdue: json['overdue'] ?? 0,
      resolutionRate: (json['resolutionRate'] ?? 0).toDouble(),
      avgResolutionDays: (json['avgResolutionDays'] ?? 0).toDouble(),
      byCategory: Map<String, int>.from(json['byCategory'] ?? {}),
      byMonth: Map<String, int>.from(json['byMonth'] ?? {}),
    );
  }
}
