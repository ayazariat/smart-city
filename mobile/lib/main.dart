// ========== MAIN APP ==========
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/core/constants/colors.dart';
import 'package:smart_city_app/core/constants/strings.dart';
import 'package:smart_city_app/screens/auth/login_screen.dart';
import 'package:smart_city_app/screens/auth/register_screen.dart';
import 'package:smart_city_app/screens/auth/forgot_password_screen.dart';
import 'package:smart_city_app/screens/dashboard_screen.dart';
import 'package:smart_city_app/screens/home_screen.dart';
import 'package:smart_city_app/screens/complaints_screen.dart';
import 'package:smart_city_app/screens/new_complaint_screen.dart';
import 'package:smart_city_app/screens/complaint_detail_screen.dart';
import 'package:smart_city_app/screens/profile_screen.dart';
import 'package:smart_city_app/screens/settings_screen.dart';
import 'package:smart_city_app/screens/transparency_screen.dart';
import 'package:smart_city_app/screens/archive_screen.dart';
import 'package:smart_city_app/screens/public_stats_screen.dart';
import 'package:smart_city_app/screens/verify_email_screen.dart';
import 'package:smart_city_app/screens/admin/admin_complaints_screen.dart';
import 'package:smart_city_app/screens/admin/admin_users_screen.dart';
import 'package:smart_city_app/screens/agent/agent_complaints_screen.dart';
import 'package:smart_city_app/screens/manager/manager_dashboard_screen.dart';
import 'package:smart_city_app/screens/manager/team_performance_screen.dart';
import 'package:smart_city_app/screens/technician/technician_tasks_screen.dart';
import 'package:smart_city_app/screens/technician/technician_task_detail_screen.dart';
import 'package:smart_city_app/routes/app_routes.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );

  runApp(const ProviderScope(child: MyApp()));
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp(
      title: AppStrings.appName,
      theme: ThemeData(
        primaryColor: AppColors.primary,
        scaffoldBackgroundColor: AppColors.background,
        colorScheme: ColorScheme.light(
          primary: AppColors.primary,
          secondary: AppColors.accent,
        ),
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      debugShowCheckedModeBanner: false,
      initialRoute: AppRoutes.login,
      routes: {
        // Auth
        AppRoutes.login: (context) => const LoginScreen(),
        AppRoutes.register: (context) => const RegisterScreen(),
        AppRoutes.forgotPassword: (context) => const ForgotPasswordScreen(),
        AppRoutes.verifyEmail: (context) => const VerifyEmailScreen(email: ''),

        // Main
        AppRoutes.home: (context) => const HomeScreen(),
        AppRoutes.dashboard: (context) => const DashboardScreen(),
        AppRoutes.transparency: (context) => const TransparencyScreen(),
        AppRoutes.profile: (context) =>
            ProfileScreen(onLogout: () {}, userName: '', userRole: ''),
        AppRoutes.settings: (context) => const SettingsScreen(),

        // Complaints
        AppRoutes.complaints: (context) => const ComplaintsScreen(),
        AppRoutes.newComplaint: (context) => NewComplaintScreen(
          onComplaintSubmitted: () {},
          onBack: () => Navigator.pop(context),
        ),
        AppRoutes.complaintDetail: (context) =>
            ComplaintDetailScreen(complaintId: ''),

        // Admin
        AppRoutes.adminDashboard: (context) => const DashboardScreen(),
        AppRoutes.adminComplaints: (context) => const AdminComplaintsScreen(),
        AppRoutes.adminUsers: (context) => const AdminUsersScreen(),

        // Agent
        AppRoutes.agentComplaints: (context) => const AgentComplaintsScreen(),

        // Manager
        AppRoutes.managerDashboard: (context) => const ManagerDashboardScreen(),
        AppRoutes.managerTeamPerformance: (context) =>
            const TeamPerformanceScreen(),

        // Technician
        AppRoutes.technicianTasks: (context) => const TechnicianTasksScreen(),
        AppRoutes.technicianTaskDetail: (context) =>
            const TechnicianTaskDetailScreen(taskId: ''),
      },
    );
  }
}
