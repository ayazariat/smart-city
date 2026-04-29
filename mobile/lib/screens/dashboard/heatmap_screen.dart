import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:smart_city_app/services/heatmap_service.dart';
import 'package:smart_city_app/core/constants/colors.dart';
import 'package:smart_city_app/data/tunisia_geography.dart';

class HeatmapScreen extends StatefulWidget {
  const HeatmapScreen({super.key});

  @override
  State<HeatmapScreen> createState() => _HeatmapScreenState();
}

class _HeatmapScreenState extends State<HeatmapScreen> {
  final HeatmapService _heatmapService = HeatmapService();
  List<Map<String, dynamic>> _points = [];
  bool _loading = true;
  String? _categoryFilter;
  String? _governorateFilter;
  List<String> _categories = [];

  @override
  void initState() {
    super.initState();
    _loadCategories();
    _load();
  }

  Future<void> _loadCategories() async {
    try {
      final cats = await _heatmapService.getCategories();
      setState(() => _categories = cats);
    } catch (_) {}
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final points = await _heatmapService.getHeatmapData(
        category: _categoryFilter,
        municipality: _governorateFilter,
      );
      setState(() => _points = points);
    } catch (_) {}
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: AppColors.textPrimary,
        title: const Text(
          'Carte thermique',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      body: Column(
        children: [
          _buildFilters(),
          Expanded(child: _buildMap()),
        ],
      ),
    );
  }

  Widget _buildFilters() {
    return Container(
      padding: const EdgeInsets.all(12),
      color: Colors.white,
      child: Row(
        children: [
          Expanded(
            child: DropdownButtonFormField<String>(
              decoration: InputDecoration(
                labelText: 'Catégorie',
                filled: true,
                fillColor: Colors.grey[50],
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              value: _categoryFilter,
              items: [
                const DropdownMenuItem(value: null, child: Text('Toutes')),
                ..._categories.map(
                  (c) => DropdownMenuItem(value: c, child: Text(c)),
                ),
              ],
              onChanged: (v) {
                setState(() => _categoryFilter = v);
                _load();
              },
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: DropdownButtonFormField<String>(
              decoration: InputDecoration(
                labelText: 'Gouvernorat',
                filled: true,
                fillColor: Colors.grey[50],
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              value: _governorateFilter,
              items: [
                const DropdownMenuItem(value: null, child: Text('Tous')),
                ...TunisiaGeography.governorates.map(
                  (g) => DropdownMenuItem(value: g.name, child: Text(g.name)),
                ),
              ],
              onChanged: (v) {
                setState(() => _governorateFilter = v);
                _load();
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMap() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    final markers = _points
        .where((p) => p['lat'] != null && p['lng'] != null)
        .map((p) {
          final count = (p['count'] ?? 1) as int;
          final color = count > 10
              ? Colors.red
              : count > 5
              ? Colors.orange
              : Colors.green;
          return Marker(
            width: 30,
            height: 30,
            point: LatLng(p['lat']!.toDouble(), p['lng']!.toDouble()),
            child: Container(
              decoration: BoxDecoration(
                color: color.withOpacity(0.6),
                shape: BoxShape.circle,
                border: Border.all(color: color, width: 2),
              ),
              child: Center(
                child: Text(
                  '$count',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          );
        })
        .toList();

    return FlutterMap(
      options: const MapOptions(
        initialCenter: LatLng(36.8065, 10.1815),
        initialZoom: 7,
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        ),
        MarkerLayer(markers: markers),
      ],
    );
  }
}
