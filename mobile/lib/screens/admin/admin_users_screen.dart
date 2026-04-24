import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/core/constants/colors.dart';
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
  String _searchQuery = '';
  final _searchController = TextEditingController();
  int _currentPage = 1;
  int _totalPages = 1;
  int _total = 0;
  String _roleFilter = '';

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
      final response = await _api.get(
        '/admin/users?page=$_currentPage&limit=20',
      );
      final List<dynamic> data =
          response['users'] ?? response['data']?['users'] ?? [];
      setState(() {
        _users = data.map((json) => User.fromJson(json)).toList();
        _total = response['pagination']?['total'] ?? _users.length;
        _totalPages = response['pagination']?['pages'] ?? 1;
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
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      filtered = filtered
          .where(
            (u) =>
                u.fullName.toLowerCase().contains(q) ||
                u.email.toLowerCase().contains(q),
          )
          .toList();
    }
    if (_roleFilter.isNotEmpty) {
      filtered = filtered.where((u) => u.role == _roleFilter).toList();
    }
    return filtered;
  }

  String _roleLabel(String role) {
    switch (role) {
      case 'CITIZEN':
        return 'Citoyen';
      case 'MUNICIPAL_AGENT':
        return 'Agent';
      case 'DEPARTMENT_MANAGER':
        return 'Responsable';
      case 'TECHNICIAN':
        return 'Technicien';
      case 'ADMIN':
        return 'Administrateur';
      default:
        return role;
    }
  }

  Color _roleColor(String role) {
    switch (role) {
      case 'ADMIN':
        return const Color(0xFFEF4444);
      case 'DEPARTMENT_MANAGER':
        return const Color(0xFFF97316);
      case 'TECHNICIAN':
        return const Color(0xFF3B82F6);
      case 'MUNICIPAL_AGENT':
        return const Color(0xFF8B5CF6);
      case 'CITIZEN':
        return AppColors.primary;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredUsers;
    final activeCount = _users.where((u) => u.isActive).length;
    final adminCount = _users.where((u) => u.role == 'ADMIN').length;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        title: const Text(
          'Gestion des utilisateurs',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadUsers),
        ],
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: Column(
              children: [
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFF5F7FA),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Rechercher par nom ou email...',
                      prefixIcon: const Icon(Icons.search, color: Colors.grey),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                    ),
                    onChanged: (v) => setState(() => _searchQuery = v),
                  ),
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildRoleChip('', 'Tous (${_users.length})'),
                      const SizedBox(width: 8),
                      _buildRoleChip('CITIZEN', 'Citoyens'),
                      const SizedBox(width: 8),
                      _buildRoleChip('MUNICIPAL_AGENT', 'Agents'),
                      const SizedBox(width: 8),
                      _buildRoleChip('ADMIN', 'Admins'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(16),
            child: GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 2,
              children: [
                _buildStatCard(
                  'Total',
                  '$_total',
                  Icons.people,
                  const Color(0xFF3B82F6),
                ),
                _buildStatCard(
                  'Actifs',
                  '$activeCount',
                  Icons.check_circle,
                  const Color(0xFF22C55E),
                ),
              ],
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: AppColors.primary),
                  )
                : _error != null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.error_outline,
                          size: 48,
                          color: Colors.red[400],
                        ),
                        const SizedBox(height: 12),
                        Text('Erreur: $_error'),
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: _loadUsers,
                          child: const Text('Réessayer'),
                        ),
                      ],
                    ),
                  )
                : filtered.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.search_off,
                          size: 48,
                          color: Colors.grey[400],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Aucun utilisateur trouvé',
                          style: TextStyle(color: Colors.grey[700]),
                        ),
                      ],
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: _loadUsers,
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: filtered.length,
                      itemBuilder: (context, index) =>
                          _buildUserCard(filtered[index]),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 8),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                value,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
              Text(
                label,
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRoleChip(String value, String label) {
    final isSelected = _roleFilter == value;
    return GestureDetector(
      onTap: () => setState(() => _roleFilter = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.primary : const Color(0xFFE2E8F0),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.grey[700],
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ),
    );
  }

  Widget _buildUserCard(User user) {
    final roleColor = _roleColor(user.role);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => _showUserActions(user),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [roleColor, roleColor.withValues(alpha: 0.7)],
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(
                      user.fullName.isNotEmpty
                          ? user.fullName[0].toUpperCase()
                          : '?',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user.fullName,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                      Text(
                        user.email,
                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
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
                              color: roleColor.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              _roleLabel(user.role),
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: roleColor,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: user.isActive
                                  ? const Color(0xFF22C55E)
                                  : Colors.grey,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            user.isActive ? 'Actif' : 'Inactif',
                            style: TextStyle(
                              fontSize: 10,
                              color: Colors.grey[500],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right, color: Colors.grey[400]),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showUserActions(User user) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                user.fullName,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(user.email, style: TextStyle(color: Colors.grey[600])),
              const SizedBox(height: 20),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: user.isActive
                        ? Colors.orange.withValues(alpha: 0.1)
                        : Colors.green.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    user.isActive ? Icons.block : Icons.check,
                    color: user.isActive ? Colors.orange : Colors.green,
                  ),
                ),
                title: Text(user.isActive ? 'Désactiver' : 'Activer'),
                subtitle: Text(
                  user.isActive ? 'Empêcher l\'accès' : 'Autoriser l\'accès',
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  _toggleUserStatus(user);
                },
              ),
              const Divider(),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.delete, color: Colors.red),
                ),
                title: const Text(
                  'Supprimer',
                  style: TextStyle(color: Colors.red),
                ),
                subtitle: const Text('Supprimer définitivement'),
                onTap: () {
                  Navigator.pop(ctx);
                  _deleteUser(user.id);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _toggleUserStatus(User user) async {
    try {
      await _api.patch('/admin/users/${user.id}/toggle-status', {});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              user.isActive
                  ? '${user.fullName} désactivé'
                  : '${user.fullName} activé',
            ),
            backgroundColor: AppColors.primary,
          ),
        );
        _loadUsers();
      }
    } catch (e) {
      if (mounted)
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur: $e'),
            backgroundColor: AppColors.error,
          ),
        );
    }
  }

  Future<void> _deleteUser(String userId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer l\'utilisateur'),
        content: const Text('Êtes-vous sûr? Cette action est irréversible.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await _api.delete('/admin/users/$userId');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Utilisateur supprimé'),
            backgroundColor: AppColors.success,
          ),
        );
        _loadUsers();
      }
    } catch (e) {
      if (mounted)
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur: $e'),
            backgroundColor: AppColors.error,
          ),
        );
    }
  }
}
