import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/core/constants/app_theme.dart';
import 'package:smart_city_app/models/complaint_model.dart';
import 'package:smart_city_app/providers/auth_provider.dart';
import 'package:smart_city_app/providers/notifications_provider.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/services/api_client.dart';
import 'package:smart_city_app/screens/home/new_complaint_screen.dart';
import 'package:smart_city_app/screens/home/my_complaints_screen.dart';
import 'package:smart_city_app/screens/home/complaint_detail_screen.dart';
import 'package:smart_city_app/screens/home/notifications_screen.dart';
import 'package:smart_city_app/screens/home/profile_screen.dart';
import 'package:smart_city_app/screens/home/transparency_screen.dart';
import 'package:smart_city_app/screens/technician/technician_tasks_screen.dart';
import 'package:smart_city_app/screens/manager/manager_dashboard_screen.dart';
import 'package:smart_city_app/screens/agent/agent_complaints_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _connectNotifications();
    });
  }

  @override
  void dispose() {
    ref.read(notificationsProvider.notifier).disconnectSocket();
    super.dispose();
  }

  Future<void> _connectNotifications() async {
    final api = ApiClient();
    await api.loadTokens();
    final token = api.token;
    if (token == null) return;

    // Load notifications immediately
    ref.read(notificationsProvider.notifier).load();

    // Get user ID for socket room
    try {
      final me = await api.get('/auth/me');
      if (me is Map) {
        final id = (me['id'] ?? me['_id'] ?? '').toString();
        if (id.isNotEmpty) {
          ref.read(notificationsProvider.notifier).connectSocket(token, id);
        }
      }
    } catch (_) {
      // Socket connection is optional — polling fallback is active
    }
  }

  List<Widget> _buildScreens(String role) {
    switch (role) {
      case 'TECHNICIAN':
        return [
          const DashboardTab(),
          const TechnicianTasksScreen(),
          const TransparencyScreen(),
          const ProfileScreen(),
        ];
      case 'DEPARTMENT_MANAGER':
        return [
          const ManagerDashboardScreen(),
          const MyComplaintsScreen(),
          const TransparencyScreen(),
          const ProfileScreen(),
        ];
      case 'MUNICIPAL_AGENT':
        return [
          const DashboardTab(),
          const AgentComplaintsScreen(),
          const TransparencyScreen(),
          const ProfileScreen(),
        ];
      default: // CITIZEN, ADMIN, etc.
        return [
          const DashboardTab(),
          const MyComplaintsScreen(),
          const TransparencyScreen(),
          const ProfileScreen(),
        ];
    }
  }

  List<BottomNavigationBarItem> _buildNavItems(String role) {
    switch (role) {
      case 'TECHNICIAN':
        return const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard),
            label: 'Accueil',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.task_alt_outlined),
            activeIcon: Icon(Icons.task_alt),
            label: 'Mes tâches',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.public_outlined),
            activeIcon: Icon(Icons.public),
            label: 'Transparence',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'Profil',
          ),
        ];
      case 'DEPARTMENT_MANAGER':
        return const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.list_alt_outlined),
            activeIcon: Icon(Icons.list_alt),
            label: 'Signalements',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.public_outlined),
            activeIcon: Icon(Icons.public),
            label: 'Transparence',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'Profil',
          ),
        ];
      case 'MUNICIPAL_AGENT':
        return const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard),
            label: 'Accueil',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.inbox_outlined),
            activeIcon: Icon(Icons.inbox),
            label: 'File d\'attente',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.public_outlined),
            activeIcon: Icon(Icons.public),
            label: 'Transparence',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'Profil',
          ),
        ];
      default:
        return const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard),
            label: 'Accueil',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.list_alt_outlined),
            activeIcon: Icon(Icons.list_alt),
            label: 'Mes signalements',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.public_outlined),
            activeIcon: Icon(Icons.public),
            label: 'Transparence',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'Profil',
          ),
        ];
    }
  }

  @override
  Widget build(BuildContext context) {
    final role = ref.watch(authProvider).user?.role ?? 'CITIZEN';
    final screens = _buildScreens(role);
    final notifState = ref.watch(notificationsProvider);
    final unreadCount = notifState.unreadCount;

    // Build nav items with notification badge on profile tab
    final navItems = _buildNavItems(role);

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        selectedItemColor: AppTheme.primary,
        unselectedItemColor: AppTheme.textMuted,
        type: BottomNavigationBarType.fixed,
        items: navItems.asMap().entries.map((entry) {
          // Add notification badge to the notifications icon in the header
          // The badge is shown on the dashboard tab's notification bell
          return entry.value;
        }).toList(),
      ),
      // Floating notification badge overlay on the app bar notification icon
    );
  }
}

// ─── DASHBOARD TAB ───────────────────────────────────────────────────────────
class DashboardTab extends ConsumerStatefulWidget {
  const DashboardTab({super.key});

  @override
  ConsumerState<DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends ConsumerState<DashboardTab> {
  final ComplaintService _complaintService = ComplaintService();
  bool _isLoading = true;
  Map<String, dynamic> _stats = {};
  List<Complaint> _recentComplaints = [];
  List<dynamic> _municipalityComplaints = [];
  List<dynamic> _recentResolutions = [];
  List<dynamic> _trendAlerts = [];
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final role = ref.read(authProvider).user?.role ?? 'CITIZEN';
    try {
      Map<String, dynamic> statsData;
      switch (role) {
        case 'MUNICIPAL_AGENT':
          statsData = await _complaintService.getAgentStats();
          break;
        case 'DEPARTMENT_MANAGER':
          statsData = await _complaintService.getManagerStats();
          break;
        case 'TECHNICIAN':
          statsData = await _complaintService.getTechnicianStats();
          break;
        case 'ADMIN':
          statsData = await _complaintService.getAdminStats();
          break;
        default:
          statsData = await _complaintService.getCitizenStats();
      }

      // Only fetch citizen complaints for CITIZEN role — other roles have their own endpoints
      List<Complaint> complaints = [];
      if (role == 'CITIZEN' || role == 'ADMIN') {
        try {
          final all = await _complaintService.getMyComplaints(limit: 10);
          complaints = all
              .where((c) => c.status != 'CLOSED' && c.status != 'REJECTED')
              .toList();
        } catch (_) {
          // Non-blocking — dashboard still shows stats
        }
      }

      setState(() {
        _stats = statsData;
        _recentComplaints = complaints;
        _isLoading = false;
        _errorMessage = null;
      });

      // Only load municipality/resolution data for citizens
      if (role == 'CITIZEN') {
        _loadMunicipalityComplaints();
        _loadRecentResolutions();
      }
      // Load trend alerts for managers/agents/admins
      if (['MUNICIPAL_AGENT', 'DEPARTMENT_MANAGER', 'ADMIN'].contains(role)) {
        _loadTrendAlerts();
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _loadMunicipalityComplaints() async {
    try {
      final response = await _complaintService.getMunicipalityComplaints();
      setState(() => _municipalityComplaints = response);
    } catch (_) {}
  }

  Future<void> _loadRecentResolutions() async {
    try {
      final response = await _complaintService.getRecentResolutions();
      setState(() => _recentResolutions = response);
    } catch (_) {}
  }

  Future<void> _loadTrendAlerts() async {
    try {
      final response = await _complaintService.getTrendAlerts();
      setState(() => _trendAlerts = response);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final role = user?.role ?? 'CITIZEN';
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? 'Bonjour'
        : hour < 18
        ? 'Bon après-midi'
        : 'Bonsoir';
    final firstName = (user?.fullName ?? 'Utilisateur').split(' ').first;

    // Role-specific subtitle
    final subtitle = role == 'TECHNICIAN'
        ? 'Gérez vos tâches assignées'
        : role == 'MUNICIPAL_AGENT'
        ? 'Gérez les signalements de votre municipalité'
        : role == 'DEPARTMENT_MANAGER'
        ? 'Gérez votre département'
        : 'Gérez vos signalements et suivez leur évolution';

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: _isLoading
            ? const Center(
                child: CircularProgressIndicator(color: AppTheme.primary),
              )
            : _errorMessage != null
            ? _buildErrorState()
            : RefreshIndicator(
                onRefresh: _loadData,
                child: CustomScrollView(
                  slivers: [
                    // Header
                    SliverToBoxAdapter(
                      child: Container(
                        margin: const EdgeInsets.all(16),
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [AppTheme.primary, AppTheme.primaryDark],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(AppTheme.radiusXl),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.primary.withOpacity(0.3),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
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
                                          color: AppTheme.textInverse,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        subtitle,
                                        style: const TextStyle(color: Colors.white70, fontSize: 13),
                                      ),
                                    ],
                                  ),
                                ),
                                Row(
                                  children: [
                                    _buildNotificationBell(),
                                    PopupMenuButton<String>(
                                      icon: const Icon(Icons.person_outline, color: Colors.white),
                                      onSelected: (v) => ref.read(authProvider.notifier).logout(),
                                      itemBuilder: (_) => [
                                        const PopupMenuItem(
                                          value: 'logout',
                                          child: Row(
                                            children: [
                                              Icon(Icons.logout, size: 18),
                                              SizedBox(width: 8),
                                              Text('Déconnexion'),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            const SizedBox(height: 20),
                            _buildPrioritiesSection(role),
                          ],
                        ),
                      ),
                    ),

                    // Stats Grid
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: _buildStatsGrid(role),
                      ),
                    ),

                    // Quick Actions — CITIZEN only
                    if (role == 'CITIZEN')
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: _buildCitizenQuickActions(),
                        ),
                      ),

                    // Recent Activities — CITIZEN only (not technician)
                    if (role == 'CITIZEN' && _recentComplaints.isNotEmpty)
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: _buildRecentActivities(),
                        ),
                      ),

                    // Municipality Complaints — CITIZEN only
                    if (role == 'CITIZEN' && _municipalityComplaints.isNotEmpty)
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: _buildMunicipalityComplaints(),
                        ),
                      ),

                    // Recent Resolutions — CITIZEN only
                    if (role == 'CITIZEN' && _recentResolutions.isNotEmpty)
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: _buildRecentResolutions(),
                        ),
                      ),

                    // Trend Alerts — AGENT/MANAGER/ADMIN only
                    if (['MUNICIPAL_AGENT', 'DEPARTMENT_MANAGER', 'ADMIN'].contains(role) && _trendAlerts.isNotEmpty)
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: _buildTrendAlerts(),
                        ),
                      ),

                    const SliverToBoxAdapter(child: SizedBox(height: 32)),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 48, color: Colors.red[400]),
          const SizedBox(height: 12),
          Text('Erreur: $_errorMessage'),
          const SizedBox(height: 12),
          ElevatedButton(onPressed: _loadData, child: const Text('Réessayer')),
        ],
      ),
    );
  }

  Widget _buildNotificationBell() {
    final notifState = ref.watch(notificationsProvider);
    final unread = notifState.unreadCount;
    return Stack(
      children: [
        IconButton(
          icon: const Icon(Icons.notifications_outlined, color: Colors.white),
          onPressed: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const NotificationsScreen()),
          ).then((_) => ref.read(notificationsProvider.notifier).load()),
        ),
        if (unread > 0)
          Positioned(
            right: 6,
            top: 6,
            child: Container(
              padding: const EdgeInsets.all(3),
              decoration: const BoxDecoration(
                color: Colors.red,
                shape: BoxShape.circle,
              ),
              constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
              child: Text(
                unread > 99 ? '99+' : '$unread',
                style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildPrioritiesSection(String role) {
    final inProgress = _stats['inProgress'] ?? 0;
    final resolved = _stats['resolved'] ?? 0;
    final assigned = _stats['assigned'] ?? 0;
    final totalOverdue = _stats['totalOverdue'] ?? _stats['overdue'] ?? 0;
    final total = _stats['total'] ?? 0;

    // Technician priorities
    if (role == 'TECHNICIAN') {
      if (assigned == 0 && inProgress == 0) {
        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.15),
            borderRadius: BorderRadius.circular(AppTheme.radiusLg),
          ),
          child: const Row(
            children: [
              Icon(Icons.check_circle, color: Colors.white70, size: 20),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Aucune tâche en attente. Bonne journée !',
                  style: TextStyle(color: Colors.white, fontSize: 13),
                ),
              ),
            ],
          ),
        );
      }
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.auto_awesome, color: Colors.white70, size: 18),
              SizedBox(width: 8),
              Text('Priorités du jour', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: 12),
          if (totalOverdue > 0)
            _buildPriorityItem('$totalOverdue tâche(s) en retard — action requise', Icons.warning_amber, Colors.red.shade100, Colors.red.shade700),
          if (assigned > 0)
            _buildPriorityItem('$assigned tâche(s) assignée(s) à démarrer', Icons.play_circle, Colors.blue.shade100, Colors.blue.shade700),
          if (inProgress > 0)
            _buildPriorityItem('$inProgress tâche(s) en cours', Icons.engineering, Colors.orange.shade100, Colors.orange.shade700),
        ],
      );
    }

    // Citizen priorities
    if (inProgress == 0 && resolved == 0 && total == 0) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.15),
          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        ),
        child: Row(
          children: [
            const Icon(Icons.info_outline, color: Colors.white70, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Aucun signalement. Soumettez votre premier signalement !',
                style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 13),
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            Icon(Icons.auto_awesome, color: Colors.white70, size: 18),
            SizedBox(width: 8),
            Text('Priorités du jour', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
          ],
        ),
        const SizedBox(height: 12),
        if (inProgress > 0)
          _buildPriorityItem('$inProgress en cours de traitement', Icons.engineering, Colors.blue.shade100, Colors.blue.shade700),
        if (resolved > 0)
          _buildPriorityItem('$resolved signalements résolus', Icons.check_circle, Colors.green.shade100, Colors.green.shade700),
      ],
    );
  }

  Widget _buildPriorityItem(
    String text,
    IconData icon,
    Color bgColor,
    Color textColor,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: bgColor.withOpacity(0.2),
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        border: Border.all(color: Colors.white.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Icon(icon, color: Colors.white, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const Icon(Icons.arrow_forward_ios, color: Colors.white70, size: 14),
        ],
      ),
    );
  }

  Widget _buildStatsGrid(String role) {
    final String title;
    final List<Widget> cards;

    if (role == 'TECHNICIAN') {
      title = 'Mes tâches';
      cards = [
        _buildStatCard('Total', '${_stats['total'] ?? 0}', Icons.summarize, AppTheme.primary),
        _buildStatCard('Assignées', '${_stats['assigned'] ?? 0}', Icons.assignment, const Color(0xFF8B5CF6)),
        _buildStatCard('En cours', '${_stats['inProgress'] ?? 0}', Icons.engineering, const Color(0xFFF97316)),
        _buildStatCard('Résolues', '${_stats['resolved'] ?? 0}', Icons.check_circle, const Color(0xFF22C55E)),
      ];
    } else if (role == 'MUNICIPAL_AGENT') {
      title = 'Statistiques Agent';
      cards = [
        _buildStatCard('Total', '${_stats['total'] ?? 0}', Icons.summarize, AppTheme.primary),
        _buildStatCard('À valider', '${_stats['submitted'] ?? 0}', Icons.pending, const Color(0xFFF59E0B)),
        _buildStatCard('En cours', '${_stats['inProgress'] ?? 0}', Icons.engineering, const Color(0xFFF97316)),
        _buildStatCard('Résolus', '${_stats['resolved'] ?? 0}', Icons.check_circle, const Color(0xFF22C55E)),
      ];
    } else if (role == 'DEPARTMENT_MANAGER') {
      title = 'Statistiques Département';
      cards = [
        _buildStatCard('Total', '${_stats['total'] ?? 0}', Icons.summarize, AppTheme.primary),
        _buildStatCard('À assigner', '${_stats['assigned'] ?? 0}', Icons.assignment, const Color(0xFF8B5CF6)),
        _buildStatCard('En cours', '${_stats['inProgress'] ?? 0}', Icons.engineering, const Color(0xFFF97316)),
        _buildStatCard('Résolus', '${_stats['resolved'] ?? 0}', Icons.check_circle, const Color(0xFF22C55E)),
      ];
    } else {
      // CITIZEN / ADMIN
      title = 'Mes signalements';
      cards = [
        _buildStatCard('Total', '${_stats['total'] ?? 0}', Icons.summarize, AppTheme.primary),
        _buildStatCard('En attente', '${_stats['submitted'] ?? 0}', Icons.pending_actions, const Color(0xFFF59E0B)),
        _buildStatCard('En cours', '${_stats['inProgress'] ?? 0}', Icons.engineering, const Color(0xFFF97316)),
        _buildStatCard('Résolus', '${(_stats['resolved'] ?? 0) + (_stats['closed'] ?? 0)}', Icons.check_circle, const Color(0xFF22C55E)),
      ];
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.5,
          children: cards,
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
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusXl),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
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
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const Spacer(),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(label, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
        ],
      ),
    );
  }

  Widget _buildCitizenQuickActions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Actions rapides',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildActionCard(
                'Nouveau signalement',
                Icons.add_circle,
                AppTheme.primary,
                () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => NewComplaintScreen(onComplaintSubmitted: _loadData),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionCard(
                'Mes signalements',
                Icons.list_alt,
                AppTheme.accent,
                () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const MyComplaintsScreen()),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildActionCard(
    String title,
    IconData icon,
    Color color,
    VoidCallback onTap,
  ) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color, color.withOpacity(0.8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AppTheme.radiusXl),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.3),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(AppTheme.radiusXl),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppTheme.radiusXl),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: Colors.white, size: 28),
                ),
                const SizedBox(height: 12),
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRecentActivities() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Activités récentes',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
              ),
            ),
            TextButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const MyComplaintsScreen()),
              ),
              child: const Text('Voir tout'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (_recentComplaints.isEmpty)
          _buildEmptyState(
            'Aucun signalement',
            'Commencez par soumettre votre premier signalement',
          )
        else
          ..._recentComplaints.take(5).map((c) => _buildComplaintMiniCard(c)),
      ],
    );
  }

  Widget _buildMunicipalityComplaints() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Icon(Icons.location_on, color: AppTheme.primary, size: 20),
                const SizedBox(width: 8),
                const Text(
                  'Signalements dans ma municipalité',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ],
            ),
            IconButton(
              icon: const Icon(Icons.refresh, size: 20),
              onPressed: _loadMunicipalityComplaints,
            ),
          ],
        ),
        const SizedBox(height: 4),
        const Text(
          'Vérifiez et soutenez les problèmes dans votre municipalité',
          style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
        ),
        const SizedBox(height: 12),
        if (_municipalityComplaints.isEmpty)
          _buildEmptyState(
            'Aucun signalement',
            'Aucun signalement dans votre municipalité pour le moment',
          )
        else
          ..._municipalityComplaints
              .take(3)
              .map((c) => _buildPublicComplaintCard(c)),
      ],
    );
  }

  Widget _buildRecentResolutions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.check_circle, color: AppTheme.success, size: 20),
            const SizedBox(width: 8),
            const Text(
              'Résolutions récentes',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ..._recentResolutions
            .take(3)
            .map((c) => _buildPublicComplaintCard(c, isResolved: true)),
      ],
    );
  }

  Widget _buildTrendAlerts() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.trending_up, color: AppTheme.info, size: 20),
            const SizedBox(width: 8),
            const Text(
              'Alertes de tendances',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ..._trendAlerts.take(3).map((alert) => _buildTrendAlertCard(alert)),
      ],
    );
  }

  Widget _buildTrendAlertCard(dynamic alert) {
    final severity = alert['severity'] ?? 'LOW';
    final isHigh = severity == 'HIGH';
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isHigh ? const Color(0xFFFEF2F2) : const Color(0xFFF0F9FF),
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        border: Border.all(
          color: isHigh ? const Color(0xFFFECACA) : const Color(0xFFBAE6FD),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                isHigh ? Icons.warning_amber : Icons.trending_up,
                color: isHigh ? AppTheme.danger : AppTheme.info,
                size: 18,
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isHigh
                      ? AppTheme.danger.withOpacity(0.1)
                      : AppTheme.info.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  alert['type']?.toString().replaceAll('_', ' ') ?? 'ALERT',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: isHigh ? AppTheme.danger : AppTheme.info,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            alert['message'] ?? '',
            style: const TextStyle(fontSize: 14, color: AppTheme.textPrimary),
          ),
          if (alert['recommendation'] != null) ...[
            const SizedBox(height: 4),
            Text(
              alert['recommendation'],
              style: const TextStyle(
                fontSize: 12,
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildEmptyState(String title, String subtitle) {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusXl),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8),
        ],
      ),
      child: Center(
        child: Column(
          children: [
            const Icon(Icons.inbox, size: 48, color: AppTheme.textMuted),
            const SizedBox(height: 12),
            Text(
              title,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: const TextStyle(color: AppTheme.textSecondary),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildComplaintMiniCard(Complaint complaint) {
    final statusColor = _getStatusColor(complaint.status);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ListTile(
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ComplaintDetailScreen(complaintId: complaint.id),
          ),
        ),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: statusColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(Icons.report_problem, color: statusColor, size: 20),
        ),
        title: Text(
          complaint.title,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          complaint.description,
          style: TextStyle(color: Colors.grey[600], fontSize: 12),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: statusColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            _getStatusLabel(complaint.status),
            style: TextStyle(
              color: statusColor,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPublicComplaintCard(
    dynamic complaint, {
    bool isResolved = false,
  }) {
    // Handle both Complaint objects and raw Maps
    final String status;
    final String title;
    final String? municipalityName;
    String photoUrl = '';

    if (complaint is Complaint) {
      status = complaint.status;
      title = complaint.title;
      municipalityName = complaint.municipalityName;
      if (complaint.media.isNotEmpty && complaint.media[0].url.isNotEmpty) {
        final url = complaint.media[0].url;
        photoUrl = url.startsWith('http') ? url : '${ApiClient.serverBaseUrl}$url';
      }
    } else if (complaint is Map) {
      status = (complaint['status'] ?? 'SUBMITTED').toString();
      title = (complaint['title'] ?? '').toString();
      municipalityName = complaint['municipalityName']?.toString();
      final media = complaint['media'];
      if (media is List && media.isNotEmpty) {
        final first = media[0];
        if (first is Map) {
          photoUrl = (first['url'] ?? '').toString();
        } else if (first is String) {
          photoUrl = first;
        }
      }
    } else {
      return const SizedBox.shrink();
    }

    final statusColor = _getStatusColor(status);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        child: InkWell(
          onTap: () {
            if (complaint is Complaint) {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => ComplaintDetailScreen(complaintId: complaint.id),
                ),
              );
            }
          },
          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        status.replaceAll('_', ' '),
                        style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
                if (municipalityName != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.location_on, size: 12, color: AppTheme.textMuted),
                      const SizedBox(width: 4),
                      Text(municipalityName, style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                    ],
                  ),
                ],
                if (photoUrl.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    child: Image.network(
                      photoUrl,
                      height: 120,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        height: 120,
                        color: const Color(0xFFE2E8F0),
                        child: const Icon(Icons.broken_image),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'SUBMITTED':
        return AppTheme.statusPending;
      case 'VALIDATED':
        return AppTheme.statusValidated;
      case 'ASSIGNED':
        return AppTheme.statusAssigned;
      case 'IN_PROGRESS':
        return AppTheme.statusInProgress;
      case 'RESOLVED':
        return AppTheme.statusResolved;
      case 'CLOSED':
        return AppTheme.statusClosed;
      case 'REJECTED':
        return AppTheme.statusRejected;
      default:
        return AppTheme.textMuted;
    }
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'SUBMITTED':
        return 'Soumis';
      case 'VALIDATED':
        return 'Validé';
      case 'ASSIGNED':
        return 'Assigné';
      case 'IN_PROGRESS':
        return 'En cours';
      case 'RESOLVED':
        return 'Résolu';
      case 'CLOSED':
        return 'Clôturé';
      case 'REJECTED':
        return 'Rejeté';
      default:
        return status;
    }
  }
}
