import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:async';
import 'package:smart_city_app/core/constants/colors.dart';
import 'package:smart_city_app/models/complaint_model.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/services/ai_service.dart';
import 'package:smart_city_app/screens/complaint_detail_screen.dart';
import 'package:smart_city_app/screens/new_complaint_screen.dart';
import 'package:smart_city_app/widgets/charts.dart';
import 'package:smart_city_app/services/api_client.dart';
import 'package:smart_city_app/providers/auth_provider.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  final ComplaintService _complaintService = ComplaintService();
  final AiService _aiService = AiService();
  bool _isLoading = true;
  String? _errorMessage;
  Map<String, int> _stats = {};
  Map<String, int> _categoryStats = {};
  Map<String, int> _monthlyTrends = {};
  List<Complaint> _recentComplaints = [];
  List<Complaint> _resolvedComplaints = [];
  List<Complaint> _municipalityComplaints = [];
  List<dynamic> _trendAlerts = [];
  Map<String, dynamic> _municipalityOverview = {};
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _loadData();
    _refreshTimer = Timer.periodic(
      const Duration(seconds: 60),
      (_) => _loadData(showLoader: false),
    );
  }

  Future<void> _loadData({bool showLoader = true}) async {
    if (showLoader) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }
    try {
      // Get user role
      final authState = ref.read(authProvider);
      final userRole = authState.user?.role ?? 'CITIZEN';

      // Load stats based on role
      Map<String, dynamic> statsData = {};

      if (userRole == 'CITIZEN') {
        statsData = await _complaintService.getCitizenStats();
      } else if (userRole == 'MUNICIPAL_AGENT') {
        statsData = await _complaintService.getAgentStats();
      } else if (userRole == 'DEPARTMENT_MANAGER') {
        statsData = await _complaintService.getManagerStats();
      } else if (userRole == 'TECHNICIAN') {
        statsData = await _complaintService.getTechnicianStats();
      } else if (userRole == 'ADMIN') {
        statsData = await _complaintService.getAdminStats();
      }

      if (mounted) {
        setState(() {
          _stats = {
            'total': (statsData['total'] ?? 0) as int,
            'submitted': (statsData['submitted'] ?? 0) as int,
            'pending': (statsData['pending'] ?? 0) as int,
            'assigned': (statsData['assigned'] ?? 0) as int,
            'inProgress': (statsData['inProgress'] ?? 0) as int,
            'resolved': (statsData['resolved'] ?? 0) as int,
            'closed': (statsData['closed'] ?? 0) as int,
            'overdue': (statsData['overdue'] ?? 0) as int,
            'totalOverdue': (statsData['totalOverdue'] ?? 0) as int,
            'rejected': (statsData['rejected'] ?? 0) as int,
            'resolutionRate': (statsData['resolutionRate'] ?? 0) as int,
          };
        });
      }

      // Load complaints
      final complaints = await _complaintService.getMyComplaints(limit: 20);
      final activeComplaints = complaints
          .where((c) => c.status != 'CLOSED' && c.status != 'REJECTED')
          .toList();
      final resolved = complaints
          .where((c) => c.status == 'RESOLVED')
          .take(6)
          .toList();
      if (mounted) {
        setState(() {
          _recentComplaints = activeComplaints.take(6).toList();
          _resolvedComplaints = resolved;
        });
      }

      // Load municipality complaints for citizens
      if (userRole == 'CITIZEN') {
        try {
          final municipalityComplaints = await _complaintService.getMunicipalityComplaints(limit: 6);
          if (mounted) {
            setState(() {
              _municipalityComplaints = municipalityComplaints;
            });
          }
        } catch (e) {
          // Municipality complaints are optional
        }
      }
      // Load municipality overview for citizens
      if (userRole == 'CITIZEN') {
        try {
          final api = ApiClient();
          final overviewResponse = await api.get('/public/municipality-overview');
          if (overviewResponse is Map && overviewResponse['data'] is Map) {
            if (mounted) {
              setState(() {
                _municipalityOverview = overviewResponse['data'] as Map<String, dynamic>;
              });
            }
          }
        } catch (e) {
          // Municipality overview is optional
        }
      }

      // Load 
      // Load trend alerts for manager/admin
      if (userRole == 'DEPARTMENT_MANAGER' || userRole == 'ADMIN' || userRole == 'MUNICIPAL_AGENT') {
        try {
          final alerts = await _complaintService.getTrendAlerts();
          if (mounted) {
            setState(() {
              _trendAlerts = alerts;
            });
          }
        } catch (e) {
          // Trend alerts are optional
        }
      }

      // Load category stats for chart
      try {
        final api = ApiClient();
        final catResponse = await api.get('/public/stats/by-category?period=month');
        if (catResponse is Map && catResponse['data'] is Map) {
          final catData = catResponse['data'] as Map;
          final categories = <String, int>{};
          catData.forEach((key, value) {
            if (value is Map) {
              categories[key] = value['total'] ?? 0;
            }
          });
          if (mounted) {
            setState(() {
              _categoryStats = categories;
            });
          }
        }

        // Load monthly trends
        final trendResponse = await api.get('/public/stats/monthly-trends?months=6');
        if (trendResponse is List) {
          final trends = <String, int>{};
          for (var item in trendResponse) {
            if (item is Map) {
              final month = item['month']?.toString() ?? '';
              final submitted = item['submitted'] ?? 0;
              trends[month] = submitted as int;
            }
          }
          if (mounted) {
            setState(() {
              _monthlyTrends = trends;
            });
          }
        }
      } catch (e) {
        // Charts data is optional - continue without it
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString();
        });
      }
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'SUBMITTED':
        return AppColors.statusSoumise;
      case 'VALIDATED':
        return AppColors.statusValidee;
      case 'ASSIGNED':
        return AppColors.statusAssignee;
      case 'IN_PROGRESS':
        return AppColors.statusEnCours;
      case 'RESOLVED':
        return AppColors.statusResolue;
      case 'CLOSED':
        return AppColors.statusCloturee;
      case 'REJECTED':
        return AppColors.statusRejetee;
      default:
        return Colors.grey;
    }
  }

  String _statusLabel(String status) {
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

  @override
  Widget build(BuildContext context) {
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? 'Bonjour'
        : hour < 18
        ? 'Bon après-midi'
        : 'Bonsoir';
    final authState = ref.watch(authProvider);
    final userRole = authState.user?.role ?? 'CITIZEN';

     return Scaffold(
       backgroundColor: const Color(0xFFF5F7FA),
       body: _isLoading
           ? const Center(
               child: CircularProgressIndicator(color: AppColors.primary),
             )
           : _errorMessage != null
           ? Center(
               child: Column(
                 mainAxisAlignment: MainAxisAlignment.center,
                 children: [
                   Icon(Icons.error_outline, size: 48, color: Colors.red[400]),
                   const SizedBox(height: 12),
                   Text('Erreur: $_errorMessage'),
                   const SizedBox(height: 12),
                   ElevatedButton(
                     onPressed: _loadData,
                     child: const Text('Réessayer'),
                   ),
                 ],
               ),
           )
           : RefreshIndicator(
               onRefresh: _loadData,
               child: CustomScrollView(
                 slivers: [
                   SliverAppBar(
                     expandedHeight: 180,
                     floating: false,
                     pinned: true,
                     backgroundColor: Colors.white,
                     foregroundColor: AppColors.textPrimary,
                     flexibleSpace: FlexibleSpaceBar(
                       background: Container(
                         decoration: const BoxDecoration(
                           gradient: LinearGradient(
                             colors: [AppColors.primary, AppColors.primaryDark],
                             begin: Alignment.topLeft,
                             end: Alignment.bottomRight,
                           ),
                         ),
                         child: SafeArea(
                           child: Padding(
                             padding: const EdgeInsets.all(20),
                             child: Column(
                               crossAxisAlignment: CrossAxisAlignment.start,
                               mainAxisAlignment: MainAxisAlignment.end,
                               children: [
                                 Text(
                                   '$greeting!',
                                   style: const TextStyle(
                                     fontSize: 24,
                                     fontWeight: FontWeight.bold,
                                     color: Colors.white,
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
                           ),
                         ),
                       ),
                     ),
                     actions: _buildHeaderActions(),
                   ),
                   SliverToBoxAdapter(
                     child: Padding(
                       padding: const EdgeInsets.all(16),
                       child: Column(
                         crossAxisAlignment: CrossAxisAlignment.start,
                         children: [
                           _buildStatsGrid(),
                           const SizedBox(height: 24),
                           _buildTodayPriorities(),
                           const SizedBox(height: 24),
                           _buildQuickActions(),
                           const SizedBox(height: 24),
                           // Charts section
                           if (_categoryStats.isNotEmpty) ...[
                             CategoryBarChart(data: _categoryStats),
                             const SizedBox(height: 16),
                           ],
                           if (_monthlyTrends.isNotEmpty) ...[
                             MonthlyLineChart(data: _monthlyTrends),
                             const SizedBox(height: 16),
                           ],
                           if (_resolvedComplaints.isNotEmpty) ...[
                             _buildResolvedComplaints(),
                             const SizedBox(height: 24),
                           ],
                           // Municipality complaints for citizens
                           if (userRole == 'CITIZEN' && _municipalityComplaints.isNotEmpty) ...[
                             _buildMunicipalityComplaints(),
                             const SizedBox(height: 24),
                           ],
                           // Municipality overview for citizens
                           if (userRole == 'CITIZEN' && _municipalityOverview.isNotEmpty) ...[
                             _buildMunicipalityOverview(),
                             const SizedBox(height: 24),
                           ],
                           // Trend alerts for manager/admin
                           if ((userRole == 'DEPARTMENT_MANAGER' || userRole == 'ADMIN' || userRole == 'MUNICIPAL_AGENT') && _trendAlerts.isNotEmpty) ...[
                             _buildTrendAlerts(),
                             const SizedBox(height: 24),
                           ],
                           // AI insight widgets for manager/admin/agent
                           if ((userRole == 'DEPARTMENT_MANAGER' || userRole == 'ADMIN' || userRole == 'MUNICIPAL_AGENT') && _monthlyTrends.isNotEmpty) ...[
                             _buildAIInsightWidget(),
                             const SizedBox(height: 24),
                           ],
                           _buildRecentComplaints(),
                           const SizedBox(height: 32),
                         ],
                       ),
                     ),
                   ),
                 ],
               ),
             ),
     );
  }

  List<Widget> _buildHeaderActions() {
    final authState = ref.watch(authProvider);
    final userRole = authState.user?.role ?? 'CITIZEN';
    
    final actions = <Widget>[];
    
    // Notifications for all roles
    actions.add(
      IconButton(
        icon: const Icon(Icons.notifications_outlined, color: Colors.white),
        onPressed: () {},
      ),
    );
    
    // Role-specific action buttons
    if (userRole == 'CITIZEN') {
      actions.add(
        IconButton(
          icon: const Icon(Icons.add, color: Colors.white),
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => NewComplaintScreen(
                  onComplaintSubmitted: _loadData,
                  onBack: () => Navigator.pop(context),
                ),
              ),
            );
          },
          tooltip: 'Nouveau signalement',
        ),
      );
    } else if (userRole == 'MUNICIPAL_AGENT') {
      actions.add(
        IconButton(
          icon: const Icon(Icons.inbox, color: Colors.white),
          onPressed: () {},
          tooltip: 'File d\'attente',
        ),
      );
    } else if (userRole == 'DEPARTMENT_MANAGER') {
      actions.add(
        IconButton(
          icon: const Icon(Icons.assignment, color: Colors.white),
          onPressed: () {},
          tooltip: 'Tâches en attente',
        ),
      );
    } else if (userRole == 'TECHNICIAN') {
      actions.add(
        IconButton(
          icon: const Icon(Icons.task_alt, color: Colors.white),
          onPressed: () {},
          tooltip: 'Mes tâches',
        ),
      );
    } else if (userRole == 'ADMIN') {
      actions.add(
        IconButton(
          icon: const Icon(Icons.admin_panel_settings, color: Colors.white),
          onPressed: () {},
          tooltip: 'Admin Panel',
        ),
      );
    }
    
    return actions;
  }

  Widget _buildStatsGrid() {
    final authState = ref.watch(authProvider);
    final userRole = authState.user?.role ?? 'CITIZEN';
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          _getStatsTitle(userRole),
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.4,
          children: _getStatCards(userRole),
        ),
        // Resolution rate bar for agent/manager
        if ((userRole == 'MUNICIPAL_AGENT' || userRole == 'DEPARTMENT_MANAGER') && 
            _stats['resolutionRate'] != null && _stats['resolutionRate']! > 0) ...[
          const SizedBox(height: 16),
          _buildResolutionRateCard(),
        ],
        // Detailed metrics for agent/manager
        if (userRole == 'MUNICIPAL_AGENT' || userRole == 'DEPARTMENT_MANAGER') ...[
          const SizedBox(height: 16),
          _buildDetailedMetricsCards(),
        ],
      ],
    );
  }

  String _getStatsTitle(String role) {
    switch (role) {
      case 'CITIZEN':
        return 'Mes signalements';
      case 'MUNICIPAL_AGENT':
        return 'Statistiques Agent';
      case 'DEPARTMENT_MANAGER':
        return 'Statistiques Département';
      case 'TECHNICIAN':
        return 'Mes Tâches';
      case 'ADMIN':
        return 'Statistiques Admin';
      default:
        return 'Statistiques';
    }
  }

  List<Widget> _getStatCards(String role) {
    switch (role) {
      case 'CITIZEN':
        return [
          _buildStatCard('Total', '${_stats['total'] ?? 0}', Icons.summarize, AppColors.primary),
          _buildStatCard('En attente', '${(_stats['submitted'] ?? 0) + (_stats['pending'] ?? 0)}', Icons.pending_actions, const Color(0xFFF59E0B)),
          _buildStatCard('En cours', '${_stats['inProgress'] ?? 0}', Icons.engineering, const Color(0xFFF97316)),
          _buildStatCard('Résolus', '${_stats['resolved'] ?? 0}', Icons.check_circle, const Color(0xFF22C55E)),
        ];
      case 'MUNICIPAL_AGENT':
        return [
          _buildStatCard('Total', '${_stats['total'] ?? 0}', Icons.summarize, AppColors.primary),
          _buildStatCard('À valider', '${_stats['submitted'] ?? _stats['pending'] ?? 0}', Icons.pending, const Color(0xFFF59E0B)),
          _buildStatCard('En cours', '${_stats['inProgress'] ?? 0}', Icons.engineering, const Color(0xFFF97316)),
          _buildStatCard('Résolus', '${_stats['resolved'] ?? 0}', Icons.check_circle, const Color(0xFF22C55E)),
          _buildStatCard('Clôturés', '${_stats['closed'] ?? 0}', Icons.done_all, Colors.grey),
          _buildStatCard('Rejetés', '${_stats['rejected'] ?? 0}', Icons.cancel, Colors.red),
          _buildStatCard('En retard', '${_stats['totalOverdue'] ?? _stats['overdue'] ?? 0}', Icons.warning, Colors.red, isWarning: (_stats['totalOverdue'] ?? 0) > 0),
        ];
      case 'DEPARTMENT_MANAGER':
        return [
          _buildStatCard('Total', '${_stats['total'] ?? 0}', Icons.summarize, AppColors.primary),
          _buildStatCard('À assigner', '${_stats['assigned'] ?? 0}', Icons.assignment, const Color(0xFF8B5CF6)),
          _buildStatCard('En cours', '${_stats['inProgress'] ?? 0}', Icons.engineering, const Color(0xFFF97316)),
          _buildStatCard('Résolus', '${_stats['resolved'] ?? 0}', Icons.check_circle, const Color(0xFF22C55E)),
          _buildStatCard('Clôturés', '${_stats['closed'] ?? 0}', Icons.done_all, Colors.grey),
          _buildStatCard('Rejetés', '${_stats['rejected'] ?? 0}', Icons.cancel, Colors.red),
          _buildStatCard('En retard', '${_stats['totalOverdue'] ?? _stats['overdue'] ?? 0}', Icons.warning, Colors.red, isWarning: (_stats['totalOverdue'] ?? 0) > 0),
        ];
      case 'TECHNICIAN':
        return [
          _buildStatCard('Total', '${_stats['total'] ?? (_stats['assigned'] ?? 0) + (_stats['inProgress'] ?? 0) + (_stats['resolved'] ?? 0)}', Icons.summarize, Colors.grey),
          _buildStatCard('Nouvelles', '${_stats['assigned'] ?? 0}', Icons.new_releases, AppColors.primary),
          _buildStatCard('En cours', '${_stats['inProgress'] ?? 0}', Icons.engineering, const Color(0xFFF97316)),
          _buildStatCard('Résolus', '${_stats['resolved'] ?? 0}', Icons.check_circle, const Color(0xFF22C55E)),
        ];
      case 'ADMIN':
        return [
          _buildStatCard('Total', '${_stats['total'] ?? 0}', Icons.summarize, AppColors.primary),
          _buildStatCard('En attente', '${_stats['submitted'] ?? _stats['pending'] ?? 0}', Icons.pending, const Color(0xFFF59E0B)),
          _buildStatCard('En cours', '${_stats['inProgress'] ?? 0}', Icons.engineering, const Color(0xFFF97316)),
          _buildStatCard('Résolus', '${_stats['resolved'] ?? 0}', Icons.check_circle, const Color(0xFF22C55E)),
          _buildStatCard('Clôturés', '${_stats['closed'] ?? 0}', Icons.done_all, Colors.grey),
          _buildStatCard('En retard', '${_stats['totalOverdue'] ?? _stats['overdue'] ?? 0}', Icons.warning, Colors.red, isWarning: (_stats['totalOverdue'] ?? 0) > 0),
        ];
      default:
        return [
          _buildStatCard('Total', '${_stats['total'] ?? 0}', Icons.summarize, AppColors.primary),
          _buildStatCard('En attente', '${(_stats['submitted'] ?? 0) + (_stats['pending'] ?? 0)}', Icons.pending_actions, const Color(0xFFF59E0B)),
          _buildStatCard('En cours', '${_stats['inProgress'] ?? 0}', Icons.engineering, const Color(0xFFF97316)),
          _buildStatCard('Résolus', '${_stats['resolved'] ?? 0}', Icons.check_circle, const Color(0xFF22C55E)),
        ];
    }
  }

  Widget _buildResolutionRateCard() {
    final rate = _stats['resolutionRate'] ?? 0;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFECFDF5), Color(0xFFD1FAE5)],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF10B981)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Taux de résolution',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Color(0xFF065F46),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                '$rate%',
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF059669),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  height: 8,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: FractionallySizedBox(
                    alignment: Alignment.centerLeft,
                    widthFactor: rate / 100,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF10B981), Color(0xFF059669)],
                        ),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDetailedMetricsCards() {
    // These would come from the stats API in a real implementation
    // For now, we'll show placeholder cards
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.6,
      children: [
        _buildMetricCard(
          'Temps moyen de réparation',
          '2.3 jours',
          Icons.schedule,
          const Color(0xFF3B82F6),
          '+12% vs dernier mois',
          isPositive: true,
        ),
        _buildMetricCard(
          'Satisfaction citoyenne',
          '87%',
          Icons.star,
          const Color(0xFF8B5CF6),
          '+5% vs dernier mois',
          isPositive: true,
        ),
      ],
    );
  }

  Widget _buildMetricCard(
    String label,
    String value,
    IconData icon,
    Color color,
    String trend, {
    bool isPositive = true,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 16),
              const SizedBox(width: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Icon(
                isPositive ? Icons.trending_up : Icons.trending_down,
                size: 12,
                color: isPositive ? Colors.green : Colors.red,
              ),
              const SizedBox(width: 4),
              Text(
                trend,
                style: TextStyle(
                  fontSize: 10,
                  color: isPositive ? Colors.green[700] : Colors.red[700],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(
    String label,
    String value,
    IconData icon,
    Color color, {
    bool isWarning = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isWarning ? const Color(0xFFFEE2E2) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: isWarning ? Border.all(color: Colors.red) : null,
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
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 18),
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
          Text(label, style: TextStyle(fontSize: 12, color: isWarning ? Colors.red[700] : Colors.grey[600])),
        ],
      ),
    );
  }

  Widget _buildTodayPriorities() {
    final authState = ref.watch(authProvider);
    final userRole = authState.user?.role ?? 'CITIZEN';
    
    // Build priority items based on role
    final priorities = _getPriorityItems(userRole);
    
    if (priorities.isEmpty) return const SizedBox.shrink();
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.white.withValues(alpha: 0.9),
            AppColors.primary.withValues(alpha: 0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
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
          Row(
            children: [
              const Icon(Icons.auto_awesome, color: AppColors.primary, size: 20),
              const SizedBox(width: 8),
              const Text(
                'Priorités du jour',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const Spacer(),
              Text(
                'Mis à jour maintenant',
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.grey[500],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...priorities.map((priority) => _buildPriorityItem(priority)).toList(),
        ],
      ),
    );
  }

  List<Map<String, dynamic>> _getPriorityItems(String role) {
    final items = <Map<String, dynamic>>[];
    
    if (role == 'MUNICIPAL_AGENT') {
      if ((_stats['totalOverdue'] ?? 0) > 0) {
        items.add({
          'title': '${_stats['totalOverdue']} signalements en retard nécessitent attention',
          'icon': Icons.warning,
          'color': Colors.red,
          'route': '/agent/complaints?status=SUBMITTED',
        });
      }
      if ((_stats['submitted'] ?? 0) > 0) {
        items.add({
          'title': '${_stats['submitted']} signalements à valider',
          'icon': Icons.pending,
          'color': const Color(0xFFF59E0B),
          'route': '/agent/complaints?status=SUBMITTED',
        });
      }
    } else if (role == 'DEPARTMENT_MANAGER') {
      if ((_stats['assigned'] ?? 0) > 0) {
        items.add({
          'title': '${_stats['assigned']} signalements à assigner aux techniciens',
          'icon': Icons.assignment,
          'color': const Color(0xFF8B5CF6),
          'route': '/manager/pending',
        });
      }
    } else if (role == 'TECHNICIAN') {
      if ((_stats['assigned'] ?? 0) > 0) {
        items.add({
          'title': '${_stats['assigned']} nouvelles tâches prêtes à démarrer',
          'icon': Icons.play_circle,
          'color': AppColors.primary,
          'route': '/tasks',
        });
      }
      if ((_stats['inProgress'] ?? 0) > 0) {
        items.add({
          'title': '${_stats['inProgress']} tâches en cours',
          'icon': Icons.engineering,
          'color': const Color(0xFFF97316),
          'route': '/tasks',
        });
      }
    } else if (role == 'CITIZEN') {
      if ((_stats['resolved'] ?? 0) > 0) {
        items.add({
          'title': '${_stats['resolved']} signalements résolus - confirmez la résolution',
          'icon': Icons.check_circle,
          'color': const Color(0xFF22C55E),
          'route': '/complaints?status=RESOLVED',
        });
      }
    }
    
    return items;
  }

  Widget _buildPriorityItem(Map<String, dynamic> priority) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: (priority['color'] as Color).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: (priority['color'] as Color).withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(
            priority['icon'] as IconData,
            color: priority['color'] as Color,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              priority['title'] as String,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: priority['color'] as Color,
              ),
            ),
          ),
          const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
        ],
      ),
    );
  }

  Widget _buildMunicipalityComplaints() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Signalements de ma commune',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            TextButton(onPressed: () {}, child: const Text('Voir tout')),
          ],
        ),
        const SizedBox(height: 12),
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _municipalityComplaints.length,
          itemBuilder: (context, index) {
            final c = _municipalityComplaints[index];
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: _statusColor(c.status).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          _statusLabel(c.status),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: _statusColor(c.status),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          c.title,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.location_on, size: 14, color: Colors.grey),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          c.municipalityName ?? 'Non spécifié',
                          style: const TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                      ),
                    ],
                  ),
                  if (c.status == 'VALIDATED' || c.status == 'ASSIGNED' || c.status == 'IN_PROGRESS') ...[
                    const SizedBox(height: 12),
                    ElevatedButton.icon(
                      onPressed: () async {
                        await _complaintService.confirmComplaint(c.id);
                        _loadData(showLoader: false);
                      },
                      icon: const Icon(Icons.check_circle, size: 16),
                      label: const Text('Confirmer'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.white,
                        minimumSize: const Size(double.infinity, 36),
                      ),
                    ),
                  ],
                ],
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildTrendAlerts() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.white.withValues(alpha: 0.9),
            const Color(0xFFF5F3FF).withValues(alpha: 0.9),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF8B5CF6).withValues(alpha: 0.2)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.trending_up, color: Color(0xFF8B5CF6), size: 20),
              const SizedBox(width: 8),
              const Text(
                'Alertes de tendance',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const Spacer(),
              Text(
                'Prédictions IA',
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.grey[500],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ..._trendAlerts.take(3).map((alert) => _buildTrendAlertItem(alert)).toList(),
        ],
      ),
    );
  }

  Widget _buildTrendAlertItem(dynamic alert) {
    final severity = alert['severity'] ?? 'LOW';
    final color = severity == 'HIGH' ? Colors.red : severity == 'MEDIUM' ? const Color(0xFFF59E0B) : const Color(0xFF3B82F6);
    
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(
            severity == 'HIGH' ? Icons.warning : Icons.trending_up,
            color: color,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  alert['type'] ?? 'Alerte',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: color,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  alert['message'] ?? '',
                  style: const TextStyle(fontSize: 13),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMunicipalityOverview() {
    final municipalityName = _municipalityOverview['name'] ?? 'Ma commune';
    final totalComplaints = _municipalityOverview['totalComplaints'] ?? 0;
    final resolvedCount = _municipalityOverview['resolved'] ?? 0;
    final pendingCount = _municipalityOverview['pending'] ?? 0;
    final resolutionRate = totalComplaints > 0 ? ((resolvedCount / totalComplaints) * 100).round() : 0;
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.white.withValues(alpha: 0.9),
            const Color(0xFFEFF6FF).withValues(alpha: 0.9),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF3B82F6).withValues(alpha: 0.2)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.location_city, color: Color(0xFF3B82F6), size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Vue d\'ensemble - $municipalityName',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
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
            childAspectRatio: 1.6,
            children: [
              _buildOverviewStat('Total', '$totalComplaints', Icons.summarize, AppColors.primary),
              _buildOverviewStat('Résolus', '$resolvedCount', Icons.check_circle, const Color(0xFF22C55E)),
              _buildOverviewStat('En attente', '$pendingCount', Icons.pending, const Color(0xFFF59E0B)),
              _buildOverviewStat('Taux de rés.', '$resolutionRate%', Icons.trending_up, const Color(0xFF8B5CF6)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildOverviewStat(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 16),
              const SizedBox(width: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAIInsightWidget() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.white.withValues(alpha: 0.9),
            const Color(0xFFECFDF5).withValues(alpha: 0.9),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.2)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_graph, color: Color(0xFF10B981), size: 20),
              const SizedBox(width: 8),
              const Text(
                'Prévisions IA - 7 jours',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const Spacer(),
              Text(
                'Prédiction',
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.grey[500],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_monthlyTrends.isNotEmpty) ...[
            MonthlyLineChart(data: _monthlyTrends),
          ] else ...[
            const Center(
              child: Padding(
                padding: EdgeInsets.all(24.0),
                child: Text(
                  'Données de prévision non disponibles',
                  style: TextStyle(color: Colors.grey),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildQuickActions() {
    final authState = ref.watch(authProvider);
    final userRole = authState.user?.role ?? 'CITIZEN';
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          _getActionsTitle(userRole),
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: _getActionCards(userRole),
        ),
      ],
    );
  }

  String _getActionsTitle(String role) {
    switch (role) {
      case 'CITIZEN':
        return 'Actions rapides';
      case 'MUNICIPAL_AGENT':
        return 'Actions Agent';
      case 'DEPARTMENT_MANAGER':
        return 'Actions Manager';
      case 'TECHNICIAN':
        return 'Actions Technicien';
      case 'ADMIN':
        return 'Actions Admin';
      default:
        return 'Actions';
    }
  }

  List<Widget> _getActionCards(String role) {
    switch (role) {
      case 'CITIZEN':
        return [
          Expanded(
            child: _buildActionCard(
              'Nouveau signalement',
              Icons.add_circle,
              AppColors.primary,
              () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => NewComplaintScreen(
                    onComplaintSubmitted: _loadData,
                    onBack: () => Navigator.pop(context),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildActionCard(
              'Mes signalements',
              Icons.list_alt,
              AppColors.attention,
              () {},
            ),
          ),
        ];
      case 'MUNICIPAL_AGENT':
        return [
          Expanded(
            child: _buildActionCard(
              'File d\'attente',
              Icons.inbox,
              AppColors.primary,
              () {},
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildActionCard(
              'En validation',
              Icons.task_alt,
              const Color(0xFFF59E0B),
              () {},
            ),
          ),
        ];
      case 'DEPARTMENT_MANAGER':
        return [
          Expanded(
            child: _buildActionCard(
              'Tâches en attente',
              Icons.pending_actions,
              AppColors.primary,
              () {},
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildActionCard(
              'Assigner',
              Icons.person_add,
              const Color(0xFF8B5CF6),
              () {},
            ),
          ),
        ];
      case 'TECHNICIAN':
        return [
          Expanded(
            child: _buildActionCard(
              'Nouvelles tâches',
              Icons.new_releases,
              AppColors.primary,
              () {},
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildActionCard(
              'En cours',
              Icons.engineering,
              const Color(0xFFF97316),
              () {},
            ),
          ),
        ];
      case 'ADMIN':
        return [
          Expanded(
            child: _buildActionCard(
              'Utilisateurs',
              Icons.people,
              Colors.red,
              () {},
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildActionCard(
              'Tous les signalements',
              Icons.list,
              AppColors.primary,
              () {},
            ),
          ),
        ];
      default:
        return [
          Expanded(
            child: _buildActionCard(
              'Nouveau signalement',
              Icons.add_circle,
              AppColors.primary,
              () {},
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildActionCard(
              'Mes signalements',
              Icons.list_alt,
              AppColors.attention,
              () {},
            ),
          ),
        ];
    }
  }

  Widget _buildActionCard(
    String title,
    IconData icon,
    Color color,
    VoidCallback onTap,
  ) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [color, color.withValues(alpha: 0.8)]),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.3),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
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

  Widget _buildResolvedComplaints() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Résolutions récentes',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            TextButton(onPressed: () {}, child: const Text('Voir tout')),
          ],
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 180,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: _resolvedComplaints.length,
            itemBuilder: (context, index) {
              final c = _resolvedComplaints[index];
              return Container(
                width: 280,
                margin: const EdgeInsets.only(right: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 8,
                    ),
                  ],
                ),
                child: Material(
                  color: Colors.transparent,
                  borderRadius: BorderRadius.circular(16),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) =>
                            ComplaintDetailScreen(complaintId: c.id),
                      ),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.statusResolue.withValues(
                                    alpha: 0.1,
                                  ),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Text(
                                  'RÉSOLU',
                                  style: TextStyle(
                                    color: AppColors.statusResolue,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            c.title,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const Spacer(),
                          Row(
                            children: [
                              Icon(
                                Icons.location_on,
                                size: 14,
                                color: Colors.grey[400],
                              ),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  c.municipalityName ?? 'Non spécifié',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey[500],
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildRecentComplaints() {
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
            TextButton(onPressed: () {}, child: const Text('Voir tout')),
          ],
        ),
        const SizedBox(height: 8),
        if (_recentComplaints.isEmpty)
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 8,
                ),
              ],
            ),
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
                  Text('Commencez par soumettre votre premier signalement'),
                ],
              ),
            ),
          )
        else
          ..._recentComplaints.map((c) => _buildComplaintCard(c)),
      ],
    );
  }

  Widget _buildComplaintCard(Complaint complaint) {
    final statusColor = _statusColor(complaint.status);
    String photoUrl = '';
    for (final media in complaint.media) {
      if (media.type == 'photo' && media.url.isNotEmpty) {
        photoUrl = media.url;
        break;
      }
    }
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
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
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => ComplaintDetailScreen(complaintId: complaint.id),
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        complaint.title,
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
                        color: statusColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        _statusLabel(complaint.status),
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
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (photoUrl.isNotEmpty) ...[
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Image.network(
                          photoUrl,
                          width: 64,
                          height: 64,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            width: 64,
                            height: 64,
                            color: const Color(0xFFE2E8F0),
                            child: const Icon(Icons.broken_image),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                    ],
                    Expanded(
                      child: Text(
                        complaint.description,
                        style: TextStyle(color: Colors.grey[600], fontSize: 13),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(
                      Icons.calendar_today,
                      size: 14,
                      color: Colors.grey[400],
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${complaint.createdAt.day}/${complaint.createdAt.month}/${complaint.createdAt.year}',
                      style: TextStyle(color: Colors.grey[500], fontSize: 12),
                    ),
                    const Spacer(),
                    Icon(
                      Icons.chevron_right,
                      size: 20,
                      color: AppColors.primary,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }
}
