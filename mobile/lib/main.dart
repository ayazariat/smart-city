// ========== MAIN APP ==========
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:smart_city_app/core/constants/colors.dart';
import 'package:smart_city_app/services/api_client.dart';
import 'package:smart_city_app/providers/auth_provider.dart';
import 'package:smart_city_app/models/user_model.dart';
import 'package:smart_city_app/providers/locale_provider.dart';
import 'package:smart_city_app/screens/auth/login_screen.dart';
import 'package:smart_city_app/screens/auth/register_screen.dart';
import 'package:smart_city_app/screens/auth/forgot_password_screen.dart';
import 'package:smart_city_app/screens/auth/reset_password_screen.dart';
import 'package:smart_city_app/screens/auth/set_password_screen.dart';
import 'package:smart_city_app/screens/verify_email_screen.dart';
import 'package:smart_city_app/screens/home/home_screen.dart' as home;
import 'package:smart_city_app/screens/home/transparency_screen.dart' as home_transparency;
import 'package:smart_city_app/routes/app_routes.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );
  await _initializeApp();
  setPreloadedAuthUser(_preloadedUser);
  runApp(const ProviderScope(child: MyApp()));
}

User? _preloadedUser;

Future<void> _initializeApp() async {
  try {
    final api = ApiClient();
    await api.loadTokens();
    if (api.token != null) {
      try {
        final me = await api.get('/auth/me');
        if (me is Map) {
          // /auth/me returns the user object directly (flat, no wrapper)
          // but also handle {user: {...}} format just in case
          dynamic userData = me;
          if (me['user'] is Map) {
            userData = me['user'];
          }
          final userMap = userData is Map<String, dynamic>
              ? userData
              : Map<String, dynamic>.from(userData as Map);
          if (userMap['id'] != null || userMap['_id'] != null) {
            _preloadedUser = User.fromJson(userMap);
          }
        }
      } catch (e) {
        debugPrint('Session restore failed: $e');
        await api.clearTokens();
      }
    }
  } catch (e) {
    debugPrint('Auth init: $e');
  }
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final localeNotifier = ref.watch(localeProvider.notifier);

    return MaterialApp(
      title: 'Smart City Tunisia',
      debugShowCheckedModeBanner: false,
      locale: localeNotifier.currentLocale,
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('fr', 'FR'),
        Locale('en', 'US'),
        Locale('ar', 'SA'),
      ],
      localeResolutionCallback: (deviceLocale, supportedLocales) {
        if (deviceLocale == null) return const Locale('fr');
        for (var supported in supportedLocales) {
          if (supported.languageCode == deviceLocale.languageCode) {
            return supported;
          }
        }
        return const Locale('fr');
      },
      theme: _buildTheme(),
      // AuthGate reacts to auth state changes — no initialRoute needed
      home: const AuthGate(),
      routes: {
        AppRoutes.login: (_) => const LoginScreen(),
        AppRoutes.register: (_) => const RegisterScreen(),
        AppRoutes.forgotPassword: (_) => const ForgotPasswordScreen(),
        AppRoutes.resetPassword: (_) => const ResetPasswordScreen(token: ''),
        AppRoutes.setPassword: (_) => const SetPasswordScreen(token: '', email: ''),
        AppRoutes.verifyEmail: (_) => const VerifyEmailScreen(email: ''),
        // Public dashboard accessible from login screen button
        AppRoutes.transparency: (_) => const home_transparency.TransparencyScreen(),
      },
    );
  }

  ThemeData _buildTheme() => ThemeData(
    primaryColor: AppColors.primary,
    scaffoldBackgroundColor: AppColors.background,
    colorScheme: const ColorScheme.light(
      primary: AppColors.primary,
      secondary: AppColors.accent,
    ),
    useMaterial3: true,
    visualDensity: VisualDensity.adaptivePlatformDensity,
  );
}

/// Reactive auth gate — rebuilds whenever auth state changes.
/// Authenticated → HomeScreen, Unauthenticated → LoginScreen.
class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    if (user != null) {
      return const home.HomeScreen();
    }
    return const LoginScreen();
  }
}
