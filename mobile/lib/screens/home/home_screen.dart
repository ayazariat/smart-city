import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/core/constants/app_theme.dart';
import 'package:smart_city_app/models/complaint_model.dart';
import 'package:smart_city_app/providers/auth_provider.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/screens/home/new_complaint_screen.dart';
import 'package:smart_city_app/screens/home/my_complaints_screen.dart';
import 'package:smart_city_app/screens/home/complaint_detail_screen.dart';
import 'package:smart_city_app/screens/home/notifications_screen.dart';
import 'package:smart_city_app/screens/home/profile_screen.dart';
import 'package:smart_city_app/screens/home/transparency_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final screens = [
      const DashboardTab(),
      const MyComplaintsScreen(),
      const TransparencyScreen(),
      const ProfileScreen(),
    ];

    return Scaffold(
      body: screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        selectedItemColor: AppTheme.primary,
        unselectedItemColor: AppTheme.textMuted,
        type: BottomNavigationBarType.fixed,
        items: const [
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
        ],
      ),
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
    try {
      final statsData = await _complaintService.getCitizenStats();
      final complaints = await _complaintService.getMyComplaints(limit: 10);
      final active = complaints
          .where((c) => c.status != 'CLOSED' && c.status != 'REJECTED')
          .toList();

      setState(() {
        _stats = statsData;
        _recentComplaints = active;
        _isLoading = false;
      });

      _loadMunicipalityComplaints();
      _loadRecentResolutions();
      _loadTrendAlerts();
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
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? 'Bonjour'
        : hour < 18
        ? 'Bon après-midi'
        : 'Bonsoir';
    final firstName = (user?.fullName ?? 'Citoyen').split(' ').first;

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
                          borderRadius: BorderRadius.circular(
                            AppTheme.radiusXl,
                          ),
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
                                Column(
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
                                    const Text(
                                      'Gérez vos signalements et suivez leur évolution',
                                      style: TextStyle(
                                        color: Colors.white70,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ],
                                ),
                                Row(
                                  children: [
                                    IconButton(
                                      icon: const Icon(
                                        Icons.notifications_outlined,
                                        color: Colors.white,
                                      ),
                                      onPressed: () => Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) =>
                                              const NotificationsScreen(),
                                        ),
                                      ),
                                    ),
                                    PopupMenuButton<String>(
                                      icon: const Icon(
                                        Icons.person_outline,
                                        color: Colors.white,
                                      ),
                                      onSelected: (v) => ref
                                          .read(authProvider.notifier)
                                          .logout(),
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
                            // Priorities Section (from web)
                            _buildPrioritiesSection(),
                          ],
                        ),
                      ),
                    ),

                    // Stats Grid
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: _buildStatsGrid(),
                      ),
                    ),

                    // Quick Actions
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: _buildQuickActions(),
                      ),
                    ),

                    // Recent Activities (from web)
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: _buildRecentActivities(),
                      ),
                    ),

                    // Municipality Complaints (from web)
                    if (_municipalityComplaints.isNotEmpty)
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: _buildMunicipalityComplaints(),
                        ),
                      ),

                    // Recent Resolutions (from web)
                    if (_recentResolutions.isNotEmpty)
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: _buildRecentResolutions(),
                        ),
                      ),

                    // Trend Alerts (from web BL-37)
                    if (_trendAlerts.isNotEmpty)
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

  Widget _buildPrioritiesSection() {
    final inProgress = _stats['inProgress'] ?? 0;
    final resolved = _stats['resolved'] ?? 0;
    final total = _stats['total'] ?? 0;

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
                style: TextStyle(
                  color: Colors.white.withOpacity(0.9),
                  fontSize: 13,
                ),
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
            Text(
              'Priorités du jour',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (inProgress > 0)
          _buildPriorityItem(
            '$inProgress en cours de traitement',
            Icons.engineering,
            Colors.blue.shade100,
            Colors.blue.shade700,
          ),
        if (resolved > 0)
          _buildPriorityItem(
            '$resolved signalements résolus',
            Icons.check_circle,
            Colors.green.shade100,
            Colors.green.shade700,
          ),
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

  Widget _buildStatsGrid() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Mes signalements',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: AppTheme.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.5,
          children: [
            _buildStatCard(
              'Total',
              '${_stats['total'] ?? 0}',
              Icons.summarize,
              AppTheme.primary,
            ),
            _buildStatCard(
              'En attente',
              '${_stats['submitted'] ?? 0}',
              Icons.pending_actions,
              const Color(0xFFF59E0B),
            ),
            _buildStatCard(
              'En cours',
              '${_stats['inProgress'] ?? 0}',
              Icons.engineering,
              const Color(0xFFF97316),
            ),
            _buildStatCard(
              'Résolus',
              '${(_stats['resolved'] ?? 0) + (_stats['closed'] ?? 0)}',
              Icons.check_circle,
              const Color(0xFF22C55E),
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

  Widget _buildQuickActions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Actions rapides',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: AppTheme.textPrimary,
          ),
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
                    builder: (_) =>
                        NewComplaintScreen(onComplaintSubmitted: _loadData),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionCard(
                'Voir tous',
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
          children: [
            const Icon(Icons.location_on, color: AppTheme.primary, size: 20),
            const SizedBox(width: 8),
            const Expanded(
              child: Text(
                'Signalements dans ma municipalité',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
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
    final status = complaint['status'] ?? 'SUBMITTED';
    final statusColor = _getStatusColor(status);
    String photoUrl = '';
    final media = complaint['media'] as List<dynamic>?;
    if (media != null && media.isNotEmpty) {
      photoUrl = media[0]['url']?.toString() ?? '';
    }

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
          onTap: () {},
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
                        complaint['title'] ?? '',
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        status.toString().replaceAll('_', ' '),
                        style: TextStyle(
                          color: statusColor,
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if (photoUrl.isNotEmpty)
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
