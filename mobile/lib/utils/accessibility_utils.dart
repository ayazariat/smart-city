import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'dart:math' as math;

/// Accessibility Utilities for WCAG 2.1 AA Compliance
/// ====================================================

class AccessibilityConfig {
  static bool _highContrastMode = false;
  static double _textScaleFactor = 1.0;

  static bool get highContrastMode => _highContrastMode;
  static double get textScaleFactor => _textScaleFactor;

  static void setHighContrastMode(bool enabled) {
    _highContrastMode = enabled;
  }

  static void setTextScaleFactor(double factor) {
    _textScaleFactor = factor.clamp(0.8, 2.0);
  }
}

/// Semantic Labels for Screen Readers
class SemanticLabels {
  static const String backButton = 'Retourner à l\'écran précédent';
  static const String closeButton = 'Fermer';
  static const String submitButton = 'Soumettre le formulaire';
  static const String requiredField = 'Champ obligatoire';
  static const String optionalField = 'Champ optionnel';
  static const String loadingIndicator = 'Chargement en cours';
  static const String errorMessage = 'Message d\'erreur';
  static const String successMessage = 'Message de succès';

  static String statusLabel(String status) => 'Statut: $status';
  static String categoryLabel(String category) => 'Catégorie: $category';
  static String locationLabel(String location) => 'Emplacement: $location';
  static String dateLabel(String date) => 'Date: $date';
}

/// Color Contrast Ratios (WCAG AA requires 4.5:1 for normal text, 3:1 for large text)
class ContrastUtils {
  static Color getHighContrastText(Color background) {
    final luminance = background.computeLuminance();
    return luminance > 0.5 ? Colors.black : Colors.white;
  }

  static bool meetsWcagAA(Color foreground, Color background) {
    final ratio = _calculateContrastRatio(foreground, background);
    return ratio >= 4.5;
  }

  static bool meetsWcagAALargeText(Color foreground, Color background) {
    final ratio = _calculateContrastRatio(foreground, background);
    return ratio >= 3.0;
  }

  static double _calculateContrastRatio(Color c1, Color c2) {
    final l1 = _getLuminance(c1);
    final l2 = _getLuminance(c2);
    final lighter = l1 > l2 ? l1 : l2;
    final darker = l1 > l2 ? l2 : l1;
    return (lighter + 0.05) / (darker + 0.05);
  }

  static double _getLuminance(Color color) {
    final r = _linearize(color.r / 255.0);
    final g = _linearize(color.g / 255.0);
    final b = _linearize(color.b / 255.0);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  static double _linearize(double value) {
    return value <= 0.03928
        ? value / 12.92
        : ((value + 0.055) / 1.055).pow(2.4);
  }
}

/// Touch Target Size Helper (minimum 44x44 for WCAG compliance)
class AccessibleTouchTarget extends StatelessWidget {
  final Widget child;
  final double minSize;

  const AccessibleTouchTarget({
    super.key,
    required this.child,
    this.minSize = 44.0,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(width: minSize, height: minSize, child: child);
  }
}

/// Extension for accessible button styling
extension AccessibleButton on ButtonStyle {
  static ButtonStyle accessibleStyle({
    required Color backgroundColor,
    required Color foregroundColor,
    double minHeight = 44.0,
  }) {
    return ButtonStyle(
      minimumSize: WidgetStateProperty.all(Size(double.infinity, minHeight)),
      padding: WidgetStateProperty.all(
        const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
      backgroundColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.disabled)) {
          return backgroundColor.withValues(alpha: 0.5);
        }
        return backgroundColor;
      }),
      foregroundColor: WidgetStateProperty.all(foregroundColor),
    );
  }
}

/// Focus Management Helper
class FocusHelper {
  static void requestFocusAndAnnounce(
    BuildContext context,
    FocusNode node,
    String announcement,
  ) {
    node.requestFocus();
    SemanticsService.announce(announcement, TextDirection.ltr);
  }

  static bool handleArrowNavigation(
    FocusNode currentFocus,
    Map<FocusNode, int> focusOrder,
    bool isForward,
  ) {
    final currentIndex = focusOrder[currentFocus] ?? 0;
    final sortedNodes = focusOrder.entries.toList()
      ..sort((a, b) => a.value.compareTo(b.value));

    final nextIndex = isForward
        ? (currentIndex + 1) % sortedNodes.length
        : (currentIndex - 1 + sortedNodes.length) % sortedNodes.length;

    sortedNodes[nextIndex].key.requestFocus();
    return true;
  }
}

/// Announcements for Screen Readers
class AccessibilityAnnouncements {
  static void announceFormError(BuildContext context, String message) {
    SemanticsService.announce('Erreur: $message', TextDirection.ltr);
  }

  static void announceSubmissionSuccess(BuildContext context) {
    SemanticsService.announce(
      'Formulaire soumis avec succès',
      TextDirection.ltr,
    );
  }

  static void announceLoading(BuildContext context) {
    SemanticsService.announce('Chargement en cours', TextDirection.ltr);
  }

  static void announceNavigation(BuildContext context, String destination) {
    SemanticsService.announce(
      'Navigation vers $destination',
      TextDirection.ltr,
    );
  }
}

/// Widget for accessible images with text alternatives
class AccessibleImage extends StatelessWidget {
  final ImageProvider image;
  final String semanticLabel;
  final double? width;
  final double? height;

  const AccessibleImage({
    super.key,
    required this.image,
    required this.semanticLabel,
    this.width,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: semanticLabel,
      image: true,
      child: Image(
        image: image,
        width: width,
        height: height,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) {
          return Container(
            width: width,
            height: height,
            color: Colors.grey[300],
            child: const Center(
              child: Icon(
                Icons.image_not_supported,
                semanticLabel: 'Image non disponible',
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Accessible card wrapper with proper semantics
class AccessibleCard extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;
  final String? semanticLabel;
  final bool enabled;

  const AccessibleCard({
    super.key,
    required this.child,
    this.onTap,
    this.semanticLabel,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: semanticLabel,
      button: onTap != null && enabled,
      enabled: enabled,
      child: Card(
        child: InkWell(
          onTap: enabled ? onTap : null,
          borderRadius: BorderRadius.circular(16),
          child: child,
        ),
      ),
    );
  }
}

/// Form field with accessibility improvements
class AccessibleFormField extends StatelessWidget {
  final Widget child;
  final String label;
  final String? error;
  final bool isRequired;

  const AccessibleFormField({
    super.key,
    required this.child,
    required this.label,
    this.error,
    this.isRequired = false,
  });

  @override
  Widget build(BuildContext context) {
    final hasError = error != null && error!.isNotEmpty;

    return Semantics(
      label: '$label${isRequired ? ' (obligatoire)' : ''}',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: hasError ? Colors.red[700] : null,
                ),
              ),
              if (isRequired)
                Container(
                  margin: const EdgeInsets.only(left: 4),
                  child: Text(
                    '*',
                    style: TextStyle(color: Colors.red[700]),
                    semanticsLabel: SemanticLabels.requiredField,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          child,
          if (hasError)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Row(
                children: [
                  Icon(Icons.error, size: 14, color: Colors.red[700]),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      error!,
                      style: TextStyle(fontSize: 12, color: Colors.red[700]),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Skip link for keyboard navigation
class SkipLink extends StatelessWidget {
  final VoidCallback onSkip;
  final String label;

  const SkipLink({
    super.key,
    required this.onSkip,
    this.label = 'Passer au contenu principal',
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      link: true,
      label: label,
      child: GestureDetector(
        onTap: onSkip,
        child: Focus(
          child: Container(
            padding: const EdgeInsets.all(8),
            color: Theme.of(context).primaryColor,
            child: Text(label, style: const TextStyle(color: Colors.white)),
          ),
        ),
      ),
    );
  }
}

/// Extension for power operation
extension Power on double {
  double pow(double exponent) => math.pow(this, exponent).toDouble();
}
