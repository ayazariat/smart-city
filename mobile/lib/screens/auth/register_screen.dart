import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:smart_city_app/providers/auth_provider.dart';
import 'package:smart_city_app/data/tunisia_geography.dart';
import 'package:smart_city_app/core/constants/colors.dart';
import 'package:smart_city_app/routes/app_routes.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _phoneController = TextEditingController();
  GovernorateData? _selectedGovernorate;
  String? _selectedMunicipality;
  int _passwordStrength = 0;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  bool _isLoadingLocation = false;

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  void _updatePasswordStrength(String password) {
    int strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (password.contains(RegExp(r'[a-z]')) &&
        password.contains(RegExp(r'[A-Z]'))) {
      strength++;
    }
    if (password.contains(RegExp(r'\d'))) strength++;
    setState(() => _passwordStrength = strength);
  }

  String _getStrengthLabel() {
    if (_passwordStrength <= 1) return 'Faible';
    if (_passwordStrength <= 2) return 'Passable';
    if (_passwordStrength <= 3) return 'Bien';
    return 'Fort';
  }

  Color _getStrengthColor() {
    if (_passwordStrength <= 1) return Colors.red;
    if (_passwordStrength <= 2) return Colors.orange;
    return Colors.green;
  }

  Future<void> _useMyLocation() async {
    setState(() => _isLoadingLocation = true);
    try {
      // Check if location services are enabled
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Services de localisation désactivés'),
            ),
          );
        }
        return;
      }

      // Check permissions
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Permission de localisation refusée'),
              ),
            );
          }
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Permissions de localisation bloquées'),
            ),
          );
        }
        return;
      }

      // Get current position
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
      );

      // Find matching governorate and municipality based on coordinates
      // Tunisia coordinates roughly between lat 30-37 and lon 7-12
      final foundLocation = _findGovernorateFromCoords(
        position.latitude,
        position.longitude,
      );

      if (foundLocation != null) {
        setState(() {
          _selectedGovernorate = foundLocation;
          _selectedMunicipality = foundLocation.municipalities.isNotEmpty
              ? foundLocation.municipalities.first
              : foundLocation.name;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Position détectée: ${_selectedMunicipality ?? foundLocation.name ?? 'Inconnue'}',
              ),
              backgroundColor: AppColors.primary,
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Position non reconnue en Tunisie')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Erreur: ${e.toString()}')));
      }
    } finally {
      if (mounted) {
        setState(() => _isLoadingLocation = false);
      }
    }
  }

  GovernorateData? _findGovernorateFromCoords(double lat, double lon) {
    // Simple coordinate-based matching for Tunisia governorates
    // This is an approximation - in production you'd use reverse geocoding
    for (final gov in TunisiaGeography.governorates) {
      if (_isInGovernorateBounds(lat, lon, gov.name)) {
        return gov;
      }
    }
    // Default to Tunis if in range
    if (lat >= 36.7 && lat <= 37.0 && lon >= 9.5 && lon <= 10.3) {
      return TunisiaGeography.governorates.firstWhere(
        (g) => g.name == 'Tunis',
        orElse: () => TunisiaGeography.governorates.first,
      );
    }
    return null;
  }

  bool _isInGovernorateBounds(double lat, double lon, String governorate) {
    // Rough bounding boxes for Tunis governorates
    final bounds = {
      'Tunis': {'minLat': 36.7, 'maxLat': 37.0, 'minLon': 9.5, 'maxLon': 10.3},
      'Ariana': {
        'minLat': 36.8,
        'maxLat': 37.0,
        'minLon': 10.0,
        'maxLon': 10.3,
      },
      'Ben Arous': {
        'minLat': 36.6,
        'maxLat': 36.9,
        'minLon': 10.0,
        'maxLon': 10.3,
      },
      'Manouba': {
        'minLat': 36.8,
        'maxLat': 37.1,
        'minLon': 9.5,
        'maxLon': 10.0,
      },
      'Nabeul': {
        'minLat': 36.4,
        'maxLat': 36.8,
        'minLon': 10.4,
        'maxLon': 11.0,
      },
      'Zaghouan': {
        'minLat': 36.3,
        'maxLat': 36.6,
        'minLon': 10.0,
        'maxLon': 10.5,
      },
      'Bizerte': {
        'minLat': 36.9,
        'maxLat': 37.5,
        'minLon': 9.5,
        'maxLon': 10.0,
      },
      'Beja': {'minLat': 36.7, 'maxLat': 37.0, 'minLon': 9.0, 'maxLon': 9.6},
      'Jendouba': {
        'minLat': 36.6,
        'maxLat': 36.9,
        'minLon': 8.5,
        'maxLon': 9.2,
      },
      'Kef': {'minLat': 36.3, 'maxLat': 36.6, 'minLon': 8.3, 'maxLon': 8.8},
      'Siliana': {'minLat': 36.0, 'maxLat': 36.4, 'minLon': 9.0, 'maxLon': 9.5},
      'Kairouan': {
        'minLat': 35.5,
        'maxLat': 35.8,
        'minLon': 10.0,
        'maxLon': 10.3,
      },
      'Kasserine': {
        'minLat': 35.3,
        'maxLat': 35.7,
        'minLon': 8.8,
        'maxLon': 9.4,
      },
      'Sidi Bouzid': {
        'minLat': 34.8,
        'maxLat': 35.3,
        'minLon': 9.0,
        'maxLon': 9.6,
      },
      'Sfax': {'minLat': 34.6, 'maxLat': 35.0, 'minLon': 10.6, 'maxLon': 11.2},
      'Gabes': {'minLat': 33.8, 'maxLat': 34.4, 'minLon': 9.9, 'maxLon': 10.6},
      'Medenine': {
        'minLat': 33.3,
        'maxLat': 33.8,
        'minLon': 10.0,
        'maxLon': 10.8,
      },
      'Tataouine': {
        'minLat': 32.8,
        'maxLat': 33.3,
        'minLon': 10.0,
        'maxLon': 10.6,
      },
      'Gafsa': {'minLat': 34.2, 'maxLat': 34.7, 'minLon': 8.3, 'maxLon': 9.2},
      'Tozeur': {'minLat': 33.8, 'maxLat': 34.2, 'minLon': 7.8, 'maxLon': 8.5},
      'Kebili': {'minLat': 33.4, 'maxLat': 34.0, 'minLon': 8.5, 'maxLon': 9.5},
      'Douz': {'minLat': 33.4, 'maxLat': 33.8, 'minLon': 9.0, 'maxLon': 9.6},
      'Mahdia': {
        'minLat': 35.3,
        'maxLat': 35.7,
        'minLon': 10.8,
        'maxLon': 11.4,
      },
      'Monastir': {
        'minLat': 35.5,
        'maxLat': 35.9,
        'minLon': 10.5,
        'maxLon': 11.0,
      },
      'Sousse': {
        'minLat': 35.8,
        'maxLat': 36.2,
        'minLon': 10.4,
        'maxLon': 10.8,
      },
      'Mornag': {
        'minLat': 36.5,
        'maxLat': 36.8,
        'minLon': 10.2,
        'maxLon': 10.6,
      },
      'Sael': {'minLat': 36.0, 'maxLat': 36.3, 'minLon': 10.0, 'maxLon': 10.5},
    };

    final b = bounds[governorate];
    if (b == null) return false;
    return lat >= b['minLat']! &&
        lat <= b['maxLat']! &&
        lon >= b['minLon']! &&
        lon <= b['maxLon']!;
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;
    try {
      await ref
          .read(authProvider.notifier)
          .register(
            _emailController.text.trim(),
            _passwordController.text,
            _fullNameController.text.trim(),
            'CITIZEN',
            _phoneController.text.isNotEmpty ? _phoneController.text : null,
            _selectedGovernorate?.name,
            _selectedMunicipality,
          );
      if (mounted) Navigator.pushNamed(context, AppRoutes.verifyEmail);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final isLoading = ref.watch(authProvider).isLoading;
    final error = ref.watch(authProvider).errorMessage;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Créer un compte',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 8,
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [AppColors.primary, AppColors.primaryDark],
                        ),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Icon(
                        Icons.person_add,
                        color: Colors.white,
                        size: 32,
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Rejoignez Smart City Tunisia',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Créez un compte pour signaler les problèmes de votre ville',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                    const SizedBox(height: 24),
                    if (error != null)
                      Container(
                        padding: const EdgeInsets.all(12),
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.red.shade100),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.error_outline, color: Colors.red[600]),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                error,
                                style: TextStyle(color: Colors.red[700]),
                              ),
                            ),
                          ],
                        ),
                      ),
                    TextFormField(
                      controller: _fullNameController,
                      decoration: InputDecoration(
                        labelText: 'Nom complet',
                        hintText: 'Votre nom complet',
                        prefixIcon: const Icon(Icons.person_outline),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        filled: true,
                        fillColor: const Color(0xFFF5F7FA),
                      ),
                      validator: (v) => v == null || v.length < 3
                          ? 'Le nom doit contenir au moins 3 caractères'
                          : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: InputDecoration(
                        labelText: 'Email',
                        hintText: 'votre@email.com',
                        prefixIcon: const Icon(Icons.email_outlined),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        filled: true,
                        fillColor: const Color(0xFFF5F7FA),
                      ),
                      validator: (v) => v == null || v.isEmpty
                          ? 'Email obligatoire'
                          : (!v.contains('@') ? 'Email invalide' : null),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: InputDecoration(
                        labelText: 'Téléphone (optionnel)',
                        hintText: '+216 XX XXX XXX',
                        prefixIcon: const Icon(Icons.phone_outlined),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        filled: true,
                        fillColor: const Color(0xFFF5F7FA),
                      ),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<GovernorateData>(
                      initialValue: _selectedGovernorate,
                      decoration: InputDecoration(
                        labelText: 'Gouvernorat (optionnel)',
                        prefixIcon: const Icon(Icons.location_on_outlined),
                        suffixIcon: IconButton(
                          icon: _isLoadingLocation
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.my_location),
                          onPressed: _isLoadingLocation ? null : _useMyLocation,
                          tooltip: 'Utiliser ma position',
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        filled: true,
                        fillColor: const Color(0xFFF5F7FA),
                      ),
                      items: TunisiaGeography.governorates
                          .map(
                            (g) =>
                                DropdownMenuItem(value: g, child: Text(g.name)),
                          )
                          .toList(),
                      onChanged: (v) => setState(() {
                        _selectedGovernorate = v;
                        _selectedMunicipality = null;
                      }),
                    ),
                    if (_selectedGovernorate != null) ...[
                      const SizedBox(height: 16),
                      DropdownButtonFormField<String>(
                        initialValue: _selectedMunicipality,
                        decoration: InputDecoration(
                          labelText: 'Municipalité',
                          prefixIcon: const Icon(Icons.location_city_outlined),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          filled: true,
                          fillColor: const Color(0xFFF5F7FA),
                        ),
                        items: _selectedGovernorate!.municipalities
                            .map(
                              (m) => DropdownMenuItem(value: m, child: Text(m)),
                            )
                            .toList(),
                        onChanged: (v) =>
                            setState(() => _selectedMunicipality = v),
                      ),
                    ],
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      onChanged: _updatePasswordStrength,
                      decoration: InputDecoration(
                        labelText: 'Mot de passe',
                        hintText: '••••••••',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscurePassword
                                ? Icons.visibility_off
                                : Icons.visibility,
                          ),
                          onPressed: () => setState(
                            () => _obscurePassword = !_obscurePassword,
                          ),
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        filled: true,
                        fillColor: const Color(0xFFF5F7FA),
                      ),
                      validator: (v) => v == null || v.length < 6
                          ? 'Le mot de passe doit contenir au moins 6 caractères'
                          : null,
                    ),
                    if (_passwordController.text.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: _passwordStrength / 4,
                                backgroundColor: Colors.grey[200],
                                valueColor: AlwaysStoppedAnimation(
                                  _getStrengthColor(),
                                ),
                                minHeight: 6,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            _getStrengthLabel(),
                            style: TextStyle(
                              color: _getStrengthColor(),
                              fontWeight: FontWeight.w600,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _confirmPasswordController,
                      obscureText: _obscureConfirm,
                      decoration: InputDecoration(
                        labelText: 'Confirmer le mot de passe',
                        hintText: '••••••••',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscureConfirm
                                ? Icons.visibility_off
                                : Icons.visibility,
                          ),
                          onPressed: () => setState(
                            () => _obscureConfirm = !_obscureConfirm,
                          ),
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        filled: true,
                        fillColor: const Color(0xFFF5F7FA),
                      ),
                      validator: (v) => v != _passwordController.text
                          ? 'Les mots de passe ne correspondent pas'
                          : null,
                    ),
                    const SizedBox(height: 24),
                    Container(
                      height: 52,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [AppColors.primary, AppColors.primaryDark],
                        ),
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: ElevatedButton(
                        onPressed: isLoading ? null : _handleRegister,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                        ),
                        child: isLoading
                            ? const SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text(
                                'Créer mon compte',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Déjà un compte?',
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                        TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Se connecter'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
