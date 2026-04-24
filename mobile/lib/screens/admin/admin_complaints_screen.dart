import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
  String _statusFilter = '';
  String _categoryFilter = '';
  String _searchQuery = '';
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
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        return c.title.toLowerCase().contains(q) ||
            c.description.toLowerCase().contains(q);
      }
      return true;
    }).toList();
  }

  int get _total => _complaints.length;
  int get _resolved => _complaints
      .where((c) => c.status == 'RESOLVED' || c.status == 'CLOSED')
      .length;
  int get _inProgress => _complaints
      .where((c) => c.status == 'IN_PROGRESS' || c.status == 'ASSIGNED')
      .length;
  int get _pending => _complaints.where((c) => c.status == 'SUBMITTED').length;
  int get _overdue => _complaints.where((c) {
    final days = DateTime.now().difference(c.createdAt).inDays;
    return ['ASSIGNED', 'IN_PROGRESS'].contains(c.status) && days > 7;
  }).length;

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

  String _categoryLabel(String cat) {
    switch (cat) {
      case 'WASTE':
        return 'Déchets';
      case 'ROAD':
        return 'Routes';
      case 'LIGHTING':
        return 'Éclairage';
      case 'WATER':
        return 'Eau';
      case 'SAFETY':
        return 'Sécurité';
      case 'PUBLIC_PROPERTY':
        return 'Domaine public';
      case 'GREEN_SPACE':
        return 'Espaces verts';
      default:
        return 'Autre';
    }
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
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Text(
                '${_total}',
                style: TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
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
                    '$_total',
                    Icons.summarize,
                    const Color(0xFF3B82F6),
                  ),
                  _buildStatCard(
                    'En attente',
                    '$_pending',
                    Icons.pending,
                    const Color(0xFFF59E0B),
                  ),
                  _buildStatCard(
                    'En cours',
                    '$_inProgress',
                    Icons.engineering,
                    const Color(0xFFF97316),
                  ),
                  _buildStatCard(
                    'Résolus',
                    '$_resolved',
                    Icons.check_circle,
                    const Color(0xFF22C55E),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (_overdue > 0)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: Colors.red.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.warning, color: Colors.red[600]),
                      const SizedBox(width: 8),
                      Text(
                        '$_overdue signalements en retard',
                        style: TextStyle(
                          color: Colors.red[700],
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
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
              const SizedBox(height: 12),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildFilterChip('', 'Tous'),
                    const SizedBox(width: 8),
                    _buildFilterChip('SUBMITTED', 'Soumis'),
                    const SizedBox(width: 8),
                    _buildFilterChip('IN_PROGRESS', 'En cours'),
                    const SizedBox(width: 8),
                    _buildFilterChip('RESOLVED', 'Résolus'),
                    const SizedBox(width: 8),
                    _buildFilterChip('CLOSED', 'Clôturés'),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                '${filtered.length} résultats',
                style: TextStyle(color: Colors.grey[600], fontSize: 13),
              ),
              const SizedBox(height: 12),
              if (_isLoading)
                const Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                )
              else if (filtered.isEmpty)
                Center(
                  child: Column(
                    children: [
                      Icon(Icons.search_off, size: 48, color: Colors.grey[400]),
                      const SizedBox(height: 12),
                      Text(
                        'Aucun signalement trouvé',
                        style: TextStyle(color: Colors.grey[700]),
                      ),
                    ],
                  ),
                )
              else
                ...filtered.map((c) => _buildComplaintCard(c)),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
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
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 8),
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
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(label, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String value, String label) {
    final isSelected = _statusFilter == value;
    return GestureDetector(
      onTap: () => setState(() => _statusFilter = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.primary : const Color(0xFFE2E8F0),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.grey[700],
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
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
                        _categoryLabel(complaint.category),
                        style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                      ),
                    ),
                    if (isOverdue) ...[
                      const Spacer(),
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
