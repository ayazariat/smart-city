// ========== AUTH PROVIDER ==========
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/services/auth_service.dart';
import 'package:smart_city_app/models/user_model.dart';

// Holds the user pre-loaded during app startup (before ProviderScope is created)
User? _preloadedAuthUser;

/// Call this before runApp to seed the auth provider with a restored session.
void setPreloadedAuthUser(User? user) {
  _preloadedAuthUser = user;
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.read(authServiceProvider), initialUser: _preloadedAuthUser);
});

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthService _authService;

  AuthNotifier(this._authService, {User? initialUser})
      : super(AuthState(user: initialUser));

  Future<void> login(
    String email,
    String password, {
    String? captchaToken,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final user = await _authService.login(
        email,
        password,
        captchaToken: captchaToken,
      );
      state = state.copyWith(isLoading: false, user: user, clearError: true);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  Future<void> register(
    String email,
    String password,
    String fullName,
    String role,
    String? phone,
    String? governorate,
    String? municipality, {
    String? captchaToken,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final user = await _authService.register(
        email,
        password,
        fullName,
        role,
        phone,
        governorate,
        municipality,
        captchaToken: captchaToken,
      );
      state = state.copyWith(isLoading: false, user: user, clearError: true);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  Future<void> forgotPassword(String email) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      await _authService.forgotPassword(email);
      state = state.copyWith(isLoading: false, clearError: true);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  Future<void> updateProfile(
    String firstName,
    String lastName,
    String phone,
  ) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final user = await _authService.updateProfile(firstName, lastName, phone);
      state = state.copyWith(isLoading: false, user: user, clearError: true);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    state = const AuthState();
  }
}

class AuthState {
  final bool isLoading;
  final String? errorMessage;
  final User? user;

  const AuthState({this.isLoading = false, this.errorMessage, this.user});

  AuthState copyWith({bool? isLoading, String? errorMessage, User? user, bool clearUser = false, bool clearError = false}) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      user: clearUser ? null : (user ?? this.user),
    );
  }
}
