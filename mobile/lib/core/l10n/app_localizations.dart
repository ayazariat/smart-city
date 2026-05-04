import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'localization/app_localizations.dart';

class AppLocalizations {
  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  static Future<AppLocalizations> load(Locale locale) async {
    final name = Intl.canonicalizedLocale(locale.toString());
    await initializeMessages(name);
    Intl.defaultLocale = name;
    return AppLocalizations();
  }

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  // Navigation
  String get home => Intl.message('Accueil');
  String get dashboard => Intl.message('Tableau de bord');
  String get complaints => Intl.message('Signalements');
  String get transparency => Intl.message('Transparence');
  String get profile => Intl.message('Profil');
  String get logout => Intl.message('Déconnexion');
  String get map => Intl.message('Carte');

  // Auth
  String get login => Intl.message('Se connecter');
  String get register => Intl.message('S\'inscrire');
  String get email => Intl.message('Email');
  String get password => Intl.message('Mot de passe');
  String get forgotPassword => Intl.message('Mot de passe oublié ?');
  String get rememberMe => Intl.message('Se souvenir de moi');
  String get publicStats => Intl.message('Statistiques publiques');

  // Complaint
  String get submitComplaint => Intl.message('Signaler un problème');
  String get complaintTitle => Intl.message('Titre du signalement');
  String get complaintDescription => Intl.message('Description');
  String get selectCategory => Intl.message('Sélectionnez une catégorie');
  String get addPhotos => Intl.message('Ajouter des photos');
  String get useCurrentLocation => Intl.message('Utiliser ma position');
  String get submit => Intl.message('Signaler');

  // Status
  String get submitted => Intl.message('Soumise');
  String get validated => Intl.message('Validée');
  String get assigned => Intl.message('Assignée');
  String get inProgress => Intl.message('En cours');
  String get resolved => Intl.message('Résolue');
  String get closed => Intl.message('Clôturée');
  String get rejected => Intl.message('Rejetée');

  // Error messages
  String get requiredField => Intl.message('Ce champ est obligatoire');
  String get invalidEmail => Intl.message('Email invalide');
  String get titleMinLength => Intl.message('Le titre doit contenir au moins 5 caractères');
  String get descriptionMinLength => Intl.message('La description doit contenir au moins 10 caractères');
  String get locationRequired => Intl.message('La localisation est requise');
  String get photosRequired => Intl.message('Au moins une photo est requise');
  String get submitFailed => Intl.message('Échec de la soumission. Veuillez réessayer.');
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return AppLocalizations.load(locale);
  }

  @override
  bool isSupported(Locale locale) =>
      ['fr', 'en', 'ar'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}
