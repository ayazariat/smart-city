import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class MobileEnv {
  MobileEnv._();

  static const String _expoPublicApiUrl = String.fromEnvironment(
    'EXPO_PUBLIC_API_URL',
    defaultValue: '',
  );
  static const String _apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: '',
  );

  static const Duration requestTimeout = Duration(seconds: 15);
  static const Duration scheduledRefreshInterval = Duration(seconds: 60);

  static bool _isLocalDevHost(String host) {
    return host == 'localhost' ||
        host == '127.0.0.1' ||
        host == '10.0.2.2' ||
        host.startsWith('192.168.') ||
        host.startsWith('10.') ||
        host.startsWith('172.16.') ||
        host.startsWith('172.17.') ||
        host.startsWith('172.18.') ||
        host.startsWith('172.19.') ||
        host.startsWith('172.2') ||
        host.startsWith('172.30.') ||
        host.startsWith('172.31.');
  }

  static String normalizeApiBaseUrl(String url) {
    var normalized = url.trim();
    while (normalized.endsWith('/')) {
      normalized = normalized.substring(0, normalized.length - 1);
    }

    if (normalized.isEmpty) {
      return normalized;
    }

    final uri = Uri.tryParse(normalized);
    if (uri == null) {
      return normalized.endsWith('/api') ? normalized : '$normalized/api';
    }

    if ((uri.scheme != 'http' && uri.scheme != 'https') || uri.host.isEmpty) {
      return normalized;
    }

    if (_isLocalDevHost(uri.host) && (uri.port == 3000 || uri.port == 3001)) {
      return uri.replace(port: 5000, path: '/api', query: '', fragment: '').toString();
    }

    final path = uri.path;
    if (path.isEmpty || path == '/') {
      return uri.replace(path: '/api', query: '', fragment: '').toString();
    }

    return path.endsWith('/api')
        ? uri.replace(query: '', fragment: '').toString()
        : uri.replace(path: '/api', query: '', fragment: '').toString();
  }

  static String resolveApiBaseUrl({String? override}) {
    if (override != null && override.trim().isNotEmpty) {
      return normalizeApiBaseUrl(override);
    }

    if (_expoPublicApiUrl.isNotEmpty) {
      return normalizeApiBaseUrl(_expoPublicApiUrl);
    }

    if (_apiBaseUrl.isNotEmpty) {
      return normalizeApiBaseUrl(_apiBaseUrl);
    }

    if (kIsWeb || defaultTargetPlatform == TargetPlatform.iOS) {
      return 'http://localhost:5000/api';
    }

    return 'http://10.0.2.2:5000/api';
  }

  static String resolveSocketBaseUrl(String apiBaseUrl) {
    return apiBaseUrl.replaceFirst(RegExp(r'/api/?$'), '');
  }
}
