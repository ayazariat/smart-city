import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/screens/login_screen.dart';
import 'package:smart_city_app/screens/home_screen.dart';
import 'package:smart_city_app/providers/auth_provider.dart';
import 'package:smart_city_app/providers/theme_provider.dart';

// Theme colors matching web (Civic Green)
class AppColors {
  static const Color primary = Color(0xFF2E7D32);
  static const Color primaryLight = Color(0xFF4CAF50);
  static const Color primaryDark = Color(0xFF1B5E20);
  static const Color secondary = Color(0xFFF5F7FA);
  static const Color surface = Color(0xFFF5F7FA);
  static const Color attention = Color(0xFFF57C00);
  static const Color success = Color(0xFF81C784);
  static const Color urgent = Color(0xFFC62828);
  static const Color error = Color(0xFFC62828);
  static const Color textPrimary = Color(0xFF1E293B);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color assigned = Color(0xFFFF9800);
  static const Color inProgress = Color(0xFFFF5722);
  static const Color resolved = Color(0xFF4CAF50);
  static const Color accent = Color(0xFF1976D2);
  static const Color warning = Color(0xFFFFA726);
  static const Color submitted = Color(0xFF2196F3);
  static const Color validated = Color(0xFF9C27B0);
  static const Color closed = Color(0xFF757575);
  static const Color rejected = Color(0xFFC62828);
}

void main() {
  runApp(const ProviderScope(child: SmartCityApp()));
}

class SmartCityApp extends ConsumerWidget {
  const SmartCityApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);

    return MaterialApp(
      title: 'Smart City Tunisia',
      debugShowCheckedModeBanner: false,
      themeMode: themeMode,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primary,
          brightness: Brightness.light,
          primary: AppColors.primary,
          secondary: AppColors.secondary,
          error: AppColors.urgent,
        ),
        useMaterial3: true,
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: AppColors.primary, width: 2),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 12,
          ),
        ),
      ),
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primary,
          brightness: Brightness.dark,
          primary: AppColors.primaryLight,
          error: AppColors.urgent,
        ),
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFF0A1628),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF112240),
          foregroundColor: Colors.white,
          elevation: 0,
        ),
        cardTheme: const CardThemeData(
          color: Color(0xFF112240),
          elevation: 2,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryLight,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: AppColors.primaryLight, width: 2),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 12,
          ),
        ),
        navigationBarTheme: NavigationBarThemeData(
          backgroundColor: const Color(0xFF112240),
          indicatorColor: AppColors.primaryLight.withAlpha(40),
        ),
        dialogTheme: const DialogThemeData(
          backgroundColor: Color(0xFF112240),
        ),
      ),
      home: const AuthWrapper(),
    );
  }
}

// Auth wrapper using Riverpod authProvider
class AuthWrapper extends ConsumerWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    if (authState.isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (authState.isAuthenticated && authState.user != null) {
      return HomeScreen(
        onLogout: () => ref.read(authProvider.notifier).logout(),
        userRole: authState.user!.role,
        userName: authState.user!.fullName,
      );
    }

    return LoginScreen(
      onLoginSuccess: (_) {
        // Auth state is managed by Riverpod — no manual setState needed
      },
    );
  }
}
