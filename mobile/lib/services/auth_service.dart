import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_client.dart';
import '../models/user_model.dart';
import '../providers/api_client_provider.dart';

final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(ref.read(apiClientProvider));
});

class AuthService {
  final ApiClient _apiClient;

  AuthService(this._apiClient);

  /// Initialize auth service - must be called on app startup
  Future<void> initialize() async {
    await _apiClient.loadTokens();
  }

  Future<User?> login(
    String email,
    String password, {
    String? captchaToken,
  }) async {
    try {
      final response = await _apiClient.post('/auth/login', {
        'email': email,
        'password': password,
        if (captchaToken != null && captchaToken.isNotEmpty)
          'captchaToken': captchaToken,
      });
      await _persistTokensFromResponse(response);
      return User.fromJson(response['user']);
    } catch (e) {
      rethrow;
    }
  }

  Future<User?> register(
    String email,
    String password,
    String fullName,
    String role,
    String? phone,
    String? governorate,
    String? municipality, {
    String? captchaToken,
  }) async {
    try {
      final response = await _apiClient.post('/auth/register', {
        'email': email,
        'password': password,
        'fullName': fullName,
        'role': role,
        'phone': phone,
        'governorate': governorate,
        'municipality': municipality,
        if (captchaToken != null && captchaToken.isNotEmpty)
          'captchaToken': captchaToken,
      });
      await _persistTokensFromResponse(response);
      return User.fromJson(response['user']);
    } catch (e) {
      rethrow;
    }
  }

  Future<bool> logout() async {
    try {
      await _apiClient.post('/auth/logout', {});
      return true;
    } catch (e) {
      return false;
    } finally {
      await _apiClient.clearTokens();
    }
  }

  Future<String?> forgotPassword(String email) async {
    try {
      final response = await _apiClient.post('/auth/forgot-password', {
        'email': email,
      });
      return response['message'];
    } catch (e) {
      rethrow;
    }
  }

  Future<bool> resetPassword({
    required String token,
    required String newPassword,
    String? userId,
  }) async {
    try {
      await _apiClient.post('/auth/reset-password', {
        'token': token,
        'newPassword': newPassword,
        if (userId != null && userId.isNotEmpty) 'userId': userId,
      });
      return true;
    } catch (e) {
      rethrow;
    }
  }

  Future<bool> setPassword({
    required String token,
    required String email,
    required String password,
  }) async {
    try {
      await _apiClient.post('/auth/set-password', {
        'token': token,
        'email': email,
        'password': password,
      });
      return true;
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> verifyMagicLink({
    required String token,
    required String userId,
  }) async {
    final response = await _apiClient.get(
      '/auth/verify-magic-link?token=${Uri.encodeQueryComponent(token)}&userId=${Uri.encodeQueryComponent(userId)}',
    );
    await _persistTokensFromResponse(response);
    return Map<String, dynamic>.from(response as Map);
  }

  Future<User?> getCurrentUser() async {
    await _apiClient.loadTokens();
    final response = await _apiClient.get('/auth/me');
    return User.fromJson(response);
  }

  Future<User?> updateProfile(
    String firstName,
    String lastName,
    String phone,
  ) async {
    try {
      final response = await _apiClient.put('/auth/profile', {
        'firstName': firstName,
        'lastName': lastName,
        'phone': phone,
      });
      return User.fromJson(response['user']);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      final response = await _apiClient.put('/auth/change-password', {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      });
      return response;
    } catch (e) {
      rethrow;
    }
  }

  Future<void> _persistTokensFromResponse(dynamic response) async {
    if (response is! Map) {
      return;
    }

    final accessToken = (response['accessToken'] ?? response['token'])
        ?.toString();
    final refreshToken = response['refreshToken']?.toString();

    if (accessToken != null &&
        accessToken.isNotEmpty &&
        refreshToken != null &&
        refreshToken.isNotEmpty) {
      await _apiClient.setTokens(accessToken, refreshToken);
    }
  }
}
