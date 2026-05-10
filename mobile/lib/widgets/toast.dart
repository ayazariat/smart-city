import 'package:flutter/material.dart';
import 'package:smart_city_app/core/constants/app_theme.dart';

enum ToastType { success, error, info }

class Toast {
  static void show(
    BuildContext context, {
    required String message,
    ToastType type = ToastType.info,
    Duration duration = const Duration(seconds: 3),
  }) {
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    
    Color backgroundColor;
    IconData icon;
    
    switch (type) {
      case ToastType.success:
        backgroundColor = AppTheme.success;
        icon = Icons.check_circle;
        break;
      case ToastType.error:
        backgroundColor = AppTheme.danger;
        icon = Icons.error;
        break;
      case ToastType.info:
        backgroundColor = AppTheme.info;
        icon = Icons.info;
        break;
    }
    
    scaffoldMessenger.showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(icon, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(color: Colors.white),
              ),
            ),
          ],
        ),
        backgroundColor: backgroundColor,
        duration: duration,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        ),
        margin: const EdgeInsets.all(16),
      ),
    );
  }
  
  static void success(BuildContext context, String message) {
    show(context, message: message, type: ToastType.success);
  }
  
  static void error(BuildContext context, String message) {
    show(context, message: message, type: ToastType.error);
  }
  
  static void info(BuildContext context, String message) {
    show(context, message: message, type: ToastType.info);
  }
}
