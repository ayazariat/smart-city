// ========== COLORS - EXACTLY MATCHING WEB (Tunis Vert Civique) ==========
import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // PRIMARY - Tunis Vert Civique (green!) - Web: #2E7D32
  static const Color primary = Color(0xFF2E7D32);
  static const Color primaryLight = Color(0xFF4CAF50);
  static const Color primaryDark = Color(0xFF1B5E20);

  // SECONDARY (slate) - Web: #F5F7FA
  static const Color secondary = Color(0xFFF5F7FA);

  // ACCENT (orange) - Web: #F57C00
  static const Color accent = Color(0xFFF57C00);
  static const Color accentLight = Color(0xFFFFA726);

  // URGENT (red) - Web: #C62828
  static const Color error = Color(0xFFC62828);
  static const Color urgent = Color(0xFFC62828);

  // SUCCESS (green) - Web: #81C784
  static const Color success = Color(0xFF81C784);

  // ATTENTION (orange) - Web: #F57C00
  static const Color warning = Color(0xFFF57C00);
  static const Color attention = Color(0xFFF57C00);

  // Status Colors
  static const Color statusSoumise = Color(0xFF2E7D32); // Primary green
  static const Color statusValidee = Color(0xFF2E7D32); // Primary green
  static const Color statusAssignee = Color(0xFFF57C00); // Orange
  static const Color statusEnCours = Color(0xFFF57C00); // Orange
  static const Color statusResolue = Color(0xFF81C784); // Green
  static const Color statusCloturee = Color(0xFF64748B); // Gray
  static const Color statusRejetee = Color(0xFFC62828); // Red

  // Background & Surface
  static const Color background = Color(0xFFF5F7FA);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceVariant = Color(0xFFFAFBFC);

  // Text
  static const Color textPrimary = Color(0xFF1E293B);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color textTertiary = Color(0xFF94A3B8);

  // Border
  static const Color border = Color(0xFFE8EDF3);
  static const Color borderLight = Color(0xFFF5F7FA);
}
