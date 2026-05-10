import 'package:flutter/material.dart';
import 'package:smart_city_app/core/constants/colors.dart';

class TimelineItem {
  final String action;
  final String actorName;
  final String? note;
  final DateTime timestamp;

  TimelineItem({
    required this.action,
    required this.actorName,
    this.note,
    required this.timestamp,
  });
}

class ComplaintTimeline extends StatelessWidget {
  final List<TimelineItem> history;
  final String? userRole;

  const ComplaintTimeline({
    super.key,
    required this.history,
    this.userRole,
  });

  Color _getActionColor(String action) {
    switch (action.toUpperCase()) {
      case 'SUBMITTED':
        return AppColors.primary;
      case 'VALIDATED':
        return Colors.green;
      case 'REJECTED':
        return Colors.red;
      case 'ASSIGNED':
        return Colors.purple;
      case 'IN_PROGRESS':
      case 'STARTED':
        return Colors.orange;
      case 'RESOLVED':
        return Colors.teal;
      case 'CLOSED':
        return Colors.green.shade700;
      default:
        return Colors.grey;
    }
  }

  String _getActionLabel(String action) {
    switch (action.toUpperCase()) {
      case 'SUBMITTED':
        return 'Soumis';
      case 'VALIDATED':
        return 'Validé';
      case 'REJECTED':
        return 'Rejeté';
      case 'ASSIGNED':
        return 'Assigné';
      case 'IN_PROGRESS':
      case 'STARTED':
        return 'En cours';
      case 'RESOLVED':
        return 'Résolu';
      case 'CLOSED':
        return 'Clôturé';
      default:
        return action;
    }
  }

  List<TimelineItem> _filterHistory() {
    if (userRole == 'CITIZEN') {
      // Citizens only see status changes and public notes
      return history.where((h) {
        final isStatusChange = ['SUBMITTED', 'VALIDATED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED']
            .contains(h.action.toUpperCase());
        final isPublicNote = h.note != null && 
            !h.note!.contains('[INTERNAL]') && 
            !h.note!.contains('[BLOCAGE]');
        return isStatusChange || isPublicNote;
      }).toList();
    }
    return history;
  }

  @override
  Widget build(BuildContext context) {
    final filteredHistory = _filterHistory();
    
    if (filteredHistory.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Chronologie du statut',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 16),
        ...filteredHistory.asMap().entries.map((entry) {
          final index = entry.key;
          final item = entry.value;
          final isLast = index == filteredHistory.length - 1;

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Timeline line
                  if (!isLast)
                    Container(
                      width: 2,
                      height: 60,
                      margin: const EdgeInsets.only(left: 10),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(1),
                      ),
                    )
                  else
                    Container(
                      width: 2,
                      height: 20,
                      margin: const EdgeInsets.only(left: 10),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(1),
                      ),
                    ),
                  const SizedBox(width: 8),
                  // Timeline dot
                  Container(
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(
                      color: _getActionColor(item.action),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                    child: Icon(
                      Icons.check,
                      size: 14,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Content
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _getActionLabel(item.action),
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: _getActionColor(item.action),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Par ${item.actorName}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade600,
                          ),
                        ),
                        if (item.note != null && item.note!.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              item.note!,
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey.shade700,
                              ),
                            ),
                          ),
                        ],
                        const SizedBox(height: 4),
                        Text(
                          _formatDate(item.timestamp),
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey.shade500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (!isLast) const SizedBox(height: 24),
            ],
          );
        }).toList(),
      ],
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) {
      if (difference.inHours == 0) {
        if (difference.inMinutes == 0) {
          return 'À l\'instant';
        }
        return 'Il y a ${difference.inMinutes} min';
      }
      return 'Il y a ${difference.inHours} h';
    } else if (difference.inDays == 1) {
      return 'Hier à ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } else if (difference.inDays < 7) {
      return 'Il y a ${difference.inDays} jours';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }
}
