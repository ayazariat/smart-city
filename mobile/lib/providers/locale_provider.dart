import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum AppLocale { fr, en, ar }

class LocaleNotifier extends StateNotifier<AppLocale> {
  LocaleNotifier() : super(AppLocale.fr);

  Locale get currentLocale {
    switch (state) {
      case AppLocale.fr:
        return const Locale('fr');
      case AppLocale.en:
        return const Locale('en');
      case AppLocale.ar:
        return const Locale('ar');
    }
  }

  TextDirection get textDirection {
    switch (state) {
      case AppLocale.ar:
        return TextDirection.rtl;
      default:
        return TextDirection.ltr;
    }
  }

  void setLocale(AppLocale locale) => state = locale;
  void toggle() {
    state = AppLocale.values[(state.index + 1) % AppLocale.values.length];
  }
}

final localeProvider = StateNotifierProvider<LocaleNotifier, AppLocale>((ref) {
  return LocaleNotifier();
});
