import 'package:flutter/material.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/main.dart';

class PublicStatsScreen extends StatefulWidget {
  const PublicStatsScreen({super.key});

  @override
  State<PublicStatsScreen> createState() => _PublicStatsScreenState();
}

class _PublicStatsScreenState extends State<PublicStatsScreen> {
  final ComplaintService _complaintService = ComplaintService();
  
  Map<String, dynamic>? _stats;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    try {
      final stats = await _complaintService.getPublicStats();
      setState(() {
        _stats = stats;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Public Statistics'),
        backgroundColor: AppColors.primary,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text('Error: $_error'))
              : RefreshIndicator(
                  onRefresh: _loadStats,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Overview Cards
                      Row(
                        children: [
                          Expanded(
                            child: _StatCard(
                              title: 'Total',
                              value: '${_stats?['total'] ?? 0}',
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _StatCard(
                              title: 'Resolved',
                              value: '${_stats?['resolved'] ?? 0}',
                              color: Colors.green,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      
                      // Resolution Rate
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Resolution Rate',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 12),
                              LinearProgressIndicator(
                                value: _stats?['total'] != null && _stats!['total'] > 0
                                    ? (_stats!['resolved'] / _stats!['total'])
                                    : 0,
                                backgroundColor: Colors.grey[200],
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.green),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                _stats?['total'] != null && _stats!['total'] > 0
                                    ? '${((_stats!['resolved'] / _stats!['total']) * 100).toStringAsFixed(1)}% resolved'
                                    : '0% resolved',
                                style: TextStyle(color: Colors.grey[600]),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      
                      // By Category
                      const Text(
                        'By Category',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            children: (_stats?['byCategory'] as Map<String, dynamic>?)
                                    ?.entries
                                    .map((e) => _CategoryRow(
                                          label: e.key.replaceAll('_', ' ').toLowerCase(),
                                          value: e.value,
                                          total: _stats!['total'] ?? 1,
                                        ))
                                    .toList() ??
                                [],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      
                      // By Governorate
                      const Text(
                        'By Governorate',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            children: (_stats?['byGovernorate'] as Map<String, dynamic>?)
                                    ?.entries
                                    .toList()
                                    .take(10)
                                    .map((e) => _CategoryRow(
                                          label: e.key.replaceAll('Gouvernorat ', ''),
                                          value: e.value,
                                          total: _stats!['total'] ?? 1,
                                        ))
                                    .toList() ??
                                [],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text(
              value,
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              title,
              style: TextStyle(color: Colors.grey[600]),
            ),
          ],
        ),
      ),
    );
  }
}

class _CategoryRow extends StatelessWidget {
  final String label;
  final int value;
  final int total;

  const _CategoryRow({
    required this.label,
    required this.value,
    required this.total,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Text(
              label[0].toUpperCase() + label.substring(1),
              style: const TextStyle(fontSize: 14),
            ),
          ),
          Expanded(
            flex: 3,
            child: LinearProgressIndicator(
              value: total > 0 ? value / total : 0,
              backgroundColor: Colors.grey[200],
              valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 40,
            child: Text(
              '$value',
              textAlign: TextAlign.right,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }
}
