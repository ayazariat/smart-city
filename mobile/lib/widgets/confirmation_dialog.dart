import 'package:flutter/material.dart';
import 'package:smart_city_app/core/constants/app_theme.dart';

class ConfirmationDialog extends StatelessWidget {
  final String title;
  final String message;
  final String confirmText;
  final String cancelText;
  final VoidCallback onConfirm;
  final VoidCallback? onCancel;

  const ConfirmationDialog({
    super.key,
    required this.title,
    required this.message,
    this.confirmText = 'Confirmer',
    this.cancelText = 'Annuler',
    required this.onConfirm,
    this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusXl),
      ),
      title: Text(
        title,
        style: const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: AppTheme.textPrimary,
        ),
      ),
      content: Text(
        message,
        style: const TextStyle(
          fontSize: 14,
          color: AppTheme.textSecondary,
        ),
      ),
      actions: [
        TextButton(
          onPressed: onCancel ?? () => Navigator.pop(context),
          child: Text(
            cancelText,
            style: const TextStyle(
              color: AppTheme.textSecondary,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        ElevatedButton(
          onPressed: () {
            Navigator.pop(context);
            onConfirm();
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primary,
            foregroundColor: AppTheme.textInverse,
          ),
          child: Text(confirmText),
        ),
      ],
    );
  }

  static Future<bool> show({
    required BuildContext context,
    required String title,
    required String message,
    String confirmText = 'Confirmer',
    String cancelText = 'Annuler',
  }) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => ConfirmationDialog(
        title: title,
        message: message,
        confirmText: confirmText,
        cancelText: cancelText,
        onConfirm: () => Navigator.pop(context, true),
        onCancel: () => Navigator.pop(context, false),
      ),
    );
    return result ?? false;
  }
}
