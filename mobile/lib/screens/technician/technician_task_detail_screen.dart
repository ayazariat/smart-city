import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:smart_city_app/models/complaint_model.dart';
import 'package:smart_city_app/providers/complaints_provider.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/services/api_client.dart';
import 'package:smart_city_app/core/constants/colors.dart';

class TechnicianTaskDetailScreen extends ConsumerStatefulWidget {
  final String taskId;

  const TechnicianTaskDetailScreen({super.key, required this.taskId});

  @override
  ConsumerState<TechnicianTaskDetailScreen> createState() =>
      _TechnicianTaskDetailScreenState();
}

class _TechnicianTaskDetailScreenState
    extends ConsumerState<TechnicianTaskDetailScreen> {
  final ComplaintService _complaintService = ComplaintService();
  final ApiClient _apiClient = ApiClient();
  final ImagePicker _picker = ImagePicker();
  Complaint? _task;
  bool _isLoading = true;
  String? _error;
  bool _actionLoading = false;

  @override
  void initState() {
    super.initState();
    _loadTask();
  }

  Future<void> _loadTask() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final task = await _complaintService.getTaskById(widget.taskId);
      if (!mounted) return;
      setState(() {
        _task = task;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _startTask() async {
    setState(() => _actionLoading = true);
    try {
      await ref.read(technicianTasksProvider.notifier).startTask(widget.taskId);
      await _loadTask();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Travail commencé avec succès!'),
            backgroundColor: AppColors.primary,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Échec du démarrage: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  void _showResolveModal() {
    if (_task == null) return;

    final notesController = TextEditingController();
    List<File> selectedPhotos = [];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            left: 20,
            right: 20,
            top: 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text(
                      'Marquer comme résolu',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      onPressed: () => Navigator.pop(ctx),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Text(
                    _task!.title,
                    style: const TextStyle(fontWeight: FontWeight.w500),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Rapport de résolution *',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: notesController,
                  maxLines: 4,
                  decoration: InputDecoration(
                    hintText:
                        'Décrivez le travail effectué pour résoudre ce problème...',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade300),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade300),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.primary),
                    ),
                  ),
                ),
                Text(
                  '${notesController.text.length}/20 caractères minimum',
                  style: TextStyle(
                    fontSize: 12,
                    color: notesController.text.length >= 20
                        ? AppColors.success
                        : AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Photos de preuve *',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                GestureDetector(
                  onTap: () async {
                    final picker = await _pickImages();
                    if (picker != null) {
                      setModalState(() {
                        selectedPhotos.addAll(picker);
                      });
                    }
                  },
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: selectedPhotos.isNotEmpty
                            ? const Color(0xFF86EFAC)
                            : Colors.grey.shade300,
                      ),
                      borderRadius: BorderRadius.circular(12),
                      color: selectedPhotos.isNotEmpty
                          ? const Color(0xFFF0FDF4)
                          : Colors.transparent,
                    ),
                    child: Column(
                      children: [
                        Icon(
                          Icons.camera_alt,
                          size: 32,
                          color: Colors.grey.shade400,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          selectedPhotos.isNotEmpty
                              ? '${selectedPhotos.length} photo(s) sélectionnée(s)'
                              : 'Appuyez pour télécharger des photos',
                          style: TextStyle(color: AppColors.textSecondary),
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
                      itemBuilder: (ctx, i) => Stack(
                        children: [
                          Container(
                            width: 80,
                            height: 80,
                            margin: const EdgeInsets.only(right: 8),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(8),
                              image: DecorationImage(
                                image: FileImage(selectedPhotos[i]),
                                fit: BoxFit.cover,
                              ),
                            ),
                          ),
                          Positioned(
                            top: 0,
                            right: 0,
                            child: GestureDetector(
                              onTap: () {
                                setModalState(() {
                                  selectedPhotos.removeAt(i);
                                });
                              },
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: const BoxDecoration(
                                  color: Colors.red,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.close,
                                  color: Colors.white,
                                  size: 14,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed:
                        notesController.text.length >= 20 &&
                            selectedPhotos.isNotEmpty
                        ? () async {
                            Navigator.pop(ctx);
                            await _resolveTask(
                              notesController.text,
                              selectedPhotos,
                            );
                          }
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF22C55E),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      notesController.text.length >= 20 &&
                              selectedPhotos.isNotEmpty
                          ? 'Soumettre la résolution'
                          : selectedPhotos.isEmpty
                          ? 'Ajouter une photo requise'
                          : '${20 - notesController.text.length} caractères requis',
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<List<File>?> _pickImages() async {
    final files = await _picker.pickMultiImage(imageQuality: 80, maxWidth: 1200);
    if (files.isEmpty) return [];
    return files.map((file) => File(file.path)).toList();
  }

  Future<void> _resolveTask(String notes, List<File> photos) async {
    setState(() => _actionLoading = true);
    try {
      List<String> uploadedUrls = [];
      if (photos.isNotEmpty) {
        final uploadResult = await _apiClient.uploadFiles(
          '/upload',
          photos.map((p) => p.path).toList(),
          fieldName: 'photos',
        );
        if (uploadResult != null && uploadResult['urls'] is List) {
          uploadedUrls = (uploadResult['urls'] as List)
              .map((e) => e.toString())
              .toList();
        }
      }
      await ref
          .read(technicianTasksProvider.notifier)
          .completeTask(widget.taskId, notes: notes);
      if (uploadedUrls.isNotEmpty) {
        await _complaintService.addAfterPhoto(widget.taskId, uploadedUrls);
      }
      await _loadTask();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Tâche résolue avec succès!'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Échec de la résolution: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year} ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppColors.primary, AppColors.primary.withAlpha(204)],
          ),
        ),
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.arrow_back, color: Colors.white),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _task != null
                            ? 'Tâche #${_task!.id.substring(0, _task!.id.length > 6 ? 6 : _task!.id.length)}'
                            : 'Détails de la tâche',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: _loadTask,
                      icon: const Icon(Icons.refresh, color: Colors.white),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Container(
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.vertical(
                      top: Radius.circular(24),
                    ),
                  ),
                  child: _isLoading
                      ? const Center(
                          child: CircularProgressIndicator(
                            color: AppColors.primary,
                          ),
                        )
                      : _error != null
                      ? _buildErrorState()
                      : _task == null
                      ? _buildNotFoundState()
                      : RefreshIndicator(
                          onRefresh: _loadTask,
                          color: AppColors.primary,
                          child: ListView(
                            padding: const EdgeInsets.all(20),
                            children: [
                              _buildStatusCard(),
                              const SizedBox(height: 16),
                              _buildMainInfoCard(),
                              const SizedBox(height: 16),
                              _buildStatusTimeline(),
                              const SizedBox(height: 16),
                              _buildDescriptionCard(),
                              const SizedBox(height: 16),
                              _buildLocationCard(),
                              if (_task!.media.isNotEmpty) ...[
                                const SizedBox(height: 16),
                                _buildPhotosCard(),
                              ],
                              const SizedBox(height: 16),
                              _buildDatesCard(),
                              const SizedBox(height: 24),
                              _buildActionButton(),
                            ],
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.red.shade50,
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.error_outline,
              size: 48,
              color: Colors.red.shade400,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            _error ?? 'Une erreur est survenue',
            style: TextStyle(color: Colors.red.shade700),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadTask,
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            child: const Text('Réessayer'),
          ),
        ],
      ),
    );
  }

  Widget _buildNotFoundState() {
    return const Center(child: Text('Tâche introuvable'));
  }

  Widget _buildStatusCard() {
    if (_task == null) return const SizedBox.shrink();

    final statusColors = _getStatusColors(_task!.status ?? 'ASSIGNED');
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: statusColors['bgColor'] as Color,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: statusColors['borderColor'] as Color),
      ),
      child: Row(
        children: [
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: statusColors['color'] as Color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Text(
            _getFrenchStatus(_task!.status ?? 'ASSIGNED'),
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: statusColors['color'] as Color,
            ),
          ),
          const Spacer(),
          if (_task!.priorityScore >= 15)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.warning_amber,
                    size: 14,
                    color: Colors.red.shade700,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Haute priorité',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Colors.red.shade700,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  String _getFrenchStatus(String status) {
    switch (status) {
      case 'ASSIGNED':
        return 'Assignée';
      case 'IN_PROGRESS':
        return 'En cours';
      case 'RESOLVED':
        return 'Résolue';
      case 'CLOSED':
        return 'Clôturée';
      default:
        return status;
    }
  }

  Widget _buildMainInfoCard() {
    if (_task == null) return const SizedBox.shrink();

    final urgency = _getUrgencyValue(_task!.urgency);

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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Informations principales',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.primary.withAlpha(26),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.category, size: 18, color: AppColors.primary),
                const SizedBox(width: 8),
                Text(
                  _task!.categoryLabel,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text(
                      'Urgence',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      '(${['', 'Faible', 'Moyenne', 'Haute', 'Urgente'][urgency.clamp(0, 4)]})',
                      style: TextStyle(
                        fontSize: 12,
                        color: _getUrgencyColor(urgency),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: List.generate(5, (i) {
                    return Expanded(
                      child: Container(
                        margin: EdgeInsets.only(right: i < 4 ? 4 : 0),
                        height: 6,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(2),
                          color: i < urgency
                              ? _getUrgencyColor(urgency)
                              : Colors.grey.shade200,
                        ),
                      ),
                    );
                  }),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusTimeline() {
    if (_task == null) return const SizedBox.shrink();

    final status = _task!.status ?? 'ASSIGNED';
    final progress = status == 'RESOLVED' || status == 'CLOSED'
        ? 3
        : status == 'IN_PROGRESS'
        ? 2
        : status == 'ASSIGNED'
        ? 1
        : 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primary.withAlpha(26), const Color(0xFFEEF2FF)],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.timeline, size: 18, color: AppColors.primary),
              const SizedBox(width: 8),
              const Text(
                'Chronologie du statut',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Stack(
            children: [
              Positioned(
                top: 12,
                left: 0,
                right: 0,
                child: Container(
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Positioned(
                top: 12,
                left: 0,
                child: Container(
                  height: 4,
                  width:
                      (MediaQuery.of(context).size.width - 96) * (progress / 3),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [const Color(0xFF22C55E), AppColors.primary],
                    ),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildTimelineStep('Assignée', 1, progress),
                  _buildTimelineStep('En cours', 2, progress),
                  _buildTimelineStep('Résolue', 3, progress),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineStep(String label, int step, int currentStep) {
    final isCompleted = currentStep >= step;
    final isCurrent = currentStep == step - 1;

    return Column(
      children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: isCompleted
                ? const Color(0xFF22C55E)
                : isCurrent
                ? const Color(0xFFF97316)
                : Colors.grey.shade200,
            shape: BoxShape.circle,
          ),
          child: Icon(
            isCompleted ? Icons.check : Icons.circle,
            size: 16,
            color: isCompleted || isCurrent
                ? Colors.white
                : Colors.grey.shade400,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: isCompleted
                ? AppColors.textPrimary
                : AppColors.textSecondary,
          ),
        ),
      ],
    );
  }

  Widget _buildDescriptionCard() {
    if (_task == null) return const SizedBox.shrink();

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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.description, size: 18, color: AppColors.primary),
              const SizedBox(width: 8),
              const Text(
                'Description',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            _task!.description,
            style: const TextStyle(color: AppColors.textSecondary, height: 1.5),
          ),
        ],
      ),
    );
  }

  Widget _buildLocationCard() {
    if (_task == null) return const SizedBox.shrink();

    final hasLocation =
        _task!.location?['latitude'] != null &&
        _task!.location?['longitude'] != null;

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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.location_on, size: 18, color: AppColors.primary),
              const SizedBox(width: 8),
              const Text(
                'Localisation',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_task!.location?['address'] != null &&
              _task!.location!['address'].toString().isNotEmpty)
            Text(
              _task!.location!['address'].toString(),
              style: const TextStyle(color: AppColors.textSecondary),
            ),
          if (!hasLocation) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.location_disabled,
                    color: Colors.red.shade400,
                    size: 24,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Localisation non disponible',
                    style: TextStyle(
                      color: Colors.red.shade700,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPhotosCard() {
    if (_task == null || _task!.media.isEmpty) return const SizedBox.shrink();

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
                'Photos (${_task!.media.length})',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 100,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: _task!.media.length,
              itemBuilder: (ctx, i) {
                final media = _task!.media[i];
                if (media.type != 'photo') return const SizedBox.shrink();
                return Container(
                  width: 100,
                  height: 100,
                  margin: const EdgeInsets.only(right: 8),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    color: Colors.grey.shade200,
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(
                      media.url,
                      fit: BoxFit.cover,
                      errorBuilder: (ctx, error, stack) => const Center(
                        child: Icon(
                          Icons.broken_image,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDatesCard() {
    if (_task == null) return const SizedBox.shrink();

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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.calendar_today,
                size: 18,
                color: AppColors.primary,
              ),
              const SizedBox(width: 8),
              const Text(
                'Dates',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildDateRow(
            'Créée',
            _formatDate(_task!.createdAt),
            Icons.add_circle_outline,
            AppColors.textSecondary,
          ),
          if (_task!.resolvedAt != null)
            _buildDateRow(
              'Résolue',
              _formatDate(_task!.resolvedAt!),
              Icons.check_circle_outline,
              const Color(0xFF22C55E),
            ),
        ],
      ),
    );
  }

  Widget _buildDateRow(String label, String value, IconData icon, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 8),
          Text(
            '$label:',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
          ),
          const SizedBox(width: 8),
          Text(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.w500,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton() {
    if (_task == null) return const SizedBox.shrink();

    final status = _task!.status ?? 'ASSIGNED';

    if (status == 'ASSIGNED') {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: _actionLoading ? null : _startTask,
          icon: _actionLoading
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    color: Colors.white,
                    strokeWidth: 2,
                  ),
                )
              : const Icon(Icons.play_arrow),
          label: Text(_actionLoading ? 'Démarrage...' : 'Commencer le travail'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      );
    } else if (status == 'IN_PROGRESS') {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: _showResolveModal,
          icon: const Icon(Icons.check_circle),
          label: const Text('Marquer résolue'),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF22C55E),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      );
    } else if (status == 'RESOLVED') {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFF0FDF4),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF86EFAC)),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.hourglass_empty, color: Color(0xFF22C55E), size: 20),
            SizedBox(width: 12),
            Text(
              'En attente de validation de l\'agent',
              style: TextStyle(
                color: Color(0xFF22C55E),
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      );
    } else if (status == 'CLOSED') {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle, color: Color(0xFF64748B), size: 20),
            SizedBox(width: 12),
            Text(
              'Tâche terminée et clôturée',
              style: TextStyle(
                color: Color(0xFF64748B),
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      );
    }

    return const SizedBox.shrink();
  }

  Map<String, Color> _getStatusColors(String status) {
    switch (status) {
      case 'ASSIGNED':
        return {
          'color': const Color(0xFF8B5CF6),
          'bgColor': const Color(0xFFF5F3FF),
          'borderColor': const Color(0xFFDDD6FE),
        };
      case 'IN_PROGRESS':
        return {
          'color': const Color(0xFFF97316),
          'bgColor': const Color(0xFFFFF7ED),
          'borderColor': const Color(0xFFFED7AA),
        };
      case 'RESOLVED':
        return {
          'color': const Color(0xFF22C55E),
          'bgColor': const Color(0xFFF0FDF4),
          'borderColor': const Color(0xFFBBF7D0),
        };
      case 'CLOSED':
        return {
          'color': const Color(0xFF64748B),
          'bgColor': const Color(0xFFF1F5F9),
          'borderColor': const Color(0xFFE2E8F0),
        };
      default:
        return {
          'color': Colors.grey,
          'bgColor': Colors.grey.shade50,
          'borderColor': Colors.grey.shade200,
        };
    }
  }

  int _getUrgencyValue(dynamic urgency) {
    if (urgency is int) return urgency;
    final urgencyMap = {'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'URGENT': 4};
    return urgencyMap[urgency] ?? 2;
  }

  Color _getUrgencyColor(int urgency) {
    if (urgency <= 1) return const Color(0xFF22C55E);
    if (urgency <= 2) return const Color(0xFFF59E0B);
    if (urgency <= 3) return const Color(0xFFF97316);
    return const Color(0xFFDC2626);
  }
}
