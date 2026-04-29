import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:smart_city_app/core/constants/colors.dart';
import 'package:smart_city_app/models/complaint_model.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/screens/complaint_detail_screen.dart';

class AdminComplaintsScreen extends ConsumerStatefulWidget {
  const AdminComplaintsScreen({super.key});

  @override
  ConsumerState<AdminComplaintsScreen> createState() =>
      _AdminComplaintsScreenState();
}

class _AdminComplaintsScreenState extends ConsumerState<AdminComplaintsScreen> {
  final ComplaintService _complaintService = ComplaintService();

  List<Complaint> _complaints = [];
  bool _isLoading = true;
  String? _error;

  // Filters
  String _statusFilter = '';
  String _categoryFilter = '';
  String _priorityFilter = '';
  String _governorateFilter = '';
  String _municipalityFilter = '';
  String _searchQuery = '';
  DateTime? _dateFrom;
  DateTime? _dateTo;

  final _searchController = TextEditingController();
  bool _showFilters = false;

  @override
  void initState() {
    super.initState();
    _loadComplaints();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadComplaints() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final data = await _complaintService.getAllComplaints(
        status: _statusFilter.isEmpty ? null : _statusFilter,
        category: _categoryFilter.isEmpty ? null : _categoryFilter,
        search: _searchQuery.isEmpty ? null : _searchQuery,
        limit: 100,
      );
      setState(() {
        _complaints = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  List<Complaint> get _filtered {
    return _complaints.where((c) {
      if (_categoryFilter.isNotEmpty && c.category != _categoryFilter)
        return false;
      if (_priorityFilter.isNotEmpty) {
        final score = c.priorityScore ?? 0;
        switch (_priorityFilter) {
          case 'HIGH':
            if (score < 15) return false;
          case 'MEDIUM':
            if (score < 6 || score >= 15) return false;
          case 'LOW':
            if (score >= 6) return false;
        }
      }
      if (_dateFrom != null && c.createdAt.isBefore(_dateFrom!)) return false;
      if (_dateTo != null) {
        final toDate = _dateTo!.add(const Duration(days: 1));
        if (c.createdAt.isAfter(toDate)) return false;
      }
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        return c.title.toLowerCase().contains(q) ||
            c.description.toLowerCase().contains(q) ||
            c.category.toLowerCase().contains(q);
      }
      return true;
    }).toList();
  }

  // Stats
  int get _total => _complaints.length;
  int get _resolved => _complaints.where((c) => c.status == 'RESOLVED').length;
  int get _atRisk => _complaints.where((c) {
    if (!['ASSIGNED', 'IN_PROGRESS'].contains(c.status)) return false;
    final days = DateTime.now().difference(c.createdAt).inDays;
    return days > 4 && days <= 7;
  }).length;
  int get _overdue => _complaints.where((c) {
    if (!['ASSIGNED', 'IN_PROGRESS'].contains(c.status)) return false;
    final days = DateTime.now().difference(c.createdAt).inDays;
    return days > 7;
  }).length;

  Future<void> _exportCSV() async {
    final filtered = _filtered;
    final buffer = StringBuffer();
    buffer.writeln(
      'Reference,Title,Category,Status,Priority,Municipality,Date',
    );

    for (final c in filtered) {
      buffer.writeln(
        [
          c.id.substring(c.id.length - 6),
          '"${c.title.replaceAll('"', '""')}"',
          c.category,
          c.status,
          c.priorityScore ?? 0,
          c.municipalityName ?? '',
          '${c.createdAt.day}/${c.createdAt.month}/${c.createdAt.year}',
        ].join(','),
      );
    }

    final dir = await getTemporaryDirectory();
    final file = File(
      '${dir.path}/complaints_${DateTime.now().toIso8601String().split('T')[0]}.csv',
    );
    await file.writeAsString(buffer.toString());

    await Share.shareXFiles([XFile(file.path)], text: 'Complaints Report');
  }

  Future<void> _exportPDF() async {
    final filtered = _filtered;
    final buffer = StringBuffer();
    buffer.writeln('COMPLAINTS REPORT');
    buffer.writeln('Generated: ${DateTime.now()}');
    buffer.writeln('Total: ${filtered.length}');
    buffer.writeln('');

    for (final c in filtered) {
      buffer.writeln('--- ${c.id.substring(c.id.length - 6)} ---');
      buffer.writeln('Title: ${c.title}');
      buffer.writeln('Category: ${c.category}');
      buffer.writeln('Status: ${c.status}');
      buffer.writeln('Date: ${c.createdAt}');
      buffer.writeln('');
    }

    final dir = await getTemporaryDirectory();
    final file = File(
      '${dir.path}/complaints_${DateTime.now().toIso8601String().split('T')[0]}.txt',
    );
    await file.writeAsString(buffer.toString());

    await Share.shareXFiles([XFile(file.path)], text: 'Complaints Report');
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Tous les signalements',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadComplaints,
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.download),
            onSelected: (value) {
              if (value == 'csv') _exportCSV();
              if (value == 'pdf') _exportPDF();
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'csv', child: Text('Export CSV')),
              const PopupMenuItem(value: 'pdf', child: Text('Export PDF')),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadComplaints,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildStatsCards(),
              const SizedBox(height: 16),
              _buildSearchAndFilters(),
              const SizedBox(height: 16),
              if (_showFilters) _buildAdvancedFilters(),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${filtered.length} résultats',
                    style: TextStyle(color: Colors.grey[600], fontSize: 13),
                  ),
                  if (_statusFilter.isNotEmpty ||
                      _categoryFilter.isNotEmpty ||
                      _priorityFilter.isNotEmpty)
                    TextButton(
                      onPressed: () {
                        setState(() {
                          _statusFilter = '';
                          _categoryFilter = '';
                          _priorityFilter = '';
                          _governorateFilter = '';
                          _municipalityFilter = '';
                          _dateFrom = null;
                          _dateTo = null;
                        });
                      },
                      child: const Text('Réinitialiser'),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              if (_isLoading)
                const Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                )
              else if (filtered.isEmpty)
                _buildEmpty()
              else
                ...filtered.map((c) => _buildComplaintCard(c)),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatsCards() {
    return GridView.count(
      crossAxisCount: 4,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.2,
      crossAxisSpacing: 8,
      mainAxisSpacing: 8,
      children: [
        _buildStatCard(
          'Total',
          _total,
          Icons.summarize,
          const Color(0xFF3B82F6),
          '',
        ),
        _buildStatCard(
          'Résolus',
          _resolved,
          Icons.check_circle,
          const Color(0xFF22C55E),
          'RESOLVED',
        ),
        _buildStatCard(
          'À risque',
          _atRisk,
          Icons.warning_amber,
          const Color(0xFFF59E0B),
          'IN_PROGRESS',
        ),
        _buildStatCard(
          'En retard',
          _overdue,
          Icons.error_outline,
          const Color(0xFFEF4444),
          'ASSIGNED',
        ),
      ],
    );
  }

  Widget _buildStatCard(
    String label,
    int value,
    IconData icon,
    Color color,
    String filter,
  ) {
    final isSelected = _statusFilter == filter && filter.isNotEmpty;
    return GestureDetector(
      onTap: filter.isEmpty
          ? null
          : () {
              setState(() => _statusFilter = isSelected ? '' : filter);
            },
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: isSelected ? Border.all(color: color, width: 2) : null,
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 4),
            Text(
              value.toString(),
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              label,
              style: TextStyle(fontSize: 10, color: Colors.grey[600]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchAndFilters() {
    return Column(
      children: [
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8),
            ],
          ),
          child: TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Rechercher par description ou catégorie...',
              prefixIcon: const Icon(Icons.search, color: Colors.grey),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                        setState(() => _searchQuery = '');
                      },
                    )
                  : null,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 14,
              ),
            ),
            onChanged: (v) => setState(() => _searchQuery = v),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: GestureDetector(
                onTap: () => setState(() => _showFilters = !_showFilters),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: _showFilters
                        ? AppColors.primary.withOpacity(0.1)
                        : Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _showFilters
                          ? AppColors.primary
                          : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.filter_list,
                        size: 18,
                        color: _showFilters
                            ? AppColors.primary
                            : Colors.grey[600],
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Filtres avancés',
                        style: TextStyle(
                          color: _showFilters
                              ? AppColors.primary
                              : Colors.grey[600],
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (_statusFilter.isNotEmpty ||
                          _categoryFilter.isNotEmpty ||
                          _priorityFilter.isNotEmpty)
                        Container(
                          margin: const EdgeInsets.only(left: 8),
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildAdvancedFilters() {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildDropdown('Statut', _statusFilter, {
            '': 'Tous',
            'SUBMITTED': 'Soumis',
            'VALIDATED': 'Validés',
            'ASSIGNED': 'Assignés',
            'IN_PROGRESS': 'En cours',
            'RESOLVED': 'Résolus',
            'CLOSED': 'Clôturés',
            'REJECTED': 'Rejetés',
          }, (v) => setState(() => _statusFilter = v)),
          const SizedBox(height: 12),
          _buildDropdown('Catégorie', _categoryFilter, {
            '': 'Toutes',
            'WASTE': 'Déchets',
            'ROAD': 'Routes',
            'LIGHTING': 'Éclairage',
            'WATER': 'Eau',
            'SAFETY': 'Sécurité',
            'PUBLIC_PROPERTY': 'Domaine public',
            'GREEN_SPACE': 'Espaces verts',
            'NOISE': 'Bruit',
            'OTHER': 'Autre',
          }, (v) => setState(() => _categoryFilter = v)),
          const SizedBox(height: 12),
          _buildDropdown('Priorité', _priorityFilter, {
            '': 'Toutes',
            'HIGH': 'Haute (≥15)',
            'MEDIUM': 'Moyenne (6-14)',
            'LOW': 'Basse (<6)',
          }, (v) => setState(() => _priorityFilter = v)),
        ],
      ),
    );
  }

  Widget _buildDropdown(
    String label,
    String value,
    Map<String, String> items,
    ValueChanged<String> onChanged,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: Colors.grey[600],
          ),
        ),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            border: Border.all(color: const Color(0xFFE2E8F0)),
            borderRadius: BorderRadius.circular(8),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              isExpanded: true,
              value: value,
              items: items.entries.map((e) {
                return DropdownMenuItem(value: e.key, child: Text(e.value));
              }).toList(),
              onChanged: (v) => onChanged(v ?? ''),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        children: [
          Icon(Icons.search_off, size: 48, color: Colors.grey[400]),
          const SizedBox(height: 12),
          Text(
            _searchQuery.isNotEmpty ||
                    _statusFilter.isNotEmpty ||
                    _categoryFilter.isNotEmpty
                ? 'Aucun résultat pour ces filtres'
                : 'Aucun signalement',
            style: TextStyle(color: Colors.grey[700]),
          ),
          const SizedBox(height: 8),
          if (_searchQuery.isNotEmpty ||
              _statusFilter.isNotEmpty ||
              _categoryFilter.isNotEmpty)
            TextButton(
              onPressed: () {
                setState(() {
                  _searchQuery = '';
                  _statusFilter = '';
                  _categoryFilter = '';
                  _priorityFilter = '';
                  _searchController.clear();
                });
              },
              child: const Text('Réinitialiser les filtres'),
            ),
        ],
      ),
    );
  }

  Widget _buildComplaintCard(Complaint complaint) {
    final statusColor = _getStatusColor(complaint.status);
    final isOverdue =
        ['ASSIGNED', 'IN_PROGRESS'].contains(complaint.status) &&
        DateTime.now().difference(complaint.createdAt).inDays > 7;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: isOverdue
            ? Border.all(color: Colors.red.withOpacity(0.3))
            : null,
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
                        color: statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        _getStatusLabel(complaint.status),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: statusColor,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF5F7FA),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        _getCategoryLabel(complaint.category),
                        style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                      ),
                    ),
                    if (complaint.priorityScore != null &&
                        complaint.priorityScore! >= 15) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.red.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.priority_high,
                              size: 10,
                              color: Colors.red[600],
                            ),
                            const SizedBox(width: 2),
                            Text(
                              'P${complaint.priorityScore}',
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
                    if (isOverdue) ...[
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.red.withOpacity(0.1),
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
                    Icon(Icons.person, size: 14, color: Colors.grey[400]),
                    const SizedBox(width: 4),
                    Text(
                      complaint.createdBy?.fullName ?? 'Anonyme',
                      style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                    ),
                    const SizedBox(width: 12),
                    Icon(
                      Icons.calendar_today,
                      size: 14,
                      color: Colors.grey[400],
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${complaint.createdAt.day}/${complaint.createdAt.month}/${complaint.createdAt.year}',
                      style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                    ),
                    const Spacer(),
                    if (complaint.municipalityName != null) ...[
                      Icon(
                        Icons.location_on,
                        size: 14,
                        color: Colors.grey[400],
                      ),
                      const SizedBox(width: 4),
                      Text(
                        complaint.municipalityName!,
                        style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                      ),
                    ],
                    const SizedBox(width: 8),
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

  Color _getStatusColor(String status) {
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

  String _getCategoryLabel(String cat) {
    const labels = {
      'WASTE': 'Déchets',
      'ROAD': 'Routes',
      'LIGHTING': 'Éclairage',
      'WATER': 'Eau',
      'SAFETY': 'Sécurité',
      'PUBLIC_PROPERTY': 'Domaine public',
      'GREEN_SPACE': 'Espaces verts',
      'NOISE': 'Bruit',
      'OTHER': 'Autre',
    };
    return labels[cat] ?? cat;
  }
}
