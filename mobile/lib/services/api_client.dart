import 'dart:convert';
import 'dart:async';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  /// Override this to use a custom API base URL (e.g. on a real device).
  /// Set via: ApiClient.overrideBaseUrl = 'http://192.168.1.x:5000/api';
  static String? overrideBaseUrl;

  static String get baseUrl {
    if (overrideBaseUrl != null && overrideBaseUrl!.isNotEmpty) {
      return overrideBaseUrl!;
    }
    // Android emulator uses 10.0.2.2 to reach host machine localhost.
    // For a real Android/iOS device on the same WiFi, set overrideBaseUrl to your machine IP.
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:5000/api';
    }
    return 'http://localhost:5000/api';
  }

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
      overrideBaseUrl = savedUrl;
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

  // Generic GET request
  Future<dynamic> get(String endpoint) async {
    try {
      var response = await http
          .get(Uri.parse('$baseUrl$endpoint'), headers: _headers)
          .timeout(const Duration(seconds: 15));
      if (response.statusCode == 401) {
        await _refreshTokens();
        response = await http
            .get(Uri.parse('$baseUrl$endpoint'), headers: _headers)
            .timeout(const Duration(seconds: 15));
      }
      return _handleResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network error: $e');
    }
  }

  // Generic POST request
  Future<dynamic> post(String endpoint, Map<String, dynamic> body) async {
    try {
      var response = await http
          .post(
            Uri.parse('$baseUrl$endpoint'),
            headers: _headers,
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 15));
      if (response.statusCode == 401) {
        await _refreshTokens();
        response = await http
            .post(
              Uri.parse('$baseUrl$endpoint'),
              headers: _headers,
              body: jsonEncode(body),
            )
            .timeout(const Duration(seconds: 15));
      }
      return _handleResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network error: $e');
    }
  }

  // Generic PUT request
  Future<dynamic> put(String endpoint, Map<String, dynamic> body) async {
    try {
      var response = await http
          .put(
            Uri.parse('$baseUrl$endpoint'),
            headers: _headers,
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 15));
      if (response.statusCode == 401) {
        await _refreshTokens();
        response = await http
            .put(
              Uri.parse('$baseUrl$endpoint'),
              headers: _headers,
              body: jsonEncode(body),
            )
            .timeout(const Duration(seconds: 15));
      }
      return _handleResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network error: $e');
    }
  }

  // Generic DELETE request
  Future<dynamic> delete(String endpoint) async {
    try {
      var response = await http
          .delete(Uri.parse('$baseUrl$endpoint'), headers: _headers)
          .timeout(const Duration(seconds: 15));
      if (response.statusCode == 401) {
        await _refreshTokens();
        response = await http
            .delete(Uri.parse('$baseUrl$endpoint'), headers: _headers)
            .timeout(const Duration(seconds: 15));
      }
      return _handleResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network error: $e');
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
      var response = await http
          .patch(
            Uri.parse('$baseUrl$endpoint'),
            headers: _headers,
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 15));
      if (response.statusCode == 401) {
        await _refreshTokens();
        response = await http
            .patch(
              Uri.parse('$baseUrl$endpoint'),
              headers: _headers,
              body: jsonEncode(body),
            )
            .timeout(const Duration(seconds: 15));
      }
      return _handleResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network error: $e');
    }
  }

  // Handle response and errors
  dynamic _handleResponse(http.Response response) {
    final body = response.body.isNotEmpty ? jsonDecode(response.body) : null;

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
      );

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
