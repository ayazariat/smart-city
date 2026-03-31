import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/main.dart';
import 'package:smart_city_app/models/user_model.dart';
import 'package:smart_city_app/services/api_client.dart';

class AdminUsersScreen extends ConsumerStatefulWidget {
  const AdminUsersScreen({super.key});

  @override
  ConsumerState<AdminUsersScreen> createState() => _AdminUsersScreenState();
}

class _AdminUsersScreenState extends ConsumerState<AdminUsersScreen> {
  final ApiClient _api = ApiClient();

  List<User> _users = [];
  bool _isLoading = true;
  String? _error;
  String _roleFilter = 'ALL';
  String _searchQuery = '';
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadUsers() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _api.get('/admin/users');
      final List<dynamic> data =
          response['users'] ?? response['data']?['users'] ?? [];
      setState(() {
        _users = data.map((json) => User.fromJson(json)).toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  List<User> get _filteredUsers {
    var filtered = _users;

    if (_roleFilter != 'ALL') {
      filtered = filtered.where((u) => u.role == _roleFilter).toList();
    }

    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      filtered = filtered
          .where(
            (u) =>
                u.fullName.toLowerCase().contains(query) ||
                u.email.toLowerCase().contains(query),
          )
          .toList();
    }

    return filtered;
  }

  Future<void> _updateUserRole(User user, String newRole) async {
    try {
      await _api.put('/admin/users/${user.id}/role', {'role': newRole});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Updated ${user.fullName} role to $newRole'),
            backgroundColor: AppColors.success,
          ),
        );
        _loadUsers();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update role: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<void> _toggleUserStatus(User user) async {
    try {
      await _api.put('/admin/users/${user.id}/toggle-status', {});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Toggled ${user.fullName} status'),
            backgroundColor: AppColors.success,
          ),
        );
        _loadUsers();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to toggle status: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  void _showRoleDialog(User user) {
    final roles = [
      'CITIZEN',
      'MUNICIPAL_AGENT',
      'DEPARTMENT_MANAGER',
      'TECHNICIAN',
      'ADMIN',
    ];
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text('Change Role for ${user.fullName}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: roles.map((role) {
            final isSelected = user.role == role;
            return ListTile(
              leading: Icon(
                _getRoleIcon(role),
                color: isSelected ? AppColors.primary : AppColors.textSecondary,
              ),
              title: Text(
                _getRoleDisplayName(role),
                style: TextStyle(
                  color: isSelected ? AppColors.primary : AppColors.textPrimary,
                  fontWeight: isSelected ? FontWeight.bold : null,
                ),
              ),
              trailing: isSelected
                  ? const Icon(Icons.check, color: AppColors.primary)
                  : null,
              onTap: () {
                Navigator.pop(ctx);
                if (role != user.role) {
                  _updateUserRole(user, role);
                }
              },
            );
          }).toList(),
        ),
      ),
    );
  }

  String _getRoleDisplayName(String role) {
    switch (role) {
      case 'CITIZEN':
        return 'Citizen';
      case 'MUNICIPAL_AGENT':
        return 'Municipal Agent';
      case 'DEPARTMENT_MANAGER':
        return 'Department Manager';
      case 'TECHNICIAN':
        return 'Technician';
      case 'ADMIN':
        return 'Administrator';
      default:
        return role;
    }
  }

  IconData _getRoleIcon(String role) {
    switch (role) {
      case 'CITIZEN':
        return Icons.person;
      case 'MUNICIPAL_AGENT':
        return Icons.badge;
      case 'DEPARTMENT_MANAGER':
        return Icons.supervisor_account;
      case 'TECHNICIAN':
        return Icons.engineering;
      case 'ADMIN':
        return Icons.admin_panel_settings;
      default:
        return Icons.person;
    }
  }

  Color _getRoleColor(String role) {
    switch (role) {
      case 'CITIZEN':
        return AppColors.textSecondary;
      case 'MUNICIPAL_AGENT':
        return AppColors.primary;
      case 'DEPARTMENT_MANAGER':
        return AppColors.assigned;
      case 'TECHNICIAN':
        return AppColors.inProgress;
      case 'ADMIN':
        return AppColors.error;
      default:
        return AppColors.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredUsers = _filteredUsers;

    return Scaffold(
      appBar: AppBar(
        title: const Text('User Management'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadUsers),
        ],
      ),
      body: Column(
        children: [
          // Search and filter
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  style: const TextStyle(color: AppColors.textPrimary),
                  decoration: InputDecoration(
                    hintText: 'Search users...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                          )
                        : null,
                  ),
                  onChanged: (value) {
                    setState(() => _searchQuery = value);
                  },
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children:
                        [
                          'ALL',
                          'CITIZEN',
                          'MUNICIPAL_AGENT',
                          'TECHNICIAN',
                          'DEPARTMENT_MANAGER',
                          'ADMIN',
                        ].map((role) {
                          final isSelected = _roleFilter == role;
                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: FilterChip(
                              label: Text(
                                role == 'ALL'
                                    ? 'All'
                                    : _getRoleDisplayName(role),
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isSelected
                                      ? Colors.white
                                      : AppColors.textPrimary,
                                ),
                              ),
                              selected: isSelected,
                              onSelected: (_) {
                                setState(() => _roleFilter = role);
                              },
                              selectedColor: AppColors.primary,
                            ),
                          );
                        }).toList(),
                  ),
                ),
              ],
            ),
          ),

          // Stats row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildMiniStat('Total', _users.length, AppColors.primary),
                _buildMiniStat(
                  'Citizens',
                  _users.where((u) => u.isCitizen).length,
                  AppColors.textSecondary,
                ),
                _buildMiniStat(
                  'Staff',
                  _users.where((u) => !u.isCitizen).length,
                  AppColors.accent,
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // Users list
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.error_outline,
                          size: 64,
                          color: AppColors.error,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _error!,
                          style: const TextStyle(color: AppColors.error),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _loadUsers,
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  )
                : filteredUsers.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.people_outline,
                          size: 64,
                          color: AppColors.textSecondary,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _searchQuery.isNotEmpty
                              ? 'No users found matching "$_searchQuery"'
                              : 'No users found',
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: _loadUsers,
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      itemCount: filteredUsers.length,
                      itemBuilder: (ctx, i) => _buildUserCard(filteredUsers[i]),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildMiniStat(String label, int count, Color color) {
    return Column(
      children: [
        Text(
          '$count',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
        ),
      ],
    );
  }

  Widget _buildUserCard(User user) {
    final roleColor = _getRoleColor(user.role);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            // Avatar
            CircleAvatar(
              radius: 24,
              backgroundColor: roleColor.withOpacity(0.2),
              child: Icon(_getRoleIcon(user.role), color: roleColor),
            ),
            const SizedBox(width: 12),

            // User info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    user.fullName,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user.email,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: roleColor.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          _getRoleDisplayName(user.role),
                          style: TextStyle(color: roleColor, fontSize: 10),
                        ),
                      ),
                      if (user.municipalityName != null) ...[
                        const SizedBox(width: 8),
                        Text(
                          user.municipalityName!,
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),

            // Actions
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert, color: AppColors.textSecondary),
              onSelected: (value) {
                if (value == 'role') {
                  _showRoleDialog(user);
                } else if (value == 'toggle') {
                  _toggleUserStatus(user);
                }
              },
              itemBuilder: (ctx) => [
                const PopupMenuItem(
                  value: 'role',
                  child: Row(
                    children: [
                      Icon(Icons.swap_horiz, size: 18),
                      SizedBox(width: 8),
                      Text('Change Role'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'toggle',
                  child: Row(
                    children: [
                      Icon(Icons.toggle_on, size: 18),
                      SizedBox(width: 8),
                      Text('Toggle Status'),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
