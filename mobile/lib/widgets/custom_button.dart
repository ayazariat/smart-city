// ========== CUSTOM BUTTON WIDGET ==========
import 'package:flutter/material.dart';
import 'package:smart_city_app/core/constants/colors.dart';

class CustomButton extends StatelessWidget {
  final String text;
  final Future<void> Function()? onPressed;
  final bool isLoading;
  final double? width;
  final double? height;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final double fontSize;
  final FontWeight fontWeight;
  final double borderRadius;
  final bool isOutline;

  const CustomButton({
    Key? key,
    required this.text,
    this.onPressed,
    this.isLoading = false,
    this.width,
    this.height,
    this.backgroundColor,
    this.foregroundColor,
    this.fontSize = 16,
    this.fontWeight = FontWeight.w600,
    this.borderRadius = 12,
    this.isOutline = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final Color bgColor =
        backgroundColor ?? (isOutline ? Colors.transparent : AppColors.primary);
    final Color fgColor =
        foregroundColor ?? (isOutline ? AppColors.primary : Colors.white);

    return SizedBox(
      width: width,
      height: height,
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: bgColor,
          foregroundColor: fgColor,
          elevation: isOutline ? 0 : 2,
          shadowColor: isOutline
              ? Colors.transparent
              : AppColors.primary.withAlpha(77),
          padding: EdgeInsets.symmetric(
            vertical: height != null ? height! / 2 - 8 : 16,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(borderRadius),
            side: isOutline
                ? BorderSide(color: AppColors.primary)
                : BorderSide.none,
          ),
        ),
        child: isLoading
            ? SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(
                  color: fgColor,
                  strokeWidth: 2,
                ),
              )
            : Text(
                text,
                style: TextStyle(fontSize: fontSize, fontWeight: fontWeight),
              ),
      ),
    );
  }
}

// Outline button variant
class CustomOutlinedButton extends StatelessWidget {
  final String text;
  final VoidCallback onPressed;
  final bool isLoading;
  final double? width;
  final double? height;
  final double fontSize;
  final FontWeight fontWeight;
  final double borderRadius;

  const CustomOutlinedButton({
    Key? key,
    required this.text,
    required this.onPressed,
    this.isLoading = false,
    this.width,
    this.height,
    this.fontSize = 16,
    this.fontWeight = FontWeight.w600,
    this.borderRadius = 12,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      height: height,
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          foregroundColor: AppColors.primary,
          elevation: 0,
          shadowColor: Colors.transparent,
          padding: EdgeInsets.symmetric(
            vertical: height != null ? height! / 2 - 8 : 16,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(borderRadius),
            side: BorderSide(color: AppColors.primary),
          ),
        ),
        child: isLoading
            ? SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(
                  color: AppColors.primary,
                  strokeWidth: 2,
                ),
              )
            : Text(
                text,
                style: TextStyle(fontSize: fontSize, fontWeight: fontWeight),
              ),
      ),
    );
  }
}
