import 'dart:convert';
import 'dart:async';
import 'dart:io' show SocketException;
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/env.dart';

class ApiClient {
  /// Override this to use a custom API base URL (e.g. on a real device).
  /// Set via: ApiClient.overrideBaseUrl = 'http://192.168.1.x:5000/api';
  static String? overrideBaseUrl;

  static String get baseUrl {
    return MobileEnv.resolveApiBaseUrl(override: overrideBaseUrl);
  }

   static String get socketBaseUrl =>
       MobileEnv.resolveSocketBaseUrl(baseUrl);

   /// Returns the server base URL (without /api) for constructing image URLs
   static String get serverBaseUrl => socketBaseUrl;

  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  String? _token;
  String? _refreshToken;

  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  ApiClient._internal();

  // Token management
  Future<void> setTokens(String token, String refreshToken) async {
    _token = token;
    _refreshToken = refreshToken;
    await _storage.write(key: 'access_token', value: token);
    await _storage.write(key: 'refresh_token', value: refreshToken);
  }

  // Load tokens AND the saved server URL override
  Future<void> loadTokens() async {
    _token = await _storage.read(key: 'access_token');
    _refreshToken = await _storage.read(key: 'refresh_token');
    // Restore custom server URL if set (for real-device support)
    final prefs = await SharedPreferences.getInstance();
    final savedUrl = prefs.getString('server_url');
    if (savedUrl != null && savedUrl.isNotEmpty) {
      overrideBaseUrl = MobileEnv.normalizeApiBaseUrl(savedUrl);
      if (kDebugMode) {
        debugPrint('[ApiClient] Restored server_url override: $overrideBaseUrl');
      }
    }
  }

  Future<void> clearTokens() async {
    _token = null;
    _refreshToken = null;
    await _storage.delete(key: 'access_token');
    await _storage.delete(key: 'refresh_token');
  }

  bool get isAuthenticated => _token != null;
  String? get token => _token;

  // Headers with authentication
  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_token != null) 'Authorization': 'Bearer $_token',
  };

  // Execute request with retry logic for transient failures
  Future<http.Response> _executeWithRetry(Future<http.Response> Function() request) async {
    int attempt = 0;
    const maxAttempts = 3;
    while (true) {
      try {
        final response = await request();
        // Retry on server errors (5xx)
        if (response.statusCode >= 500 && response.statusCode < 600) {
          attempt++;
          if (attempt >= maxAttempts) {
            throw ApiException('Erreur serveur. Veuillez réessayer plus tard.');
          }
          await Future.delayed(Duration(milliseconds: 200 * (1 << attempt)));
          continue;
        }
        // Retry on rate limiting (429) with exponential backoff
        if (response.statusCode == 429) {
          attempt++;
          if (attempt >= maxAttempts) {
            throw ApiException('Trop de requêtes. Veuillez réessayer plus tard.');
          }
          // Exponential backoff: 1s, 2s, 4s
          await Future.delayed(Duration(seconds: 1 << attempt));
          continue;
        }
        return response;
      } on TimeoutException {
        attempt++;
        if (attempt >= maxAttempts) {
          throw ApiException('Délai de requête dépassé. Vérifiez votre connexion.');
        }
        await Future.delayed(Duration(milliseconds: 200 * (1 << attempt)));
      } on SocketException {
        attempt++;
        if (attempt >= maxAttempts) {
          throw ApiException('Erreur réseau. Veuillez réessayer plus tard.');
        }
        await Future.delayed(Duration(milliseconds: 200 * (1 << attempt)));
      } on http.ClientException {
        attempt++;
        if (attempt >= maxAttempts) {
          throw ApiException('Erreur réseau. Veuillez réessayer plus tard.');
        }
        await Future.delayed(Duration(milliseconds: 200 * (1 << attempt)));
      } catch (e) {
        rethrow;
      }
    }
  }

  // Generic GET request
  Future<dynamic> get(String endpoint) async {
    // Ensure tokens are loaded (safety net for first-time calls)
    if (_token == null) {
      await loadTokens();
    }
    try {
      final url = '$baseUrl$endpoint';
      if (kDebugMode) {
        debugPrint('[ApiClient] GET $url');
      }
      var response = await _executeWithRetry(() async {
        return await http
            .get(Uri.parse(url), headers: _headers)
            .timeout(MobileEnv.requestTimeout);
      });
      if (kDebugMode) {
        debugPrint('[ApiClient] Response status: ${response.statusCode}');
        debugPrint('[ApiClient] Response body: ${response.body}');
      }
      if (response.statusCode == 401) {
        await _refreshTokens();
        response = await _executeWithRetry(() async {
          return await http
              .get(Uri.parse('$baseUrl$endpoint'), headers: _headers)
              .timeout(MobileEnv.requestTimeout);
        });
      }
      return _handleResponse(response);
    } on TimeoutException {
      throw ApiException(
        'Délai de requête dépassé. Vérifiez que l\'application peut atteindre $socketBaseUrl.',
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Erreur réseau lors de la connexion à $socketBaseUrl: $e');
    }
  }

  // Generic POST request
  Future<dynamic> post(String endpoint, Map<String, dynamic> body) async {
    if (_token == null) await loadTokens();
    try {
      var response = await _executeWithRetry(() async {
        return await http
            .post(
              Uri.parse('$baseUrl$endpoint'),
              headers: _headers,
              body: jsonEncode(body),
            )
            .timeout(MobileEnv.requestTimeout);
      });
      if (response.statusCode == 401) {
        await _refreshTokens();
        response = await http
            .post(
              Uri.parse('$baseUrl$endpoint'),
              headers: _headers,
              body: jsonEncode(body),
            )
            .timeout(MobileEnv.requestTimeout);
      }
      return _handleResponse(response);
    } on TimeoutException {
      throw ApiException(
        'Délai de requête dépassé. Vérifiez que l\'application peut atteindre $socketBaseUrl.',
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Erreur réseau lors de la connexion à $socketBaseUrl: $e');
    }
  }

  // Generic PUT request
  Future<dynamic> put(String endpoint, Map<String, dynamic> body) async {
    try {
      var response = await _executeWithRetry(() async {
        return await http
            .put(
                Uri.parse('$baseUrl$endpoint'),
                headers: _headers,
                body: jsonEncode(body),
              )
            .timeout(MobileEnv.requestTimeout);
      });
      if (response.statusCode == 401) {
        await _refreshTokens();
        response = await _executeWithRetry(() async {
          return await http
              .put(
                Uri.parse('$baseUrl$endpoint'),
                headers: _headers,
                body: jsonEncode(body),
              )
              .timeout(MobileEnv.requestTimeout);
        });
      }
      return _handleResponse(response);
    } on TimeoutException {
      throw ApiException(
        'Délai de requête dépassé. Vérifiez que l\'application peut atteindre $socketBaseUrl.',
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Erreur réseau lors de la connexion à $socketBaseUrl: $e');
    }
  }

  // Generic DELETE request
  Future<dynamic> delete(String endpoint) async {
    try {
      var response = await _executeWithRetry(() async {
        return await http
            .delete(Uri.parse('$baseUrl$endpoint'), headers: _headers)
            .timeout(MobileEnv.requestTimeout);
      });
      if (response.statusCode == 401) {
        await _refreshTokens();
        response = await _executeWithRetry(() async {
          return await http
              .delete(Uri.parse('$baseUrl$endpoint'), headers: _headers)
              .timeout(MobileEnv.requestTimeout);
        });
      }
      return _handleResponse(response);
    } on TimeoutException {
      throw ApiException(
        'Délai de requête dépassé. Vérifiez que l\'application peut atteindre $socketBaseUrl.',
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Erreur réseau lors de la connexion à $socketBaseUrl: $e');
    }
  }

  // Multipart file upload
  Future<dynamic> uploadFiles(
    String endpoint,
    List<String> filePaths, {
    String fieldName = 'photos',
  }) async {
    try {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl$endpoint'),
      );
      if (_token != null) {
        request.headers['Authorization'] = 'Bearer $_token';
      }
      for (final path in filePaths) {
        request.files.add(await http.MultipartFile.fromPath(fieldName, path));
      }
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      return _handleResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Échec du téléchargement: $e');
    }
  }

  // PATCH request
  Future<dynamic> patch(String endpoint, Map<String, dynamic> body) async {
    try {
      var response = await _executeWithRetry(() async {
        return await http
            .patch(
              Uri.parse('$baseUrl$endpoint'),
              headers: _headers,
              body: jsonEncode(body),
            )
            .timeout(MobileEnv.requestTimeout);
      });
      if (response.statusCode == 401) {
        await _refreshTokens();
        response = await _executeWithRetry(() async {
          return await http
              .patch(
                Uri.parse('$baseUrl$endpoint'),
                headers: _headers,
                body: jsonEncode(body),
              )
              .timeout(MobileEnv.requestTimeout);
        });
      }
      return _handleResponse(response);
    } on TimeoutException {
      throw ApiException(
        'Délai de requête dépassé. Vérifiez que l\'application peut atteindre $socketBaseUrl.',
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Erreur réseau lors de la connexion à $socketBaseUrl: $e');
    }
  }

  // Handle response and errors
  dynamic _handleResponse(http.Response response) {
    final body = _decodeResponseBody(response.body);

    switch (response.statusCode) {
      case 200:
      case 201:
        return body;
      case 400:
        throw ApiException(body?['message'] ?? 'Mauvaise requête');
      case 401:
        throw ApiException('Non autorisé');
      case 403:
        throw ApiException(body?['message'] ?? 'Accès refusé');
      case 404:
        throw ApiException(body?['message'] ?? 'Non trouvé');
      case 429:
        throw ApiException('Trop de requêtes. Veuillez réessayer plus tard.');
      case 500:
        throw ApiException('Erreur serveur. Veuillez réessayer plus tard.');
      default:
        throw ApiException(body?['message'] ?? 'Une erreur inconnue s\'est produite');
    }
  }

  dynamic _decodeResponseBody(String body) {
    if (body.isEmpty) {
      return null;
    }

    final trimmed = body.trimLeft();
    if (trimmed.startsWith('<!DOCTYPE html') || trimmed.startsWith('<html')) {
      if (kDebugMode) {
        final preview = trimmed.length > 180
            ? '${trimmed.substring(0, 180)}...'
            : trimmed;
        debugPrint('[ApiClient] HTML response from $baseUrl: $preview');
      }

      return {
        'message':
            'Réponse API invalide de $baseUrl. L\'application atteint une page web au lieu de l\'API backend. Vérifiez l\'URL du serveur configurée.',
      };
    }

    try {
      return jsonDecode(body);
    } catch (_) {
      final preview = body.length > 180 ? '${body.substring(0, 180)}...' : body;
      if (kDebugMode) {
        debugPrint('[ApiClient] Non-JSON response from $baseUrl: $preview');
      }
      return {'message': preview};
    }
  }

  // Refresh tokens when 401 is received
  Future<void> _refreshTokens() async {
    if (_refreshToken == null) {
      await clearTokens();
      throw ApiException('Session expirée. Veuillez vous reconnecter.');
    }

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/refresh-token'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': _refreshToken}),
      ).timeout(MobileEnv.requestTimeout);

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        await setTokens(body['accessToken'], body['refreshToken']);
        // Tokens refreshed — caller will retry the original request
        return;
      } else {
        await clearTokens();
        throw ApiException('Session expirée. Veuillez vous reconnecter.');
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      await clearTokens();
      throw ApiException('Session expirée. Veuillez vous reconnecter.');
    }
  }
}

class ApiException implements Exception {
  final String message;
  ApiException(this.message);

  @override
  String toString() => message;
}
