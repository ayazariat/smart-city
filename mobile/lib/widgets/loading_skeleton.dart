import 'package:flutter/material.dart';
import 'package:smart_city_app/core/constants/app_theme.dart';

class LoadingSkeleton extends StatelessWidget {
  final double? width;
  final double? height;
  final BorderRadius? borderRadius;

  const LoadingSkeleton({
    super.key,
    this.width,
    this.height,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: AppTheme.textMuted.withOpacity(0.1),
        borderRadius: borderRadius ?? BorderRadius.circular(AppTheme.radiusMd),
      ),
    );
  }
}

class CardSkeleton extends StatelessWidget {
  const CardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusXl),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const LoadingSkeleton(
                width: 40,
                height: 40,
                borderRadius: BorderRadius.all(Radius.circular(10)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    LoadingSkeleton(
                      width: double.infinity,
                      height: 16,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    const SizedBox(height: 8),
                    LoadingSkeleton(
                      width: 100,
                      height: 12,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          LoadingSkeleton(
            width: double.infinity,
            height: 12,
            borderRadius: BorderRadius.circular(4),
          ),
          const SizedBox(height: 8),
          LoadingSkeleton(
            width: double.infinity,
            height: 12,
            borderRadius: BorderRadius.circular(4),
          ),
          const SizedBox(height: 8),
          LoadingSkeleton(
            width: 150,
            height: 12,
            borderRadius: BorderRadius.circular(4),
          ),
        ],
      ),
    );
  }
}

class ListSkeleton extends StatelessWidget {
  final int itemCount;

  const ListSkeleton({super.key, this.itemCount = 5});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: itemCount,
      physics: const NeverScrollableScrollPhysics(),
      shrinkWrap: true,
      itemBuilder: (context, index) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: const CardSkeleton(),
      ),
    );
  }
}
