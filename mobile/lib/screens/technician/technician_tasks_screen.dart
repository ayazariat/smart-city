import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;
import 'package:smart_city_app/core/constants/app_theme.dart';
import 'package:smart_city_app/providers/complaints_provider.dart';
import 'package:smart_city_app/models/complaint_model.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/services/api_client.dart';
import 'package:smart_city_app/screens/technician/technician_task_detail_screen.dart';

class TechnicianTasksScreen extends ConsumerStatefulWidget {
  const TechnicianTasksScreen({super.key});

  @override
  ConsumerState<TechnicianTasksScreen> createState() =>
      _TechnicianTasksScreenState();
}

class _TechnicianTasksScreenState extends ConsumerState<TechnicianTasksScreen> {
  String _statusFilter = 'ALL';
  String _searchTerm = '';
  final TextEditingController _searchController = TextEditingController();
  bool _actionLoading = false;
  final ComplaintService _complaintService = ComplaintService();
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(technicianTasksProvider.notifier).loadWithStats();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadTasks() async {
    String statusParam = _statusFilter == 'ALL'
        ? 'ASSIGNED,IN_PROGRESS,RESOLVED'
        : _statusFilter;
    await ref
        .read(technicianTasksProvider.notifier)
        .loadWithStats(status: statusParam);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(technicianTasksProvider);
    final stats = state.stats;
    final tasks = state.complaints.where((task) {
      final statusMatch =
          _statusFilter == 'ALL' ? true : task.status == _statusFilter;
      final q = _searchTerm.trim().toLowerCase();
      final searchMatch =
          q.isEmpty ||
          task.title.toLowerCase().contains(q) ||
          task.description.toLowerCase().contains(q) ||
          task.category.toLowerCase().contains(q);
      return statusMatch && searchMatch;
    }).toList();

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: RefreshIndicator(
        onRefresh: _loadTasks,
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              expandedHeight: 180,
              floating: false,
              pinned: true,
              backgroundColor: AppTheme.surface,
              foregroundColor: AppTheme.textPrimary,
              flexibleSpace: FlexibleSpaceBar(
                background: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [AppTheme.primary, AppTheme.primaryDark],
                    ),
                  ),
                  child: SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: const Icon(
                                  Icons.task_alt,
                                  color: Colors.white,
                                  size: 28,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Mes Tâches',
                                      style: TextStyle(
                                        fontSize: 22,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                      ),
                                    ),
                                    Text(
                                      '${stats?.total ?? 0} tâches assignées',
                                      style: const TextStyle(
                                        color: Colors.white70,
                                        fontSize: 14,
                                      ),
                                    ),
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
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.refresh, color: Colors.white),
                  onPressed: _loadTasks,
                ),
              ],
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1.4,
                      children: [
                        _buildStatCard('Total', '${stats?.total ?? 0}', Icons.summarize, AppTheme.primary),
                        _buildStatCard('Assignées', '${stats?.assigned ?? 0}', Icons.assignment, const Color(0xFF8B5CF6)),
                        _buildStatCard('En cours', '${stats?.inProgress ?? 0}', Icons.engineering, const Color(0xFFF97316)),
                        _buildStatCard('Résolues', '${stats?.resolved ?? 0}', Icons.check_circle, const Color(0xFF22C55E)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _buildFilterChip('ALL', 'Tous'),
                          const SizedBox(width: 8),
                          _buildFilterChip('ASSIGNED', 'Assigné'),
                          const SizedBox(width: 8),
                          _buildFilterChip('IN_PROGRESS', 'En cours'),
                          const SizedBox(width: 8),
                          _buildFilterChip('RESOLVED', 'Résolu'),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      decoration: BoxDecoration(
                        color: AppTheme.surface,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 8,
                          ),
                        ],
                      ),
                      child: TextField(
                        controller: _searchController,
                        decoration: InputDecoration(
                          hintText: 'Rechercher une tâche...',
                          prefixIcon: const Icon(
                            Icons.search,
                            color: Colors.grey,
                          ),
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 14,
                          ),
                        ),
                        onChanged: (v) => setState(() => _searchTerm = v),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (state.isLoading)
              const SliverFillRemaining(
                child: Center(
                  child: CircularProgressIndicator(color: AppTheme.primary),
                ),
              )
            else if (tasks.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppTheme.background,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.task_alt,
                          size: 48,
                          color: Colors.grey[400],
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Aucune tâche trouvée',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey[700],
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) => _buildTaskCard(tasks[index]),
                    childCount: tasks.length,
                  ),
                ),
              ),
            const SliverToBoxAdapter(child: SizedBox(height: 32)),
          ],
        ),
      ),
    );
  }

  // ─── Helper methods ───────────────────────────────────────────────────────

  Color _statusColor(String status) {
    switch (status) {
      case 'ASSIGNED': return const Color(0xFF8B5CF6);
      case 'IN_PROGRESS': return const Color(0xFFF97316);
      case 'RESOLVED': return const Color(0xFF22C55E);
      case 'CLOSED': return const Color(0xFF64748B);
      default: return AppTheme.textMuted;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'ASSIGNED': return 'Assigné';
      case 'IN_PROGRESS': return 'En cours';
      case 'RESOLVED': return 'Résolu';
      case 'CLOSED': return 'Clôturé';
      default: return status;
    }
  }

  Color _urgencyColor(String urgency) {
    switch (urgency.toUpperCase()) {
      case 'LOW': return const Color(0xFF22C55E);
      case 'MEDIUM': return const Color(0xFFF59E0B);
      case 'HIGH': return const Color(0xFFF97316);
      case 'URGENT': return const Color(0xFFEF4444);
      default: return AppTheme.textMuted;
    }
  }

  String _categoryLabel(String cat) {
    switch (cat.toUpperCase()) {
      case 'ROAD': return 'Routes';
      case 'LIGHTING': return 'Éclairage';
      case 'WASTE': return 'Déchets';
      case 'WATER': return 'Eau';
      case 'SAFETY': return 'Sécurité';
      case 'PUBLIC_PROPERTY': return 'Domaine public';
      case 'GREEN_SPACE': return 'Espaces verts';
      default: return cat;
    }
  }

  String _priorityLabel(int score) {
    if (score >= 20) return 'CRITIQUE';
    if (score >= 15) return 'HAUTE';
    if (score >= 10) return 'MOYENNE';
    return 'BASSE';
  }

  Color _priorityColor(int score) {
    if (score >= 20) return const Color(0xFFEF4444);
    if (score >= 15) return const Color(0xFFF97316);
    if (score >= 10) return const Color(0xFFF59E0B);
    return const Color(0xFF22C55E);
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  void _confirmStartWork(Complaint task) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Démarrer le travail'),
        content: Text('Voulez-vous démarrer le travail sur "${task.title}" ? Le statut passera à En cours.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              _startWork(task.id);
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
            child: const Text('Démarrer'),
          ),
        ],
      ),
    );
  }

  Future<void> _startWork(String taskId) async {
    setState(() => _actionLoading = true);
    try {
      await ref.read(technicianTasksProvider.notifier).startTask(taskId);
      await _loadTasks();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Travail démarré avec succès !'), backgroundColor: Color(0xFF22C55E)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  void _showResolveModal(Complaint task) {
    final notesController = TextEditingController();
    List<XFile> selectedPhotos = [];
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            left: 20, right: 20, top: 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text('Marquer comme résolu', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    const Spacer(),
                    IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close)),
                  ],
                ),
                const SizedBox(height: 8),
                // Task info
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
                  child: Text(task.title, style: const TextStyle(fontWeight: FontWeight.w500), maxLines: 2, overflow: TextOverflow.ellipsis),
                ),
                const SizedBox(height: 16),
                // Resolution notes
                const Text('Rapport de résolution *', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                TextField(
                  controller: notesController,
                  maxLines: 5,
                  onChanged: (_) => setModalState(() {}),
                  decoration: InputDecoration(
                    hintText: 'Décrivez le travail effectué pour résoudre ce problème...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primary)),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${notesController.text.length}/20 caractères minimum',
                  style: TextStyle(fontSize: 12, color: notesController.text.length >= 20 ? const Color(0xFF22C55E) : AppTheme.textSecondary),
                ),
                const SizedBox(height: 16),
                // Proof photos
                const Text('Photos de preuve *', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                GestureDetector(
                  onTap: () async {
                    try {
                      final images = await _picker.pickMultiImage(imageQuality: 80, maxWidth: 1200);
                      if (images.isNotEmpty) {
                        setModalState(() {
                          selectedPhotos.addAll(images); // Keep as XFile — works on web + mobile
                        });
                      }
                    } catch (e) {
                      if (ctx.mounted) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          SnackBar(content: Text('Erreur sélection photo: $e')),
                        );
                      }
                    }
                  },
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: selectedPhotos.isNotEmpty ? const Color(0xFFF0FDF4) : Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: selectedPhotos.isNotEmpty ? const Color(0xFF22C55E) : Colors.grey.shade300,
                      ),
                    ),
                    child: Column(
                      children: [
                        Icon(Icons.camera_alt, size: 32, color: selectedPhotos.isNotEmpty ? const Color(0xFF22C55E) : Colors.grey),
                        const SizedBox(height: 8),
                        Text(
                          selectedPhotos.isNotEmpty
                              ? '${selectedPhotos.length} photo(s) sélectionnée(s) — Appuyez pour en ajouter'
                              : 'Appuyez pour ajouter des photos',
                          style: TextStyle(color: selectedPhotos.isNotEmpty ? const Color(0xFF22C55E) : Colors.grey),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
                if (selectedPhotos.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 80,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: selectedPhotos.length,
                      itemBuilder: (_, i) => Stack(
                        children: [
                          Container(
                            width: 80, height: 80,
                            margin: const EdgeInsets.only(right: 8),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(8),
                              color: Colors.grey[200],
                            ),
                            clipBehavior: Clip.antiAlias,
                            child: FutureBuilder<Uint8List>(
                              future: selectedPhotos[i].readAsBytes(),
                              builder: (_, snap) {
                                if (snap.hasData) {
                                  return Image.memory(snap.data!, fit: BoxFit.cover);
                                }
                                return const Center(child: CircularProgressIndicator(strokeWidth: 2));
                              },
                            ),
                          ),
                          Positioned(
                            top: 0, right: 8,
                            child: GestureDetector(
                              onTap: () => setModalState(() => selectedPhotos.removeAt(i)),
                              child: Container(
                                width: 20, height: 20,
                                decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                                child: const Icon(Icons.close, size: 14, color: Colors.white),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 24),
                // Submit button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: (isSubmitting || notesController.text.trim().length < 20 || selectedPhotos.isEmpty)
                        ? null
                        : () async {
                            setModalState(() => isSubmitting = true);
                            try {
                              // Upload photos using http.MultipartRequest — works on web + mobile
                              List<String> photoUrls = [];
                              if (selectedPhotos.isNotEmpty) {
                                try {
                                  final uploadUrl = '${ApiClient.baseUrl}/upload';
                                  debugPrint('[Upload] Uploading to: $uploadUrl');
                                  debugPrint('[Upload] Photos count: ${selectedPhotos.length}');
                                  
                                  final request = http.MultipartRequest(
                                    'POST',
                                    Uri.parse(uploadUrl),
                                  );
                                  final token = ApiClient().token;
                                  if (token != null) {
                                    request.headers['Authorization'] = 'Bearer $token';
                                    debugPrint('[Upload] Token present');
                                  } else {
                                    debugPrint('[Upload] WARNING: No token!');
                                  }
                                  for (final xfile in selectedPhotos) {
                                    final bytes = await xfile.readAsBytes();
                                    debugPrint('[Upload] Adding file: ${xfile.name}, size: ${bytes.length}');
                                    // Determine content type from file extension
                                    final extension = xfile.name.split('.').last.toLowerCase();
                                    final contentType = {
                                      'jpg': 'image/jpeg',
                                      'jpeg': 'image/jpeg',
                                      'jfif': 'image/jpeg',
                                      'png': 'image/png',
                                      'gif': 'image/gif',
                                      'webp': 'image/webp',
                                      'mp4': 'video/mp4',
                                      'mov': 'video/quicktime',
                                      'webm': 'video/webm',
                                    }[extension] ?? 'image/jpeg';
                                    request.files.add(http.MultipartFile.fromBytes(
                                      'media',
                                      bytes,
                                      filename: xfile.name,
                                      contentType: http.MediaType.parse(contentType),
                                    ));
                                  }
                                  debugPrint('[Upload] Sending request...');
                                  final streamedResponse = await request.send()
                                      .timeout(const Duration(seconds: 30));
                                  final responseBody = await streamedResponse.stream.bytesToString();
                                  debugPrint('[Upload] Response status: ${streamedResponse.statusCode}');
                                  debugPrint('[Upload] Response body: $responseBody');
                                  if (streamedResponse.statusCode == 200 || streamedResponse.statusCode == 201) {
                                    final decoded = jsonDecode(responseBody) as Map<String, dynamic>?;
                                    final dataList = decoded?['data'] as List?;
                                    if (dataList != null) {
                                      for (final item in dataList) {
                                        if (item is Map && item['url'] != null) {
                                          photoUrls.add(item['url'].toString());
                                        }
                                      }
                                    }
                                  } else {
                                    throw Exception('Upload failed: ${streamedResponse.statusCode} - $responseBody');
                                  }
                                } catch (uploadErr) {
                                  setModalState(() => isSubmitting = false);
                                  if (ctx.mounted) {
                                    ScaffoldMessenger.of(ctx).showSnackBar(
                                      SnackBar(
                                        content: Text('Échec du téléchargement des photos: $uploadErr'),
                                        backgroundColor: Colors.red,
                                      ),
                                    );
                                  }
                                  return;
                                }
                              }
                              await _complaintService.completeTask(task.id, {
                                'resolutionNotes': notesController.text.trim(),
                                if (photoUrls.isNotEmpty)
                                  'proofPhotos': photoUrls.map((u) => {'url': u, 'type': 'photo'}).toList(),
                              });
                              if (ctx.mounted) Navigator.pop(ctx);
                              await _loadTasks();
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Tâche résolue avec succès !'),
                                    backgroundColor: Color(0xFF22C55E),
                                  ),
                                );
                              }
                            } catch (e) {
                              setModalState(() => isSubmitting = false);
                              if (ctx.mounted) {
                                ScaffoldMessenger.of(ctx).showSnackBar(
                                  SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red),
                                );
                              }
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF22C55E),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: isSubmitting
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Text(
                            notesController.text.trim().length >= 20 && selectedPhotos.isNotEmpty
                                ? 'Soumettre la résolution'
                                : selectedPhotos.isEmpty
                                    ? 'Photo de preuve requise'
                                    : '${20 - notesController.text.trim().length} caractères manquants',
                          ),
                  ),
                ),
                const SizedBox(height: 8),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatCard(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(label, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String value, String label) {
    final isSelected = _statusFilter == value;
    return GestureDetector(
      onTap: () {
        setState(() => _statusFilter = value);
        _loadTasks();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary : AppTheme.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppTheme.primary : AppTheme.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.grey[700],
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ),
    );
  }

  Widget _buildTaskCard(Complaint task) {
    final statusColor = _statusColor(task.status);
    final statusLabel = _statusLabel(task.status);
    final urgencyColor = _urgencyColor(task.urgency ?? 'LOW');
    final urgencyLabel = task.urgency ?? 'LOW';
    final priorityLabel = _priorityLabel(task.priorityScore.toInt());
    final priorityColor = _priorityColor(task.priorityScore.toInt());

    // SLA countdown
    String? slaText;
    Color slaColor = AppTheme.success;
    if (task.slaDeadline != null && !['RESOLVED', 'CLOSED'].contains(task.status)) {
      final diff = task.slaDeadline!.difference(DateTime.now());
      if (diff.isNegative) {
        final abs = diff.abs();
        slaText = abs.inDays > 0 ? '${abs.inDays}j ${abs.inHours % 24}h en retard' : '${abs.inHours}h en retard';
        slaColor = Colors.red;
      } else if (diff.inHours < 48) {
        slaText = diff.inDays > 0 ? '${diff.inDays}j ${diff.inHours % 24}h restant' : '${diff.inHours}h restant';
        slaColor = const Color(0xFFF97316);
      }
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        border: Border.all(color: statusColor.withOpacity(0.3)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => TechnicianTaskDetailScreen(taskId: task.id)),
          ).then((_) => _loadTasks()),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Badges row
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    // Reference ID
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '#${task.id.length > 6 ? task.id.substring(task.id.length - 6).toUpperCase() : task.id.toUpperCase()}',
                        style: const TextStyle(fontSize: 10, fontFamily: 'monospace', color: AppTheme.textSecondary),
                      ),
                    ),
                    // Status badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(width: 6, height: 6, decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle)),
                          const SizedBox(width: 4),
                          Text(statusLabel, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: statusColor)),
                        ],
                      ),
                    ),
                    // Category badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(_categoryLabel(task.category), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.primary)),
                    ),
                    // Urgency badge
                    if (task.urgency != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: urgencyColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(urgencyLabel, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: urgencyColor)),
                      ),
                    // Priority badge
                    if (task.priorityScore >= 15)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: priorityColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.warning_amber, size: 12, color: priorityColor),
                            const SizedBox(width: 3),
                            Text(priorityLabel, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: priorityColor)),
                          ],
                        ),
                      ),
                    // SLA badge
                    if (slaText != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: slaColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.access_time, size: 12, color: slaColor),
                            const SizedBox(width: 3),
                            Text(slaText, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: slaColor)),
                          ],
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                // Title
                Text(
                  task.title,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  task.description,
                  style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 12),
                // Meta row
                Wrap(
                  spacing: 12,
                  runSpacing: 4,
                  children: [
                    if (task.municipalityName != null)
                      Row(mainAxisSize: MainAxisSize.min, children: [
                        const Icon(Icons.location_city, size: 13, color: AppTheme.textMuted),
                        const SizedBox(width: 3),
                        Text(task.municipalityName!, style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                      ]),
                    Row(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.calendar_today, size: 13, color: AppTheme.textMuted),
                      const SizedBox(width: 3),
                      Text('${task.createdAt.day}/${task.createdAt.month}/${task.createdAt.year}', style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                    ]),
                  ],
                ),
                const SizedBox(height: 12),
                // Action buttons
                Row(
                  children: [
                    if (task.status == 'ASSIGNED') ...[
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _actionLoading ? null : () => _confirmStartWork(task),
                          icon: const Icon(Icons.play_arrow, size: 16),
                          label: const Text('Démarrer'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                    ],
                    if (task.status == 'IN_PROGRESS') ...[
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _actionLoading ? null : () => _showResolveModal(task),
                          icon: const Icon(Icons.check_circle, size: 16),
                          label: const Text('Marquer résolu'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF22C55E),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                    ],
                    OutlinedButton.icon(
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => TechnicianTaskDetailScreen(taskId: task.id)),
                      ).then((_) => _loadTasks()),
                      icon: const Icon(Icons.visibility, size: 16),
                      label: const Text('Détails'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
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
}
