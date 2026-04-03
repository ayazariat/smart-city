import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/main.dart';
import 'package:smart_city_app/screens/complaints_screen.dart';
import 'package:smart_city_app/screens/new_complaint_screen.dart';
import 'package:smart_city_app/screens/profile_screen.dart';
import 'package:smart_city_app/screens/transparency_screen.dart';
import 'package:smart_city_app/screens/notifications_screen.dart';
import 'package:smart_city_app/screens/archive_screen.dart';
import 'package:smart_city_app/screens/agent/agent_complaints_screen.dart';
import 'package:smart_city_app/screens/manager/manager_dashboard_screen.dart';
import 'package:smart_city_app/screens/technician/technician_tasks_screen.dart';
import 'package:smart_city_app/screens/admin/admin_users_screen.dart';
import 'package:smart_city_app/providers/notifications_provider.dart';
import 'package:smart_city_app/services/api_client.dart';

class HomeScreen extends ConsumerStatefulWidget {
  final VoidCallback onLogout;
  final String userRole;
  final String userName;

  const HomeScreen({
    super.key,
    required this.onLogout,
    required this.userRole,
    required this.userName,
  });

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _selectedIndex = 0;

  @override
  void initState() {
    super.initState();
    _connectNotifications();
  }

  Future<void> _connectNotifications() async {
    final apiClient = ApiClient();
    await apiClient.loadTokens();
    if (apiClient.token != null) {
      try {
        final meRes = await apiClient.get('/auth/me');
        final userId = meRes['data']?['_id'] ?? meRes['data']?['id'] ?? '';
        if (userId.toString().isNotEmpty) {
          ref
              .read(notificationsProvider.notifier)
              .connectSocket(apiClient.token!, userId.toString());
          ref.read(notificationsProvider.notifier).load();
        }
      } catch (_) {}
    }
  }

  List<NavigationDestination> get _navDestinations {
    switch (widget.userRole) {
      case 'MUNICIPAL_AGENT':
        return const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(Icons.public_outlined),
            selectedIcon: Icon(Icons.public),
            label: 'Public',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ];
      case 'DEPARTMENT_MANAGER':
        return const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(Icons.public_outlined),
            selectedIcon: Icon(Icons.public),
            label: 'Public',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ];
      case 'TECHNICIAN':
        return const [
          NavigationDestination(
            icon: Icon(Icons.task_outlined),
            selectedIcon: Icon(Icons.task),
            label: 'Tasks',
          ),
          NavigationDestination(
            icon: Icon(Icons.public_outlined),
            selectedIcon: Icon(Icons.public),
            label: 'Public',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ];
      case 'ADMIN':
        return const [
          NavigationDestination(
            icon: Icon(Icons.admin_panel_settings_outlined),
            selectedIcon: Icon(Icons.admin_panel_settings),
            label: 'Users',
          ),
          NavigationDestination(
            icon: Icon(Icons.public_outlined),
            selectedIcon: Icon(Icons.public),
            label: 'Public',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ];
      default:
        return const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.list_alt_outlined),
            selectedIcon: Icon(Icons.list_alt),
            label: 'Complaints',
          ),
          NavigationDestination(
            icon: Icon(Icons.add_circle_outline),
            selectedIcon: Icon(Icons.add_circle),
            label: 'Report',
          ),
          NavigationDestination(
            icon: Icon(Icons.public_outlined),
            selectedIcon: Icon(Icons.public),
            label: 'Public',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ];
    }
  }

  Widget _buildBody() {
    switch (widget.userRole) {
      case 'MUNICIPAL_AGENT':
        switch (_selectedIndex) {
          case 0:
            return const AgentComplaintsScreen();
          case 1:
            return const TransparencyScreen();
          case 2:
            return ProfileScreen(onLogout: widget.onLogout);
          default:
            return const AgentComplaintsScreen();
        }
      case 'DEPARTMENT_MANAGER':
        switch (_selectedIndex) {
          case 0:
            return const ManagerDashboardScreen();
          case 1:
            return const TransparencyScreen();
          case 2:
            return ProfileScreen(onLogout: widget.onLogout);
          default:
            return const ManagerDashboardScreen();
        }
      case 'TECHNICIAN':
        switch (_selectedIndex) {
          case 0:
            return const TechnicianTasksScreen();
          case 1:
            return const TransparencyScreen();
          case 2:
            return ProfileScreen(onLogout: widget.onLogout);
          default:
            return const TechnicianTasksScreen();
        }
      case 'ADMIN':
        switch (_selectedIndex) {
          case 0:
            return const AdminUsersScreen();
          case 1:
            return const TransparencyScreen();
          case 2:
            return ProfileScreen(onLogout: widget.onLogout);
          default:
            return const AdminUsersScreen();
        }
      default: // CITIZEN
        switch (_selectedIndex) {
          case 0:
            return _buildHomeContent();
          case 1:
            return ComplaintsScreen(onLogout: widget.onLogout);
          case 2:
            return NewComplaintScreen(onComplaintSubmitted: () {});
          case 3:
            return const TransparencyScreen();
          case 4:
            return ProfileScreen(onLogout: widget.onLogout);
          default:
            return _buildHomeContent();
        }
    }
  }

  String _getAppBarTitle() {
    switch (widget.userRole) {
      case 'MUNICIPAL_AGENT':
        return 'Agent Dashboard';
      case 'DEPARTMENT_MANAGER':
        return 'Manager Dashboard';
      case 'TECHNICIAN':
        return 'My Tasks';
      case 'ADMIN':
        return 'Admin Panel';
      default:
        return 'Smart City Tunisia';
    }
  }

  @override
  Widget build(BuildContext context) {
    final notifState = ref.watch(notificationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(_getAppBarTitle()),
        centerTitle: true,
        actions: [
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const NotificationsScreen(),
                    ),
                  );
                },
              ),
              if (notifState.unreadCount > 0)
                Positioned(
                  right: 6,
                  top: 6,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: AppColors.urgent,
                      shape: BoxShape.circle,
                    ),
                    constraints: const BoxConstraints(
                      minWidth: 18,
                      minHeight: 18,
                    ),
                    child: Text(
                      '${notifState.unreadCount > 99 ? '99+' : notifState.unreadCount}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _showLogoutDialog,
          ),
        ],
      ),
      body: _buildBody(),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) =>
            setState(() => _selectedIndex = index),
        destinations: _navDestinations,
      ),
    );
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              ref.read(notificationsProvider.notifier).disconnectSocket();
              widget.onLogout();
            },
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }

  Widget _buildHomeContent() {
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? 'Good morning'
        : hour < 18
        ? 'Good afternoon'
        : 'Good evening';
    final firstName = widget.userName.split(' ').first;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Card(
            elevation: 4,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                gradient: const LinearGradient(
                  colors: [AppColors.primary, AppColors.primaryDark],
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$greeting, $firstName!',
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Report urban issues and help improve your city.',
                    style: TextStyle(fontSize: 14, color: Colors.white70),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Quick Actions',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          _buildActionCard(
            icon: Icons.add_circle,
            title: 'Report an Issue',
            subtitle: 'Submit a new complaint',
            color: AppColors.primary,
            onTap: () => setState(() => _selectedIndex = 2),
          ),
          _buildActionCard(
            icon: Icons.list_alt,
            title: 'My Complaints',
            subtitle: 'View your submitted complaints',
            color: AppColors.attention,
            onTap: () => setState(() => _selectedIndex = 1),
          ),
          _buildActionCard(
            icon: Icons.public,
            title: 'Public Dashboard',
            subtitle: 'View public transparency data',
            color: Colors.blue,
            onTap: () => setState(() => _selectedIndex = 3),
          ),
          _buildActionCard(
            icon: Icons.archive,
            title: 'Archive',
            subtitle: 'View closed & rejected complaints',
            color: Colors.grey,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ArchiveScreen()),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildActionCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withAlpha(26),
          child: Icon(icon, color: color),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16),
        onTap: onTap,
      ),
    );
  }
}
