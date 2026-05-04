import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/providers/locale_provider.dart';

class LanguagePicker extends ConsumerWidget {
  const LanguagePicker({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final currentLanguage = _getLanguageLabel(locale);
    final isOpen = ValueNotifier<bool>(false);

    return PopupMenuButton<AppLocale>(
      icon: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.language, size: 20, color: Colors.white),
          const SizedBox(width: 4),
          Text(
            currentLanguage,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
          const Icon(Icons.arrow_drop_down, size: 20, color: Colors.white),
        ],
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      onSelected: (AppLocale newLocale) {
        ref.read(localeProvider.notifier).setLocale(newLocale);
      },
      itemBuilder: (context) => [
        _buildMenuItem(AppLocale.fr, 'Français', '🇫🇷', locale),
        _buildMenuItem(AppLocale.en, 'English', '🇬🇧', locale),
        _buildMenuItem(AppLocale.ar, 'العربية', '🇹🇳', locale),
      ],
    );
  }

  PopupMenuItem<AppLocale> _buildMenuItem(
    AppLocale value,
    String label,
    String flag,
    AppLocale current,
  ) {
    final isSelected = value == current;
    return PopupMenuItem(
      value: value,
      child: Row(
        children: [
          Text(flag, style: const TextStyle(fontSize: 16)),
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w400,
              color: isSelected ? Colors.green[700] : Colors.black87,
            ),
          ),
          if (isSelected) ...[
            const Spacer(),
            Icon(Icons.check, size: 16, color: Colors.green[700]),
          ],
        ],
      ),
    );
  }

  String _getLanguageLabel(AppLocale locale) {
    switch (locale) {
      case AppLocale.fr:
        return 'FR';
      case AppLocale.en:
        return 'EN';
      case AppLocale.ar:
        return 'AR';
    }
  }
}
