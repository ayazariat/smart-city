import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/models/complaint_model.dart';
import 'package:smart_city_app/main.dart';
import 'package:smart_city_app/screens/new_complaint_screen.dart';
import 'package:smart_city_app/screens/complaint_detail_screen.dart';
import 'package:smart_city_app/providers/complaints_provider.dart';

class ComplaintsScreen extends ConsumerStatefulWidget {
  final VoidCallback? onLogout;

  const ComplaintsScreen({super.key, this.onLogout});

  @override
  ConsumerState<ComplaintsScreen> createState() => _ComplaintsScreenState();
}

class _ComplaintsScreenState extends ConsumerState<ComplaintsScreen> {
  String _statusFilter = 'ALL';
  String _searchTerm = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(myComplaintsProvider.notifier).load();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadComplaints() async {
    await ref.read(myComplaintsProvider.notifier).load();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(myComplaintsProvider);
    final stats = state.stats;

    return Scaffold(
      body: Column(
        children: [
          // Stats Header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(13),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              children: [
                // Stats Row
                Row(
                  children: [
                    Expanded(
                      child: _buildStatItem(
                        'Total',
                        '${stats?.total ?? state.complaints.length}',
                        Icons.summarize,
                        const Color(0xFF3B82F6),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildStatItem(
                        'Pending',
                        '${(stats?.submitted ?? 0) + (stats?.pending ?? 0)}',
                        Icons.pending_actions,
                        const Color(0xFFF59E0B),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: _buildStatItem(
                        'In Progress',
                        '${stats?.inProgress ?? 0}',
                        Icons.engineering,
                        const Color(0xFFF97316),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildStatItem(
                        'Resolved',
                        '${(stats?.resolved ?? 0) + (stats?.closed ?? 0)}',
                        Icons.check_circle,
                        const Color(0xFF22C55E),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Search Bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search complaints...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchTerm.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchTerm = '');
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                filled: true,
                fillColor: Colors.grey.shade50,
              ),
              onChanged: (value) => setState(() => _searchTerm = value),
            ),
          ),

          // Filter Chips
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterChip('ALL', 'All'),
                  const SizedBox(width: 8),
                  _buildFilterChip('SUBMITTED', 'Submitted'),
                  const SizedBox(width: 8),
                  _buildFilterChip('VALIDATED', 'Validated'),
                  const SizedBox(width: 8),
                  _buildFilterChip('IN_PROGRESS', 'In Progress'),
                  const SizedBox(width: 8),
                  _buildFilterChip('RESOLVED', 'Resolved'),
                ],
              ),
            ),
          ),

          const SizedBox(height: 8),

          // Complaints List
          Expanded(
            child: state.isLoading
                ? const Center(child: CircularProgressIndicator())
                : _buildFilteredList(state.complaints).isEmpty
                ? _buildEmptyState()
                : RefreshIndicator(
                    onRefresh: _loadComplaints,
                    child: ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _buildFilteredList(state.complaints).length,
                      itemBuilder: (context, index) {
                        final complaint = _buildFilteredList(
                          state.complaints,
                        )[index];
                        return _buildComplaintCard(complaint);
                      },
                    ),
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) =>
                  NewComplaintScreen(onComplaintSubmitted: _loadComplaints),
            ),
          );
        },
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  List<Complaint> _buildFilteredList(List<Complaint> complaints) {
    var filtered = complaints;

    // Status filter
    if (_statusFilter != 'ALL') {
      filtered = filtered.where((c) => c.status == _statusFilter).toList();
    }

    // Search filter
    if (_searchTerm.isNotEmpty) {
      final q = _searchTerm.toLowerCase();
      filtered = filtered
          .where(
            (c) =>
                c.title.toLowerCase().contains(q) ||
                c.description.toLowerCase().contains(q) ||
                c.category.toLowerCase().contains(q) ||
                (c.municipalityName?.toLowerCase().contains(q) ?? false),
          )
          .toList();
    }

    return filtered;
  }

  Widget _buildStatItem(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
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
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
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
                style: TextStyle(fontSize: 11, color: Colors.grey[600]),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String status, String label) {
    final isSelected = _statusFilter == status;
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) {
        setState(() => _statusFilter = status);
      },
      selectedColor: AppColors.primary,
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : null,
        fontSize: 12,
      ),
      checkmarkColor: Colors.white,
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.inbox_outlined, size: 80, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(
            _searchTerm.isNotEmpty || _statusFilter != 'ALL'
                ? 'No complaints match your filters'
                : 'No complaints yet',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _searchTerm.isNotEmpty || _statusFilter != 'ALL'
                ? 'Try adjusting your search or filters'
                : 'Tap + to report an issue',
            style: TextStyle(color: Colors.grey[400]),
          ),
        ],
      ),
    );
  }

  Widget _buildComplaintCard(Complaint complaint) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => ComplaintDetailScreen(complaintId: complaint.id),
            ),
          ).then((_) => _loadComplaints());
        },
        child: Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  _buildCategoryIcon(complaint.category),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          complaint.title,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          complaint.description,
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 14,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  _buildStatusChip(complaint.status),
                ],
              ),
              const SizedBox(height: 12),

              // Meta info
              Row(
                children: [
                  if (complaint.municipalityName != null) ...[
                    Icon(Icons.location_on, size: 14, color: Colors.grey[500]),
                    const SizedBox(width: 4),
                    Text(
                      complaint.municipalityName!,
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    ),
                    const SizedBox(width: 12),
                  ],
                  Icon(Icons.calendar_today, size: 14, color: Colors.grey[500]),
                  const SizedBox(width: 4),
                  Text(
                    '${complaint.createdAt.day}/${complaint.createdAt.month}/${complaint.createdAt.year}',
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  ),
                  const Spacer(),
                  if (complaint.media.isNotEmpty)
                    Row(
                      children: [
                        Icon(Icons.photo, size: 14, color: Colors.grey[500]),
                        const SizedBox(width: 4),
                        Text(
                          '${complaint.media.length}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryIcon(String category) {
    IconData icon;
    Color color;

    switch (category.toUpperCase()) {
      case 'ROAD':
        icon = Icons.add_road;
        color = const Color(0xFF6B7280);
        break;
      case 'LIGHTING':
        icon = Icons.lightbulb;
        color = const Color(0xFFF59E0B);
        break;
      case 'WASTE':
        icon = Icons.delete;
        color = const Color(0xFF22C55E);
        break;
      case 'WATER':
        icon = Icons.water_drop;
        color = const Color(0xFF3B82F6);
        break;
      case 'SAFETY':
        icon = Icons.shield;
        color = const Color(0xFFEF4444);
        break;
      case 'PUBLIC_PROPERTY':
        icon = Icons.account_balance;
        color = const Color(0xFF8B5CF6);
        break;
      case 'GREEN_SPACE':
        icon = Icons.park;
        color = const Color(0xFF22C55E);
        break;
      default:
        icon = Icons.report_problem;
        color = const Color(0xFF6B7280);
    }

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: color.withAlpha(26),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Icon(icon, color: color, size: 22),
    );
  }

  Widget _buildStatusChip(String status) {
    Color color;
    switch (status.toUpperCase()) {
      case 'SUBMITTED':
        color = const Color(0xFF3B82F6);
        break;
      case 'VALIDATED':
        color = const Color(0xFF8B5CF6);
        break;
      case 'ASSIGNED':
        color = const Color(0xFFF59E0B);
        break;
      case 'IN_PROGRESS':
        color = const Color(0xFFF97316);
        break;
      case 'RESOLVED':
        color = const Color(0xFF22C55E);
        break;
      case 'CLOSED':
        color = const Color(0xFF6B7280);
        break;
      case 'REJECTED':
        color = const Color(0xFFEF4444);
        break;
      default:
        color = Colors.grey;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withAlpha(26),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        status.replaceAll('_', ' '),
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
