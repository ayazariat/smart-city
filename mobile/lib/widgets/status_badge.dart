import 'package:flutter/material.dart';
import 'package:smart_city_app/core/constants/app_theme.dart';

class StatusBadge extends StatelessWidget {
  final String status;
  final double? fontSize;

  const StatusBadge({
    super.key,
    required this.status,
    this.fontSize,
  });

  Color _getStatusColor() {
    switch (status.toUpperCase()) {
      case 'SUBMITTED':
      case 'SOUMISE':
        return AppTheme.statusPending;
      case 'VALIDATED':
      case 'VALIDÉE':
        return AppTheme.statusValidated;
      case 'ASSIGNED':
      case 'ASSIGNÉE':
        return AppTheme.statusAssigned;
      case 'IN_PROGRESS':
      case 'EN COURS':
        return AppTheme.statusInProgress;
      case 'RESOLVED':
      case 'RÉSOLUE':
        return AppTheme.statusResolved;
      case 'CLOSED':
      case 'CLÔTURÉE':
        return AppTheme.statusClosed;
      case 'REJECTED':
      case 'REJETÉE':
        return AppTheme.statusRejected;
      default:
        return AppTheme.statusPending;
    }
  }

  String _getStatusLabel() {
    switch (status.toUpperCase()) {
      case 'SUBMITTED':
        return 'Soumise';
      case 'VALIDATED':
        return 'Validée';
      case 'ASSIGNED':
        return 'Assignée';
      case 'IN_PROGRESS':
        return 'En cours';
      case 'RESOLVED':
        return 'Résolue';
      case 'CLOSED':
        return 'Clôturée';
      case 'REJECTED':
        return 'Rejetée';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _getStatusColor();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        _getStatusLabel(),
        style: TextStyle(
          color: color,
          fontSize: fontSize ?? 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
