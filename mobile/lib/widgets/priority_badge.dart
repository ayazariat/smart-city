import 'package:flutter/material.dart';
import 'package:smart_city_app/core/constants/app_theme.dart';

class PriorityBadge extends StatelessWidget {
  final String priority;
  final double? fontSize;

  const PriorityBadge({
    super.key,
    required this.priority,
    this.fontSize,
  });

  Color _getPriorityColor() {
    switch (priority.toUpperCase()) {
      case 'LOW':
      case 'FAIBLE':
        return const Color(0xFF22C55E); // Green
      case 'MEDIUM':
      case 'MOYENNE':
        return const Color(0xFFF59E0B); // Amber
      case 'HIGH':
      case 'HAUTE':
        return const Color(0xFFF97316); // Orange
      case 'CRITICAL':
      case 'URGENTE':
        return const Color(0xFFEF4444); // Red
      default:
        return AppTheme.statusPending;
    }
  }

  String _getPriorityLabel() {
    switch (priority.toUpperCase()) {
      case 'LOW':
        return 'Faible';
      case 'MEDIUM':
        return 'Moyenne';
      case 'HIGH':
        return 'Haute';
      case 'CRITICAL':
        return 'Urgente';
      default:
        return priority;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _getPriorityColor();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        _getPriorityLabel(),
        style: TextStyle(
          color: color,
          fontSize: fontSize ?? 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
