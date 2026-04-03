import 'api_client.dart';
import '../models/user_model.dart';

class AuthService {
  final ApiClient _api = ApiClient();
  User? _currentUser;

  User? get currentUser => _currentUser;
  bool get isAuthenticated => _api.isAuthenticated;

  Future<void> initialize() async {
    await _api.loadTokens();
    if (_api.isAuthenticated) {
      try {
        await _getCurrentUser();
      } catch (e) {
        await logout();
      }
    }
  }

  Future<User> login(String email, String password) async {
    final response = await _api.post('/auth/login', {
      'email': email,
      'password': password,
    });

    final token = response['accessToken'];
    final refreshToken = response['refreshToken'];

    if (token == null) {
      throw ApiException('Login failed: No token received');
    }

    await _api.setTokens(token, refreshToken ?? '');
    _currentUser = User.fromJson(response['user'] ?? {});

    return _currentUser!;
  }

  Future<User> register({
    required String email,
    required String password,
    required String fullName,
    required String role,
    String? phone,
    String? municipality,
    String? governorate,
  }) async {
    final response = await _api.post('/auth/register', {
      'email': email,
      'password': password,
      'fullName': fullName,
      'role': role,
      'phone': ?phone,
      'municipality': ?municipality,
      'governorate': ?governorate,
    });

    return User.fromJson(response['user'] ?? {});
  }

  Future<User> _getCurrentUser() async {
    final response = await _api.get('/auth/me');
    _currentUser = User.fromJson(response['user'] ?? response);
    return _currentUser!;
  }

  Future<void> logout() async {
    _currentUser = null;
    await _api.clearTokens();
  }

  Future<User> updateProfile({
    String? fullName,
    String? phone,
    String? municipality,
    String? governorate,
  }) async {
    final response = await _api.put('/auth/profile', {
      'fullName': ?fullName,
      'phone': ?phone,
      'municipality': ?municipality,
      'governorate': ?governorate,
    });

    _currentUser = User.fromJson(response['user'] ?? response);
    return _currentUser!;
  }

  Future<void> forgotPassword(String email) async {
    await _api.post('/auth/forgot-password', {'email': email});
  }

  Future<void> resetPassword(String token, String password) async {
    await _api.post('/auth/reset-password', {
      'token': token,
      'password': password,
    });
  }

  Future<void> verifyAccount(String code) async {
    await _api.post('/auth/verify', {'code': code});
  }
}
