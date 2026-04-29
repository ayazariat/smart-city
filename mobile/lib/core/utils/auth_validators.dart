class AuthValidators {
  AuthValidators._();

  static final RegExp _emailRegex = RegExp(
    r'^[\w\-.]+@([\w\-]+\.)+[\w\-]{2,4}$',
  );

  static final RegExp _passwordPolicyRegex = RegExp(
    r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$',
  );

  static String? validateFullName(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) return 'Nom complet obligatoire';
    if (trimmed.length < 3) {
      return 'Le nom doit contenir au moins 3 caractères';
    }
    return null;
  }

  static String? validateEmail(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) return 'Email obligatoire';
    if (!_emailRegex.hasMatch(trimmed)) return 'Email invalide';
    return null;
  }

  static String? validatePhone(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) return null;
    final digits = trimmed.replaceAll(RegExp(r'\D'), '');
    final localNumber = digits.startsWith('216') ? digits.substring(3) : digits;
    if (!RegExp(r'^[2-9][0-9]{7}$').hasMatch(localNumber)) {
      return 'Le téléphone doit contenir 8 chiffres et commencer par 2-9';
    }
    return null;
  }

  static String? validatePassword(String? value) {
    final password = value ?? '';
    if (password.isEmpty) return 'Mot de passe obligatoire';
    if (!_passwordPolicyRegex.hasMatch(password)) {
      return '8+ caractères avec majuscule, minuscule, chiffre et symbole';
    }
    return null;
  }

  static String? validatePasswordConfirmation(
    String? password,
    String? confirmation,
  ) {
    if ((confirmation ?? '').isEmpty) {
      return 'Confirmation du mot de passe obligatoire';
    }
    if (password != confirmation) {
      return 'Les mots de passe ne correspondent pas';
    }
    return null;
  }

  static int passwordStrengthScore(String password) {
    var score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (RegExp(r'[a-z]').hasMatch(password) &&
        RegExp(r'[A-Z]').hasMatch(password)) {
      score++;
    }
    if (RegExp(r'\d').hasMatch(password)) score++;
    if (RegExp(r'[\W_]').hasMatch(password)) score++;
    return score.clamp(0, 5);
  }

  static String passwordStrengthLabel(String password) {
    final score = passwordStrengthScore(password);
    if (score <= 1) return 'Faible';
    if (score == 2) return 'Passable';
    if (score == 3) return 'Moyen';
    if (score == 4) return 'Bon';
    return 'Fort';
  }
}
