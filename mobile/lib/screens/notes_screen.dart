import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/core/constants/colors.dart';
import 'package:smart_city_app/providers/auth_provider.dart';
import 'package:smart_city_app/services/api_client.dart';

class Note {
  final String id;
  final String type;
  final String authorName;
  final String authorRole;
  final String content;
  final DateTime createdAt;

  Note({
    required this.id,
    required this.type,
    required this.authorName,
    required this.authorRole,
    required this.content,
    required this.createdAt,
  });

  factory Note.fromJson(Map<String, dynamic> json) {
    return Note(
      id: json['_id'] ?? json['id'] ?? '',
      type: json['type'] ?? 'NOTE',
      authorName: json['authorName'] ?? json['author_name'] ?? 'Unknown',
      authorRole: json['authorRole'] ?? json['author_role'] ?? '',
      content: json['content'] ?? json['note'] ?? json['comment'] ?? '',
      createdAt: DateTime.tryParse(json['createdAt'] ?? json['created_at'] ?? '') ?? DateTime.now(),
    );
  }
}

class NotesScreen extends ConsumerStatefulWidget {
  final String complaintId;
  final String complaintTitle;

  const NotesScreen({
    super.key,
    required this.complaintId,
    this.complaintTitle = '',
  });

  @override
  ConsumerState<NotesScreen> createState() => _NotesScreenState();
}

class _NotesScreenState extends ConsumerState<NotesScreen> {
  final ApiClient _api = ApiClient();
  List<Note> _notes = [];
  bool _isLoading = true;
  String? _error;
  bool _isPosting = false;
  final _noteController = TextEditingController();
  String _selectedType = 'NOTE';

  bool get _isStaff {
    final role = ref.read(authProvider).user?.role ?? '';
    return !['CITIZEN', '', null].contains(role);
  }

  String get _userRole => ref.read(authProvider).user?.role ?? '';

  @override
  void initState() {
    super.initState();
    _loadNotes();
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _loadNotes() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _api.get('/complaints/${widget.complaintId}/notes');
      final notesList = (response['notes'] ?? response['data'] ?? []) as List;
      setState(() {
        _notes = notesList.map((n) => Note.fromJson(n as Map<String, dynamic>)).toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _postNote() async {
    final text = _noteController.text.trim();
    if (text.isEmpty || _isPosting) return;

    setState(() => _isPosting = true);

    try {
      await _api.post('/complaints/${widget.complaintId}/notes', {
        'type': _selectedType,
        'content': text,
      });
      _noteController.clear();
      await _loadNotes();
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
      if (mounted) setState(() => _isPosting = false);
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final visibleNotes = _userRole == 'CITIZEN'
        ? _notes.where((n) => n.type == 'PUBLIC').toList()
        : _notes;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Notes & Commentaires',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            if (widget.complaintTitle.isNotEmpty)
              Text(
                widget.complaintTitle,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                  fontWeight: FontWeight.normal,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadNotes,
          ),
        ],
      ),
      body: Column(
        children: [
          if (_isStaff)
            Container(
              padding: const EdgeInsets.all(16),
              color: Colors.white,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: _noteController,
                    maxLines: 3,
                    decoration: InputDecoration(
                      hintText: 'Ajouter une note...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      _buildTypeChip('NOTE', 'Note interne', Colors.grey),
                      const SizedBox(width: 8),
                      _buildTypeChip('PUBLIC', 'Public', Colors.blue),
                      if (['TECHNICIAN', 'MUNICIPAL_AGENT', 'DEPARTMENT_MANAGER', 'ADMIN'].contains(_userRole)) ...[
                        const SizedBox(width: 8),
                        _buildTypeChip('BLOCAGE', 'Blocage', Colors.orange),
                      ],
                      const Spacer(),
                      ElevatedButton(
                        onPressed: _isPosting || _noteController.text.trim().isEmpty
                            ? null
                            : _postNote,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                        ),
                        child: _isPosting
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text('Publier'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: AppColors.primary),
                  )
                : _error != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.error_outline, size: 48, color: Colors.red[400]),
                            const SizedBox(height: 12),
                            Text('Erreur: $_error'),
                            const SizedBox(height: 12),
                            ElevatedButton(
                              onPressed: _loadNotes,
                              child: const Text('Réessayer'),
                            ),
                          ],
                        ),
                      )
                    : visibleNotes.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.note, size: 48, color: Colors.grey[400]),
                                const SizedBox(height: 12),
                                Text(
                                  _userRole == 'CITIZEN'
                                      ? 'Aucun commentaire public'
                                      : 'Aucune note',
                                  style: TextStyle(color: Colors.grey[600]),
                                ),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: _loadNotes,
                            child: ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: visibleNotes.length,
                              itemBuilder: (context, index) {
                                final note = visibleNotes[index];
                                return _buildNoteCard(note);
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildTypeChip(String type, String label, Color color) {
    final isSelected = _selectedType == type;
    return GestureDetector(
      onTap: () => setState(() => _selectedType = type),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? color : color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? color : Colors.transparent),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : color,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _buildNoteCard(Note note) {
    Color cardColor;
    Color borderColor;
    Color badgeColor;
    String badgeText;

    switch (note.type) {
      case 'BLOCAGE':
        cardColor = const Color(0xFFFFF7ED);
        borderColor = const Color(0xFFFED7AA);
        badgeColor = Colors.orange;
        badgeText = 'Blocage';
        break;
      case 'PUBLIC':
        cardColor = const Color(0xFFEFF6FF);
        borderColor = const Color(0xFFBFDBFE);
        badgeColor = Colors.blue;
        badgeText = 'Public';
        break;
      default:
        cardColor = Colors.white;
        borderColor = Colors.grey.shade200;
        badgeColor = Colors.grey;
        badgeText = 'Interne';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: borderColor.withValues(alpha: 0.5))),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: badgeColor,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    badgeText,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  note.authorName,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
                const Spacer(),
                Text(
                  _formatDate(note.createdAt),
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Text(
              note.content,
              style: const TextStyle(fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }
}