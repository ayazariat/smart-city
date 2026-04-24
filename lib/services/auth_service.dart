import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_client.dart';
import '../models/user_model.dart';

final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(ref.read(apiClientProvider));
});

class AuthService {
  final ApiClient _apiClient;

  AuthService(this._apiClient);

  Future<UserModel?> login(String email, String password) async {
    try {
      final response = await _apiClient.post('/auth/login', {
        'email': email,
        'password': password,
      });
      return UserModel.fromJson(response['user']);
    } catch (e) {
      rethrow;
    }
  }

  Future<UserModel?> register(
    String email,
    String password,
    String firstName,
    String lastName,
    String phone,
  ) async {
    try {
      final response = await _apiClient.post('/auth/register', {
        'email': email,
        'password': password,
        'firstName': firstName,
        'lastName': lastName,
        'phone': phone,
      });
      return UserModel.fromJson(response['user']);
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
}
