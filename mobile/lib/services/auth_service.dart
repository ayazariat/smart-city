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

  Future<User?> login(
    String email,
    String password, {
    String? captchaToken,
  }) async {
    try {
      final response = await _apiClient.post('/auth/login', {
        'email': email,
        'password': password,
        if (captchaToken != null) 'captchaToken': captchaToken,
      });
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
        if (captchaToken != null) 'captchaToken': captchaToken,
      });
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

  Future<bool> resetPassword(String token, String password) async {
    try {
      await _apiClient.post('/auth/reset-password', {
        'token': token,
        'password': password,
      });
      return true;
    } catch (e) {
      rethrow;
    }
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
}
