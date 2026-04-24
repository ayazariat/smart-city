// ========== COLORS ==========
import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Primary
  static const Color primary = Color(0xFF1E40AF);
  static const Color primaryLight = Color(0xFF3B82F6);
  static const Color primaryDark = Color(0xFF1E3A8A);

  // Secondary
  static const Color secondary = Color(0xFF3B82F6);

  // Accent / CTA
  static const Color accent = Color(0xFFF59E0B);
  static const Color accentLight = Color(0xFFFBBF24);

  // Status
  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFF97316);
  static const Color error = Color(0xFFEF4444);
  static const Color urgent = Color(0xFFDC2626);

  // Background & Surface
  static const Color background = Color(0xFFF8FAFC);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceVariant = Color(0xFFF1F5F9);

  // Text
  static const Color textPrimary = Color(0xFF1E293B);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color textTertiary = Color(0xFF94A3B8);

  // Border
  static const Color border = Color(0xFFE2E8F0);
  static const Color borderLight = Color(0xFFF1F5F9);

  // Complaint Status Colors
  static const Color statusSoumise = Color(0xFF3B82F6); // Blue
  static const Color statusValidee = Color(0xFF6366F1); // Indigo
  static const Color statusAssignee = Color(0xFF8B5CF6); // Purple
  static const Color statusEnCours = Color(0xFFF97316); // Orange
  static const Color statusResolue = Color(0xFF10B981); // Green
  static const Color statusCloturee = Color(0xFF64748B); // Gray
  static const Color statusRejetee = Color(0xFFEF4444); // Red

  // Priority Colors
  static const Color priorityFaible = Color(0xFF10B981); // Green
  static const Color priorityMoyenne = Color(0xFFFBBF24); // Amber
  static const Color priorityHaute = Color(0xFFF97316); // Orange
  static const Color priorityCritique = Color(0xFFEF4444); // Red
}
