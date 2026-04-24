import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/core/constants/colors.dart';
import 'package:smart_city_app/providers/theme_provider.dart';
import 'package:smart_city_app/services/api_client.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final _serverUrlController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _serverUrlController.text = ApiClient.overrideBaseUrl ?? '';
  }

  @override
  void dispose() {
    _serverUrlController.dispose();
    super.dispose();
  }

  Future<void> _saveServerUrl(String url) async {
    final trimmed = url.trim();
    ApiClient.overrideBaseUrl = trimmed.isEmpty ? null : trimmed;
    final prefs = await SharedPreferences.getInstance();
    if (trimmed.isEmpty) {
      await prefs.remove('server_url');
    } else {
      await prefs.setString('server_url', trimmed);
    }
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            trimmed.isEmpty
                ? 'Serveur réinitialisé'
                : 'URL du serveur enregistrée',
          ),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeMode = ref.watch(themeModeProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppColors.primary, AppColors.primary.withAlpha(204)],
          ),
        ),
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.arrow_back, color: Colors.white),
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'Paramètres',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Container(
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.vertical(
                      top: Radius.circular(24),
                    ),
                  ),
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      _buildSectionTitle('Apparence'),
                      const SizedBox(height: 12),
                      _buildThemeCard(themeMode),
                      const SizedBox(height: 24),
                      _buildSectionTitle('Serveur'),
                      const SizedBox(height: 12),
                      _buildServerCard(isDark),
                      const SizedBox(height: 24),
                      _buildSectionTitle('À propos'),
                      const SizedBox(height: 12),
                      _buildAboutCard(isDark),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: AppColors.primary,
        letterSpacing: 0.5,
      ),
    );
  }

  Widget _buildThemeCard(ThemeMode themeMode) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(13),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          _buildThemeOption(
            title: 'Par défaut',
            subtitle: 'Suivre le thème de l\'appareil',
            icon: Icons.brightness_auto,
            isSelected: themeMode == ThemeMode.system,
            onTap: () => ref
                .read(themeModeProvider.notifier)
                .setThemeMode(ThemeMode.system),
          ),
          Divider(height: 1, color: Colors.grey.shade200),
          _buildThemeOption(
            title: 'Mode clair',
            subtitle: 'Toujours utiliser le thème clair',
            icon: Icons.light_mode,
            isSelected: themeMode == ThemeMode.light,
            onTap: () => ref
                .read(themeModeProvider.notifier)
                .setThemeMode(ThemeMode.light),
          ),
          Divider(height: 1, color: Colors.grey.shade200),
          _buildThemeOption(
            title: 'Mode sombre',
            subtitle: 'Toujours utiliser le thème sombre',
            icon: Icons.dark_mode,
            isSelected: themeMode == ThemeMode.dark,
            onTap: () => ref
                .read(themeModeProvider.notifier)
                .setThemeMode(ThemeMode.dark),
          ),
        ],
      ),
    );
  }

  Widget _buildThemeOption({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      leading: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary.withAlpha(26)
              : Colors.grey.withAlpha(26),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, color: isSelected ? AppColors.primary : Colors.grey),
      ),
      title: Text(
        title,
        style: TextStyle(
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          color: AppColors.textPrimary,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
      ),
      trailing: isSelected
          ? Container(
              padding: const EdgeInsets.all(6),
              decoration: const BoxDecoration(
                color: AppColors.success,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check, color: Colors.white, size: 14),
            )
          : null,
    );
  }

  Widget _buildServerCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(13),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.primary.withAlpha(26),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.dns, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'URL de l\'API',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  Text(
                    'Serveur de l\'application',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            'Laissez vide pour utiliser le serveur par défaut (émulateur: 10.0.2.2).',
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _serverUrlController,
                  keyboardType: TextInputType.url,
                  autocorrect: false,
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark ? Colors.white : AppColors.textPrimary,
                  ),
                  decoration: InputDecoration(
                    hintText: 'http://192.168.1.x:5000/api',
                    hintStyle: TextStyle(color: Colors.grey.shade400),
                    filled: true,
                    fillColor: AppColors.secondary,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(
                        color: AppColors.primary,
                        width: 2,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              ElevatedButton(
                onPressed: () => _saveServerUrl(_serverUrlController.text),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 14,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                child: const Text('Enregistrer'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAboutCard(bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(13),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          ListTile(
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 8,
            ),
            leading: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.primary.withAlpha(26),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.info_outline, color: AppColors.primary),
            ),
            title: const Text(
              'Version de l\'application',
              style: TextStyle(fontWeight: FontWeight.w500),
            ),
            subtitle: const Text('1.0.0'),
          ),
          Divider(height: 1, color: Colors.grey.shade200),
          ListTile(
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 8,
            ),
            leading: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.primary.withAlpha(26),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.location_city, color: AppColors.primary),
            ),
            title: const Text(
              'Smart City Tunisia',
              style: TextStyle(fontWeight: FontWeight.w500),
            ),
            subtitle: const Text('Gestion des plaintes municipales'),
          ),
        ],
      ),
    );
  }
}
