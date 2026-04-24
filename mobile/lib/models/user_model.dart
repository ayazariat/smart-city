class User {
  final String id;
  final String email;
  final String fullName;
  final String role;
  final String? phone;
  final String? municipalityName;
  final String? governorate;
  final String? department;
  final bool isActive;

  User({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    this.phone,
    this.municipalityName,
    this.governorate,
    this.department,
    this.isActive = true,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? json['_id'] ?? '',
      email: json['email'] ?? '',
      fullName: json['fullName'] ?? '',
      role: json['role'] ?? 'CITIZEN',
      phone: json['phone'],
      municipalityName: json['municipalityName'],
      governorate: json['governorate'],
      department: json['department'],
      isActive: json['isActive'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'fullName': fullName,
      'role': role,
      'phone': phone,
      'municipalityName': municipalityName,
      'governorate': governorate,
      'department': department,
    };
  }

  bool get isAdmin => role == 'ADMIN';
  bool get isManager => role == 'DEPARTMENT_MANAGER';
  bool get isAgent => role == 'MUNICIPAL_AGENT';
  bool get isTechnician => role == 'TECHNICIAN';
  bool get isCitizen => role == 'CITIZEN';
}
