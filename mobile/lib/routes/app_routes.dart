// ========== APP ROUTES ==========
class AppRoutes {
  // Auth
  static const String login = '/login';
  static const String register = '/register';
  static const String forgotPassword = '/forgot-password';
  static const String resetPassword = '/reset-password';
  static const String setPassword = '/set-password';
  static const String verifyEmail = '/verify-email';

  // Main (Role-based)
  static const String home = '/';
  static const String transparency = '/transparency';
  static const String archive = '/archive';
  static const String notifications = '/notifications';
  static const String profile = '/profile';
  static const String settings = '/settings';
  static const String heatmap = '/heatmap';

  // Citizen
  static const String complaints = '/complaints';
  static const String newComplaint = '/complaints/new';
  static const String complaintDetail = '/complaints/:id';

  // Technician
  static const String technicianTasks = '/tasks';
  static const String technicianTaskDetail = '/tasks/:id';
}

