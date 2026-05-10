import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:async';
import 'package:smart_city_app/core/constants/colors.dart';
import 'package:smart_city_app/widgets/language_picker.dart';
import 'package:smart_city_app/screens/complaints_screen.dart';
import 'package:smart_city_app/screens/profile_screen.dart';
import 'package:smart_city_app/screens/notifications_screen.dart';
import 'package:smart_city_app/screens/archive_screen.dart';
import 'package:smart_city_app/screens/dashboard_screen.dart'
    as citizen_dashboard;
import 'package:smart_city_app/screens/technician/technician_tasks_screen.dart';
import 'package:smart_city_app/screens/dashboard/heatmap_screen.dart';
import 'package:smart_city_app/screens/home/map_screen.dart';
import 'package:smart_city_app/screens/home/new_complaint_screen.dart';
import 'package:smart_city_app/providers/notifications_provider.dart';
import 'package:smart_city_app/providers/theme_provider.dart';
import 'package:smart_city_app/providers/complaints_provider.dart';
import 'package:smart_city_app/providers/auth_provider.dart';
import 'package:smart_city_app/services/api_client.dart';
import 'package:smart_city_app/models/complaint_model.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/screens/complaint_detail_screen.dart';

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
    // Load public complaints for municipality section
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(publicComplaintsProvider.notifier).load();
    });
  }

  void _refresh() {
    final authState = ref.read(authProvider);
    final isAuthenticated = authState.user != null;
    
    if (!isAuthenticated) return;
    
    if (_isTechnician && _selectedIndex == 1) {
      ref.read(technicianTasksProvider.notifier).load();
    } else if (!_isTechnician && _selectedIndex == 0) {
      ref.read(myComplaintsProvider.notifier).loadWithStats();
    }
  }

  Future<void> _connectNotifications() async {
    final authState = ref.read(authProvider);
    final isAuthenticated = authState.user != null;
    
    if (!isAuthenticated) return;
    
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
    // Both citizens and technicians use the same 5-tab navigation
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
        icon: Icon(Icons.map_outlined),
        selectedIcon: Icon(Icons.map),
        label: 'Map',
      ),
      NavigationDestination(
        icon: Icon(Icons.notifications_outlined),
        selectedIcon: Icon(Icons.notifications),
        label: 'Notifications',
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
          return MapScreen();
        case 3:
          return const NotificationsScreen();
        case 4:
          return ProfileScreen(
            onLogout: widget.onLogout,
            userName: widget.userName,
            userRole: widget.userRole,
          );
        default:
          return const citizen_dashboard.DashboardScreen();
      }
    }
    switch (_selectedIndex) {
      case 0:
        return _buildCitizenDashboard();
      case 1:
        return ComplaintsScreen(onLogout: widget.onLogout);
      case 2:
        return MapScreen();
      case 3:
        return const NotificationsScreen();
      case 4:
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
        'Map',
        'Notifications',
        'Profile',
      ][_selectedIndex];
    }
    return [
      'Dashboard',
      'My Complaints',
      'Map',
      'Notifications',
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
    final municipalityStats = state.municipalityStats ?? {};

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
            _buildTodayPriorities(s),
            const SizedBox(height: 20),
            _buildStatsGrid(s),
            const SizedBox(height: 20),
            _buildQuickActions(),
            const SizedBox(height: 20),
            _buildMunicipalitySection(s, municipalityStats),
            const SizedBox(height: 20),
            _buildMunicipalityComplaintsSection(),
            const SizedBox(height: 20),
            _buildRecentResolutionsSection(),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildTodayPriorities(DashboardStats stats) {
    final inProgress = stats.inProgress ?? 0;
    final resolved = stats.resolved ?? 0;
    final total = stats.total ?? 0;
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primary.withAlpha(25), AppColors.primary.withAlpha(10)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withAlpha(51)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_awesome, color: AppColors.primary, size: 20),
              const SizedBox(width: 8),
              const Text(
                "Today's Priorities",
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const Spacer(),
              Text(
                'Updated now',
                style: TextStyle(
                  fontSize: 11,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (inProgress > 0)
            _buildPriorityItem(
              '$inProgress being worked on',
              Colors.blue,
              Icons.engineering,
            ),
          if (resolved > 0)
            _buildPriorityItem(
              '$resolved complaints resolved',
              Colors.green,
              Icons.check_circle,
            ),
          if (inProgress == 0 && resolved == 0 && total == 0)
            _buildPriorityItem(
              'No complaints yet. Submit your first complaint!',
              Colors.grey,
              Icons.info_outline,
            ),
        ],
      ),
    );
  }

  Widget _buildPriorityItem(String text, Color color, IconData icon) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withAlpha(26),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withAlpha(77)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: color,
              ),
            ),
          ),
          const Icon(Icons.arrow_forward_ios, color: AppColors.textSecondary, size: 16),
        ],
      ),
    );
  }

  Widget _buildMunicipalityComplaintsSection() {
    final state = ref.watch(publicComplaintsProvider);
    final complaints = state.complaints.take(6).toList();
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.location_on, color: AppColors.primary, size: 20),
              const SizedBox(width: 8),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Complaints in My Municipality',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      'See what\'s happening in your area',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (complaints.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Column(
                  children: [
                    Icon(Icons.location_on, color: AppColors.textSecondary, size: 48),
                    SizedBox(height: 12),
                    Text(
                      'No complaints yet',
                      style: TextStyle(color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
            )
          else
            Column(
              children: complaints.map((complaint) => _buildMunicipalityComplaintCard(complaint)).toList(),
            ),
        ],
      ),
    );
  }

  Widget _buildRecentResolutionsSection() {
    final state = ref.watch(myComplaintsProvider);
    final complaints = state.complaints
        .where((c) => c.status == 'RESOLVED' || c.status == 'CLOSED')
        .take(5)
        .toList();
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.check_circle, color: Colors.green, size: 20),
              const SizedBox(width: 8),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Recent Resolutions',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      'See recently resolved complaints',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (complaints.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Column(
                  children: [
                    Icon(Icons.check_circle, color: AppColors.textSecondary, size: 48),
                    SizedBox(height: 12),
                    Text(
                      'No resolved complaints yet',
                      style: TextStyle(color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
            )
          else
            Column(
              children: complaints.map((complaint) => _buildResolutionCard(complaint)).toList(),
            ),
        ],
      ),
    );
  }

  Widget _buildResolutionCard(Complaint complaint) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.green.withAlpha(26),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.check_circle, color: Colors.green, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  complaint.title,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  complaint.category,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          const Icon(Icons.arrow_forward_ios, color: AppColors.textSecondary, size: 16),
        ],
      ),
    );
  }

  Widget _buildMunicipalitySection(DashboardStats stats, Map<String, dynamic> municipalityStats) {
    final total = municipalityStats['total'] ?? stats.total ?? 0;
    final resolved = municipalityStats['resolved'] ?? stats.resolved ?? 0;
    final rate = total > 0 ? ((resolved / total) * 100).round() : 0;
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.location_city, color: AppColors.primary, size: 20),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Votre Municipalité',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      'Tunis',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _miniStat('Total', '$total', AppColors.primary),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _miniStat('Résolus', '$resolved', const Color(0xFF22C55E)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _miniStat('Taux', '$rate%', const Color(0xFF3B82F6)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildMunicipalityComplaintsPreview(),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => setState(() => _selectedIndex = 2),
              icon: const Icon(Icons.map_outlined, size: 16),
              label: const Text('Voir les signalements dans ma zone', style: TextStyle(fontSize: 12)),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primary,
                side: BorderSide(color: AppColors.primary.withOpacity(0.3)),
                padding: const EdgeInsets.symmetric(vertical: 10),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMunicipalityComplaintsPreview() {
    final state = ref.watch(publicComplaintsProvider);
    final complaints = state.complaints.take(2).toList();
    
    if (complaints.isEmpty) {
      return const SizedBox.shrink();
    }
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Signalements récents',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        ...complaints.map((complaint) => _buildMunicipalityComplaintCard(complaint)),
      ],
    );
  }

  Widget _buildMunicipalityComplaintCard(Complaint complaint) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  complaint.title,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  complaint.municipalityName ?? 'Non spécifié',
                  style: const TextStyle(
                    fontSize: 10,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.thumb_up, size: 16),
                onPressed: () => _upvoteComplaint(complaint.id),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
              Text(
                '${complaint.upvoteCount}',
                style: const TextStyle(fontSize: 11),
              ),
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.comment, size: 16),
                onPressed: () => _navigateToComplaintDetail(complaint.id),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _upvoteComplaint(String complaintId) async {
    try {
      final service = ComplaintService();
      await service.upvoteComplaint(complaintId);
      ref.read(publicComplaintsProvider.notifier).load();
    } catch (e) {
      // Handle error
    }
  }

  void _navigateToComplaintDetail(String complaintId) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ComplaintDetailScreen(complaintId: complaintId),
      ),
    );
  }

  Widget _miniStat(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActivityMap() {
    return Container(
      height: 250,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Placeholder for map
          Container(
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.map_outlined, size: 48, color: Colors.grey),
                  SizedBox(height: 8),
                  Text(
                    'Carte des activités',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            top: 12,
            right: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  _mapDot(const Color(0xFF94A3B8)),
                  const SizedBox(width: 4),
                  const Text('Actifs', style: TextStyle(fontSize: 12)),
                  const SizedBox(width: 8),
                  _mapDot(const Color(0xFF22C55E)),
                  const SizedBox(width: 4),
                  const Text('Résolus', style: TextStyle(fontSize: 12)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _mapDot(Color color) {
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
      ),
    );
  }

  Widget _buildGreetingCard(String greeting, String firstName) {
    final now = DateTime.now();
    final formattedDate = '${now.day}/${now.month}/${now.year}';
    
    return Container(
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
                    const SizedBox(height: 4),
                    Text(
                      formattedDate,
                      style: const TextStyle(fontSize: 13, color: Colors.white70),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => NewComplaintScreen(
                    onComplaintSubmitted: null,
                    onBack: null,
                  ),
                ),
              ),
              icon: const Icon(Icons.add, color: Colors.white),
              label: const Text(
                '+ Nouveau signalement',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white.withValues(alpha: 0.2),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsGrid(DashboardStats stats) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Text(
        'Mes Signalements',
        style: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.bold,
          color: AppColors.textPrimary,
        ),
      ),
      const SizedBox(height: 10),
      GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 1.5,
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
        'Activité Récente',
        style: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: AppColors.textPrimary,
        ),
      ),
      const SizedBox(height: 12),
      _buildRecentActivityFeed(),
    ],
  );

  Widget _buildRecentActivityFeed() {
    final state = ref.watch(myComplaintsProvider);
    final complaints = state.complaints.take(3).toList();
    
    if (complaints.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: _cardDecoration(),
        child: const Center(
          child: Text(
            'Aucune activité récente',
            style: TextStyle(color: AppColors.textSecondary),
          ),
        ),
      );
    }
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration(),
      child: Column(
        children: complaints.map((complaint) {
          final icon = _getStatusIcon(complaint.status);
          final color = _getStatusColor(complaint.status);
          return Column(
            children: [
              _activityItem(icon, color, complaint.title, _formatDate(complaint.createdAt)),
              if (complaint != complaints.last) const Divider(height: 24),
            ],
          );
        }).toList(),
      ),
    );
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'SUBMITTED':
        return Icons.pending;
      case 'VALIDATED':
      case 'ASSIGNED':
        return Icons.assignment;
      case 'IN_PROGRESS':
        return Icons.engineering;
      case 'RESOLVED':
      case 'CLOSED':
        return Icons.check_circle;
      default:
        return Icons.info;
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'SUBMITTED':
        return Colors.orange;
      case 'VALIDATED':
      case 'ASSIGNED':
        return Colors.blue;
      case 'IN_PROGRESS':
        return Colors.orange.shade700;
      case 'RESOLVED':
      case 'CLOSED':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);
    
    if (difference.inMinutes < 60) {
      return 'Il y a ${difference.inMinutes} min';
    } else if (difference.inHours < 24) {
      return 'Il y a ${difference.inHours} h';
    } else if (difference.inDays == 1) {
      return 'Hier';
    } else {
      return 'Il y a ${difference.inDays} jours';
    }
  }

  Widget _activityItem(IconData icon, Color color, String title, String time) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                  color: AppColors.textPrimary,
                ),
              ),
              Text(
                time,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

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
          const LanguagePicker(),
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
