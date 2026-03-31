import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user_model.dart';
import '../services/api_client.dart';
import 'notifications_provider.dart';

// Auth state
class AuthState {
  final User? user;
  final bool isLoading;
  final String? error;

  AuthState({this.user, this.isLoading = false, this.error});

  AuthState copyWith({User? user, bool? isLoading, String? error}) {
    return AuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }

  bool get isAuthenticated => user != null;
}

// Auth notifier
class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _api;
  final Ref _ref;

  AuthNotifier(this._api, this._ref) : super(AuthState()) {
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    await _api.loadTokens();
    if (_api.isAuthenticated) {
      try {
        final response = await _api.get('/auth/me');
        final user = User.fromJson(response['user'] ?? response);
        state = state.copyWith(user: user);

        // Connect socket if we have a valid session
        if (_api.token != null && user.id.isNotEmpty) {
          _ref
              .read(notificationsProvider.notifier)
              .connectSocket(_api.token!, user.id);
        }
      } catch (e) {
        await _api.clearTokens();
      }
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _api.post('/auth/login', {
        'email': email,
        'password': password,
      });

      final token = response['accessToken'];
      final refreshToken = response['refreshToken'];

      if (token == null) throw Exception('No token received');

      await _api.setTokens(token, refreshToken ?? '');
      final user = User.fromJson(response['user'] ?? {});

      state = state.copyWith(user: user, isLoading: false);

      // Connect socket after login
      if (user.id.isNotEmpty) {
        _ref.read(notificationsProvider.notifier).connectSocket(token, user.id);
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceAll('Exception: ', ''),
      );
      rethrow;
    }
  }

  Future<void> register({
    required String email,
    required String password,
    required String fullName,
    required String role,
    String? phone,
    String? municipality,
    String? governorate,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _api.post('/auth/register', {
        'email': email,
        'password': password,
        'fullName': fullName,
        'role': role,
        if (phone != null) 'phone': phone,
        if (municipality != null) 'municipality': municipality,
        if (governorate != null) 'governorate': governorate,
      });
      state = state.copyWith(isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceAll('Exception: ', ''),
      );
      rethrow;
    }
  }

  Future<void> logout() async {
    // Disconnect socket before logout
    _ref.read(notificationsProvider.notifier).disconnectSocket();
    await _api.clearTokens();
    state = AuthState();
  }

  Future<void> updateProfile({
    String? fullName,
    String? phone,
    String? municipality,
    String? governorate,
  }) async {
    state = state.copyWith(isLoading: true);
    try {
      final response = await _api.put('/auth/profile', {
        if (fullName != null) 'fullName': fullName,
        if (phone != null) 'phone': phone,
        if (municipality != null) 'municipality': municipality,
        if (governorate != null) 'governorate': governorate,
      });
      final user = User.fromJson(response['user'] ?? response);
      state = state.copyWith(user: user, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false);
      rethrow;
    }
  }
}

// Providers
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final api = ref.watch(apiClientProvider);
  return AuthNotifier(api, ref);
});

final currentUserProvider = Provider<User?>((ref) {
  return ref.watch(authProvider).user;
});

final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isAuthenticated;
});
