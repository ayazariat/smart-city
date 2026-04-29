import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/core/constants/app_theme.dart';
import 'package:smart_city_app/models/complaint_model.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/screens/home/complaint_detail_screen.dart';

class MyComplaintsScreen extends ConsumerStatefulWidget {
  const MyComplaintsScreen({super.key});

  @override
  ConsumerState<MyComplaintsScreen> createState() => _MyComplaintsScreenState();
}

class _MyComplaintsScreenState extends ConsumerState<MyComplaintsScreen> {
  final ComplaintService _complaintService = ComplaintService();
  List<Complaint> _complaints = [];
  bool _isLoading = true;
  String _searchQuery = '';
  String? _statusFilter;

  final List<Map<String, dynamic>> _statusOptions = [
    {'value': '', 'label': 'Tous', 'color': AppTheme.textSecondary},
    {'value': 'SUBMITTED', 'label': 'Soumis', 'color': AppTheme.statusPending},
    {'value': 'VALIDATED', 'label': 'Validé', 'color': AppTheme.statusValidated},
    {'value': 'ASSIGNED', 'label': 'Assigné', 'color': AppTheme.statusAssigned},
    {'value': 'IN_PROGRESS', 'label': 'En cours', 'color': AppTheme.statusInProgress},
    {'value': 'RESOLVED', 'label': 'Résolu', 'color': AppTheme.statusResolved},
    {'value': 'CLOSED', 'label': 'Clôturé', 'color': AppTheme.statusClosed},
    {'value': 'REJECTED', 'label': 'Rejeté', 'color': AppTheme.statusRejected},
  ];

  @override
  void initState() {
    super.initState();
    _loadComplaints();
  }

  Future<void> _loadComplaints() async {
    setState(() => _isLoading = true);
    try {
      final complaints = await _complaintService.getMyComplaints(limit: 100);
      setState(() {
        _complaints = complaints;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  List<Complaint> get _filteredComplaints {
    return _complaints.where((c) {
      if (_statusFilter != null && _statusFilter!.isNotEmpty && c.status != _statusFilter) {
        return false;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Mes signalements'),
        backgroundColor: AppTheme.surface,
        foregroundColor: AppTheme.textPrimary,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadComplaints,
          ),
        ],
      ),
      body: Column(
        children: [
          // Search & Filters
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: AppTheme.surface,
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(AppTheme.radiusXl),
                bottomRight: Radius.circular(AppTheme.radiusXl),
              ),
              boxShadow: [
                BoxShadow(
                  color: Color(0x0A000000),
                  blurRadius: 8,
                  offset: Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              children: [
                TextField(
                  decoration: InputDecoration(
                    hintText: 'Rechercher...',
                    prefixIcon: const Icon(Icons.search),
                    filled: true,
                    fillColor: AppTheme.background,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                      borderSide: BorderSide.none,
                    ),
                  ),
                  onChanged: (v) => setState(() => _searchQuery = v),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 40,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _statusOptions.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (context, index) {
                      final opt = _statusOptions[index];
                      final isSelected = _statusFilter == opt['value'] || 
                          (opt['value'] == '' && (_statusFilter == null || _statusFilter!.isEmpty));
                      return FilterChip(
                        label: Text(opt['label'] as String),
                        selected: isSelected,
                        selectedColor: (opt['color'] as Color).withOpacity(0.15),
                        checkmarkColor: opt['color'] as Color,
                        labelStyle: TextStyle(
                          color: isSelected ? opt['color'] as Color : AppTheme.textSecondary,
                          fontSize: 13,
                          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                        ),
                        backgroundColor: AppTheme.background,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                          side: BorderSide(
                            color: isSelected ? opt['color'] as Color : AppTheme.border,
                          ),
                        ),
                        onSelected: (_) => setState(() => _statusFilter = opt['value'] as String),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),

          // Complaints List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                : _filteredComplaints.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: _loadComplaints,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _filteredComplaints.length,
                          itemBuilder: (context, index) {
                            final complaint = _filteredComplaints[index];
                            return _buildComplaintCard(complaint);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.inbox, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(
            _searchQuery.isNotEmpty || (_statusFilter != null && _statusFilter!.isNotEmpty)
                ? 'Aucun résultat'
                : 'Aucun signalement',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
          ),
          const SizedBox(height: 8),
          Text(
            _searchQuery.isNotEmpty
                ? 'Essayez une autre recherche'
                : 'Soumettez votre premier signalement',
            style: const TextStyle(color: AppTheme.textMuted),
          ),
        ],
      ),
    );
  }

  Widget _buildComplaintCard(Complaint c) {
    final statusColor = _getStatusColor(c.status);
    String photoUrl = '';
    for (final media in c.media) {
      if (media.type == 'photo' && media.url.isNotEmpty) {
        photoUrl = media.url.startsWith('http') ? media.url : 'http://localhost:5000${media.url}';
        break;
      }
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
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
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        child: InkWell(
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => ComplaintDetailScreen(complaintId: c.id),
            ),
          ),
          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        c.title,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        _getStatusLabel(c.status),
                        style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.w600),
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
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
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
                      const SizedBox(width: 12),
                    ],
                    Expanded(
                      child: Text(
                        c.description,
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
                    Icon(Icons.calendar_today, size: 14, color: Colors.grey[400]),
                    const SizedBox(width: 4),
                    Text(
                      '${c.createdAt.day}/${c.createdAt.month}/${c.createdAt.year}',
                      style: TextStyle(color: Colors.grey[500], fontSize: 12),
                    ),
                    const Spacer(),
                    if (c.priorityScore != null && c.priorityScore! >= 15)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.danger.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.warning_amber, size: 12, color: AppTheme.danger),
                            SizedBox(width: 4),
                            Text('Urgent', style: TextStyle(color: AppTheme.danger, fontSize: 10, fontWeight: FontWeight.w600)),
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
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'SUBMITTED': return AppTheme.statusPending;
      case 'VALIDATED': return AppTheme.statusValidated;
      case 'ASSIGNED': return AppTheme.statusAssigned;
      case 'IN_PROGRESS': return AppTheme.statusInProgress;
      case 'RESOLVED': return AppTheme.statusResolved;
      case 'CLOSED': return AppTheme.statusClosed;
      case 'REJECTED': return AppTheme.statusRejected;
      default: return AppTheme.textMuted;
    }
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'SUBMITTED': return 'Soumis';
      case 'VALIDATED': return 'Validé';
      case 'ASSIGNED': return 'Assigné';
      case 'IN_PROGRESS': return 'En cours';
      case 'RESOLVED': return 'Résolu';
      case 'CLOSED': return 'Clôturé';
      case 'REJECTED': return 'Rejeté';
      default: return status;
    }
  }
}
