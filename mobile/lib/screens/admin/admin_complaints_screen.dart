import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/main.dart';
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
  String _statusFilter = '';
  String _searchQuery = '';
  final _searchController = TextEditingController();

  // Stats
  int get _total => _complaints.length;
  int get _resolved => _complaints
      .where((c) => c.status == 'RESOLVED' || c.status == 'CLOSED')
      .length;
  int get _overdue => _complaints.where((c) {
    final days = DateTime.now().difference(c.createdAt).inDays;
    return ['ASSIGNED', 'IN_PROGRESS'].contains(c.status) && days > 7;
  }).length;
  int get _atRisk => _complaints.where((c) {
    final days = DateTime.now().difference(c.createdAt).inDays;
    return ['ASSIGNED', 'IN_PROGRESS'].contains(c.status) &&
        days > 4 &&
        days <= 7;
  }).length;

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
    setState(() => _isLoading = true);
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
      setState(() => _isLoading = false);
    }
  }

  List<Complaint> get _filtered {
    if (_searchQuery.isEmpty) return _complaints;
    final q = _searchQuery.toLowerCase();
    return _complaints.where((c) {
      return c.title.toLowerCase().contains(q) ||
          c.description.toLowerCase().contains(q) ||
          (c.municipalityName?.toLowerCase().contains(q) ?? false);
    }).toList();
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'SUBMITTED':
        return Colors.blue;
      case 'VALIDATED':
        return Colors.purple;
      case 'ASSIGNED':
        return Colors.orange;
      case 'IN_PROGRESS':
        return Colors.deepOrange;
      case 'RESOLVED':
        return Colors.green;
      case 'CLOSED':
        return Colors.grey;
      case 'REJECTED':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  bool _isOverdue(Complaint c) {
    final days = DateTime.now().difference(c.createdAt).inDays;
    return ['ASSIGNED', 'IN_PROGRESS'].contains(c.status) && days > 7;
  }

  bool _isAtRisk(Complaint c) {
    final days = DateTime.now().difference(c.createdAt).inDays;
    return ['ASSIGNED', 'IN_PROGRESS'].contains(c.status) &&
        days > 4 &&
        days <= 7;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('All Complaints'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadComplaints,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadComplaints,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // ─── Stats Cards ────────────────────────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 8,
                  childAspectRatio: 2.2,
                  children: [
                    _buildStatCard(
                      'Total',
                      _total,
                      Icons.list_alt,
                      Colors.blue,
                      onTap: () => setState(() {
                        _statusFilter = '';
                        _loadComplaints();
                      }),
                    ),
                    _buildStatCard(
                      'Resolved',
                      _resolved,
                      Icons.check_circle,
                      Colors.green,
                      onTap: () => setState(() {
                        _statusFilter = 'RESOLVED';
                        _loadComplaints();
                      }),
                    ),
                    _buildStatCard(
                      'At Risk',
                      _atRisk,
                      Icons.warning_amber,
                      Colors.amber,
                      onTap: () => setState(() {
                        _statusFilter = 'IN_PROGRESS';
                        _loadComplaints();
                      }),
                    ),
                    _buildStatCard(
                      'Overdue',
                      _overdue,
                      Icons.alarm_off,
                      Colors.red,
                      onTap: () => setState(() {
                        _statusFilter = 'ASSIGNED';
                        _loadComplaints();
                      }),
                    ),
                  ],
                ),
              ),
            ),

            // ─── SLA Bar ─────────────────────────────────────────────────────
            if (_total > 0)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'SLA Overview',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: Row(
                              children: [
                                Flexible(
                                  flex: (_total - _overdue - _atRisk).clamp(
                                    0,
                                    _total,
                                  ),
                                  child: Container(
                                    height: 12,
                                    color: Colors.green,
                                  ),
                                ),
                                Flexible(
                                  flex: _atRisk,
                                  child: Container(
                                    height: 12,
                                    color: Colors.amber,
                                  ),
                                ),
                                Flexible(
                                  flex: _overdue,
                                  child: Container(
                                    height: 12,
                                    color: Colors.red,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              _buildLegendDot(Colors.green, 'Compliant'),
                              const SizedBox(width: 12),
                              _buildLegendDot(Colors.amber, 'At Risk'),
                              const SizedBox(width: 12),
                              _buildLegendDot(Colors.red, 'Overdue'),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),

            // ─── Search + Filter ─────────────────────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                child: Column(
                  children: [
                    TextField(
                      controller: _searchController,
                      onChanged: (v) {
                        setState(() => _searchQuery = v);
                        if (v.isEmpty) _loadComplaints();
                      },
                      onSubmitted: (_) => _loadComplaints(),
                      decoration: InputDecoration(
                        hintText: 'Search complaints...',
                        prefixIcon: const Icon(Icons.search),
                        suffixIcon: _searchQuery.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear),
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() => _searchQuery = '');
                                  _loadComplaints();
                                },
                              )
                            : null,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children:
                            [
                              'ALL',
                              'SUBMITTED',
                              'VALIDATED',
                              'ASSIGNED',
                              'IN_PROGRESS',
                              'RESOLVED',
                              'CLOSED',
                              'REJECTED',
                            ].map((s) {
                              final selected =
                                  _statusFilter == (s == 'ALL' ? '' : s);
                              return Padding(
                                padding: const EdgeInsets.only(right: 6),
                                child: ChoiceChip(
                                  label: Text(
                                    s.replaceAll('_', ' '),
                                    style: const TextStyle(fontSize: 12),
                                  ),
                                  selected: selected,
                                  selectedColor: AppColors.primary.withAlpha(
                                    40,
                                  ),
                                  onSelected: (_) {
                                    setState(
                                      () => _statusFilter = s == 'ALL' ? '' : s,
                                    );
                                    _loadComplaints();
                                  },
                                ),
                              );
                            }).toList(),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // ─── List ─────────────────────────────────────────────────────────
            if (_isLoading)
              const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_filtered.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.inbox_outlined,
                        size: 60,
                        color: Colors.grey.shade400,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'No complaints found',
                        style: TextStyle(color: Colors.grey.shade500),
                      ),
                    ],
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) => _buildComplaintTile(_filtered[i]),
                    childCount: _filtered.length,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(
    String label,
    int count,
    IconData icon,
    Color color, {
    VoidCallback? onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: color.withAlpha(30),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 18),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    '$count',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                  Text(
                    label,
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLegendDot(Color color, String label) {
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 11)),
      ],
    );
  }

  Widget _buildComplaintTile(Complaint c) {
    final statusColor = _getStatusColor(c.status);
    final isOverdue = _isOverdue(c);
    final isAtRisk = _isAtRisk(c);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: isOverdue
            ? const BorderSide(color: Colors.red, width: 1.5)
            : isAtRisk
            ? const BorderSide(color: Colors.amber, width: 1.5)
            : BorderSide.none,
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ComplaintDetailScreen(complaintId: c.id),
          ),
        ).then((_) => _loadComplaints()),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      c.title,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor.withAlpha(25),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      c.status.replaceAll('_', ' '),
                      style: TextStyle(
                        color: statusColor,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(
                    Icons.location_on,
                    size: 12,
                    color: Colors.grey.shade500,
                  ),
                  const SizedBox(width: 2),
                  Expanded(
                    child: Text(
                      [
                        c.municipalityName,
                        c.governorate,
                      ].where((s) => s != null && s.isNotEmpty).join(', '),
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Text(
                    _daysSince(c.createdAt),
                    style: TextStyle(
                      fontSize: 11,
                      color: isOverdue
                          ? Colors.red
                          : isAtRisk
                          ? Colors.amber.shade700
                          : Colors.grey.shade500,
                    ),
                  ),
                ],
              ),
              if (isOverdue || isAtRisk) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(
                      isOverdue ? Icons.alarm_off : Icons.warning_amber,
                      size: 12,
                      color: isOverdue ? Colors.red : Colors.amber.shade700,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      isOverdue ? 'SLA Overdue' : 'SLA At Risk',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: isOverdue ? Colors.red : Colors.amber.shade700,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _daysSince(DateTime dt) {
    final days = DateTime.now().difference(dt).inDays;
    if (days == 0) return 'Today';
    if (days == 1) return '1 day ago';
    return '$days days ago';
  }
}
