import 'package:flutter/material.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/services/api_client.dart';
import 'package:smart_city_app/data/tunisia_data.dart';
import 'package:smart_city_app/main.dart';

class ComplaintDetailScreen extends StatefulWidget {
  final String complaintId;

  const ComplaintDetailScreen({super.key, required this.complaintId});

  @override
  State<ComplaintDetailScreen> createState() => _ComplaintDetailScreenState();
}

class _ComplaintDetailScreenState extends State<ComplaintDetailScreen> {
  final ComplaintService _complaintService = ComplaintService();
  final ApiClient _apiClient = ApiClient();
  
  Map<String, dynamic>? _complaint;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadComplaint();
  }

  Future<void> _loadComplaint() async {
    try {
      final complaint = await _complaintService.getComplaintById(widget.complaintId);
      setState(() {
        _complaint = complaint;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'SUBMITTED': return Colors.blue;
      case 'VALIDATED': return Colors.purple;
      case 'ASSIGNED': return Colors.orange;
      case 'IN_PROGRESS': return Colors.deepOrange;
      case 'RESOLVED': return Colors.green;
      case 'CLOSED': return Colors.grey;
      case 'REJECTED': return Colors.red;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Complaint Details'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text('Error: $_error'))
              : _complaint == null
                  ? const Center(child: Text('Complaint not found'))
                  : RefreshIndicator(
                      onRefresh: _loadComplaint,
                      child: ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          // Header
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          _complaint!['title'] ?? '',
                                          style: const TextStyle(
                                            fontSize: 20,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 12,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: _getStatusColor(_complaint!['status']).withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: Text(
                                          TunisiaData.statusLabels[_complaint!['status']] ?? 
                                              _complaint!['status'] ?? '',
                                          style: TextStyle(
                                            color: _getStatusColor(_complaint!['status']),
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Row(
                                    children: [
                                      _InfoChip(
                                        label: TunisiaData.categoryLabels[_complaint!['category']] ?? 
                                            _complaint!['category'] ?? '',
                                        color: AppColors.primary,
                                      ),
                                      const SizedBox(width: 8),
                                      _InfoChip(
                                        label: TunisiaData.urgencyLabels[_complaint!['urgency']] ?? 
                                            _complaint!['urgency'] ?? '',
                                        color: _getUrgencyColor(_complaint!['urgency']),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          
                          // Citizen Actions (Confirm/Vote)
                          FutureBuilder(
                            future: _apiClient.get('/auth/me'),
                            builder: (context, snapshot) {
                              final role = snapshot.data?['data']?['role'] ?? '';
                              if (role == 'CITIZEN') {
                                return Card(
                                  child: Padding(
                                    padding: const EdgeInsets.all(16),
                                    child: Row(
                                      children: [
                                        Expanded(
                                          child: ElevatedButton.icon(
                                            onPressed: () => _confirmComplaint(),
                                            icon: const Icon(Icons.check),
                                            label: const Text('Confirm'),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: OutlinedButton.icon(
                                            onPressed: () => _voteComplaint(),
                                            icon: const Icon(Icons.thumb_up),
                                            label: const Text('Vote'),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              }
                              return const SizedBox.shrink();
                            },
                          ),
                          const SizedBox(height: 16),
                          
                          // Description
                          const Text(
                            'Description',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Text(_complaint!['description'] ?? ''),
                            ),
                          ),
                          const SizedBox(height: 16),
                          
                          // Location
                          const Text(
                            'Location',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          Card(
                            child: ListTile(
                              leading: const Icon(Icons.location_on, color: AppColors.primary),
                              title: Text(_complaint!['location']?['address'] ?? ''),
                              subtitle: Text(
                                '${_complaint!['location']?['municipality'] ?? ''}, '
                                '${_complaint!['location']?['governorate'] ?? ''}',
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          
                          // Statistics
                          if (_complaint!['confirmationCount'] != null || 
                              _complaint!['voteCount'] != null)
                            Card(
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                                  children: [
                                    if (_complaint!['confirmationCount'] != null)
                                      Column(
                                        children: [
                                          Text(
                                            '${_complaint!['confirmationCount']}',
                                            style: const TextStyle(
                                              fontSize: 24,
                                              fontWeight: FontWeight.bold,
                                              color: AppColors.primary,
                                            ),
                                          ),
                                          const Text('Confirmations'),
                                        ],
                                      ),
                                    if (_complaint!['voteCount'] != null)
                                      Column(
                                        children: [
                                          Text(
                                            '${_complaint!['voteCount']}',
                                            style: const TextStyle(
                                              fontSize: 24,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.blue,
                                            ),
                                          ),
                                          const Text('Votes'),
                                        ],
                                      ),
                                  ],
                                ),
                              ),
                            ),
                          const SizedBox(height: 16),
                          
                          // Technician Report
                          if (_complaint!['technicianReport'] != null) ...[
                            const Text(
                              'Technician Report',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 8),
                            Card(
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    if (_complaint!['technicianReport']['description'] != null)
                                      _ReportRow(
                                        label: 'Description',
                                        value: _complaint!['technicianReport']['description'],
                                      ),
                                    if (_complaint!['technicianReport']['workDone'] != null)
                                      _ReportRow(
                                        label: 'Work Done',
                                        value: _complaint!['technicianReport']['workDone'],
                                      ),
                                    if (_complaint!['technicianReport']['materials'] != null)
                                      _ReportRow(
                                        label: 'Materials',
                                        value: _complaint!['technicianReport']['materials'],
                                      ),
                                    if (_complaint!['technicianReport']['isVerified'] == true)
                                      Container(
                                        margin: const EdgeInsets.only(top: 12),
                                        padding: const EdgeInsets.all(8),
                                        decoration: BoxDecoration(
                                          color: Colors.green.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: const Row(
                                          children: [
                                            Icon(Icons.check_circle, color: Colors.green, size: 16),
                                            SizedBox(width: 8),
                                            Text(
                                              'Verified by Agent',
                                              style: TextStyle(color: Colors.green),
                                            ),
                                          ],
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
    );
  }

  Color _getUrgencyColor(String urgency) {
    switch (urgency) {
      case 'URGENT': return Colors.red;
      case 'HIGH': return Colors.deepOrange;
      case 'MEDIUM': return Colors.orange;
      case 'LOW': return Colors.green;
      default: return Colors.grey;
    }
  }

  Future<void> _confirmComplaint() async {
    try {
      await _complaintService.confirmComplaint(widget.complaintId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Thank you for confirming!')),
        );
        _loadComplaint();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  Future<void> _voteComplaint() async {
    try {
      await _complaintService.voteComplaint(widget.complaintId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Vote recorded!')),
        );
        _loadComplaint();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }
}

class _InfoChip extends StatelessWidget {
  final String label;
  final Color color;

  const _InfoChip({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontWeight: FontWeight.w500, fontSize: 12),
      ),
    );
  }
}

class _ReportRow extends StatelessWidget {
  final String label;
  final String value;

  const _ReportRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 12,
              color: Colors.grey,
            ),
          ),
          Text(value),
        ],
      ),
    );
  }
}
