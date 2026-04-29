import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:async';
import 'package:smart_city_app/core/constants/colors.dart';
import 'package:smart_city_app/providers/complaints_provider.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/models/complaint_model.dart';
import 'package:smart_city_app/screens/complaint_detail_screen.dart';

class AgentComplaintsScreen extends ConsumerStatefulWidget {
  const AgentComplaintsScreen({super.key});

  @override
  ConsumerState<AgentComplaintsScreen> createState() =>
      _AgentComplaintsScreenState();
}

class _AgentComplaintsScreenState extends ConsumerState<AgentComplaintsScreen> {
  String _statusFilter = 'ACTIVE';
  final String _categoryFilter = '';
  String _searchTerm = '';
  final _searchController = TextEditingController();
  List<dynamic> _departments = [];
  final bool _showFilters = false;
  final Set<String> _processingDuplicateIds = <String>{};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(agentComplaintsProvider.notifier).load(status: _statusFilter);
      _loadDepartments();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadDepartments() async {
    try {
      final depts = await ComplaintService().getAgentDepartments();
      if (mounted) setState(() => _departments = depts);
    } catch (_) {}
  }

  Future<void> _loadComplaints() async {
    await ref
        .read(agentComplaintsProvider.notifier)
        .load(status: _statusFilter);
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'ACTIVE':
        return 'Actifs';
      case 'PENDING':
        return 'En attente';
      case 'RESOLVED':
        return 'Résolus';
      case 'ALL':
        return 'Tous';
      default:
        return status;
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

  String? _extractMatchId(dynamic match) {
    if (match is! Map) return null;
    final candidate =
        match['_id'] ??
        match['id'] ??
        match['complaintId'] ??
        (match['complaint'] is Map
            ? (match['complaint']['_id'] ?? match['complaint']['id'])
            : null);
    return candidate?.toString();
  }

  Future<void> _resolveDuplicate(
    Complaint complaint, {
    String? existingComplaintId,
    required String action,
  }) async {
    if (_processingDuplicateIds.contains(complaint.id)) return;
    setState(() => _processingDuplicateIds.add(complaint.id));
    try {
      await ComplaintService().confirmDuplicateDecision(
        newComplaintId: complaint.id,
        existingComplaintId: existingComplaintId ?? complaint.id,
        action: action,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            action == 'merge'
                ? 'Fusion effectuée avec conservation des confirmations.'
                : 'Signalements conservés séparément.',
          ),
          backgroundColor: AppColors.primary,
        ),
      );
      await _loadComplaints();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Action impossible: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _processingDuplicateIds.remove(complaint.id));
      }
    }
  }

  Future<void> _mergeMultipleDuplicates(
    Complaint complaint,
    List<String> sourceIds,
  ) async {
    if (sourceIds.isEmpty || _processingDuplicateIds.contains(complaint.id)) {
      return;
    }
    setState(() => _processingDuplicateIds.add(complaint.id));
    try {
      for (final sourceId in sourceIds) {
        await ComplaintService().confirmDuplicateDecision(
          newComplaintId: complaint.id,
          existingComplaintId: sourceId,
          action: 'merge',
        );
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '${sourceIds.length} signalement(s) fusionné(s) avec conservation des confirmations.',
          ),
          backgroundColor: AppColors.primary,
        ),
      );
      await _loadComplaints();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Fusion multiple impossible: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _processingDuplicateIds.remove(complaint.id));
      }
    }
  }

  Future<void> _showDuplicateActions(Complaint complaint) async {
    final rawMatches = (complaint.aiDuplicateCheck?['topMatches'] as List?) ?? [];
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        final selectedIds = <String>{};
        return SafeArea(
          child: StatefulBuilder(
            builder: (context, setLocalState) => Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Revue des doublons',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Sélectionnez un ou plusieurs cas similaires à fusionner, ou conservez séparé.',
                    style: TextStyle(color: Colors.black54),
                  ),
                  const SizedBox(height: 16),
                  if (rawMatches.isEmpty)
                    const Text(
                      'Aucun match suggéré. Vous pouvez garder le signalement séparé.',
                    )
                  else
                    ...rawMatches.take(8).map((m) {
                      final id = _extractMatchId(m);
                      final title =
                          (m is Map ? (m['title'] ?? m['complaintTitle']) : null)
                              ?.toString();
                      final similarity = (m is Map ? m['similarityScore'] : null);
                      final selected = id != null && selectedIds.contains(id);
                      return GestureDetector(
                        onTap: id == null
                            ? null
                            : () {
                                setLocalState(() {
                                  if (selected) {
                                    selectedIds.remove(id);
                                  } else {
                                    selectedIds.add(id);
                                  }
                                });
                              },
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: selected
                                ? AppColors.primary.withValues(alpha: 0.08)
                                : const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: selected
                                  ? AppColors.primary
                                  : const Color(0xFFE2E8F0),
                            ),
                          ),
                          child: Row(
                            children: [
                              Checkbox(
                                value: selected,
                                onChanged: id == null
                                    ? null
                                    : (_) {
                                        setLocalState(() {
                                          if (selected) {
                                            selectedIds.remove(id);
                                          } else {
                                            selectedIds.add(id);
                                          }
                                        });
                                      },
                              ),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      title?.isNotEmpty == true
                                          ? title!
                                          : 'Signalement similaire',
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    if (similarity != null)
                                      Text(
                                        'Similarité: ${(similarity as num).toDouble().toStringAsFixed(2)}',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Colors.black54,
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  const SizedBox(height: 6),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: selectedIds.isEmpty
                          ? null
                          : () async {
                              final ids = selectedIds.toList(growable: false);
                              Navigator.pop(ctx);
                              await _mergeMultipleDuplicates(complaint, ids);
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                      ),
                      child: Text('Fusionner la sélection (${selectedIds.length})'),
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () async {
                        Navigator.pop(ctx);
                        await _resolveDuplicate(complaint, action: 'keep_separate');
                      },
                      child: const Text('Conserver séparé'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(agentComplaintsProvider);
    final complaints = state.complaints.where((complaint) {
      final statusMatch = _statusFilter == 'ACTIVE'
          ? ['SUBMITTED', 'VALIDATED', 'ASSIGNED', 'IN_PROGRESS'].contains(
              complaint.status,
            )
          : _statusFilter == 'ALL'
          ? true
          : complaint.status == _statusFilter;
      final q = _searchTerm.trim().toLowerCase();
      final searchMatch =
          q.isEmpty ||
          complaint.title.toLowerCase().contains(q) ||
          complaint.description.toLowerCase().contains(q) ||
          complaint.category.toLowerCase().contains(q);
      return statusMatch && searchMatch;
    }).toList();

    final totalCount = complaints.length;
    final resolvedCount = complaints
        .where((c) => c.status == 'RESOLVED' || c.status == 'CLOSED')
        .length;
    final overdueCount = complaints.where((c) {
      final days = DateTime.now().difference(c.createdAt).inDays;
      return ['ASSIGNED', 'IN_PROGRESS'].contains(c.status) && days > 7;
    }).length;
    final inProgressCount = complaints
        .where((c) => c.status == 'IN_PROGRESS')
        .length;
    final resolutionRate = totalCount > 0
        ? (resolvedCount / totalCount * 100).round()
        : 0;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      body: RefreshIndicator(
        onRefresh: _loadComplaints,
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              expandedHeight: 140,
              floating: false,
              pinned: true,
              backgroundColor: Colors.white,
              foregroundColor: AppColors.textPrimary,
              flexibleSpace: FlexibleSpaceBar(
                background: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [AppColors.primary, AppColors.primaryDark],
                    ),
                  ),
                  child: SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Icon(
                                  Icons.assignment,
                                  color: Colors.white,
                                  size: 24,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Mes actions',
                                      style: TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                      ),
                                    ),
                                    Text(
                                      '${complaints.length} signalements',
                                      style: const TextStyle(
                                        color: Colors.white70,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              actions: [
                IconButton(
                  icon: const Icon(
                    Icons.notifications_outlined,
                    color: Colors.white,
                  ),
                  onPressed: () {},
                ),
              ],
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1.4,
                      children: [
                        _buildStatCard(
                          'Total',
                          '$totalCount',
                          Icons.summarize,
                          AppColors.primary,
                        ),
                        _buildStatCard(
                          'Résolus',
                          '$resolvedCount',
                          Icons.check_circle,
                          AppColors.primary,
                          subtitle: '$resolutionRate%',
                        ),
                        _buildStatCard(
                          'En cours',
                          '$inProgressCount',
                          Icons.engineering,
                          const Color(0xFFF97316),
                        ),
                        _buildStatCard(
                          'En retard',
                          '$overdueCount',
                          Icons.warning,
                          const Color(0xFFEF4444),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _buildStatusFilters(state.complaints),
                    const SizedBox(height: 16),
                    Container(
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
                      child: TextField(
                        controller: _searchController,
                        decoration: InputDecoration(
                          hintText: 'Rechercher un signalement...',
                          prefixIcon: const Icon(
                            Icons.search,
                            color: Colors.grey,
                          ),
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 14,
                          ),
                        ),
                        onChanged: (v) => setState(() => _searchTerm = v),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (state.isLoading)
              const SliverFillRemaining(
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              )
            else if (state.complaints.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF5F7FA),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.inbox,
                          size: 48,
                          color: Colors.grey[400],
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Aucun signalement trouvé',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey[700],
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate((context, index) {
                    final complaint = complaints[index];
                    return _buildComplaintCard(complaint);
                  }, childCount: complaints.length),
                ),
              ),
            const SliverToBoxAdapter(child: SizedBox(height: 32)),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(
    String label,
    String value,
    IconData icon,
    Color color, {
    String? subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 8),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 18),
              ),
              if (subtitle != null)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 10,
                      color: color,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
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

  Widget _buildStatusFilters(List<Complaint> complaints) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _buildFilterChip(
            'ACTIVE',
            'Actifs',
            complaints
                .where(
                  (c) => [
                    'SUBMITTED',
                    'VALIDATED',
                    'ASSIGNED',
                    'IN_PROGRESS',
                  ].contains(c.status),
                )
                .length,
          ),
          const SizedBox(width: 8),
          _buildFilterChip(
            'SUBMITTED',
            'Soumis',
            complaints.where((c) => c.status == 'SUBMITTED').length,
          ),
          const SizedBox(width: 8),
          _buildFilterChip(
            'VALIDATED',
            'Validés',
            complaints.where((c) => c.status == 'VALIDATED').length,
          ),
          const SizedBox(width: 8),
          _buildFilterChip(
            'IN_PROGRESS',
            'En cours',
            complaints.where((c) => c.status == 'IN_PROGRESS').length,
          ),
          const SizedBox(width: 8),
          _buildFilterChip(
            'RESOLVED',
            'Résolus',
            complaints.where((c) => c.status == 'RESOLVED').length,
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String value, String label, int count) {
    final isSelected = _statusFilter == value;
    return GestureDetector(
      onTap: () {
        setState(() => _statusFilter = value);
        _loadComplaints();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.primary : const Color(0xFFE2E8F0),
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.2),
                    blurRadius: 8,
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : Colors.grey[700],
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: isSelected
                    ? Colors.white.withValues(alpha: 0.2)
                    : Colors.grey[200],
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  fontSize: 11,
                  color: isSelected ? Colors.white : Colors.grey[600],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildComplaintCard(Complaint complaint) {
    final statusColor = _statusColor(complaint.status);
    final isOverdue =
        ['ASSIGNED', 'IN_PROGRESS'].contains(complaint.status) &&
        DateTime.now().difference(complaint.createdAt).inDays > 7;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: isOverdue
            ? Border.all(color: Colors.red.withValues(alpha: 0.3))
            : null,
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
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        _statusLabel(complaint.status),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: statusColor,
                        ),
                      ),
                    ),
                    if (complaint.duplicateStatus != null &&
                        complaint.duplicateStatus!.isNotEmpty &&
                        complaint.duplicateStatus != 'NOT_DUPLICATE') ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFAE8FF),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.copy_all,
                              size: 12,
                              color: Colors.purple[700],
                            ),
                            const SizedBox(width: 4),
                            Text(
                              complaint.duplicateStatus == 'CONFIRMED_DUPLICATE'
                                  ? 'Fusionné'
                                  : 'Doublon',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: Colors.purple[700],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    if (complaint.duplicateStatus != null &&
                        complaint.duplicateStatus == 'POTENTIAL_DUPLICATE') ...[
                      const SizedBox(width: 8),
                      TextButton.icon(
                        onPressed: _processingDuplicateIds.contains(complaint.id)
                            ? null
                            : () => _showDuplicateActions(complaint),
                        icon: _processingDuplicateIds.contains(complaint.id)
                            ? const SizedBox(
                                width: 12,
                                height: 12,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.rule, size: 14),
                        label: const Text('Traiter'),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                      ),
                    ],
                    if (isOverdue) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.red.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.warning,
                              size: 12,
                              color: Colors.red[600],
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'En retard',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: Colors.red[600],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const Spacer(),
                    Text(
                      '${complaint.createdAt.day}/${complaint.createdAt.month}/${complaint.createdAt.year}',
                      style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  complaint.title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  complaint.description,
                  style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(Icons.category, size: 14, color: Colors.grey[400]),
                    const SizedBox(width: 4),
                    Text(
                      complaint.category,
                      style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                    ),
                    if (complaint.municipalityName != null) ...[
                      const SizedBox(width: 12),
                      Icon(
                        Icons.location_city,
                        size: 14,
                        color: Colors.grey[400],
                      ),
                      const SizedBox(width: 4),
                      Text(
                        complaint.municipalityName!,
                        style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                      ),
                    ],
                    if ((complaint.confirmationCount) > 0) ...[
                      const SizedBox(width: 12),
                      Icon(Icons.groups, size: 14, color: Colors.grey[400]),
                      const SizedBox(width: 4),
                      Text(
                        '${complaint.confirmationCount}',
                        style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                      ),
                    ],
                    if ((complaint.upvoteCount) > 0) ...[
                      const SizedBox(width: 10),
                      Icon(Icons.thumb_up, size: 14, color: Colors.grey[400]),
                      const SizedBox(width: 4),
                      Text(
                        '${complaint.upvoteCount}',
                        style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                      ),
                    ],
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
}
