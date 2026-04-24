// ========== APP ROUTES ==========
class AppRoutes {
  // Auth
  static const String login = '/login';
  static const String register = '/register';
  static const String forgotPassword = '/forgot-password';
  static const String verifyEmail = '/verify-email';

  // Main
  static const String dashboard = '/dashboard';
  static const String home = '/';
  static const String transparency = '/transparency';
  static const String profile = '/profile';
  static const String settings = '/settings';

  // Complaints
  static const String complaints = '/complaints';
  static const String newComplaint = '/complaints/new';
  static const String complaintDetail = '/complaints/:id';

  // Admin
  static const String adminDashboard = '/admin/dashboard';
  static const String adminUsers = '/admin/users';
  static const String adminComplaints = '/admin/complaints';
  static const String adminSettings = '/admin/settings';

  // Agent/Technician
  static const String agentComplaints = '/agent/complaints';
  static const String technicianTasks = '/tasks';
  static const String technicianTaskDetail = '/tasks/:id';

  // Manager
  static const String managerDashboard = '/manager/dashboard';
  static const String managerTeamPerformance = '/manager/team-performance';
}
