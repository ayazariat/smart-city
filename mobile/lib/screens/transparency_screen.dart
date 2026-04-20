import 'package:flutter/material.dart';
import 'package:smart_city_app/models/complaint_model.dart';
import 'package:smart_city_app/services/api_client.dart';
import 'package:smart_city_app/main.dart';

class TransparencyScreen extends StatefulWidget {
  const TransparencyScreen({super.key});

  @override
  State<TransparencyScreen> createState() => _TransparencyScreenState();
}

class _TransparencyScreenState extends State<TransparencyScreen>
    with SingleTickerProviderStateMixin {
  final ApiClient _apiClient = ApiClient();
  late TabController _tabController;
  List<Complaint> _complaints = [];
  Map<String, dynamic> _stats = {};
  bool _isLoading = true;
  String? _error;
  String _searchQuery = '';
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _apiClient.get('/public/stats'),
        _apiClient.get('/public/complaints?limit=50'),
      ]);
      setState(() {
        _stats = results[0] is Map ? results[0] as Map<String, dynamic> : {};
        final complaintData = results[1];
        if (complaintData is Map && complaintData['complaints'] != null) {
          _complaints = (complaintData['complaints'] as List)
              .map((c) => Complaint.fromJson(c))
              .toList();
        } else if (complaintData is List) {
          _complaints = complaintData
              .map((c) => Complaint.fromJson(c))
              .toList();
        }
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  List<Complaint> get _filteredComplaints {
    if (_searchQuery.isEmpty) return _complaints;
    final q = _searchQuery.toLowerCase();
    return _complaints.where((c) {
      final title = c.title.toLowerCase();
      final desc = c.description.toLowerCase();
      final muni = (c.municipalityName ?? '').toLowerCase();
      return title.contains(q) || desc.contains(q) || muni.contains(q);
    }).toList();
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'SUBMITTED':
        return Colors.amber;
      case 'VALIDATED':
        return Colors.blue;
      case 'ASSIGNED':
        return Colors.purple;
      case 'IN_PROGRESS':
        return Colors.orange;
      case 'RESOLVED':
        return AppColors.primary;
      case 'CLOSED':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  IconData _categoryIcon(String? cat) {
    switch (cat) {
      case 'ROAD':
        return Icons.add_road;
      case 'LIGHTING':
        return Icons.lightbulb;
      case 'WASTE':
        return Icons.delete_sweep;
      case 'WATER':
        return Icons.water_drop;
      case 'SAFETY':
        return Icons.shield;
      case 'PUBLIC_PROPERTY':
        return Icons.account_balance;
      case 'GREEN_SPACE':
        return Icons.park;
      default:
        return Icons.help_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        title: const Text('Public Dashboard'),
        centerTitle: true,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'Overview', icon: Icon(Icons.bar_chart, size: 18)),
            Tab(text: 'Complaints', icon: Icon(Icons.list_alt, size: 18)),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 48,
                    color: Colors.red.shade300,
                  ),
                  const SizedBox(height: 12),
                  Text(_error!, textAlign: TextAlign.center),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: _loadData,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            )
          : TabBarView(
              controller: _tabController,
              children: [_buildOverview(), _buildComplaintsList()],
            ),
    );
  }

  Widget _buildOverview() {
    final total = _stats['total'] ?? _stats['totalComplaints'] ?? 0;
    final resolved = _stats['resolved'] ?? _stats['resolvedComplaints'] ?? 0;
    final rate = total > 0
        ? ((resolved / total) * 100).toStringAsFixed(1)
        : '0';
    final byCategory = _stats['byCategory'] as Map<String, dynamic>? ?? {};

    return RefreshIndicator(
      onRefresh: _loadData,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Summary cards
            Row(
              children: [
                Expanded(
                  child: _statCard(
                    'Total',
                    total.toString(),
                    AppColors.primary,
                    Icons.assignment,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _statCard(
                    'Resolved',
                    resolved.toString(),
                    AppColors.primaryLight,
                    Icons.check_circle,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _statCard(
                    'In Progress',
                    (_stats['inProgress'] ?? 0).toString(),
                    AppColors.attention,
                    Icons.pending,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _statCard(
                    'Rate',
                    '$rate%',
                    Colors.blue,
                    Icons.trending_up,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // By category
            if (byCategory.isNotEmpty) ...[
              const Text(
                'By Category',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              ...byCategory.entries.map((e) {
                final count = (e.value is int)
                    ? e.value
                    : int.tryParse(e.value.toString()) ?? 0;
                final maxVal = byCategory.values.fold<int>(0, (prev, v) {
                  final val = (v is int) ? v : int.tryParse(v.toString()) ?? 0;
                  return val > prev ? val : prev;
                });
                final pct = maxVal > 0 ? count / maxVal : 0.0;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      Icon(
                        _categoryIcon(e.key),
                        size: 18,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 8),
                      SizedBox(
                        width: 100,
                        child: Text(
                          e.key,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: pct,
                            minHeight: 8,
                            backgroundColor: Colors.grey.shade200,
                            valueColor: AlwaysStoppedAnimation(
                              AppColors.primary,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '$count',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],

            const SizedBox(height: 24),
            // Featured complaints
            const Text(
              'Recent Complaints',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            ..._complaints.take(5).map((c) => _complaintCard(c)),
          ],
        ),
      ),
    );
  }

  Widget _buildComplaintsList() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: TextField(
            controller: _searchController,
            onChanged: (v) => setState(() => _searchQuery = v),
            decoration: InputDecoration(
              hintText: 'Search complaints...',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                        setState(() => _searchQuery = '');
                      },
                    )
                  : null,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              filled: true,
              fillColor: Colors.white,
            ),
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _loadData,
            child: _filteredComplaints.isEmpty
                ? const Center(child: Text('No complaints found'))
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    itemCount: _filteredComplaints.length,
                    itemBuilder: (context, index) =>
                        _complaintCard(_filteredComplaints[index]),
                  ),
          ),
        ),
      ],
    );
  }

  Widget _statCard(String label, String value, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
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
          Icon(icon, color: color, size: 28),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }

  Widget _complaintCard(Complaint complaint) {
    final status = complaint.status;
    final category = complaint.category;
    final municipality = complaint.municipalityName ?? '';
    final title = complaint.title;
    final description = complaint.description;
    final media = complaint.media;
    final confirmCount = complaint.confirmationCount;
    final upvoteCount = complaint.upvoteCount;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image
          if (media.isNotEmpty && media[0].url.isNotEmpty)
            SizedBox(
              height: 120,
              width: double.infinity,
              child: Image.network(
                media[0].url.startsWith('http')
                    ? media[0].url
                    : '${ApiClient.baseUrl.replaceAll('/api', '')}${media[0].url}',
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => Container(
                  height: 120,
                  color: AppColors.secondary,
                  child: const Center(
                    child: Icon(Icons.image_not_supported, color: Colors.grey),
                  ),
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Status + Category row
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: _statusColor(status).withAlpha(25),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        status.toString().replaceAll('_', ' '),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: _statusColor(status),
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Icon(
                      _categoryIcon(category),
                      size: 14,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      category,
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const Spacer(),
                    if (municipality.toString().isNotEmpty)
                      Row(
                        children: [
                          const Icon(
                            Icons.location_on,
                            size: 12,
                            color: AppColors.textSecondary,
                          ),
                          const SizedBox(width: 2),
                          Text(
                            municipality.toString(),
                            style: const TextStyle(
                              fontSize: 10,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  title.toString(),
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  description.toString(),
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                // Upvote + Confirm counts
                Row(
                  children: [
                    Icon(
                      Icons.check_circle_outline,
                      size: 16,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '$confirmCount',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Icon(Icons.thumb_up_outlined, size: 16, color: Colors.blue),
                    const SizedBox(width: 4),
                    Text(
                      '$upvoteCount',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
