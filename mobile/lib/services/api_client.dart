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
            throw ApiException('Server error. Please try again later.');
          }
          await Future.delayed(Duration(milliseconds: 200 * (1 << attempt)));
          continue;
        }
        return response;
      } on TimeoutException {
        attempt++;
        if (attempt >= maxAttempts) {
          throw ApiException('Request timed out. Check your connection.');
        }
        await Future.delayed(Duration(milliseconds: 200 * (1 << attempt)));
      } on SocketException {
        attempt++;
        if (attempt >= maxAttempts) {
          throw ApiException('Network error. Please check your connection.');
        }
        await Future.delayed(Duration(milliseconds: 200 * (1 << attempt)));
      } on http.ClientException {
        attempt++;
        if (attempt >= maxAttempts) {
          throw ApiException('Network error. Please try again later.');
        }
        await Future.delayed(Duration(milliseconds: 200 * (1 << attempt)));
      } catch (e) {
        rethrow;
      }
    }
  }

  // Generic GET request
  Future<dynamic> get(String endpoint) async {
    try {
      var response = await _executeWithRetry(() async {
        return await http
            .get(Uri.parse('$baseUrl$endpoint'), headers: _headers)
            .timeout(MobileEnv.requestTimeout);
      });
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
        'Request timed out. Check that the app can reach $socketBaseUrl.',
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network error while reaching $socketBaseUrl: $e');
    }
  }

  // Generic POST request
  Future<dynamic> post(String endpoint, Map<String, dynamic> body) async {
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
        response = await _executeWithRetry(() async {
          return await http
              .post(
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
        'Request timed out. Check that the app can reach $socketBaseUrl.',
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network error while reaching $socketBaseUrl: $e');
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
        'Request timed out. Check that the app can reach $socketBaseUrl.',
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network error while reaching $socketBaseUrl: $e');
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
        'Request timed out. Check that the app can reach $socketBaseUrl.',
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network error while reaching $socketBaseUrl: $e');
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
      throw ApiException('Upload failed: $e');
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
        'Request timed out. Check that the app can reach $socketBaseUrl.',
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network error while reaching $socketBaseUrl: $e');
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
        throw ApiException(body?['message'] ?? 'Bad request');
      case 401:
        throw ApiException('Unauthorized');
      case 403:
        throw ApiException(body?['message'] ?? 'Access denied');
      case 404:
        throw ApiException(body?['message'] ?? 'Not found');
      case 500:
        throw ApiException('Server error. Please try again later.');
      default:
        throw ApiException(body?['message'] ?? 'Unknown error occurred');
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
            'Invalid API response from $baseUrl. The app is reaching a web page instead of the backend API. Check the configured server URL.',
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
      throw ApiException('Session expired. Please login again.');
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
        throw ApiException('Session expired. Please login again.');
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      await clearTokens();
      throw ApiException('Session expired. Please login again.');
    }
  }
}

class ApiException implements Exception {
  final String message;
  ApiException(this.message);

  @override
  String toString() => message;
}
