import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:async';
import 'package:smart_city_app/core/constants/colors.dart';
import 'package:smart_city_app/screens/complaints_screen.dart';
import 'package:smart_city_app/screens/new_complaint_screen.dart';
import 'package:smart_city_app/screens/profile_screen.dart';
import 'package:smart_city_app/screens/transparency_screen.dart';
import 'package:smart_city_app/screens/notifications_screen.dart';
import 'package:smart_city_app/screens/archive_screen.dart';
import 'package:smart_city_app/screens/dashboard_screen.dart'
    as citizen_dashboard;
import 'package:smart_city_app/screens/technician/technician_tasks_screen.dart';
import 'package:smart_city_app/screens/dashboard/heatmap_screen.dart';
import 'package:smart_city_app/providers/notifications_provider.dart';
import 'package:smart_city_app/providers/theme_provider.dart';
import 'package:smart_city_app/providers/complaints_provider.dart';
import 'package:smart_city_app/services/api_client.dart';

class HomeScreen extends ConsumerStatefulWidget {
  final VoidCallback? onLogout;
  final String userRole;
  final String userName;

  const HomeScreen({
    super.key,
    this.onLogout,
    this.userRole = '',
    this.userName = '',
  });

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _selectedIndex = 0;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _connectNotifications();
    _refreshTimer = Timer.periodic(
      const Duration(seconds: 60),
      (_) => _refresh(),
    );
  }

  void _refresh() {
    if (_isTechnician && _selectedIndex == 1) {
      ref.read(technicianTasksProvider.notifier).load();
    } else if (!_isTechnician && _selectedIndex == 0) {
      ref.read(myComplaintsProvider.notifier).loadWithStats();
    }
  }

  Future<void> _connectNotifications() async {
    final api = ApiClient();
    await api.loadTokens();
    if (api.token != null) {
      ref.read(notificationsProvider.notifier).load();
      try {
        final me = await api.get('/auth/me');
        final id = (me['_id'] ?? me['id'] ?? '').toString();
        if (id.isNotEmpty) {
          ref
              .read(notificationsProvider.notifier)
              .connectSocket(api.token!, id);
        }
      } catch (_) {}
    }
  }

  bool get _isTechnician => widget.userRole == 'TECHNICIAN';

  List<NavigationDestination> get _navDestinations {
    if (_isTechnician) {
      return const [
        NavigationDestination(
          icon: Icon(Icons.dashboard_outlined),
          selectedIcon: Icon(Icons.dashboard),
          label: 'Dashboard',
        ),
        NavigationDestination(
          icon: Icon(Icons.task_outlined),
          selectedIcon: Icon(Icons.task),
          label: 'My Tasks',
        ),
        NavigationDestination(
          icon: Icon(Icons.archive_outlined),
          selectedIcon: Icon(Icons.archive),
          label: 'Archive',
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
    return const [
      NavigationDestination(
        icon: Icon(Icons.dashboard_outlined),
        selectedIcon: Icon(Icons.dashboard),
        label: 'Dashboard',
      ),
      NavigationDestination(
        icon: Icon(Icons.list_alt_outlined),
        selectedIcon: Icon(Icons.list_alt),
        label: 'My Complaints',
      ),
      NavigationDestination(
        icon: Icon(Icons.archive_outlined),
        selectedIcon: Icon(Icons.archive),
        label: 'Archive',
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

  Widget _buildBody() {
    if (_isTechnician) {
      switch (_selectedIndex) {
        case 0:
          return const citizen_dashboard.DashboardScreen();
        case 1:
          return const TechnicianTasksScreen();
        case 2:
          return const ArchiveScreen();
        case 3:
          return const TransparencyScreen();
        case 4:
          return ProfileScreen(
            onLogout: widget.onLogout,
            userName: widget.userName,
            userRole: widget.userRole,
          );
        default:
          return const TechnicianTasksScreen();
      }
    }
    switch (_selectedIndex) {
      case 0:
        return _buildCitizenDashboard();
      case 1:
        return ComplaintsScreen(onLogout: widget.onLogout);
      case 2:
        return const ArchiveScreen();
      case 3:
        return NewComplaintScreen(onComplaintSubmitted: () {}, onBack: () {});
      case 4:
        return const TransparencyScreen();
      case 5:
        return ProfileScreen(
          onLogout: widget.onLogout,
          userName: widget.userName,
          userRole: widget.userRole,
        );
      default:
        return _buildCitizenDashboard();
    }
  }

  String _getAppBarTitle() {
    if (_isTechnician) {
      return [
        'Dashboard',
        'My Tasks',
        'Archive',
        'Public',
        'Profile',
      ][_selectedIndex];
    }
    return [
      'Dashboard',
      'My Complaints',
      'Archive',
      'New Report',
      'Public',
      'Profile',
    ][_selectedIndex];
  }

  Widget _buildCitizenDashboard() {
    final state = ref.watch(myComplaintsProvider);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (state.stats == null && !state.isLoading) {
        ref.read(myComplaintsProvider.notifier).loadWithStats();
      }
    });
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? 'Bonjour'
        : hour < 18
        ? 'Bon après-midi'
        : 'Bonsoir';
    final firstName = widget.userName.split(' ').first;
    final s = state.stats ?? DashboardStats();

    return RefreshIndicator(
      onRefresh: () => ref.read(myComplaintsProvider.notifier).loadWithStats(),
      color: AppColors.primary,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildGreetingCard(greeting, firstName),
            const SizedBox(height: 20),
            _buildStatsGrid(s),
            const SizedBox(height: 20),
            _buildQuickActions(),
            const SizedBox(height: 20),
            _buildRecentComplaints(state),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildGreetingCard(String greeting, String firstName) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      gradient: const LinearGradient(
        colors: [AppColors.primary, AppColors.primaryDark],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      borderRadius: BorderRadius.circular(20),
      boxShadow: [
        BoxShadow(
          color: AppColors.primary.withValues(alpha: 0.3),
          blurRadius: 12,
          offset: const Offset(0, 6),
        ),
      ],
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
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
                  const SizedBox(height: 6),
                  const Text(
                    'Signalez et suivez les problèmes de votre ville',
                    style: TextStyle(fontSize: 13, color: Colors.white70),
                  ),
                ],
              ),
            ),
            GestureDetector(
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ArchiveScreen()),
              ),
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.archive, color: Colors.white, size: 22),
              ),
            ),
          ],
        ),
      ],
    ),
  );

  Widget _buildStatsGrid(DashboardStats stats) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            'Mes Signalements',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          GestureDetector(
            onTap: () => setState(() => _selectedIndex = 1),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                'Voir tout',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                ),
              ),
            ),
          ),
        ],
      ),
      const SizedBox(height: 12),
      GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.3,
        children: [
          _statCard(
            'Total',
            '${stats.total}',
            Icons.summarize,
            AppColors.primary,
          ),
          _statCard(
            'En attente',
            '${stats.submitted + stats.pending}',
            Icons.pending_actions,
            const Color(0xFFF59E0B),
          ),
          _statCard(
            'En cours',
            '${stats.inProgress}',
            Icons.engineering,
            const Color(0xFFF97316),
          ),
          _statCard(
            'Résolus',
            '${stats.resolved + stats.closed}',
            Icons.check_circle,
            const Color(0xFF22C55E),
          ),
        ],
      ),
    ],
  );

  Widget _statCard(String l, String v, IconData i, Color c) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.05),
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
            color: c.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(i, color: c, size: 18),
        ),
        const Spacer(),
        Text(
          v,
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: c),
        ),
        Text(l, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
      ],
    ),
  );

  Widget _buildQuickActions() => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Text(
        'Actions rapides',
        style: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: AppColors.textPrimary,
        ),
      ),
      const SizedBox(height: 12),
      Container(
        padding: const EdgeInsets.all(16),
        decoration: _cardDecoration(),
        child: Row(
          children: [
            Expanded(
              child: _actionCard(
                'Signaler un problème',
                Icons.add_circle,
                AppColors.primary,
                () => setState(() => _selectedIndex = 3),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _actionCard(
                'Mes signalements',
                Icons.list_alt,
                AppColors.attention,
                () => setState(() => _selectedIndex = 1),
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 12),
      Container(
        padding: const EdgeInsets.all(16),
        decoration: _cardDecoration(),
        child: Row(
          children: [
            Expanded(
              child: _actionCard(
                'Transparence',
                Icons.public,
                AppColors.primary,
                () => setState(() => _selectedIndex = 4),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _actionCard(
                'Carte thermique',
                Icons.map,
                const Color(0xFFEF4444),
                () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const HeatmapScreen()),
                ),
              ),
            ),
          ],
        ),
      ),
    ],
  );

  BoxDecoration _cardDecoration() => BoxDecoration(
    color: Colors.white,
    borderRadius: BorderRadius.circular(16),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withValues(alpha: 0.05),
        blurRadius: 8,
        offset: const Offset(0, 2),
      ),
    ],
  );

  Widget _actionCard(String t, IconData i, Color c, VoidCallback onTap) =>
      Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: c.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(i, color: c, size: 24),
                ),
                const SizedBox(height: 10),
                Text(
                  t,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      );

  Widget _buildRecentComplaints(ComplaintsState state) {
    final complaints = state.complaints
        .where((c) => c.status != 'CLOSED' && c.status != 'REJECTED')
        .take(3)
        .toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Signalements récents',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            TextButton(
              onPressed: () => setState(() => _selectedIndex = 1),
              child: Text(
                'Voir tout',
                style: TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (state.isLoading)
          const Center(
            child: CircularProgressIndicator(color: AppColors.primary),
          )
        else if (complaints.isEmpty)
          _emptyState()
        else
          ...complaints.map((c) => _complaintCard(c)),
      ],
    );
  }

  Widget _emptyState() => Container(
    padding: const EdgeInsets.all(32),
    decoration: _cardDecoration(),
    child: const Center(
      child: Column(
        children: [
          Icon(Icons.inbox, size: 48, color: Colors.grey),
          SizedBox(height: 12),
          Text(
            'Aucun signalement',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          SizedBox(height: 4),
          Text(
            'Soumettez votre premier signalement',
            style: TextStyle(color: Colors.grey),
          ),
        ],
      ),
    ),
  );

  Widget _complaintCard(dynamic c) {
    final statusColors = {
      'SUBMITTED': AppColors.statusSoumise,
      'VALIDATED': AppColors.statusValidee,
      'ASSIGNED': AppColors.statusAssignee,
      'IN_PROGRESS': AppColors.statusEnCours,
      'RESOLVED': AppColors.statusResolue,
      'CLOSED': AppColors.statusCloturee,
      'REJECTED': AppColors.statusRejetee,
    };
    final color = statusColors[c.status] ?? Colors.grey;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  c.title ?? 'Sans titre',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  c.status?.replaceAll('_', ' ') ?? '',
                  style: TextStyle(
                    color: color,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            c.description ?? '',
            style: TextStyle(color: Colors.grey[600], fontSize: 13),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(Icons.calendar_today, size: 14, color: Colors.grey[400]),
              const SizedBox(width: 4),
              Text(
                '${c.createdAt.day}/${c.createdAt.month}/${c.createdAt.year}',
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
        title: Text(
          _getAppBarTitle(),
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(
              Theme.of(context).brightness == Brightness.dark
                  ? Icons.light_mode
                  : Icons.dark_mode,
            ),
            onPressed: () => ref.read(themeModeProvider.notifier).toggleTheme(),
          ),
          _notificationBadge(notifState),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _showLogoutDialog,
          ),
        ],
      ),
      body: _buildBody(),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (i) => setState(() => _selectedIndex = i),
        destinations: _navDestinations,
      ),
    );
  }

  Widget _notificationBadge(dynamic notifState) => Stack(
    children: [
      IconButton(
        icon: const Icon(Icons.notifications_outlined),
        onPressed: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const NotificationsScreen()),
        ),
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
            constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
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
  );

  void _showLogoutDialog() => showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Déconnexion'),
      content: const Text('Êtes-vous sûr de vouloir vous déconnecter?'),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: const Text('Annuler'),
        ),
        TextButton(
          onPressed: () {
            Navigator.pop(ctx);
            ref.read(notificationsProvider.notifier).disconnectSocket();
            widget.onLogout?.call();
          },
          child: const Text('Déconnexion'),
        ),
      ],
    ),
  );

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }
}
