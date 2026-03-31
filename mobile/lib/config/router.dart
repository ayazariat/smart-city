import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';

// Placeholder screens - will be replaced with actual screens
class LoginScreen extends StatelessWidget {
  final VoidCallback? onLoginSuccess;
  const LoginScreen({super.key, this.onLoginSuccess});
  @override
  Widget build(BuildContext context) => const Placeholder();
}

class RegisterScreen extends StatelessWidget {
  final VoidCallback? onRegisterSuccess;
  const RegisterScreen({super.key, this.onRegisterSuccess});
  @override
  Widget build(BuildContext context) => const Placeholder();
}

class HomeScreen extends StatelessWidget {
  final VoidCallback onLogout;
  final Widget? child;
  const HomeScreen({super.key, required this.onLogout, this.child});
  @override
  Widget build(BuildContext context) => child ?? const Placeholder();
}

class ProfileScreen extends StatelessWidget {
  final VoidCallback? onLogout;
  const ProfileScreen({super.key, this.onLogout});
  @override
  Widget build(BuildContext context) => const Placeholder();
}

class PublicStatsScreen extends StatelessWidget {
  const PublicStatsScreen({super.key});
  @override
  Widget build(BuildContext context) => const Placeholder();
}

class ComplaintsScreen extends StatelessWidget {
  final VoidCallback? onLogout;
  const ComplaintsScreen({super.key, this.onLogout});
  @override
  Widget build(BuildContext context) => const Placeholder();
}

class ComplaintDetailScreen extends StatelessWidget {
  final String complaintId;
  const ComplaintDetailScreen({super.key, required this.complaintId});
  @override
  Widget build(BuildContext context) => const Placeholder();
}

class NewComplaintScreen extends StatelessWidget {
  final VoidCallback? onComplaintSubmitted;
  const NewComplaintScreen({super.key, this.onComplaintSubmitted});
  @override
  Widget build(BuildContext context) => const Placeholder();
}

class ArchiveScreen extends StatelessWidget {
  const ArchiveScreen({super.key});
  @override
  Widget build(BuildContext context) => const Placeholder();
}

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});
  @override
  Widget build(BuildContext context) => const Placeholder();
}

class AgentComplaintsScreen extends StatelessWidget {
  const AgentComplaintsScreen({super.key});
  @override
  Widget build(BuildContext context) => const Placeholder();
}

class TechnicianTasksScreen extends StatelessWidget {
  const TechnicianTasksScreen({super.key});
  @override
  Widget build(BuildContext context) => const Placeholder();
}

class ManagerDashboardScreen extends StatelessWidget {
  const ManagerDashboardScreen({super.key});
  @override
  Widget build(BuildContext context) => const Placeholder();
}

final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>();

class AppRouter {
  final AuthState authState;
  AppRouter(this.authState);

  late final router = GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/',
    routes: [
      GoRoute(path: '/', builder: (c, s) => const LoginScreen()),
      GoRoute(path: '/login', builder: (c, s) => const LoginScreen()),
      GoRoute(path: '/register', builder: (c, s) => const RegisterScreen()),
      GoRoute(
        path: '/public-stats',
        builder: (c, s) => const PublicStatsScreen(),
      ),
      GoRoute(
        path: '/home',
        builder: (c, s) => HomeScreen(onLogout: () {}),
      ),
      GoRoute(path: '/profile', builder: (c, s) => const ProfileScreen()),
      GoRoute(path: '/complaints', builder: (c, s) => const ComplaintsScreen()),
      GoRoute(path: '/archive', builder: (c, s) => const ArchiveScreen()),
      GoRoute(
        path: '/notifications',
        builder: (c, s) => const NotificationsScreen(),
      ),
      GoRoute(
        path: '/agent/complaints',
        builder: (c, s) => const AgentComplaintsScreen(),
      ),
      GoRoute(
        path: '/technician/tasks',
        builder: (c, s) => const TechnicianTasksScreen(),
      ),
      GoRoute(
        path: '/manager/dashboard',
        builder: (c, s) => const ManagerDashboardScreen(),
      ),
      GoRoute(
        path: '/complaint/:id',
        builder: (c, s) =>
            ComplaintDetailScreen(complaintId: s.pathParameters['id']!),
      ),
    ],
  );
}
