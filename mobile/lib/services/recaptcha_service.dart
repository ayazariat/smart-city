import 'package:flutter/foundation.dart';

class RecaptchaService {
  static String get siteKey {
    try {
      final key = const String.fromEnvironment('RECAPTCHA_SITE_KEY');
      if (key == 'null' || key.isEmpty) return '';
      return key;
    } catch (e) {
      return '';
    }
  }

  static bool get isEnabled => siteKey.isNotEmpty;

  static Future<String?> getToken() async {
    return null;
  }
}
