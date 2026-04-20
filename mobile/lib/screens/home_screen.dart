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
import 'package:smart_city_app/screens/admin/admin_complaints_screen.dart';
import 'package:smart_city_app/providers/notifications_provider.dart';
import 'package:smart_city_app/providers/theme_provider.dart';
import 'package:smart_city_app/providers/complaints_provider.dart';
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
      ref.read(notificationsProvider.notifier).load();
      try {
        final meRes = await apiClient.get('/auth/me');
        final userId = (meRes['_id'] ?? meRes['id'] ?? '').toString();
        if (userId.isNotEmpty) {
          ref
              .read(notificationsProvider.notifier)
              .connectSocket(apiClient.token!, userId);
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
            icon: Icon(Icons.list_alt_outlined),
            selectedIcon: Icon(Icons.list_alt),
            label: 'Complaints',
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
            return const AdminComplaintsScreen();
          case 2:
            return const TransparencyScreen();
          case 3:
            return ProfileScreen(onLogout: widget.onLogout);
          default:
            return const AdminUsersScreen();
        }
      default:
        switch (_selectedIndex) {
          case 0:
            return _buildCitizenDashboard();
          case 1:
            return ComplaintsScreen(onLogout: widget.onLogout);
          case 2:
            return NewComplaintScreen(onComplaintSubmitted: () {});
          case 3:
            return const TransparencyScreen();
          case 4:
            return ProfileScreen(onLogout: widget.onLogout);
          default:
            return _buildCitizenDashboard();
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
        if (_selectedIndex == 1) return 'All Complaints';
        return 'Admin Panel';
      default:
        return 'Smart City Tunisia';
    }
  }

  Widget _buildCitizenDashboard() {
    final state = ref.watch(myComplaintsProvider);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (state.stats == null && !state.isLoading) {
        ref.read(myComplaintsProvider.notifier).loadWithStats();
      }
    });

    return RefreshIndicator(
      onRefresh: () => ref.read(myComplaintsProvider.notifier).loadWithStats(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(),
            const SizedBox(height: 20),
            _buildStatsCards(state.stats),
            const SizedBox(height: 24),
            _buildQuickActions(),
            const SizedBox(height: 24),
            _buildRecentComplaints(state),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? 'Good morning'
        : hour < 18
        ? 'Good afternoon'
        : 'Good evening';
    final firstName = widget.userName.split(' ').first;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primary, AppColors.primaryDark],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withAlpha(77),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$greeting, $firstName!',
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Track and manage your city complaints',
            style: TextStyle(fontSize: 14, color: Colors.white70),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsCards(DashboardStats? stats) {
    final s = stats ?? DashboardStats();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'My Complaints',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildStatCard(
                'Total',
                '${s.total}',
                Icons.summarize,
                const Color(0xFF3B82F6),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildStatCard(
                'Pending',
                '${s.submitted + s.pending}',
                Icons.pending_actions,
                const Color(0xFFF59E0B),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildStatCard(
                'In Progress',
                '${s.inProgress}',
                Icons.engineering,
                const Color(0xFFF97316),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildStatCard(
                'Resolved',
                '${s.resolved + s.closed}',
                Icons.check_circle,
                const Color(0xFF22C55E),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStatCard(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(13),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withAlpha(26),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(label, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
        ],
      ),
    );
  }

  Widget _buildQuickActions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Quick Actions',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildActionButton(
                'Report Issue',
                Icons.add_circle,
                AppColors.primary,
                () => setState(() => _selectedIndex = 2),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionButton(
                'My Complaints',
                Icons.list_alt,
                AppColors.attention,
                () => setState(() => _selectedIndex = 1),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildActionButton(
                'Transparency',
                Icons.public,
                const Color(0xFF3B82F6),
                () => setState(() => _selectedIndex = 3),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionButton(
                'Archive',
                Icons.archive,
                const Color(0xFF6B7280),
                () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const ArchiveScreen()),
                  );
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildActionButton(
    String title,
    IconData icon,
    Color color,
    VoidCallback onTap,
  ) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withAlpha(26),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
              Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey[400]),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRecentComplaints(ComplaintsState state) {
    final complaints = state.complaints.take(3).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Recent Complaints',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            TextButton(
              onPressed: () => setState(() => _selectedIndex = 1),
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (state.isLoading)
          const Center(child: CircularProgressIndicator())
        else if (complaints.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.grey[50],
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Center(
              child: Column(
                children: [
                  Icon(Icons.inbox, size: 48, color: Colors.grey),
                  SizedBox(height: 8),
                  Text('No complaints yet'),
                  Text(
                    'Submit your first complaint',
                    style: TextStyle(color: Colors.grey),
                  ),
                ],
              ),
            ),
          )
        else
          ...complaints.map((c) => _buildComplaintCard(c)),
      ],
    );
  }

  Widget _buildComplaintCard(dynamic complaint) {
    Color statusColor;
    switch (complaint.status) {
      case 'SUBMITTED':
        statusColor = const Color(0xFF3B82F6);
        break;
      case 'VALIDATED':
        statusColor = const Color(0xFF8B5CF6);
        break;
      case 'ASSIGNED':
        statusColor = const Color(0xFFF59E0B);
        break;
      case 'IN_PROGRESS':
        statusColor = const Color(0xFFF97316);
        break;
      case 'RESOLVED':
        statusColor = const Color(0xFF22C55E);
        break;
      case 'CLOSED':
        statusColor = const Color(0xFF6B7280);
        break;
      case 'REJECTED':
        statusColor = const Color(0xFFEF4444);
        break;
      default:
        statusColor = Colors.grey;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  complaint.title ?? 'Untitled',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withAlpha(26),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  complaint.status?.replaceAll('_', ' ') ?? '',
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            complaint.description ?? '',
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(color: Colors.grey[600], fontSize: 13),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(Icons.calendar_today, size: 14, color: Colors.grey[400]),
              const SizedBox(width: 4),
              Text(
                '${complaint.createdAt.day}/${complaint.createdAt.month}/${complaint.createdAt.year}',
                style: TextStyle(color: Colors.grey[500], fontSize: 12),
              ),
              const SizedBox(width: 16),
              Icon(Icons.category, size: 14, color: Colors.grey[400]),
              const SizedBox(width: 4),
              Text(
                complaint.category ?? '',
                style: TextStyle(color: Colors.grey[500], fontSize: 12),
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final notifState = ref.watch(notificationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(_getAppBarTitle()),
        centerTitle: true,
        actions: [
          IconButton(
            icon: Icon(
              Theme.of(context).brightness == Brightness.dark
                  ? Icons.light_mode
                  : Icons.dark_mode,
            ),
            onPressed: () => ref.read(themeModeProvider.notifier).toggleTheme(),
            tooltip: 'Toggle Theme',
          ),
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
}
