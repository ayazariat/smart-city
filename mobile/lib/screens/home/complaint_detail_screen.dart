import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:smart_city_app/core/constants/app_theme.dart';
import 'package:smart_city_app/models/complaint_model.dart';
import 'package:smart_city_app/providers/auth_provider.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/services/api_client.dart';
import 'package:smart_city_app/widgets/status_badge.dart';
import 'package:smart_city_app/widgets/priority_badge.dart';
import 'package:smart_city_app/widgets/toast.dart';
import 'package:smart_city_app/widgets/confirmation_dialog.dart';

class ComplaintDetailScreen extends ConsumerStatefulWidget {
  final String complaintId;
  const ComplaintDetailScreen({super.key, required this.complaintId});

  @override
  ConsumerState<ComplaintDetailScreen> createState() => _ComplaintDetailScreenState();
}

class _ComplaintDetailScreenState extends ConsumerState<ComplaintDetailScreen> {
  final ComplaintService _complaintService = ComplaintService();
  Complaint? _complaint;
  List<dynamic> _comments = [];
  bool _isLoading = true;
  bool _isAnonymousComment = false;
  final TextEditingController _commentController = TextEditingController();

  // Rating / satisfaction state
  int _selectedRating = 0;
  String _ratingComment = '';
  bool _resolvedCorrectly = true;
  bool _isSubmittingRating = false;
  bool _satisfactionSubmitted = false;

  // Upvote state
  bool _isUpvoting = false;

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
      // Use satisfaction survey endpoint
      await _complaintService.submitSatisfaction(
        widget.complaintId,
        _selectedRating,
        comment: _ratingComment.isNotEmpty ? _ratingComment : null,
      );
      Toast.success(context, 'Merci pour votre évaluation !');
      setState(() {
        _selectedRating = 0;
        _ratingComment = '';
        _satisfactionSubmitted = true;
      });
      _loadData();
    } catch (e) {
      Toast.error(context, 'Erreur: $e');
    } finally {
      setState(() => _isSubmittingRating = false);
    }
  }

  Future<void> _upvoteComplaint() async {
    setState(() => _isUpvoting = true);
    try {
      await _complaintService.upvoteComplaint(widget.complaintId);
      Toast.success(context, 'Vote ajouté !');
      _loadData();
    } catch (e) {
      Toast.error(context, 'Erreur: $e');
    } finally {
      setState(() => _isUpvoting = false);
    }
  }

  Future<void> _addComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty) return;
    if (text.length < 5) {
      Toast.error(context, 'Le commentaire doit contenir au moins 5 caractères');
      return;
    }
    try {
      await _complaintService.addPublicComment(widget.complaintId, text, anonymous: _isAnonymousComment);
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
                  BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8),
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
                  if (c.municipalityName != null) ...[
                    const SizedBox(height: 12),
                    _buildInfoRow(Icons.location_city, 'Municipalité', c.municipalityName!),
                  ],
                  if (c.governorate != null) ...[
                    const SizedBox(height: 12),
                    _buildInfoRow(Icons.map, 'Gouvernorat', c.governorate!),
                  ],
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
                  if (c.slaDeadline != null) ...[
                    const SizedBox(height: 12),
                    _buildInfoRow(
                      Icons.timer,
                      'Délai SLA',
                      '${c.slaDeadline!.day}/${c.slaDeadline!.month}/${c.slaDeadline!.year}',
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Location Map
            if (_hasLocation(c))
              _buildLocationMap(c),
            if (_hasLocation(c)) const SizedBox(height: 16),

            // Community stats (upvote + confirm)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(AppTheme.radiusXl),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)],
              ),
              child: Row(
                children: [
                  // Upvote
                  Expanded(
                    child: InkWell(
                      onTap: _isUpvoting ? null : _upvoteComplaint,
                      borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            _isUpvoting
                                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary))
                                : const Icon(Icons.thumb_up_outlined, color: AppTheme.primary, size: 20),
                            const SizedBox(width: 6),
                            Text(
                              '${c.upvoteCount} vote${c.upvoteCount != 1 ? 's' : ''}',
                              style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Confirmations
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: AppTheme.success.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.check_circle_outline, color: AppTheme.success, size: 20),
                          const SizedBox(width: 6),
                          Text(
                            '${c.confirmationCount} confirmation${c.confirmationCount != 1 ? 's' : ''}',
                            style: const TextStyle(color: AppTheme.success, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                  ),
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

            // Satisfaction Survey (for resolved complaints, not yet rated)
            if (c.status == 'RESOLVED' && !_satisfactionSubmitted)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(AppTheme.radiusXl),
                  border: Border.all(color: const Color(0xFF22C55E).withOpacity(0.3)),
                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.star, color: Color(0xFF22C55E), size: 20),
                        SizedBox(width: 8),
                        Text('Comment s\'est passée la résolution ?', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: _buildSatisfactionButton('😊', 'Satisfait', 5, const Color(0xFF22C55E)),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _buildSatisfactionButton('😐', 'Neutre', 3, const Color(0xFFF59E0B)),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _buildSatisfactionButton('😞', 'Insatisfait', 1, const Color(0xFFEF4444)),
                        ),
                      ],
                    ),
                    if (_selectedRating > 0) ...[
                      const SizedBox(height: 12),
                      TextField(
                        decoration: const InputDecoration(
                          hintText: 'Commentaire optionnel...',
                          border: OutlineInputBorder(),
                          contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                        maxLines: 2,
                        onChanged: (v) => _ratingComment = v,
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton(
                              onPressed: _isSubmittingRating ? null : _submitRating,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF22C55E),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                              child: _isSubmittingRating
                                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                  : const Text('Soumettre'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          TextButton(
                            onPressed: () => setState(() => _satisfactionSubmitted = true),
                            child: const Text('Ignorer'),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            if (c.status == 'RESOLVED' && !_satisfactionSubmitted) const SizedBox(height: 16),

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
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusLg)),
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
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Commentaires (${_comments.length})',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (_comments.isEmpty)
                    const Text('Aucun commentaire', style: TextStyle(color: AppTheme.textMuted))
                  else
                    ..._comments.map((comment) => _buildCommentItem(comment)),
                  const SizedBox(height: 12),
                  // Anonymous toggle
                  Row(
                    children: [
                      const Text('Anonyme', style: TextStyle(fontSize: 13)),
                      const SizedBox(width: 8),
                      Switch(
                        value: _isAnonymousComment,
                        onChanged: (v) => setState(() => _isAnonymousComment = v),
                        activeColor: AppTheme.primary,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _commentController,
                          decoration: const InputDecoration(
                            hintText: 'Ajouter un commentaire... (min 5 caractères)',
                            border: OutlineInputBorder(),
                            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          ),
                          maxLength: 500,
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

  bool _hasLocation(Complaint c) {
    final lat = c.location?['lat'] ?? c.location?['latitude'];
    final lng = c.location?['lng'] ?? c.location?['longitude'];
    if (lat == null || lng == null) return false;
    final latD = lat is num ? lat.toDouble() : double.tryParse(lat.toString());
    final lngD = lng is num ? lng.toDouble() : double.tryParse(lng.toString());
    return latD != null && lngD != null && latD != 0 && lngD != 0;
  }

  double? _getLat(Complaint c) {
    final v = c.location?['lat'] ?? c.location?['latitude'];
    if (v == null) return null;
    return v is num ? v.toDouble() : double.tryParse(v.toString());
  }

  double? _getLng(Complaint c) {
    final v = c.location?['lng'] ?? c.location?['longitude'];
    if (v == null) return null;
    return v is num ? v.toDouble() : double.tryParse(v.toString());
  }

  Widget _buildLocationMap(Complaint c) {
    final lat = _getLat(c)!;
    final lng = _getLng(c)!;
    final address = c.location?['address'] as String? ?? c.municipalityName ?? '';

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusXl),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 220,
            child: FlutterMap(
              options: MapOptions(
                initialCenter: LatLng(lat, lng),
                initialZoom: 15,
                interactionOptions: const InteractionOptions(flags: InteractiveFlag.none),
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.example.smart_city',
                ),
                MarkerLayer(
                  markers: [
                    Marker(
                      point: LatLng(lat, lng),
                      width: 40,
                      height: 40,
                      child: const Icon(Icons.location_pin, color: AppTheme.primary, size: 40),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (address.isNotEmpty) ...[
                  Row(
                    children: [
                      const Icon(Icons.location_on, size: 16, color: AppTheme.textMuted),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          address,
                          style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary, fontStyle: FontStyle.italic),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                ],
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => _navigateToLocation(lat, lng),
                    icon: const Icon(Icons.navigation, size: 18),
                    label: const Text('Naviguer vers ce lieu'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.primary,
                      side: const BorderSide(color: AppTheme.primary),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _navigateToLocation(double lat, double lng) async {
    final uri = Uri.parse('https://maps.google.com?q=$lat,$lng');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) Toast.error(context, 'Impossible d\'ouvrir la carte');
    }
  }

  Widget _buildSatisfactionButton(String emoji, String label, int rating, Color color) {
    final isSelected = _selectedRating == rating;
    return GestureDetector(
      onTap: () => setState(() => _selectedRating = rating),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.15) : Colors.white,
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          border: Border.all(color: isSelected ? color : Colors.grey.shade300, width: isSelected ? 2 : 1),
        ),
        child: Column(
          children: [
            Text(emoji, style: const TextStyle(fontSize: 24)),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: isSelected ? color : AppTheme.textSecondary)),
          ],
        ),
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
              _formatCommentDate(comment['createdAt'].toString()),
              style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
            ),
        ],
      ),
    );
  }

  String _formatCommentDate(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final dt = DateTime.parse(dateStr);
      final now = DateTime.now();
      final diff = now.difference(dt);
      if (diff.inMinutes < 1) return 'À l\'instant';
      if (diff.inMinutes < 60) return 'Il y a ${diff.inMinutes} min';
      if (diff.inHours < 24) return 'Il y a ${diff.inHours} h';
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return '';
    }
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
