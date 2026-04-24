import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
        password.contains(RegExp(r'[A-Z]')))
      strength++;
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
                      value: _selectedGovernorate,
                      decoration: InputDecoration(
                        labelText: 'Gouvernorat (optionnel)',
                        prefixIcon: const Icon(Icons.location_on_outlined),
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
                        value: _selectedMunicipality,
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
