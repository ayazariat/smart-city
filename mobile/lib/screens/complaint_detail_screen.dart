import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/models/complaint_model.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/services/api_client.dart';
import 'package:smart_city_app/providers/auth_provider.dart';
import 'package:smart_city_app/main.dart';

class ComplaintDetailScreen extends ConsumerStatefulWidget {
  final String complaintId;

  const ComplaintDetailScreen({super.key, required this.complaintId});

  @override
  ConsumerState<ComplaintDetailScreen> createState() =>
      _ComplaintDetailScreenState();
}

class _ComplaintDetailScreenState extends ConsumerState<ComplaintDetailScreen> {
  final ComplaintService _complaintService = ComplaintService();

  Complaint? _complaint;
  bool _isLoading = true;
  String? _error;
  List<dynamic> _departments = [];
  List<dynamic> _technicians = [];
  bool _loadingAction = false;

  @override
  void initState() {
    super.initState();
    _loadData();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final role = ref.read(authProvider).user?.role ?? '';
      if (role == 'MUNICIPAL_AGENT') _loadDepartments();
      if (role == 'DEPARTMENT_MANAGER') _loadTechnicians();
    });
  }

  Future<void> _loadData() async {
    try {
      final complaint = await _complaintService.getComplaintById(
        widget.complaintId,
      );
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

  String get _baseUrl => ApiClient.baseUrl.replaceAll('/api', '');
  String get _userRole => ref.read(authProvider).user?.role ?? '';
  String get _status => _complaint?.status ?? '';

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

  Color _getUrgencyColor(String? urgency) {
    switch (urgency) {
      case 'URGENT':
        return Colors.red;
      case 'HIGH':
        return Colors.deepOrange;
      case 'MEDIUM':
        return Colors.orange;
      case 'LOW':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  String _formatDate(dynamic date) {
    if (date == null) return '';
    try {
      final dt = DateTime.parse(date.toString());
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return date.toString();
    }
  }

  String _getPhotoUrl(dynamic photo) {
    String url = '';
    if (photo is String) {
      url = photo;
    } else if (photo is Map) {
      url = photo['url']?.toString() ?? '';
    }
    if (url.isEmpty) return '';
    if (url.startsWith('http')) return url;
    return '$_baseUrl$url';
  }

  Future<void> _loadDepartments() async {
    try {
      final depts = await _complaintService.getAgentDepartments();
      if (mounted) setState(() => _departments = depts);
    } catch (_) {}
  }

  Future<void> _loadTechnicians() async {
    try {
      final techs = await _complaintService.getDepartmentTechnicians();
      if (mounted) setState(() => _technicians = techs);
    } catch (_) {}
  }

  Future<void> _doAction(
    Future<void> Function() action,
    String successMsg,
  ) async {
    setState(() => _loadingAction = true);
    try {
      await action();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(successMsg),
            backgroundColor: AppColors.primary,
          ),
        );
        await _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loadingAction = false);
    }
  }

  void _showRejectDialog() {
    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reject Complaint'),
        content: TextField(
          controller: ctrl,
          decoration: const InputDecoration(
            labelText: 'Reason for rejection',
            hintText: 'Enter reason...',
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              Navigator.pop(ctx);
              if (ctrl.text.trim().isNotEmpty) {
                _doAction(
                  () => _complaintService.rejectComplaint(
                    widget.complaintId,
                    ctrl.text.trim(),
                  ),
                  'Complaint rejected',
                );
              }
            },
            child: const Text('Reject'),
          ),
        ],
      ),
    );
  }

  void _showAssignDeptDialog() {
    if (_departments.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('No departments available')));
      return;
    }
    String? selectedDeptId;
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => AlertDialog(
          title: const Text('Assign to Department'),
          content: DropdownButtonFormField<String>(
            decoration: const InputDecoration(labelText: 'Department'),
            items: _departments.map((d) {
              final id = d['_id']?.toString() ?? d['id']?.toString() ?? '';
              final name = d['name']?.toString() ?? id;
              return DropdownMenuItem(value: id, child: Text(name));
            }).toList(),
            onChanged: (v) => setS(() => selectedDeptId = v),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: selectedDeptId == null
                  ? null
                  : () {
                      Navigator.pop(ctx);
                      _doAction(
                        () => _complaintService.assignDepartment(
                          widget.complaintId,
                          selectedDeptId!,
                        ),
                        'Department assigned',
                      );
                    },
              child: const Text('Assign'),
            ),
          ],
        ),
      ),
    );
  }

  void _showAssignTechDialog() {
    if (_technicians.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('No technicians available')));
      return;
    }
    String? selectedTechId;
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => AlertDialog(
          title: const Text('Assign to Technician'),
          content: DropdownButtonFormField<String>(
            decoration: const InputDecoration(labelText: 'Technician'),
            items: _technicians.map((t) {
              final id = t['_id']?.toString() ?? t['id']?.toString() ?? '';
              final name =
                  t['fullName']?.toString() ?? t['name']?.toString() ?? id;
              return DropdownMenuItem(value: id, child: Text(name));
            }).toList(),
            onChanged: (v) => setS(() => selectedTechId = v),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: selectedTechId == null
                  ? null
                  : () {
                      Navigator.pop(ctx);
                      _doAction(
                        () => _complaintService.assignTechnician(
                          widget.complaintId,
                          selectedTechId!,
                        ),
                        'Technician assigned',
                      );
                    },
              child: const Text('Assign'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Complaint Details')),
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
                  const SizedBox(height: 16),
                  Text(
                    'Failed to load complaint',
                    style: TextStyle(color: Colors.red.shade700),
                  ),
                  const SizedBox(height: 8),
                  ElevatedButton(
                    onPressed: _loadData,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            )
          : _complaint == null
          ? const Center(child: Text('Complaint not found'))
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _buildHeader(),
                  const SizedBox(height: 16),
                  _buildDescription(),
                  const SizedBox(height: 16),
                  if (_hasMedia()) ...[
                    _buildMediaGallery(),
                    const SizedBox(height: 16),
                  ],
                  _buildLocation(),
                  const SizedBox(height: 16),
                  _buildStats(),
                  const SizedBox(height: 16),
                  if (_hasSLA()) ...[
                    _buildSLAInfo(),
                    const SizedBox(height: 16),
                  ],
                  if (_hasBeforeAfterPhotos()) ...[
                    _buildBeforeAfterPhotos(),
                    const SizedBox(height: 16),
                  ],
                  if (_hasResolution()) ...[
                    _buildResolutionReport(),
                    const SizedBox(height: 16),
                  ],
                  if (_hasTimeline()) ...[
                    _buildStatusTimeline(),
                    const SizedBox(height: 16),
                  ],
                  if (_hasDuplicateInfo()) ...[
                    _buildDuplicateBanner(),
                    const SizedBox(height: 16),
                  ],
                  if (_userRole == 'CITIZEN') _buildCitizenActions(),
                  if (_userRole == 'MUNICIPAL_AGENT') _buildAgentActions(),
                  if (_userRole == 'DEPARTMENT_MANAGER') _buildManagerActions(),
                  if (_userRole == 'TECHNICIAN') _buildTechnicianActions(),
                  const SizedBox(height: 24),
                ],
              ),
            ),
    );
  }

  Widget _buildHeader() {
    final category = _complaint!.category;
    final urgency = _complaint!.urgency ?? '';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    _complaint!.title,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: _getStatusColor(_status).withAlpha(25),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    _status.replaceAll('_', ' '),
                    style: TextStyle(
                      color: _getStatusColor(_status),
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _buildChip(category.replaceAll('_', ' '), AppColors.primary),
                if (urgency.isNotEmpty)
                  _buildChip(urgency, _getUrgencyColor(urgency)),
                _buildChip('P${_complaint!.priorityScore}', Colors.deepPurple),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Submitted: ${_formatDate(_complaint!.createdAt.toIso8601String())}',
              style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChip(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withAlpha(25),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w500,
          fontSize: 12,
        ),
      ),
    );
  }

  Widget _buildDescription() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.description, size: 18, color: AppColors.primary),
                SizedBox(width: 8),
                Text(
                  'Description',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(_complaint!.description, style: const TextStyle(height: 1.5)),
          ],
        ),
      ),
    );
  }

  bool _hasMedia() {
    return _complaint!.media.isNotEmpty;
  }

  Widget _buildMediaGallery() {
    final media = _complaint!.media;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.photo_library,
                  size: 18,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'Photos (${media.length})',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 120,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: media.length,
                itemBuilder: (ctx, i) {
                  final url = _getPhotoUrl(media[i]);
                  return Container(
                    margin: const EdgeInsets.only(right: 8),
                    width: 120,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      color: Colors.grey.shade200,
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: url.isNotEmpty
                        ? Image.network(
                            url,
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) =>
                                const Icon(Icons.broken_image, size: 40),
                          )
                        : const Icon(Icons.image, size: 40),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLocation() {
    final loc = _complaint!.location;
    final municipality =
        _complaint!.municipalityName ??
        loc?['municipality'] ??
        loc?['commune'] ??
        '';
    final governorate = _complaint!.governorate ?? loc?['governorate'] ?? '';
    final address = loc?['address'] ?? '';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.location_on, size: 18, color: AppColors.primary),
                SizedBox(width: 8),
                Text(
                  'Location',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (address.isNotEmpty) Text(address),
            if (municipality.isNotEmpty || governorate.isNotEmpty)
              Text(
                [
                  municipality,
                  governorate,
                ].where((s) => s.isNotEmpty).join(', '),
                style: TextStyle(color: Colors.grey.shade600),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStats() {
    final confirmCount = _complaint!.confirmationCount;
    final upvoteCount = _complaint!.upvoteCount;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildStatItem(
              Icons.check_circle_outline,
              '$confirmCount',
              'Confirmations',
              AppColors.primary,
            ),
            _buildStatItem(
              Icons.thumb_up_outlined,
              '$upvoteCount',
              'Upvotes',
              Colors.blue,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(
    IconData icon,
    String value,
    String label,
    Color color,
  ) {
    return Column(
      children: [
        Icon(icon, color: color, size: 28),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
        ),
      ],
    );
  }

  bool _hasSLA() {
    return _complaint!.slaDeadline != null || _complaint!.slaStatus != null;
  }

  Widget _buildSLAInfo() {
    final slaStatus = _complaint!.slaStatus ?? 'ON_TRACK';
    Color slaColor;
    IconData slaIcon;
    switch (slaStatus) {
      case 'ON_TRACK':
        slaColor = Colors.green;
        slaIcon = Icons.check_circle;
        break;
      case 'AT_RISK':
        slaColor = Colors.orange;
        slaIcon = Icons.warning;
        break;
      case 'OVERDUE':
        slaColor = Colors.red;
        slaIcon = Icons.error;
        break;
      default:
        slaColor = Colors.grey;
        slaIcon = Icons.schedule;
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(slaIcon, color: slaColor, size: 28),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'SLA Status',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  Text(
                    slaStatus.replaceAll('_', ' '),
                    style: TextStyle(
                      color: slaColor,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (_complaint!.slaDeadline != null)
                    Text(
                      'Deadline: ${_formatDate(_complaint!.slaDeadline!.toIso8601String())}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade600,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  bool _hasBeforeAfterPhotos() {
    return _complaint!.beforePhotos.isNotEmpty ||
        _complaint!.afterPhotos.isNotEmpty;
  }

  Widget _buildBeforeAfterPhotos() {
    final beforePhotos = _complaint!.beforePhotos;
    final afterPhotos = _complaint!.afterPhotos;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.compare, size: 18, color: AppColors.primary),
                SizedBox(width: 8),
                Text(
                  'Before & After',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            if (beforePhotos.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Text(
                'Before Work',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 100,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: beforePhotos.length,
                  itemBuilder: (_, i) {
                    final url = _getPhotoUrl(beforePhotos[i]);
                    return Container(
                      margin: const EdgeInsets.only(right: 8),
                      width: 100,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        color: Colors.grey.shade200,
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: url.isNotEmpty
                          ? Image.network(
                              url,
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) =>
                                  const Icon(Icons.broken_image),
                            )
                          : const Icon(Icons.image),
                    );
                  },
                ),
              ),
            ],
            if (afterPhotos.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Text(
                'After Work',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 100,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: afterPhotos.length,
                  itemBuilder: (_, i) {
                    final url = _getPhotoUrl(afterPhotos[i]);
                    return Container(
                      margin: const EdgeInsets.only(right: 8),
                      width: 100,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        color: Colors.grey.shade200,
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: url.isNotEmpty
                          ? Image.network(
                              url,
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) =>
                                  const Icon(Icons.broken_image),
                            )
                          : const Icon(Icons.image),
                    );
                  },
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  bool _hasResolution() {
    return _complaint!.resolutionNotes != null ||
        _complaint!.materialsUsed.isNotEmpty;
  }

  Widget _buildResolutionReport() {
    final notes = _complaint!.resolutionNotes ?? '';
    final materials = _complaint!.materialsUsed;
    final isClosed = _status == 'CLOSED';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.assignment_turned_in,
                  size: 18,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Resolution Report',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
                if (isClosed)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.green.shade50,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'Approved',
                      style: TextStyle(
                        color: Colors.green,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
            if (notes.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Text(
                'Notes',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 4),
              Text(notes, style: const TextStyle(height: 1.4)),
            ],
            if (materials.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Text(
                'Materials Used',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 4),
              Wrap(
                spacing: 8,
                children: materials
                    .map(
                      (m) => Chip(
                        label: Text(
                          m.toString(),
                          style: const TextStyle(fontSize: 12),
                        ),
                      ),
                    )
                    .toList(),
              ),
            ],
            if (_complaint!.resolvedAt != null) ...[
              const SizedBox(height: 8),
              Text(
                'Resolved: ${_formatDate(_complaint!.resolvedAt!.toIso8601String())}',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
              ),
            ],
          ],
        ),
      ),
    );
  }

  bool _hasTimeline() {
    return _complaint!.statusHistory.isNotEmpty;
  }

  bool _hasDuplicateInfo() {
    final ds = _complaint!.duplicateStatus;
    return ds == 'PROBABLE_DUPLICATE' || ds == 'POSSIBLE_DUPLICATE';
  }

  Widget _buildDuplicateBanner() {
    final isProbable = _complaint!.duplicateStatus == 'PROBABLE_DUPLICATE';
    final color = isProbable ? Colors.orange : Colors.yellow.shade700;
    final bgColor = isProbable ? Colors.orange.shade50 : Colors.yellow.shade50;
    final borderColor = isProbable
        ? Colors.orange.shade200
        : Colors.yellow.shade300;
    final topMatches =
        _complaint!.aiDuplicateCheck?['topMatches'] as List<dynamic>? ?? [];
    final recommendation =
        _complaint!.aiDuplicateCheck?['recommendation'] as String?;

    return Container(
      decoration: BoxDecoration(
        color: bgColor,
        border: Border.all(color: borderColor),
        borderRadius: BorderRadius.circular(12),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.copy_outlined, size: 16, color: color),
              const SizedBox(width: 8),
              Text(
                isProbable ? 'Probable Duplicate' : 'Possible Duplicate',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                  color: color,
                ),
              ),
            ],
          ),
          if (recommendation != null) ...[
            const SizedBox(height: 6),
            Text(
              recommendation,
              style: const TextStyle(fontSize: 12, color: Colors.black87),
            ),
          ],
          if (topMatches.isNotEmpty) ...[
            const SizedBox(height: 8),
            ...topMatches.take(2).map((m) {
              final match = m as Map<String, dynamic>;
              final refId = match['referenceId'] ?? match['_id'] ?? '';
              final similarity =
                  ((match['overallScore'] ?? match['similarity'] ?? 0.0) * 100)
                      .round();
              return Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  children: [
                    Icon(Icons.link, size: 12, color: color),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        '$refId — $similarity% match',
                        style: TextStyle(fontSize: 11, color: color),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ],
      ),
    );
  }

  Widget _buildStatusTimeline() {
    final history = _complaint!.statusHistory;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.timeline, size: 18, color: AppColors.primary),
                SizedBox(width: 8),
                Text(
                  'Status History',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...history.reversed.map((entry) {
              final entryStatus = entry.status;
              final updatedAt = _formatDate(entry.updatedAt.toIso8601String());
              final name = entry.updatedByName ?? '';
              final notes = entry.notes ?? '';
              final color = _getStatusColor(entryStatus);

              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Column(
                      children: [
                        Container(
                          width: 12,
                          height: 12,
                          decoration: BoxDecoration(
                            color: color,
                            shape: BoxShape.circle,
                          ),
                        ),
                        Container(
                          width: 2,
                          height: 30,
                          color: Colors.grey.shade300,
                        ),
                      ],
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            entryStatus.replaceAll('_', ' '),
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: color,
                            ),
                          ),
                          if (name.isNotEmpty)
                            Text(
                              'by $name',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey.shade600,
                              ),
                            ),
                          if (updatedAt.isNotEmpty)
                            Text(
                              updatedAt,
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.grey.shade500,
                              ),
                            ),
                          if (notes.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(
                                notes,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade700,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildCitizenActions() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: _confirmComplaint,
                icon: const Icon(Icons.check),
                label: const Text('Confirm'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _voteComplaint,
                icon: const Icon(Icons.thumb_up),
                label: const Text('Upvote'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmComplaint() async {
    try {
      await _complaintService.confirmComplaint(widget.complaintId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Thank you for confirming!')),
        );
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  Future<void> _voteComplaint() async {
    try {
      await _complaintService.upvoteComplaint(widget.complaintId);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Vote recorded!')));
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  // ─── Agent Actions ───────────────────────────────────────────────────────────
  Widget _buildAgentActions() {
    final disabled = _loadingAction;
    final canValidate = _status == 'SUBMITTED';
    final canAssign = _status == 'VALIDATED';
    final canClose = _status == 'RESOLVED';

    return Card(
      color: Colors.blue.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.admin_panel_settings,
                  size: 18,
                  color: Colors.blue,
                ),
                const SizedBox(width: 8),
                const Text(
                  'Agent Actions',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Colors.blue,
                  ),
                ),
                if (_loadingAction) ...[
                  const SizedBox(width: 8),
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (canValidate)
                  ElevatedButton.icon(
                    onPressed: disabled
                        ? null
                        : () => _doAction(
                            () => _complaintService.validateComplaint(
                              widget.complaintId,
                            ),
                            'Complaint validated',
                          ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                    ),
                    icon: const Icon(Icons.check_circle_outline, size: 16),
                    label: const Text('Validate'),
                  ),
                if (canValidate)
                  ElevatedButton.icon(
                    onPressed: disabled ? null : _showRejectDialog,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                    ),
                    icon: const Icon(Icons.cancel_outlined, size: 16),
                    label: const Text('Reject'),
                  ),
                if (canAssign)
                  ElevatedButton.icon(
                    onPressed: disabled ? null : _showAssignDeptDialog,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.orange,
                    ),
                    icon: const Icon(Icons.apartment, size: 16),
                    label: const Text('Assign Dept.'),
                  ),
                if (canClose)
                  ElevatedButton.icon(
                    onPressed: disabled
                        ? null
                        : () => _doAction(
                            () => _complaintService.closeComplaint(
                              widget.complaintId,
                            ),
                            'Complaint closed',
                          ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.grey,
                    ),
                    icon: const Icon(Icons.lock_outline, size: 16),
                    label: const Text('Close'),
                  ),
                if (_status == 'RESOLVED')
                  ElevatedButton.icon(
                    onPressed: disabled
                        ? null
                        : () => _doAction(
                            () => _complaintService.approveResolution(
                              widget.complaintId,
                            ),
                            'Resolution approved',
                          ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                    ),
                    icon: const Icon(Icons.verified, size: 16),
                    label: const Text('Approve Resolution'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ─── Manager Actions ─────────────────────────────────────────────────────────
  Widget _buildManagerActions() {
    final disabled = _loadingAction;
    final canAssignTech = _status == 'VALIDATED' || _status == 'ASSIGNED';

    return Card(
      color: Colors.purple.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.manage_accounts,
                  size: 18,
                  color: Colors.purple,
                ),
                const SizedBox(width: 8),
                const Text(
                  'Manager Actions',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Colors.purple,
                  ),
                ),
                if (_loadingAction) ...[
                  const SizedBox(width: 8),
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (canAssignTech)
                  ElevatedButton.icon(
                    onPressed: disabled ? null : _showAssignTechDialog,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.purple,
                    ),
                    icon: const Icon(Icons.engineering, size: 16),
                    label: const Text('Assign Technician'),
                  ),
                // Priority updater
                PopupMenuButton<String>(
                  onSelected: (urgency) => _doAction(
                    () => _complaintService.updatePriority(
                      widget.complaintId,
                      urgency,
                    ),
                    'Priority updated to $urgency',
                  ),
                  itemBuilder: (_) => ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
                      .map((u) => PopupMenuItem(value: u, child: Text(u)))
                      .toList(),
                  child: ElevatedButton.icon(
                    onPressed: null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.deepPurple,
                      disabledBackgroundColor: Colors.deepPurple,
                      disabledForegroundColor: Colors.white,
                    ),
                    icon: const Icon(Icons.flag_outlined, size: 16),
                    label: const Text('Set Priority'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ─── Technician Actions ──────────────────────────────────────────────────────
  Widget _buildTechnicianActions() {
    final disabled = _loadingAction;

    return Card(
      color: Colors.teal.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.engineering, size: 18, color: Colors.teal),
                const SizedBox(width: 8),
                const Text(
                  'Technician Actions',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Colors.teal,
                  ),
                ),
                if (_loadingAction) ...[
                  const SizedBox(width: 8),
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (_status == 'ASSIGNED')
                  ElevatedButton.icon(
                    onPressed: disabled
                        ? null
                        : () => _doAction(
                            () =>
                                _complaintService.startTask(widget.complaintId),
                            'Task started',
                          ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.teal,
                    ),
                    icon: const Icon(Icons.play_arrow, size: 16),
                    label: const Text('Start Work'),
                  ),
                if (_status == 'IN_PROGRESS')
                  ElevatedButton.icon(
                    onPressed: disabled ? null : _showCompleteTaskDialog,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                    ),
                    icon: const Icon(Icons.check_circle, size: 16),
                    label: const Text('Mark Complete'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showCompleteTaskDialog() {
    final notesCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Complete Task'),
        content: TextField(
          controller: notesCtrl,
          decoration: const InputDecoration(
            labelText: 'Resolution notes',
            hintText: 'Describe what was done...',
          ),
          maxLines: 4,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () {
              Navigator.pop(ctx);
              _doAction(
                () => _complaintService.completeTask(widget.complaintId, {
                  'resolutionNotes': notesCtrl.text.trim(),
                }),
                'Task marked as complete',
              );
            },
            child: const Text('Complete'),
          ),
        ],
      ),
    );
  }
}
