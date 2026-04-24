import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/models/complaint_model.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/services/api_client.dart';
import 'package:smart_city_app/providers/auth_provider.dart';
import 'package:smart_city_app/core/constants/colors.dart';
import 'package:smart_city_app/screens/complaint_detail_screen.dart';

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
  int _currentPhotoIndex = 0;
  bool _isExpanded = false;

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

  Color _getUrgencyColor(String? urgency) {
    switch (urgency) {
      case 'CRITICAL':
        return const Color(0xFFEF4444);
      case 'HIGH':
        return const Color(0xFFF97316);
      case 'MEDIUM':
        return const Color(0xFFEAB308);
      case 'LOW':
        return const Color(0xFF22C55E);
      default:
        return Colors.grey;
    }
  }

  String _urgencyLabel(String? urgency) {
    switch (urgency) {
      case 'CRITICAL':
        return 'Urgente';
      case 'HIGH':
        return 'Haute';
      case 'MEDIUM':
        return 'Moyenne';
      case 'LOW':
        return 'Basse';
      default:
        return 'Non définie';
    }
  }

  String _categoryLabel(String? cat) {
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

  IconData _categoryIcon(String? cat) {
    switch (cat) {
      case 'WASTE':
        return Icons.delete_sweep;
      case 'ROAD':
        return Icons.add_road;
      case 'LIGHTING':
        return Icons.lightbulb;
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

  String _formatDate(dynamic date) {
    if (date == null) return '';
    try {
      final dt = DateTime.parse(date.toString());
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year} à ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
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
            content: Text('Erreur: $e'),
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
        title: const Text('Rejeter le signalement'),
        content: TextField(
          controller: ctrl,
          maxLines: 3,
          decoration: InputDecoration(
            labelText: 'Motif du rejet',
            hintText: 'Expliquez pourquoi vous rejetez ce signalement...',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () {
              Navigator.pop(ctx);
              if (ctrl.text.trim().isNotEmpty) {
                _doAction(
                  () => _complaintService.rejectComplaint(
                    widget.complaintId,
                    ctrl.text.trim(),
                  ),
                  'Signalement rejeté',
                );
              }
            },
            child: const Text('Rejeter'),
          ),
        ],
      ),
    );
  }

  void _showAssignDialog() {
    String? selectedDept;
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Confirmer la validation'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Voulez-vous valider ce signalement et l\'affecter à un département?',
              ),
              const SizedBox(height: 16),
              if (_departments.isNotEmpty) ...[
                const Text(
                  'Département:',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  decoration: InputDecoration(
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    isDense: true,
                  ),
                  hint: const Text('Sélectionner...'),
                  items: _departments
                      .map<DropdownMenuItem<String>>(
                        (d) => DropdownMenuItem(
                          value: d['_id'] ?? d['id']?.toString(),
                          child: Text(d['name'] ?? ''),
                        ),
                      )
                      .toList(),
                  onChanged: (v) => selectedDept = v,
                ),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Annuler'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
              ),
              onPressed: () {
                Navigator.pop(ctx);
                _doAction(
                  () => _complaintService.validateComplaint(widget.complaintId),
                  'Signalement validé',
                );
              },
              child: const Text('Valider'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : _error != null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
                  const SizedBox(height: 16),
                  Text(
                    'Erreur: $_error',
                    style: TextStyle(color: Colors.red[700]),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadData,
                    child: const Text('Réessayer'),
                  ),
                ],
              ),
            )
          : _buildContent(),
      bottomNavigationBar: _complaint != null ? _buildBottomActions() : null,
    );
  }

  Widget _buildContent() {
    final c = _complaint!;
    final photos = c.media.where((m) => m.type == 'photo').toList();
    final statusColor = _getStatusColor(c.status);

    return CustomScrollView(
      slivers: [
        SliverAppBar(
          expandedHeight: photos.isNotEmpty ? 300 : 0,
          pinned: true,
          backgroundColor: Colors.white,
          foregroundColor: AppColors.textPrimary,
          leading: IconButton(
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 8,
                  ),
                ],
              ),
              child: const Icon(
                Icons.arrow_back,
                color: AppColors.textPrimary,
                size: 20,
              ),
            ),
            onPressed: () => Navigator.pop(context),
          ),
          flexibleSpace: photos.isNotEmpty
              ? FlexibleSpaceBar(
                  background: Stack(
                    children: [
                      PageView.builder(
                        itemCount: photos.length,
                        onPageChanged: (i) =>
                            setState(() => _currentPhotoIndex = i),
                        itemBuilder: (ctx, i) {
                          final url = _getPhotoUrl(photos[i]);
                          return url.isNotEmpty
                              ? Image.network(
                                  url,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Container(
                                    color: AppColors.secondary,
                                    child: const Center(
                                      child: Icon(
                                        Icons.image,
                                        size: 64,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                )
                              : Container(
                                  color: AppColors.secondary,
                                  child: const Center(
                                    child: Icon(
                                      Icons.image,
                                      size: 64,
                                      color: Colors.white,
                                    ),
                                  ),
                                );
                        },
                      ),
                      Positioned(
                        bottom: 16,
                        left: 0,
                        right: 0,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: List.generate(
                            photos.length,
                            (i) => Container(
                              width: 8,
                              height: 8,
                              margin: const EdgeInsets.symmetric(horizontal: 4),
                              decoration: BoxDecoration(
                                color: i == _currentPhotoIndex
                                    ? Colors.white
                                    : Colors.white.withValues(alpha: 0.5),
                                shape: BoxShape.circle,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                )
              : null,
        ),
        SliverToBoxAdapter(
          child: Column(
            children: [
              Container(
                color: Colors.white,
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: statusColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            _statusLabel(c.status),
                            style: TextStyle(
                              color: statusColor,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: _getUrgencyColor(
                              c.urgency,
                            ).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            _urgencyLabel(c.urgency),
                            style: TextStyle(
                              color: _getUrgencyColor(c.urgency),
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      c.title,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _buildInfoRow(
                      Icons.calendar_today,
                      'Soumis le',
                      _formatDate(c.createdAt),
                    ),
                    if (c.municipalityName != null)
                      _buildInfoRow(
                        Icons.location_city,
                        'Commune',
                        c.municipalityName!,
                      ),
                    if (c.governorate != null)
                      _buildInfoRow(Icons.map, 'Gouvernorat', c.governorate!),
                    _buildInfoRow(
                      Icons.category,
                      'Catégorie',
                      _categoryLabel(c.category),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              _buildSection(
                'Description',
                Container(
                  padding: const EdgeInsets.all(16),
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
                  child: Text(
                    c.description,
                    style: const TextStyle(
                      fontSize: 15,
                      height: 1.5,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ),
              if (c.rejectionReason != null) ...[
                const SizedBox(height: 12),
                _buildSection(
                  'Motif du rejet',
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEE2E2),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFFCA5A5)),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.info_outline, color: Colors.red[600]),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            c.rejectionReason!,
                            style: TextStyle(color: Colors.red[700]),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              if (c.resolutionNotes != null) ...[
                const SizedBox(height: 12),
                _buildSection(
                  'Notes de résolution',
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDCFCE7),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFBBF7D0)),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.check_circle, color: Colors.green[600]),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            c.resolutionNotes!,
                            style: TextStyle(color: Colors.green[700]),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 12),
              _buildSection(
                'Historique du statut',
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
                  child: Column(
                    children: c.statusHistory.asMap().entries.map((entry) {
                      final i = entry.key;
                      final h = entry.value;
                      return Column(
                        children: [
                          ListTile(
                            leading: Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: _getStatusColor(
                                  h.status,
                                ).withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Icon(
                                _getStatusIcon(h.status),
                                color: _getStatusColor(h.status),
                                size: 20,
                              ),
                            ),
                            title: Text(
                              _statusLabel(h.status),
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _formatDate(h.updatedAt),
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey[500],
                                  ),
                                ),
                                if (h.notes != null)
                                  Text(
                                    h.notes!,
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey[600],
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          if (i < c.statusHistory.length - 1)
                            const Divider(height: 1),
                        ],
                      );
                    }).toList(),
                  ),
                ),
              ),
              const SizedBox(height: 100),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSection(String title, Widget child) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 18, color: Colors.grey[500]),
          const SizedBox(width: 8),
          Text(
            '$label: ',
            style: TextStyle(color: Colors.grey[600], fontSize: 14),
          ),
          Text(
            value,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'SUBMITTED':
        return Icons.send;
      case 'VALIDATED':
        return Icons.check_circle;
      case 'ASSIGNED':
        return Icons.assignment_ind;
      case 'IN_PROGRESS':
        return Icons.engineering;
      case 'RESOLVED':
        return Icons.task_alt;
      case 'CLOSED':
        return Icons.archive;
      case 'REJECTED':
        return Icons.cancel;
      default:
        return Icons.circle;
    }
  }

  Widget _buildBottomActions() {
    final c = _complaint!;
    if (_userRole == 'CITIZEN') return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            if (c.canValidate) ...[
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _loadingAction ? null : _showRejectDialog,
                  icon: const Icon(Icons.close),
                  label: const Text('Rejeter'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.error,
                    side: const BorderSide(color: AppColors.error),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _loadingAction ? null : _showAssignDialog,
                  icon: const Icon(Icons.check),
                  label: const Text('Valider'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
