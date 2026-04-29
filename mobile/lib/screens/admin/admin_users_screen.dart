import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/core/constants/colors.dart';
import 'package:smart_city_app/data/tunisia_geography.dart';
import 'package:smart_city_app/services/admin_service.dart';

class AdminUsersScreen extends ConsumerStatefulWidget {
  const AdminUsersScreen({super.key});

  @override
  ConsumerState<AdminUsersScreen> createState() => _AdminUsersScreenState();
}

class _AdminUsersScreenState extends ConsumerState<AdminUsersScreen> {
  final AdminService _adminService = AdminService();

  List<dynamic> _users = [];
  Map<String, dynamic> _stats = {};
  bool _isLoading = true;
  String? _error;
  int _page = 1;
  int _totalPages = 1;
  int _total = 0;
  String _searchQuery = '';
  final _searchController = TextEditingController();

  bool _showCreateModal = false;
  bool _showEditModal = false;
  dynamic _selectedUser;

  final _createForm = <String, dynamic>{
    'fullName': '', 'email': '', 'role': 'CITIZEN', 'phone': '',
    'governorate': '', 'municipality': '', 'department': '',
  };
  final _editForm = <String, dynamic>{
    'fullName': '', 'phone': '', 'isActive': true, 'role': 'CITIZEN',
    'governorate': '', 'municipality': '', 'department': '',
  };
  final Map<String, String> _formErrors = {};

  final List<Map<String, String>> _roleOptions = [
    {'value': 'CITIZEN', 'label': 'Citoyen'},
    {'value': 'MUNICIPAL_AGENT', 'label': 'Agent municipal'},
    {'value': 'DEPARTMENT_MANAGER', 'label': 'Responsable dept'},
    {'value': 'TECHNICIAN', 'label': 'Technicien'},
    {'value': 'ADMIN', 'label': 'Administrateur'},
  ];

  List<dynamic> _departments = [];

  @override
  void initState() {
    super.initState();
    _loadUsers();
    _loadStats();
    _loadDepartments();
  }

  Future<void> _loadUsers() async {
    setState(() => _isLoading = true);
    try {
      final response = await _adminService.getUsers(
        page: _page, limit: 10,
        search: _searchQuery.isEmpty ? null : _searchQuery,
      );
      setState(() {
        _users = response['users'] ?? [];
        final p = response['pagination'];
        if (p != null) { _total = p['total'] ?? 0; _totalPages = p['pages'] ?? 1; }
        _isLoading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _isLoading = false; });
    }
  }

  Future<void> _loadStats() async {
    try { _stats = await _adminService.getUserStats(); } catch (e) { debugPrint('$e'); }
  }

  Future<void> _loadDepartments() async {
    try { _departments = await _adminService.getDepartments(); } catch (e) { debugPrint('$e'); }
  }

  bool _requiresMunicipality(String role) =>
    ['CITIZEN','MUNICIPAL_AGENT','DEPARTMENT_MANAGER','TECHNICIAN'].contains(role);
  bool _requiresDepartment(String role) =>
    ['DEPARTMENT_MANAGER','TECHNICIAN'].contains(role);

  void _openCreateModal() => setState(() {
    _createForm.updateAll((_, __) => '');
    _createForm['role'] = 'CITIZEN';
    _createForm['isActive'] = true;
    _formErrors.clear();
    _showCreateModal = true;
  });

  void _openEditModal(dynamic user) => setState(() {
    _selectedUser = user;
    _editForm['fullName'] = user['fullName'] ?? '';
    _editForm['phone'] = user['phone'] ?? '';
    _editForm['isActive'] = user['isActive'] ?? true;
    _editForm['role'] = user['role'] ?? 'CITIZEN';
    final m = user['municipality'];
    _editForm['municipality'] = m is String ? m : (m?['name'] ?? '');
    _editForm['governorate'] = user['governorate'] ?? '';
    final d = user['department'];
    _editForm['department'] = d is String ? d : (d?['_id'] ?? '');
    _formErrors.clear();
    _showEditModal = true;
  });

  String? _validate(String field, String value, String role) {
    switch (field) {
      case 'fullName': return value.trim().isEmpty ? 'Requis' : null;
      case 'email': return RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(value) ? null : 'Email invalide';
      case 'governorate': return _requiresMunicipality(role) && value.isEmpty ? 'Requis' : null;
      case 'municipality': return _requiresMunicipality(role) && value.isEmpty ? 'Requis' : null;
      case 'department': return _requiresDepartment(role) && value.isEmpty ? 'Requis' : null;
      default: return null;
    }
  }

  Future<void> _createUser() async {
    _formErrors.clear();
    final r = _createForm['role'];
    final errs = <String, String>{
      'fullName': _validate('fullName', _createForm['fullName'], r) ?? '',
      'email': _validate('email', _createForm['email'], r) ?? '',
      'governorate': _validate('governorate', _createForm['governorate'], r) ?? '',
      'municipality': _validate('municipality', _createForm['municipality'], r) ?? '',
      'department': _validate('department', _createForm['department'], r) ?? '',
    }..removeWhere((_, v) => v.isEmpty);

    if (errs.isNotEmpty) { setState(() => _formErrors.addAll(errs)); return; }

    try {
      await _adminService.createUser({
        'fullName': _createForm['fullName'], 'email': _createForm['email'],
        'role': _createForm['role'], 'phone': _createForm['phone'],
        if (_createForm['governorate'].isNotEmpty) 'governorate': _createForm['governorate'],
        if (_createForm['municipality'].isNotEmpty) 'municipality': _createForm['municipality'],
        if (_createForm['department'].isNotEmpty) 'department': _createForm['department'],
      });
      setState(() => _showCreateModal = false);
      _loadUsers(); _loadStats();
      _showSnack('Utilisateur créé !', Colors.green);
    } catch (e) {
      final m = e.toString().toLowerCase();
      if (m.contains('email') && m.contains('existe')) {
        setState(() => _formErrors['email'] = 'Email déjà utilisé');
      } else { _showSnack('Erreur: $e', Colors.red); }
    }
  }

  Future<void> _updateUser() async {
    if (_selectedUser == null) return;
    try {
      await _adminService.updateUser(_selectedUser['id'] ?? _selectedUser['_id'], {
        'fullName': _editForm['fullName'], 'phone': _editForm['phone'], 'isActive': _editForm['isActive'],
        if (_editForm['governorate'].isNotEmpty) 'governorate': _editForm['governorate'],
        if (_editForm['municipality'].isNotEmpty) 'municipality': _editForm['municipality'],
        if (_editForm['department'].isNotEmpty) 'department': _editForm['department'],
      });
      if (_editForm['role'] != _selectedUser['role']) {
        await _adminService.updateUserRole(_selectedUser['id'] ?? _selectedUser['_id'], _editForm['role']);
      }
      setState(() => _showEditModal = false);
      _loadUsers(); _loadStats();
      _showSnack('Mis à jour !', Colors.green);
    } catch (e) { _showSnack('Erreur: $e', Colors.red); }
  }

  Future<void> _toggleActive(String id, bool isActive) async {
    try {
      await _adminService.toggleUserActive(id, !isActive);
      _loadUsers(); _loadStats();
      _showSnack(isActive ? 'Désactivé' : 'Activé', Colors.green);
    } catch (e) { _showSnack('Erreur: $e', Colors.red); }
  }

  Future<void> _deleteUser(String id) async {
    final ok = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(
      title: const Text('Supprimer ?'),
      content: const Text('Action irréversible.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
        TextButton(onPressed: () => Navigator.pop(ctx, true), style: TextButton.styleFrom(foregroundColor: Colors.red), child: const Text('Supprimer')),
      ],
    ));
    if (ok != true) return;
    try { await _adminService.deleteUser(id); _loadUsers(); _loadStats(); _showSnack('Supprimé', Colors.green); }
    catch (e) { _showSnack('Erreur: $e', Colors.red); }
  }

  void _showSnack(String msg, Color color) => ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(msg), backgroundColor: color),
  );

  List<String> _getMunicipalities(String g) => TunisiaGeography.getMunicipalities(g);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: Colors.white, foregroundColor: AppColors.textPrimary, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => Navigator.pop(context)),
        title: const Text('Utilisateurs', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _loadUsers)],
      ),
      body: _isLoading && _users.isEmpty
        'fullName': _createForm['fullName'],
        'email': _createForm['email'],
        'role': _createForm['role'],
        'phone': _createForm['phone'],
        if (_createForm['governorate'].isNotEmpty) 'governorate': _createForm['governorate'],
        if (_createForm['municipality'].isNotEmpty) 'municipality': _createForm['municipality'],
        if (_createForm['department'].isNotEmpty) 'department': _createForm['department'],
      });
      
      setState(() => _showCreateModal = false);
      _loadUsers();
      _loadStats();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Utilisateur créé avec succès !'), backgroundColor: Colors.green),
      );
    } catch (e) {
      final msg = e.toString().toLowerCase();
      if (msg.contains('email') && (msg.contains('existe') || msg.contains('already'))) {
        setState(() => _formErrors['email'] = 'Un compte existe déjà avec cet email');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _updateUser() async {
    if (_selectedUser == null) return;
    
    try {
      await _adminService.updateUser(_selectedUser['id'] ?? _selectedUser['_id'], {
        'fullName': _editForm['fullName'],
        'phone': _editForm['phone'],
        'isActive': _editForm['isActive'],
        if (_editForm['governorate'].isNotEmpty) 'governorate': _editForm['governorate'],
        if (_editForm['municipality'].isNotEmpty) 'municipality': _editForm['municipality'],
        if (_editForm['department'].isNotEmpty) 'department': _editForm['department'],
      });
      
      if (_editForm['role'] != _selectedUser['role']) {
        await _adminService.updateUserRole(
          _selectedUser['id'] ?? _selectedUser['_id'],
          _editForm['role'],
        );
      }
      
      setState(() => _showEditModal = false);
      _loadUsers();
      _loadStats();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Utilisateur mis à jour !'), backgroundColor: Colors.green),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _toggleUserActive(String userId, bool isActive) async {
    try {
      await _adminService.toggleUserActive(userId, !isActive);
      _loadUsers();
      _loadStats();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(isActive ? 'Utilisateur désactivé' : 'Utilisateur activé'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _deleteUser(String userId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer l\'utilisateur'),
        content: const Text('Cette action est irréversible. Êtes-vous sûr ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    
    if (confirmed != true) return;
    
    try {
      await _adminService.deleteUser(userId);
      _loadUsers();
      _loadStats();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Utilisateur supprimé'), backgroundColor: Colors.green),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red),
      );
    }
  }

  List<String> _getMunicipalities(String governorate) {
    return TunisiaGeography.getMunicipalities(governorate);
  }

  @override
  Widget build(BuildContext context) {
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
        title: const Text('Gestion des utilisateurs', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadUsers),
        ],
      ),
      body: _isLoading && _users.isEmpty
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : Column(
              children: [
                // Stats cards
                _buildStatsCards(),
                // Search bar
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)],
                    ),
                    child: TextField(
                      controller: _searchController,
                      decoration: InputDecoration(
                        hintText: 'Rechercher par nom ou email...',
                        prefixIcon: const Icon(Icons.search, color: Colors.grey),
                        suffixIcon: _searchQuery.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear),
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() {
                                    _searchQuery = '';
                                    _page = 1;
                                  });
                                  _loadUsers();
                                },
                              )
                            : null,
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      ),
                      onSubmitted: (v) {
                        setState(() {
                          _searchQuery = v;
                          _page = 1;
                        });
                        _loadUsers();
                      },
                    ),
                  ),
                ),
                // Users list
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _loadUsers,
                    child: _users.isEmpty
                        ? _buildEmpty()
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            itemCount: _users.length,
                            itemBuilder: (_, i) => _buildUserCard(_users[i]),
                          ),
                  ),
                ),
                // Pagination
                if (_totalPages > 1)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.chevron_left),
                          onPressed: _page > 1
                              ? () {
                                  setState(() => _page--);
                                  _loadUsers();
                                }
                              : null,
                        ),
                        Text('Page $_page sur $_totalPages', style: const TextStyle(fontWeight: FontWeight.w600)),
                        IconButton(
                          icon: const Icon(Icons.chevron_right),
                          onPressed: _page < _totalPages
                              ? () {
                                  setState(() => _page++);
                                  _loadUsers();
                                }
                              : null,
                        ),
                      ],
                    ),
                  ),
              ],
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _openCreateModal,
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add),
      ),
      // Create Modal
      bottomSheet: _showCreateModal ? _buildCreateModal() : null,
    );
  }

  Widget _buildStatsCards() {
    final total = _stats['total'] ?? 0;
    final active = _stats['active'] ?? 0;
    final inactive = _stats['inactive'] ?? 0;
    final adminCount = (_stats['byRole'] as List<dynamic>?)?.firstWhere(
          (r) => r['_id'] == 'ADMIN',
          orElse: () => {'count': 0},
        )['count'] ?? 0;

    return Container(
      padding: const EdgeInsets.all(16),
      child: GridView.count(
        crossAxisCount: 4,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        childAspectRatio: 1.2,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        children: [
          _buildStatCard('Total', total.toString(), Icons.people, const Color(0xFF3B82F6)),
          _buildStatCard('Actifs', active.toString(), Icons.check_circle, const Color(0xFF22C55E)),
          _buildStatCard('Inactifs', inactive.toString(), Icons.cancel, const Color(0xFF6B7280)),
          _buildStatCard('Admins', adminCount.toString(), Icons.admin_panel_settings, const Color(0xFFEF4444)),
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
          Text(label, style: TextStyle(fontSize: 10, color: Colors.grey[600])),
        ],
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.people_outline, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text(
            _searchQuery.isNotEmpty ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          if (_searchQuery.isNotEmpty)
            TextButton(
              onPressed: () {
                _searchController.clear();
                setState(() {
                  _searchQuery = '';
                  _page = 1;
                });
                _loadUsers();
              },
              child: const Text('Réinitialiser la recherche'),
            ),
        ],
      ),
    );
  }

  Widget _buildUserCard(dynamic user) {
    final role = user['role'] as String? ?? 'CITIZEN';
    final isActive = user['isActive'] as bool? ?? true;
    final roleColor = _getRoleColor(role);
    final roleLabel = _roleOptions.firstWhere((r) => r['value'] == role, orElse: () => {'label': role})['label']!;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user['fullName'] ?? 'Sans nom',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        user['email'] ?? '',
                        style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: roleColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    roleLabel,
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: roleColor),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                if (user['governorate'] != null) ...[
                  Icon(Icons.location_on, size: 14, color: Colors.grey[400]),
                  const SizedBox(width: 4),
                  Text(
                    '${user['municipality'] is String ? user['municipality'] : user['municipality']?['name'] ?? ''}, ${user['governorate']}',
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  ),
                ],
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isActive ? Colors.green.withOpacity(0.1) : Colors.grey.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    isActive ? 'Actif' : 'Inactif',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: isActive ? Colors.green : Colors.grey,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _openEditModal(user),
                    icon: const Icon(Icons.edit, size: 16),
                    label: const Text('Modifier'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: const BorderSide(color: AppColors.primary),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _toggleUserActive(user['id'] ?? user['_id'], isActive),
                    icon: Icon(isActive ? Icons.block : Icons.check_circle, size: 16),
                    label: Text(isActive ? 'Désactiver' : 'Activer'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: isActive ? Colors.orange : Colors.green,
                      side: BorderSide(color: isActive ? Colors.orange : Colors.green),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: () => _deleteUser(user['id'] ?? user['_id']),
                  icon: const Icon(Icons.delete_outline, color: Colors.red),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCreateModal() {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: Colors.grey[200]!)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Nouvel utilisateur',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => setState(() => _showCreateModal = false),
                ),
              ],
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildFormField('Nom complet *', 'fullName', _createForm, required: true),
                  const SizedBox(height: 16),
                  _buildFormField('Email *', 'email', _createForm, required: true, keyboardType: TextInputType.emailAddress),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.blue.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.info, color: Colors.blue, size: 18),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Un lien d\'activation sera envoyé par email pour définir le mot de passe.',
                            style: TextStyle(fontSize: 13, color: Colors.blue),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildRoleDropdown('Rôle', 'role', _createForm, (v) {
                    setState(() {
                      _createForm['role'] = v;
                      _createForm['governorate'] = '';
                      _createForm['municipality'] = '';
                      _createForm['department'] = '';
                    });
                  }),
                  const SizedBox(height: 16),
                  if (_requiresMunicipality(_createForm['role'])) ...[
                    _buildAutocompleteField(
                      'Gouvernorat *',
                      'governorate',
                      _createForm,
                      TunisiaGeography.governorateNames,
                      onChanged: (v) {
                        setState(() {
                          _createForm['governorate'] = v;
                          _createForm['municipality'] = '';
                        });
                      },
                    ),
                    const SizedBox(height: 16),
                    if (_createForm['governorate'].isNotEmpty)
                      _buildAutocompleteField(
                        'Municipalité *',
                        'municipality',
                        _createForm,
                        _getMunicipalities(_createForm['governorate']),
                      ),
                    const SizedBox(height: 16),
                  ],
                  if (_requiresDepartment(_createForm['role'])) ...[
                    _buildDepartmentDropdown('Département *', 'department', _createForm),
                    const SizedBox(height: 16),
                  ],
                  _buildFormField('Téléphone', 'phone', _createForm, keyboardType: TextInputType.phone),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _createUser,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Créer l\'utilisateur', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEditModal() {
    if (_selectedUser == null) return const SizedBox.shrink();
    
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: Colors.grey[200]!)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Modifier l\'utilisateur',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => setState(() => _showEditModal = false),
                ),
              ],
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildFormField('Nom complet', 'fullName', _editForm),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.email, color: Colors.grey[600], size: 18),
                        const SizedBox(width: 8),
                        Text(
                          _selectedUser['email'] ?? '',
                          style: TextStyle(fontSize: 14, color: Colors.grey[700]),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildRoleDropdown('Rôle', 'role', _editForm, (v) {
                    setState(() {
                      _editForm['role'] = v;
                      _editForm['governorate'] = '';
                      _editForm['municipality'] = '';
                      _editForm['department'] = '';
                    });
                  }),
                  const SizedBox(height: 16),
                  if (_requiresMunicipality(_editForm['role'])) ...[
                    _buildAutocompleteField(
                      'Gouvernorat',
                      'governorate',
                      _editForm,
                      TunisiaGeography.governorateNames,
                      onChanged: (v) {
                        setState(() {
                          _editForm['governorate'] = v;
                          _editForm['municipality'] = '';
                        });
                      },
                    ),
                    const SizedBox(height: 16),
                    if (_editForm['governorate'].isNotEmpty)
                      _buildAutocompleteField(
                        'Municipalité',
                        'municipality',
                        _editForm,
                        _getMunicipalities(_editForm['governorate']),
                      ),
                    const SizedBox(height: 16),
                  ],
                  if (_requiresDepartment(_editForm['role'])) ...[
                    _buildDepartmentDropdown('Département', 'department', _editForm),
