import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/main.dart';
import 'package:smart_city_app/providers/theme_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Appearance section
          const _SectionHeader(title: 'Appearance'),
          Card(
            child: Column(
              children: [
                _ThemeTile(
                  title: 'System Default',
                  subtitle: 'Follow device theme',
                  icon: Icons.brightness_auto,
                  isSelected: themeMode == ThemeMode.system,
                  onTap: () => ref.read(themeModeProvider.notifier).setThemeMode(ThemeMode.system),
                ),
                const Divider(height: 1),
                _ThemeTile(
                  title: 'Light Mode',
                  subtitle: 'Always use light theme',
                  icon: Icons.light_mode,
                  isSelected: themeMode == ThemeMode.light,
                  onTap: () => ref.read(themeModeProvider.notifier).setThemeMode(ThemeMode.light),
                ),
                const Divider(height: 1),
                _ThemeTile(
                  title: 'Dark Mode',
                  subtitle: 'Always use dark theme',
                  icon: Icons.dark_mode,
                  isSelected: themeMode == ThemeMode.dark,
                  onTap: () => ref.read(themeModeProvider.notifier).setThemeMode(ThemeMode.dark),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // About section
          const _SectionHeader(title: 'About'),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: CircleAvatar(
                    backgroundColor: isDark ? AppColors.primaryLight.withAlpha(40) : AppColors.primary.withAlpha(26),
                    child: Icon(Icons.info_outline, color: isDark ? AppColors.primaryLight : AppColors.primary),
                  ),
                  title: const Text('App Version'),
                  subtitle: const Text('1.0.0'),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: CircleAvatar(
                    backgroundColor: isDark ? AppColors.primaryLight.withAlpha(40) : AppColors.primary.withAlpha(26),
                    child: Icon(Icons.location_city, color: isDark ? AppColors.primaryLight : AppColors.primary),
                  ),
                  title: const Text('Smart City Tunisia'),
                  subtitle: const Text('Municipal complaint management'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: Theme.of(context).colorScheme.primary,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}

class _ThemeTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _ThemeTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;

    return ListTile(
      leading: CircleAvatar(
        backgroundColor: isSelected ? primary.withAlpha(26) : Colors.grey.withAlpha(26),
        child: Icon(icon, color: isSelected ? primary : Colors.grey),
      ),
      title: Text(
        title,
        style: TextStyle(fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal),
      ),
      subtitle: Text(subtitle),
      trailing: isSelected ? Icon(Icons.check_circle, color: primary) : null,
      onTap: onTap,
    );
  }
}
