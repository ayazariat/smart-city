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
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFF8FAFC), Color(0xFFF1F5F9)],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 40),
                  Center(
                    child: Column(
                      children: [
                        GestureDetector(
                          onTap: () => Navigator.of(context).pop(),
                          child: Container(
                            width: 80,
                            height: 80,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [AppColors.primary, Color(0xFF1E40AF)],
                              ),
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.primary.withValues(alpha: 0.25),
                                  blurRadius: 20,
                                  offset: const Offset(0, 10),
                                ),
                              ],
                            ),
                            child: const Icon(
                              Icons.person_add,
                              size: 40,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                        const Text(
                          'Create Account',
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Join Smart City Tunisia to report issues',
                          style: TextStyle(
                            fontSize: 16,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 40),
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.1),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text(
                          'Sign Up',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Fill in your information to create an account',
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
                            labelText: 'Full Name',
                            hintText: 'John Doe',
                            prefixIcon: const Icon(Icons.person_outline),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            filled: true,
                            fillColor: const Color(0xFFF5F7FA),
                          ),
                          validator: (v) => v == null || v.length < 3
                              ? 'Name must be at least 3 characters'
                              : null,
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          decoration: InputDecoration(
                            labelText: 'Email',
                            hintText: 'your@email.com',
                            prefixIcon: const Icon(Icons.email_outlined),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            filled: true,
                            fillColor: const Color(0xFFF5F7FA),
                          ),
                          validator: (v) => v == null || v.isEmpty
                              ? 'Email is required'
                              : (!v.contains('@') ? 'Invalid email' : null),
                        ),
                        const SizedBox(height: 16),
                        // Location section with governorate and municipality
                        Row(
                          children: [
                            const Icon(Icons.location_on, size: 20, color: Color(0xFF64748B)),
                            const SizedBox(width: 8),
                            const Text(
                              'Location',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: Color(0xFF64748B),
                              ),
                            ),
                            const Spacer(),
                            TextButton.icon(
                              onPressed: _isLoadingLocation ? null : _useMyLocation,
                              icon: _isLoadingLocation
                                  ? const SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: AppColors.primary,
                                      ),
                                    )
                                  : const Icon(Icons.navigation, size: 18),
                              label: const Text('Use my location'),
                              style: TextButton.styleFrom(
                                foregroundColor: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<GovernorateData>(
                          value: _selectedGovernorate,
                          decoration: InputDecoration(
                            labelText: 'Governorate',
                            hintText: 'Select governorate',
                            prefixIcon: const Icon(Icons.map_outlined),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            filled: true,
                            fillColor: const Color(0xFFF5F7FA),
                          ),
                          items: TunisiaGeography.governorates.map((gov) {
                            return DropdownMenuItem(
                              value: gov,
                              child: Text(gov.name),
                            );
                          }).toList(),
                          onChanged: (value) {
                            setState(() {
                              _selectedGovernorate = value;
                              _selectedMunicipality = null;
                            });
                          },
                        ),
                        const SizedBox(height: 16),
                        DropdownButtonFormField<String>(
                          value: _selectedMunicipality,
                          decoration: InputDecoration(
                            labelText: 'Municipality',
                            hintText: _selectedGovernorate == null
                                ? 'Select governorate first'
                                : 'Select municipality',
                            prefixIcon: const Icon(Icons.location_city),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            filled: true,
                            fillColor: const Color(0xFFF5F7FA),
                          ),
                          items: _selectedGovernorate?.municipalities.map((muni) {
                            return DropdownMenuItem(
                              value: muni,
                              child: Text(muni),
                            );
                          }).toList() ?? [],
                          onChanged: _selectedGovernorate == null ? null : (value) {
                            setState(() {
                              _selectedMunicipality = value;
                            });
                          },
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          decoration: InputDecoration(
                            labelText: 'Phone',
                            hintText: '2X XXX XXX',
                            prefixIcon: const Icon(Icons.phone_outlined),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            filled: true,
                            fillColor: const Color(0xFFF5F7FA),
                          ),
                          validator: (v) {
                            if (v == null || v.isEmpty) return 'Phone is required';
                            if (v.length != 8) return 'Phone must be 8 digits';
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          onChanged: _updatePasswordStrength,
                          decoration: InputDecoration(
                            labelText: 'Password',
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
                          validator: (v) => v == null || v.length < 8
                              ? 'Password must be at least 8 characters'
                              : null,
                        ),
                        if (_passwordController.text.isNotEmpty)
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'Password Strength',
                                    style: TextStyle(fontSize: 12),
                                  ),
                                  Text(
                                    _getStrengthLabel(),
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                      color: _getStrengthColor(),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Container(
                                height: 4,
                                decoration: BoxDecoration(
                                  color: Colors.grey[200],
                                  borderRadius: BorderRadius.circular(2),
                                ),
                                child: FractionallySizedBox(
                                  widthFactor: _passwordStrength / 4,
                                  alignment: Alignment.centerLeft,
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: _getStrengthColor(),
                                      borderRadius: BorderRadius.circular(2),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _confirmPasswordController,
                          obscureText: _obscureConfirm,
                          decoration: InputDecoration(
                            labelText: 'Confirm Password',
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
                              ? 'Passwords do not match'
                              : null,
                        ),
                        const SizedBox(height: 24),
                        Container(
                          height: 52,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                AppColors.primary,
                                AppColors.primaryDark,
                              ],
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
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
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
                                    'Create Account',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.white,
                                    ),
                                  ),
                          ),
                        ),
                        const SizedBox(height: 20),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              'Already have an account?',
                              style: TextStyle(color: Colors.grey[600]),
                            ),
                            TextButton(
                              onPressed: () => Navigator.pop(context),
                              child: const Text('Sign In'),
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
        ),
      ),
    );
  }
}
