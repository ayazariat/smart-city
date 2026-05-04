import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum AppLanguage { french, english, arabic }

class LocalizationNotifier extends StateNotifier<AppLanguage> {
  LocalizationNotifier() : super(AppLanguage.french);

  void setLanguage(AppLanguage lang) => state = lang;

  Locale get locale {
    switch (state) {
      case AppLanguage.french:
        return const Locale('fr', 'FR');
      case AppLanguage.english:
        return const Locale('en', 'US');
      case AppLanguage.arabic:
        return const Locale('ar', 'SA');
    }
  }

  TextDirection get textDirection {
    switch (state) {
      case AppLanguage.arabic:
        return TextDirection.rtl;
      default:
        return TextDirection.ltr;
    }
  }
}

final localeProvider = StateNotifierProvider<LocalizationNotifier, AppLanguage>((ref) {
  return LocalizationNotifier();
});

class AppLocalizations {
  final AppLanguage language;

  AppLocalizations(this.language);

  static AppLocalizations of(BuildContext context) {
    final lang = ProviderScope.containerOf(context).read(localeProvider);
    return AppLocalizations(lang);
  }

  String get home => _get('home');
  String get dashboard => _get('dashboard');
  String get complaints => _get('complaints');
  String get transparency => _get('transparency');
  String get profile => _get('profile');
  String get logout => _get('logout');
  String get map => _get('map');
  String get publicStats => _get('publicStats');

  String get login => _get('login');
  String get register => _get('register');
  String get email => _get('email');
  String get password => _get('password');
  String get forgotPassword => _get('forgotPassword');
  String get rememberMe => _get('rememberMe');

  String get submitComplaint => _get('submitComplaint');
  String get complaintTitle => _get('complaintTitle');
  String get complaintDescription => _get('complaintDescription');
  String get addPhotos => _get('addPhotos');
  String get useCurrentLocation => _get('useCurrentLocation');
  String get submit => _get('submit');

  String get submitted => _get('submitted');
  String get validated => _get('validated');
  String get assigned => _get('assigned');
  String get inProgress => _get('inProgress');
  String get resolved => _get('resolved');
  String get closed => _get('closed');
  String get rejected => _get('rejected');

  String get requiredField => _get('requiredField');
  String get invalidEmail => _get('invalidEmail');
  String get titleMinLength => _get('titleMinLength');
  String get descriptionMinLength => _get('descriptionMinLength');
  String get locationRequired => _get('locationRequired');
  String get photosRequired => _get('photosRequired');
  String get submitFailed => _get('submitFailed');

  String _get(String key) {
    final map = _getMapForLanguage();
    return map[key] ?? key;
  }

  Map<String, String> _getMapForLanguage() {
    switch (language) {
      case AppLanguage.french:
        return {
          'home': 'Accueil',
          'dashboard': 'Tableau de bord',
          'complaints': 'Signalements',
          'transparency': 'Transparence',
          'profile': 'Profil',
          'logout': 'Déconnexion',
          'map': 'Carte',
          'publicStats': 'Statistiques publiques',
          'login': 'Se connecter',
          'register': 'S\'inscrire',
          'email': 'Email',
          'password': 'Mot de passe',
          'forgotPassword': 'Mot de passe oublié ?',
          'rememberMe': 'Se souvenir de moi',
          'submitComplaint': 'Signaler un problème',
          'complaintTitle': 'Titre du signalement',
          'complaintDescription': 'Description',
          'addPhotos': 'Ajouter des photos',
          'useCurrentLocation': 'Utiliser ma position',
          'submit': 'Signaler',
          'submitted': 'Soumise',
          'validated': 'Validée',
          'assigned': 'Assignée',
          'inProgress': 'En cours',
          'resolved': 'Résolue',
          'closed': 'Clôturée',
          'rejected': 'Rejetée',
          'requiredField': 'Ce champ est obligatoire',
          'invalidEmail': 'Email invalide',
          'titleMinLength': 'Le titre doit contenir au moins 5 caractères',
          'descriptionMinLength': 'La description doit contenir au moins 10 caractères',
          'locationRequired': 'La localisation est requise',
          'photosRequired': 'Au moins une photo est requise',
          'submitFailed': 'Échec de la soumission. Veuillez réessayer.',
        };
      case AppLanguage.english:
        return {
          'home': 'Home',
          'dashboard': 'Dashboard',
          'complaints': 'Complaints',
          'transparency': 'Transparency',
          'profile': 'Profile',
          'logout': 'Logout',
          'map': 'Map',
          'publicStats': 'Public Statistics',
          'login': 'Sign In',
          'register': 'Register',
          'email': 'Email',
          'password': 'Password',
          'forgotPassword': 'Forgot password?',
          'rememberMe': 'Remember me',
          'submitComplaint': 'Report an Issue',
          'complaintTitle': 'Complaint Title',
          'complaintDescription': 'Description',
          'addPhotos': 'Add Photos',
          'useCurrentLocation': 'Use current location',
          'submit': 'Submit',
          'submitted': 'Submitted',
          'validated': 'Validated',
          'assigned': 'Assigned',
          'inProgress': 'In Progress',
          'resolved': 'Resolved',
          'closed': 'Closed',
          'rejected': 'Rejected',
          'requiredField': 'This field is required',
          'invalidEmail': 'Invalid email',
          'titleMinLength': 'Title must be at least 5 characters',
          'descriptionMinLength': 'Description must be at least 10 characters',
          'locationRequired': 'Location is required',
          'photosRequired': 'At least one photo is required',
          'submitFailed': 'Submission failed. Please try again.',
        };
      case AppLanguage.arabic:
        return {
          'home': 'الرئيسية',
          'dashboard': 'لوحة التحكم',
          'complaints': 'الشكاوى',
          'transparency': 'الشفافية',
          'profile': 'الملف الشخصي',
          'logout': 'تسجيل الخروج',
          'map': 'الخريطة',
          'publicStats': 'إحصائيات عامة',
          'login': 'تسجيل الدخول',
          'register': 'إنشاء حساب',
          'email': 'البريد الإلكتروني',
          'password': 'كلمة المرور',
          'forgotPassword': 'نسيت كلمة المرور؟',
          'rememberMe': 'تذكرني',
          'submitComplaint': 'الإبلاغ عن مشكلة',
          'complaintTitle': 'عنوان الشكوى',
          'complaintDescription': 'الوصف',
          'addPhotos': 'إضافة صور',
          'useCurrentLocation': 'استخدام موقعي الحالي',
          'submit': 'إرسال',
          'submitted': 'مقدمة',
          'validated': 'تم التحقق',
          'assigned': 'تم التعيين',
          'inProgress': 'قيد التنفيذ',
          'resolved': 'تم الحل',
          'closed': 'مغلقة',
          'rejected': 'مرفوضة',
          'requiredField': 'هذا الحقل mandatory',
          'invalidEmail': 'بريد إلكتروني غير صالح',
          'titleMinLength': 'يجب أن يكون العنوان 5 أحرف على الأقل',
          'descriptionMinLength': 'يجب أن يحتوي الوصف على 10 أحرف على الأقل',
          'locationRequired': 'الموقع مطلوب',
          'photosRequired': 'صورة واحدة على الأقل مطلوبة',
          'submitFailed': 'فشل الإرسال. يرجى المحاولة مرة أخرى.',
        };
    }
  }
}
