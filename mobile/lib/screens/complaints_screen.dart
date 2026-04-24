import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/models/complaint_model.dart';
import 'package:smart_city_app/core/constants/colors.dart';
import 'package:smart_city_app/screens/new_complaint_screen.dart';
import 'package:smart_city_app/screens/complaint_detail_screen.dart';
import 'package:smart_city_app/providers/complaints_provider.dart';

const Map<String, Map<String, dynamic>> _statusConfig = {
  'SUBMITTED': {
    'label': 'Submitted',
    'bg': Color(0xFFFFF3E0),
    'text': Color(0xFFE65100),
    'dot': Color(0xFFFF9800),
  },
  'VALIDATED': {
    'label': 'Validated',
    'bg': Color(0xFFE3F2FD),
    'text': Color(0xFF1565C0),
    'dot': Color(0xFF2196F3),
  },
  'ASSIGNED': {
    'label': 'Assigned',
    'bg': Color(0xFFF3E5F5),
    'text': Color(0xFF6A1B9A),
    'dot': Color(0xFF9C27B0),
  },
  'IN_PROGRESS': {
    'label': 'In Progress',
    'bg': Color(0xFFFFF3E0),
    'text': Color(0xFFEF6C00),
    'dot': Color(0xFFFF9800),
  },
  'RESOLVED': {
    'label': 'Resolved',
    'bg': Color(0xFFE8F5E9),
    'text': Color(0xFF2E7D32),
    'dot': Color(0xFF4CAF50),
  },
  'CLOSED': {
    'label': 'Closed',
    'bg': Color(0xFFF1F5F9),
    'text': Color(0xFF475569),
    'dot': Color(0xFF64748B),
  },
  'REJECTED': {
    'label': 'Rejected',
    'bg': Color(0xFFFFEBEE),
    'text': Color(0xFFC62828),
    'dot': Color(0xFFEF5350),
  },
};

const Map<String, String> _categoryLabels = {
  'ROAD': 'Roads & Infrastructure',
  'LIGHTING': 'Public Lighting',
  'WASTE': 'Waste Management',
  'WATER': 'Water & Sanitation',
  'SAFETY': 'Public Safety',
  'PUBLIC_PROPERTY': 'Public Property',
  'GREEN_SPACE': 'Parks & Green Spaces',
  'OTHER': 'Other',
};

class ComplaintsScreen extends ConsumerStatefulWidget {
  final VoidCallback? onLogout;

  const ComplaintsScreen({super.key, this.onLogout});

  @override
  ConsumerState<ComplaintsScreen> createState() => _ComplaintsScreenState();
}

class _ComplaintsScreenState extends ConsumerState<ComplaintsScreen> {
  String _statusFilter = '';
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
    final complaints = _buildFilteredList(state.complaints);

    final submitted = state.complaints
        .where((c) => c.status == 'SUBMITTED')
        .length;
    final inProgress = state.complaints
        .where(
          (c) => ['VALIDATED', 'ASSIGNED', 'IN_PROGRESS'].contains(c.status),
        )
        .length;
    final resolved = state.complaints
        .where((c) => c.status == 'RESOLVED')
        .length;
    final total = state.complaints.length;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: _loadComplaints,
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              floating: true,
              pinned: true,
              backgroundColor: Colors.white,
              elevation: 0,
              surfaceTintColor: Colors.transparent,
              leading: IconButton(
                icon: const Icon(
                  Icons.arrow_back,
                  color: AppColors.textPrimary,
                ),
                onPressed: () => Navigator.pop(context),
              ),
              title: const Text(
                'My Complaints',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              actions: [
                Padding(
                  padding: const EdgeInsets.only(right: 16),
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => NewComplaintScreen(
                            onComplaintSubmitted: _loadComplaints,
                            onBack: () => Navigator.pop(context),
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('New'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ],
              bottom: PreferredSize(
                preferredSize: const Size.fromHeight(1),
                child: Container(color: const Color(0xFFE2E8F0), height: 1),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: _buildStatCard(
                            'Submitted',
                            submitted,
                            Icons.access_time,
                            const Color(0xFFFF9800),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildStatCard(
                            'In Progress',
                            inProgress,
                            Icons.trending_up,
                            const Color(0xFF2196F3),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _buildStatCard(
                            'Resolved',
                            resolved,
                            Icons.check_circle,
                            const Color(0xFF4CAF50),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildStatCard(
                            'Total',
                            total,
                            Icons.description,
                            AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  children: [
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: TextField(
                        controller: _searchController,
                        decoration: InputDecoration(
                          hintText: 'Search complaints...',
                          hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                          prefixIcon: const Icon(
                            Icons.search,
                            color: AppColors.textSecondary,
                          ),
                          suffixIcon: _searchTerm.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear),
                                  onPressed: () {
                                    _searchController.clear();
                                    setState(() => _searchTerm = '');
                                  },
                                )
                              : null,
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 14,
                          ),
                        ),
                        onChanged: (value) =>
                            setState(() => _searchTerm = value),
                      ),
                    ),
                    const SizedBox(height: 16),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _buildFilterChip('', 'All'),
                          const SizedBox(width: 8),
                          _buildFilterChip('SUBMITTED', 'Submitted'),
                          const SizedBox(width: 8),
                          _buildFilterChip('IN_PROGRESS', 'In Progress'),
                          const SizedBox(width: 8),
                          _buildFilterChip('RESOLVED', 'Resolved'),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 16)),
            if (state.isLoading)
              const SliverFillRemaining(
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              )
            else if (complaints.isEmpty)
              SliverFillRemaining(child: _buildEmptyState())
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
            const SliverToBoxAdapter(child: SizedBox(height: 80)),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => NewComplaintScreen(
                onComplaintSubmitted: _loadComplaints,
                onBack: () => Navigator.pop(context),
              ),
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

    if (_statusFilter == 'IN_PROGRESS') {
      filtered = filtered
          .where(
            (c) => ['VALIDATED', 'ASSIGNED', 'IN_PROGRESS'].contains(c.status),
          )
          .toList();
    } else if (_statusFilter.isNotEmpty) {
      filtered = filtered.where((c) => c.status == _statusFilter).toList();
    }

    if (_searchTerm.isNotEmpty) {
      final q = _searchTerm.toLowerCase();
      filtered = filtered
          .where(
            (c) =>
                c.title.toLowerCase().contains(q) ||
                c.description.toLowerCase().contains(q) ||
                (_categoryLabels[c.category]?.toLowerCase().contains(q) ??
                    false) ||
                (c.municipalityName?.toLowerCase().contains(q) ?? false),
          )
          .toList();
    }

    return filtered;
  }

  Widget _buildStatCard(String label, int value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(13),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withAlpha(26),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$value',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String status, String label) {
    final isSelected = _statusFilter == status;
    return GestureDetector(
      onTap: () => setState(() => _statusFilter = status),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
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
            color: isSelected ? Colors.white : AppColors.textSecondary,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.inbox_outlined, size: 80, color: Color(0xFFCBD5E1)),
          const SizedBox(height: 16),
          Text(
            _searchTerm.isNotEmpty || _statusFilter.isNotEmpty
                ? 'No complaints match your filters'
                : "You haven't submitted any complaints yet.",
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            _searchTerm.isNotEmpty || _statusFilter.isNotEmpty
                ? 'Try adjusting your search or filters'
                : 'Tap + to report an issue',
            style: const TextStyle(color: AppColors.textTertiary, fontSize: 14),
          ),
        ],
      ),
    );
  }

  Widget _buildComplaintCard(Complaint complaint) {
    final statusCfg =
        _statusConfig[complaint.status] ??
        {
          'label': complaint.status,
          'bg': const Color(0xFFF1F5F9),
          'text': const Color(0xFF475569),
          'dot': const Color(0xFF64748B),
        };
    final categoryLabel =
        _categoryLabels[complaint.category] ?? complaint.category;
    final locationAddress = complaint.location?['address'] as String?;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(13),
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
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) =>
                    ComplaintDetailScreen(complaintId: complaint.id),
              ),
            ).then((_) => _loadComplaints());
          },
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              'RC-${complaint.id.substring(complaint.id.length > 6 ? complaint.id.length - 6 : 0).toUpperCase()}',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                color: AppColors.textSecondary,
                                fontFamily: 'monospace',
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: statusCfg['bg'] as Color,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: BoxDecoration(
                                    color: statusCfg['dot'] as Color,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  statusCfg['label'] as String,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: statusCfg['text'] as Color,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withAlpha(26),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              categoryLabel,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.access_time,
                              size: 14,
                              color: Color(0xFF94A3B8),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '${complaint.createdAt.day}/${complaint.createdAt.month}/${complaint.createdAt.year}',
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF94A3B8),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  complaint.description,
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.textPrimary,
                    height: 1.5,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    if (locationAddress != null) ...[
                      const Icon(
                        Icons.location_on,
                        size: 14,
                        color: Color(0xFF94A3B8),
                      ),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          locationAddress,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 12),
                    ],
                    if (complaint.municipalityName != null) ...[
                      const Icon(
                        Icons.location_city,
                        size: 14,
                        color: Color(0xFF94A3B8),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        complaint.municipalityName!,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(width: 12),
                    ],
                    if (complaint.media.isNotEmpty) ...[
                      const Icon(
                        Icons.photo,
                        size: 14,
                        color: Color(0xFF94A3B8),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${complaint.media.length}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                    const Spacer(),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'View details',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(width: 2),
                        const Icon(
                          Icons.chevron_right,
                          size: 16,
                          color: AppColors.primary,
                        ),
                      ],
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
