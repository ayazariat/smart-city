import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:smart_city_app/core/constants/app_theme.dart';
import 'package:smart_city_app/models/complaint_model.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/screens/home/complaint_detail_screen.dart';
import 'package:smart_city_app/widgets/status_badge.dart';
import 'package:smart_city_app/data/tunisia_geography.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final ComplaintService _complaintService = ComplaintService();
  List<Complaint> _complaints = [];
  bool _isLoading = true;
  String? _statusFilter;
  String? _categoryFilter;
  String? _governorateFilter;

  final List<String> _statusOptions = [
    'SUBMITTED',
    'VALIDATED',
    'ASSIGNED',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED',
  ];

  final List<String> _categoryOptions = [
    'ROAD',
    'LIGHTING',
    'WASTE',
    'WATER',
    'SAFETY',
    'PROPERTY',
    'PARKS',
    'OTHER',
  ];

  @override
  void initState() {
    super.initState();
    _loadComplaints();
  }

  Future<void> _loadComplaints() async {
    setState(() => _isLoading = true);
    try {
      final complaints = await _complaintService.getAllComplaints(limit: 500);
      setState(() => _complaints = complaints);
    } catch (e) {
      // Handle error
    }
    setState(() => _isLoading = false);
  }

  List<Complaint> get _filteredComplaints {
    return _complaints.where((c) {
      if (_statusFilter != null && c.status != _statusFilter) return false;
      if (_categoryFilter != null && c.category != _categoryFilter) return false;
      if (_governorateFilter != null && c.governorate != _governorateFilter) return false;
      return true;
    }).toList();
  }

  Color _getMarkerColor(String status) {
    switch (status) {
      case 'SUBMITTED':
        return AppTheme.statusPending;
      case 'VALIDATED':
        return AppTheme.statusValidated;
      case 'ASSIGNED':
        return AppTheme.statusAssigned;
      case 'IN_PROGRESS':
        return AppTheme.statusInProgress;
      case 'RESOLVED':
        return AppTheme.statusResolved;
      case 'CLOSED':
        return AppTheme.statusClosed;
      case 'REJECTED':
        return AppTheme.statusRejected;
      default:
        return AppTheme.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Carte des signalements'),
        backgroundColor: AppTheme.surface,
        foregroundColor: AppTheme.textPrimary,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadComplaints,
          ),
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterBottomSheet,
          ),
        ],
      ),
      body: Stack(
        children: [
          _buildMap(),
          _buildFilterChips(),
        ],
      ),
    );
  }

  Widget _buildMap() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppTheme.primary),
      );
    }

    final filtered = _filteredComplaints;
    final markers = filtered
        .where((c) => c.location != null && c.location!['lat'] != null && c.location!['lng'] != null)
        .map((c) {
      final color = _getMarkerColor(c.status);
      return Marker(
        width: 40,
        height: 40,
        point: LatLng(c.location!['lat']!.toDouble(), c.location!['lng']!.toDouble()),
        child: GestureDetector(
          onTap: () => _showComplaintDetails(c),
          child: Container(
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 2),
              boxShadow: [
                BoxShadow(
                  color: color.withOpacity(0.4),
                  blurRadius: 8,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: const Icon(
              Icons.location_on,
              color: Colors.white,
              size: 20,
            ),
          ),
        ),
      );
    }).toList();

    return FlutterMap(
      options: const MapOptions(
        initialCenter: LatLng(36.8065, 10.1815),
        initialZoom: 7,
        minZoom: 5,
        maxZoom: 18,
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        ),
        MarkerLayer(markers: markers),
        if (markers.isEmpty)
          const MarkerLayer(
            markers: [],
          ),
      ],
    );
  }

  Widget _buildFilterChips() {
    if (_statusFilter == null && _categoryFilter == null && _governorateFilter == null) {
      return const SizedBox.shrink();
    }

    return Positioned(
      top: 16,
      left: 16,
      right: 16,
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          if (_statusFilter != null)
            Chip(
              label: Text(_getStatusFilterLabel()),
              deleteIcon: const Icon(Icons.close, size: 18),
              onDeleted: () => setState(() => _statusFilter = null),
              backgroundColor: AppTheme.primary.withOpacity(0.1),
              labelStyle: const TextStyle(color: AppTheme.primary),
            ),
          if (_categoryFilter != null)
            Chip(
              label: Text(_getCategoryFilterLabel()),
              deleteIcon: const Icon(Icons.close, size: 18),
              onDeleted: () => setState(() => _categoryFilter = null),
              backgroundColor: AppTheme.info.withOpacity(0.1),
              labelStyle: const TextStyle(color: AppTheme.info),
            ),
          if (_governorateFilter != null)
            Chip(
              label: Text(_governorateFilter!),
              deleteIcon: const Icon(Icons.close, size: 18),
              onDeleted: () => setState(() => _governorateFilter = null),
              backgroundColor: AppTheme.warning.withOpacity(0.1),
              labelStyle: const TextStyle(color: AppTheme.warning),
            ),
        ],
      ),
    );
  }

  void _showFilterBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.4,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Filtres',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _statusFilter = null;
                        _categoryFilter = null;
                        _governorateFilter = null;
                      });
                      Navigator.pop(context);
                    },
                    child: const Text('Réinitialiser'),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              const Text(
                'Statut',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: _statusFilter,
                decoration: const InputDecoration(
                  hintText: 'Tous les statuts',
                  border: OutlineInputBorder(),
                ),
                items: [
                  const DropdownMenuItem(value: null, child: Text('Tous les statuts')),
                  ..._statusOptions.map(
                    (s) => DropdownMenuItem(
                      value: s,
                      child: Text(_getStatusLabel(s)),
                    ),
                  ),
                ],
                onChanged: (value) => setState(() => _statusFilter = value),
              ),
              const SizedBox(height: 20),
              const Text(
                'Catégorie',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: _categoryFilter,
                decoration: const InputDecoration(
                  hintText: 'Toutes les catégories',
                  border: OutlineInputBorder(),
                ),
                items: [
                  const DropdownMenuItem(value: null, child: Text('Toutes les catégories')),
                  ..._categoryOptions.map(
                    (c) => DropdownMenuItem(
                      value: c,
                      child: Text(_getCategoryLabel(c)),
                    ),
                  ),
                ],
                onChanged: (value) => setState(() => _categoryFilter = value),
              ),
              const SizedBox(height: 20),
              const Text(
                'Gouvernorat',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: _governorateFilter,
                decoration: const InputDecoration(
                  hintText: 'Tous les gouvernorats',
                  border: OutlineInputBorder(),
                ),
                items: [
                  const DropdownMenuItem(value: null, child: Text('Tous les gouvernorats')),
                  ...TunisiaGeography.governorates.map(
                    (g) => DropdownMenuItem(
                      value: g.name,
                      child: Text(g.name),
                    ),
                  ),
                ],
                onChanged: (value) => setState(() => _governorateFilter = value),
              ),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: const Text('Appliquer'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showComplaintDetails(Complaint complaint) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.4,
        minChildSize: 0.3,
        maxChildSize: 0.8,
        expand: false,
        builder: (context, scrollController) => Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      complaint.title,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  StatusBadge(status: complaint.status),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                complaint.description,
                style: const TextStyle(color: AppTheme.textSecondary),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(Icons.location_on, size: 16, color: AppTheme.textMuted),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      complaint.municipalityName ?? 'Non spécifié',
                      style: const TextStyle(color: AppTheme.textMuted),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ComplaintDetailScreen(complaintId: complaint.id),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Voir les détails'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _getStatusLabel(String status) {
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

  String _getCategoryLabel(String category) {
    switch (category) {
      case 'ROAD':
        return 'Routes & Trafic';
      case 'LIGHTING':
        return 'Éclairage Public';
      case 'WASTE':
        return 'Déchets & Propreté';
      case 'WATER':
        return 'Eau & Drainage';
      case 'SAFETY':
        return 'Sécurité & Bruit';
      case 'PROPERTY':
        return 'Biens Publics';
      case 'PARKS':
        return 'Parcs & Espaces Verts';
      case 'OTHER':
        return 'Autre';
      default:
        return category;
    }
  }

  String _getStatusFilterLabel() {
    return _statusFilter != null ? _getStatusLabel(_statusFilter!) : '';
  }

  String _getCategoryFilterLabel() {
    return _categoryFilter != null ? _getCategoryLabel(_categoryFilter!) : '';
  }
}
