import 'package:flutter/material.dart';
import 'package:smart_city_app/core/constants/app_theme.dart';
import 'package:smart_city_app/models/complaint_model.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/services/api_client.dart';
import 'package:smart_city_app/widgets/status_badge.dart';
import 'package:smart_city_app/widgets/priority_badge.dart';
import 'package:smart_city_app/widgets/toast.dart';
import 'package:smart_city_app/widgets/confirmation_dialog.dart';

class ComplaintDetailScreen extends StatefulWidget {
  final String complaintId;
  const ComplaintDetailScreen({super.key, required this.complaintId});

  @override
  State<ComplaintDetailScreen> createState() => _ComplaintDetailScreenState();
}

class _ComplaintDetailScreenState extends State<ComplaintDetailScreen> {
  final ComplaintService _complaintService = ComplaintService();
  Complaint? _complaint;
  List<dynamic> _comments = [];
  bool _isLoading = true;
  final TextEditingController _commentController = TextEditingController();

  // Rating state
  int _selectedRating = 0;
  String _ratingComment = '';
  bool _resolvedCorrectly = true;
  bool _isSubmittingRating = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final complaint = await _complaintService.getComplaintById(
        widget.complaintId,
      );
      final comments = await _complaintService.getPublicComments(
        widget.complaintId,
      );
      setState(() {
        _complaint = complaint;
        _comments = comments;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _confirmResolution() async {
    try {
      await _complaintService.confirmResolution(widget.complaintId);
      Toast.success(context, 'Résolution confirmée !');
      _loadData();
    } catch (e) {
      Toast.error(context, 'Erreur: $e');
    }
  }

  Future<void> _submitRating() async {
    if (_selectedRating == 0) {
      Toast.error(context, 'Veuillez sélectionner une note');
      return;
    }

    setState(() => _isSubmittingRating = true);
    try {
      await _complaintService.submitRating(
        widget.complaintId,
        _selectedRating,
        _ratingComment,
        _resolvedCorrectly,
      );
      Toast.success(context, 'Merci pour votre évaluation !');
      setState(() {
        _selectedRating = 0;
        _ratingComment = '';
      });
      _loadData();
    } catch (e) {
      Toast.error(context, 'Erreur: $e');
    } finally {
      setState(() => _isSubmittingRating = false);
    }
  }

  Future<void> _addComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty) return;
    try {
      await _complaintService.addPublicComment(widget.complaintId, text);
      _commentController.clear();
      Toast.success(context, 'Commentaire ajouté');
      _loadData();
    } catch (e) {
      Toast.error(context, 'Erreur: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppTheme.primary)),
      );
    }

    final c = _complaint;
    if (c == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Détail')),
        body: const Center(child: Text('Signalement introuvable')),
      );
    }

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Détail du signalement'),
        backgroundColor: AppTheme.surface,
        foregroundColor: AppTheme.textPrimary,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Header Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.primary, AppTheme.primaryDark],
                ),
                borderRadius: BorderRadius.circular(AppTheme.radiusXl),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          c.title,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                      StatusBadge(status: c.status),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text(
                        '#${c.id.substring(c.id.length - 6)}',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.7),
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(width: 12),
                      PriorityBadge(
                        priority: _getPriorityLabel(c.priorityScore.toInt()),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Info Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(AppTheme.radiusXl),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 8,
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildInfoRow(Icons.category, 'Catégorie', c.categoryLabel),
                  const SizedBox(height: 12),
                  _buildInfoRow(
                    Icons.location_on,
                    'Adresse',
                    c.location?['address'] ?? c.municipalityName ?? '-',
                  ),
                  const SizedBox(height: 12),
                  _buildInfoRow(
                    Icons.calendar_today,
                    'Date de création',
                    '${c.createdAt.day}/${c.createdAt.month}/${c.createdAt.year}',
                  ),
                  if (c.resolvedAt != null) ...[
                    const SizedBox(height: 12),
                    _buildInfoRow(
                      Icons.check_circle,
                      'Date de résolution',
                      '${c.resolvedAt!.day}/${c.resolvedAt!.month}/${c.resolvedAt!.year}',
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Description
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(AppTheme.radiusXl),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 8,
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Description',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    c.description,
                    style: const TextStyle(
                      color: AppTheme.textSecondary,
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Photos
            if (c.media.isNotEmpty)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(AppTheme.radiusXl),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 8,
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Photos',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 120,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        itemCount: c.media.length,
                        itemBuilder: (context, index) {
                          final media = c.media[index];
                          final url = media.url.startsWith('http')
                              ? media.url
                              : '${ApiClient.serverBaseUrl}${media.url}';
                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(
                                AppTheme.radiusLg,
                              ),
                              child: GestureDetector(
                                onTap: () => _showFullscreenPhoto(url),
                                child: Image.network(
                                  url,
                                  width: 120,
                                  height: 120,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Container(
                                    width: 120,
                                    height: 120,
                                    color: Colors.grey[200],
                                    child: const Icon(Icons.broken_image),
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
              ),
            if (c.media.isNotEmpty) const SizedBox(height: 16),

            // Timeline
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(AppTheme.radiusXl),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 8,
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Historique',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 12),
                  ...c.statusHistory.map((h) => _buildTimelineItem(h)),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Rating Section (for resolved complaints)
            if (c.status == 'RESOLVED')
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(AppTheme.radiusXl),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 8,
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Évaluez la résolution',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: List.generate(5, (index) {
                        return IconButton(
                          icon: Icon(
                            index < _selectedRating ? Icons.star : Icons.star_border,
                            color: Colors.amber,
                          ),
                          onPressed: () => setState(() => _selectedRating = index + 1),
                        );
                      }),
                    ),
                    const SizedBox(height: 12),
                    SwitchListTile(
                      title: const Text('Résolu correctement'),
                      value: _resolvedCorrectly,
                      onChanged: (value) => setState(() => _resolvedCorrectly = value),
                      contentPadding: EdgeInsets.zero,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      decoration: const InputDecoration(
                        hintText: 'Commentaire (optionnel)',
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 12,
                        ),
                      ),
                      maxLines: 3,
                      onChanged: (value) => _ratingComment = value,
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isSubmittingRating ? null : _submitRating,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          foregroundColor: Colors.white,
                        ),
                        child: _isSubmittingRating
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text('Soumettre l\'évaluation'),
                      ),
                    ),
                  ],
                ),
              ),
            if (c.status == 'RESOLVED') const SizedBox(height: 16),

            // Confirm Resolution Button
            if (c.status == 'RESOLVED')
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _confirmResolution,
                  icon: const Icon(Icons.check_circle),
                  label: const Text('Confirmer la résolution'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.success,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                    ),
                  ),
                ),
              ),
            const SizedBox(height: 16),

            // Comments
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(AppTheme.radiusXl),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 8,
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Commentaires',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 12),
                  if (_comments.isEmpty)
                    const Text(
                      'Aucun commentaire',
                      style: TextStyle(color: AppTheme.textMuted),
                    )
                  else
                    ..._comments.map((comment) => _buildCommentItem(comment)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _commentController,
                          decoration: const InputDecoration(
                            hintText: 'Ajouter un commentaire...',
                            border: OutlineInputBorder(),
                            contentPadding: EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 10,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        onPressed: _addComment,
                        icon: const Icon(Icons.send, color: AppTheme.primary),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  void _showFullscreenPhoto(String url) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => FullscreenPhotoView(url: url),
      ),
    );
  }

  String _getPriorityLabel(int score) {
    if (score >= 20) return 'CRITICAL';
    if (score >= 15) return 'HIGH';
    if (score >= 10) return 'MEDIUM';
    return 'LOW';
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppTheme.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: AppTheme.primary, size: 18),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
              ),
              Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTimelineItem(StatusHistoryItem history) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 12,
            height: 12,
            margin: const EdgeInsets.only(top: 4),
            decoration: BoxDecoration(
              color: _getStatusColor(history.status),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  history.status.replaceAll('_', ' '),
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                if (history.updatedByName != null)
                  Text(
                    'Par ${history.updatedByName}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.textMuted,
                    ),
                  ),
                Text(
                  '${history.updatedAt.day}/${history.updatedAt.month}/${history.updatedAt.year}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCommentItem(dynamic comment) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.person, size: 16, color: AppTheme.primary),
              const SizedBox(width: 4),
              Text(
                comment['authorName'] ?? 'Citoyen',
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            comment['text'] ?? comment['content'] ?? '',
            style: const TextStyle(fontSize: 14),
          ),
          const SizedBox(height: 4),
          if (comment['createdAt'] != null)
            Text(
              '${DateTime.parse(comment['createdAt'].toString()).day}/${DateTime.parse(comment['createdAt'].toString()).month}/${DateTime.parse(comment['createdAt'].toString()).year}',
              style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
            ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
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
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }
}

class FullscreenPhotoView extends StatelessWidget {
  final String url;

  const FullscreenPhotoView({super.key, required this.url});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Center(
        child: InteractiveViewer(
          child: Image.network(
            url,
            errorBuilder: (_, __, ___) => const Icon(
              Icons.broken_image,
              color: Colors.white,
              size: 64,
            ),
          ),
        ),
      ),
    );
  }
}
