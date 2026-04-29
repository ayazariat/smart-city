// ========== MAIN APP ==========
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/core/constants/colors.dart';
import 'package:smart_city_app/core/constants/strings.dart';
import 'package:smart_city_app/services/api_client.dart';
import 'package:smart_city_app/providers/auth_provider.dart';
import 'package:smart_city_app/screens/auth/login_screen.dart';
import 'package:smart_city_app/screens/auth/register_screen.dart';
import 'package:smart_city_app/screens/auth/forgot_password_screen.dart';
import 'package:smart_city_app/screens/auth/reset_password_screen.dart';
import 'package:smart_city_app/screens/auth/set_password_screen.dart';
import 'package:smart_city_app/screens/verify_email_screen.dart';
import 'package:smart_city_app/screens/home_screen.dart';
import 'package:smart_city_app/screens/dashboard_screen.dart'
    as citizen_dashboard;
import 'package:smart_city_app/screens/complaints_screen.dart';
import 'package:smart_city_app/screens/new_complaint_screen.dart';
import 'package:smart_city_app/screens/complaint_detail_screen.dart';
import 'package:smart_city_app/screens/profile_screen.dart';
import 'package:smart_city_app/screens/settings_screen.dart';
import 'package:smart_city_app/screens/transparency_screen.dart';
import 'package:smart_city_app/screens/archive_screen.dart';
import 'package:smart_city_app/screens/notifications_screen.dart';
import 'package:smart_city_app/screens/technician/technician_tasks_screen.dart';
import 'package:smart_city_app/screens/technician/technician_task_detail_screen.dart';
import 'package:smart_city_app/screens/dashboard/heatmap_screen.dart';
import 'package:smart_city_app/routes/app_routes.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );
  await _initializeApp();
  runApp(const ProviderScope(child: MyApp()));
}

Future<void> _initializeApp() async {
  try {
    await ApiClient().loadTokens();
  } catch (e) {
    debugPrint('Auth init: $e');
  }
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.user;

    // Route guard: redirect to login if not authenticated
    // and to role-based home if authenticated
    String initialRoute;
    if (user == null) {
      initialRoute = AppRoutes.login;
    } else {
      initialRoute = AppRoutes.home;
    }

    return MaterialApp(
      title: AppStrings.appName,
      theme: _buildTheme(),
      debugShowCheckedModeBanner: false,
      initialRoute: initialRoute,
      routes: {
        // Auth
        AppRoutes.login: (_) => const LoginScreen(),
        AppRoutes.register: (_) => const RegisterScreen(),
        AppRoutes.forgotPassword: (_) => const ForgotPasswordScreen(),
        AppRoutes.resetPassword: (_) => const ResetPasswordScreen(token: ''),
        AppRoutes.setPassword: (_) =>
            const SetPasswordScreen(token: '', email: ''),
        AppRoutes.verifyEmail: (_) => const VerifyEmailScreen(email: ''),
        // Role-based home (redirects based on role)
        AppRoutes.home: (_) => HomeScreen(
          userRole: user?.role ?? '',
          userName: user?.fullName ?? '',
          onLogout: () => ref.read(authProvider.notifier).logout(),
        ),
        // Citizen
        AppRoutes.complaints: (_) => ComplaintsScreen(
          onLogout: () => ref.read(authProvider.notifier).logout(),
        ),
        AppRoutes.newComplaint: (_) =>
            NewComplaintScreen(onComplaintSubmitted: () {}, onBack: () {}),
        AppRoutes.complaintDetail: (_) =>
            ComplaintDetailScreen(complaintId: ''),
        AppRoutes.profile: (_) => ProfileScreen(
          onLogout: () => ref.read(authProvider.notifier).logout(),
          userName: user?.fullName ?? '',
          userRole: user?.role ?? '',
        ),
        AppRoutes.settings: (_) => const SettingsScreen(),
        // Public
        AppRoutes.transparency: (_) => const TransparencyScreen(),
        AppRoutes.archive: (_) => const ArchiveScreen(),
        AppRoutes.notifications: (_) => const NotificationsScreen(),
        AppRoutes.heatmap: (_) => const HeatmapScreen(),
        // Technician
        AppRoutes.technicianTasks: (_) => const TechnicianTasksScreen(),
        AppRoutes.technicianTaskDetail: (_) =>
            TechnicianTaskDetailScreen(taskId: ''),
      },
    );
  }

  ThemeData _buildTheme() => ThemeData(
    primaryColor: AppColors.primary,
    scaffoldBackgroundColor: AppColors.background,
    colorScheme: const ColorScheme.light(
      primary: AppColors.primary,
      secondary: AppColors.accent,
    ),
    useMaterial3: true,
    visualDensity: VisualDensity.adaptivePlatformDensity,
  );
}
