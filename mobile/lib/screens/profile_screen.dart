import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/providers/auth_provider.dart';
import 'package:smart_city_app/models/user_model.dart';
import 'package:smart_city_app/core/constants/colors.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  final VoidCallback? onLogout;
  final String userName;
  final String userRole;

  const ProfileScreen({
    super.key,
    this.onLogout,
    this.userName = '',
    this.userRole = '',
  });

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _isEditing = false;
  String? _errorMessage;
  String? _successMessage;
  bool _resetEmailLoading = false;
  int _activeTab = 0;
  final _fullNameController = TextEditingController();
  final _phoneController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  void _loadUserData() {
    final user = ref.read(authProvider).user;
    if (user != null) {
      _fullNameController.text = user.fullName;
      _phoneController.text = _stripCountryCode(user.phone);
    }
  }

  String _stripCountryCode(String? phone) {
    if (phone == null || phone.isEmpty) return '';
    final digits = phone.replaceAll(RegExp(r'\D'), '');
    if (digits.startsWith('216')) {
      return digits.substring(3);
    }
    return digits.length > 8 ? digits.substring(digits.length - 8) : digits;
  }

  String _formatPhoneDisplay(String? phone) {
    if (phone == null || phone.isEmpty) return 'Not set';
    final digits = phone.replaceAll(RegExp(r'\D'), '');
    if (digits.startsWith('216')) {
      return digits.substring(3);
    }
    return digits.length > 8 ? digits.substring(digits.length - 8) : digits;
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

  String _formatDate(DateTime? date) {
    if (date == null) return 'Never';
    return '${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')}/${date.year}';
  }

  Future<void> _sendPasswordResetEmail() async {
    setState(() => _resetEmailLoading = true);
    try {
      await ref.read(authProvider.notifier).forgotPassword(_userEmail);
      if (mounted) {
        setState(() {
          _successMessage = 'Password reset email sent to $_userEmail';
        });
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) setState(() => _successMessage = null);
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceFirst('Exception: ', '');
        });
      }
    } finally {
      if (mounted) {
        setState(() => _resetEmailLoading = false);
      }
    }
  }

  User? get _user => ref.read(authProvider).user;
  bool get _isLoading => ref.read(authProvider).isLoading;
  String get _userEmail => _user?.email ?? '';

  @override
  void dispose() {
    _fullNameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final isLoading = authState.isLoading;

    if (isLoading && user == null) {
      return Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: AppColors.primary),
              const SizedBox(height: 16),
              Text(
                'Loading profile...',
                style: TextStyle(
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (user == null) {
      return Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 48, color: Colors.red[400]),
              const SizedBox(height: 16),
              Text(
                'Unable to load profile',
                style: TextStyle(color: Colors.grey[600]),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: Colors.grey[700]),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.primary.withAlpha(26),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                Icons.auto_awesome,
                color: AppColors.primary,
                size: 20,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              'Smart City Tunisia',
              style: TextStyle(
                color: Colors.grey[800],
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        actions: [
          if (!_isEditing)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Row(
                children: [
                  Icon(Icons.person, color: Colors.grey[600], size: 18),
                  const SizedBox(width: 6),
                  Text(
                    user.fullName,
                    style: TextStyle(color: Colors.grey[700], fontSize: 14),
                  ),
                ],
              ),
            ),
        ],
      ),
      body: Column(
        children: [
          Container(
            width: double.infinity,
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Profile Settings',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey[900],
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Manage your personal information and account security',
                  style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                ),
              ],
            ),
          ),
          if (_errorMessage != null)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.red[100]!),
              ),
              child: Row(
                children: [
                  Icon(Icons.error_outline, color: Colors.red[600], size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: TextStyle(color: Colors.red[700], fontSize: 14),
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close, color: Colors.red[600], size: 18),
                    onPressed: () => setState(() => _errorMessage = null),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
            ),
          if (_successMessage != null)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFDCFCE7),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFBBF7D0)),
              ),
              child: Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.green[600], size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _successMessage!,
                      style: TextStyle(color: Colors.green[700], fontSize: 14),
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close, color: Colors.green[600], size: 18),
                    onPressed: () => setState(() => _successMessage = null),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _activeTab = 0),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: _activeTab == 0
                            ? AppColors.primary
                            : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: _activeTab == 0
                            ? [
                                BoxShadow(
                                  color: AppColors.primary.withAlpha(77),
                                  blurRadius: 8,
                                  offset: const Offset(0, 4),
                                ),
                              ]
                            : null,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.person,
                            color: _activeTab == 0
                                ? Colors.white
                                : Colors.grey[600],
                            size: 18,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Profile',
                            style: TextStyle(
                              color: _activeTab == 0
                                  ? Colors.white
                                  : Colors.grey[600],
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _activeTab = 1),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: _activeTab == 1
                            ? AppColors.primary
                            : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: _activeTab == 1
                            ? [
                                BoxShadow(
                                  color: AppColors.primary.withAlpha(77),
                                  blurRadius: 8,
                                  offset: const Offset(0, 4),
                                ),
                              ]
                            : null,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.lock,
                            color: _activeTab == 1
                                ? Colors.white
                                : Colors.grey[600],
                            size: 18,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Security',
                            style: TextStyle(
                              color: _activeTab == 1
                                  ? Colors.white
                                  : Colors.grey[600],
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _activeTab == 0
                ? _buildProfileTab(user, isLoading)
                : _buildSecurityTab(user),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileTab(dynamic user, bool isLoading) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFF1F5F9)),
        ),
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.primary.withAlpha(26),
                    AppColors.primary.withAlpha(13),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(16),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withAlpha(26),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Icon(
                      Icons.person,
                      color: AppColors.primary,
                      size: 36,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user.fullName.isNotEmpty ? user.fullName : 'User',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey[900],
                          ),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withAlpha(26),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.shield,
                                color: AppColors.primary,
                                size: 14,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                _getRoleDisplayName(user.role),
                                style: TextStyle(
                                  color: AppColors.primary,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (!_isEditing)
                    ElevatedButton.icon(
                      onPressed: () => setState(() => _isEditing = true),
                      icon: const Icon(Icons.edit, size: 16),
                      label: const Text('Edit'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                      ),
                    )
                  else
                    TextButton(
                      onPressed: () {
                        setState(() => _isEditing = false);
                        _loadUserData();
                      },
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.close, size: 16, color: Colors.grey[600]),
                          const SizedBox(width: 4),
                          Text(
                            'Cancel',
                            style: TextStyle(color: Colors.grey[600]),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _buildEmailField(user),
                  const SizedBox(height: 12),
                  if (_isEditing)
                    _buildFullNameEditField()
                  else
                    _buildInfoTile(
                      Icons.person,
                      'Full Name',
                      user.fullName.isNotEmpty ? user.fullName : 'Not set',
                      const Color(0xFF22C55E),
                    ),
                  const SizedBox(height: 12),
                  if (_isEditing)
                    _buildPhoneEditField()
                  else
                    _buildInfoTile(
                      Icons.phone,
                      'Phone',
                      user.phone != null && user.phone!.isNotEmpty
                          ? _formatPhoneDisplay(user.phone)
                          : 'Not set',
                      const Color(0xFFF59E0B),
                    ),
                  if (_shouldShowMunicipality(user.role)) ...[
                    const SizedBox(height: 12),
                    _buildInfoTile(
                      Icons.location_on,
                      'Municipality',
                      user.municipalityName ?? 'Not set',
                      Colors.purple,
                    ),
                  ],
                  if (_shouldShowMunicipality(user.role) &&
                      user.governorate != null) ...[
                    const SizedBox(height: 12),
                    _buildInfoTile(
                      Icons.location_on,
                      'Governorate',
                      user.governorate ?? 'Not set',
                      Colors.blue,
                    ),
                  ],
                  if (_shouldShowDepartment(user.role, user.department)) ...[
                    const SizedBox(height: 12),
                    _buildInfoTile(
                      Icons.business,
                      'Department',
                      user.department ?? 'Not set',
                      Colors.orange,
                    ),
                  ],
                  if (_isEditing) ...[
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: isLoading ? null : _saveProfile,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                            ),
                            icon: isLoading
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(Icons.save, size: 18),
                            label: const Text('Save Changes'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSecurityTab(dynamic user) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFF1F5F9)),
        ),
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    const Color(0xFFFEF2F2).withAlpha(128),
                    const Color(0xFFFEF2F2).withAlpha(64),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(16),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Icon(Icons.lock, color: Colors.red[600], size: 28),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Security Settings',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey[900],
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Manage your password and account security',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _buildInfoTile(
                    Icons.shield,
                    'Password',
                    'Last changed',
                    const Color(0xFF22C55E),
                    subtitle: _formatDate(DateTime.now()),
                    showArrow: false,
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: AppColors.primary.withAlpha(26),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            Icons.lock,
                            color: AppColors.primary,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Password Reset',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  color: Colors.grey[700],
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Send password reset email',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey[500],
                                ),
                              ),
                            ],
                          ),
                        ),
                        ElevatedButton(
                          onPressed: _resetEmailLoading
                              ? null
                              : _sendPasswordResetEmail,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                          ),
                          child: _resetEmailLoading
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Text('Send Reset Email'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmailField(dynamic user) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.primary.withAlpha(26),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(Icons.email, color: AppColors.primary, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Email',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: Colors.grey[700],
                  ),
                ),
                Text(
                  'Cannot be changed',
                  style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                ),
              ],
            ),
          ),
          Expanded(
            child: Text(
              user.email,
              style: TextStyle(
                color: Colors.grey[900],
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.end,
            ),
          ),
          const SizedBox(width: 8),
          Icon(Icons.email, color: Colors.grey[400], size: 16),
        ],
      ),
    );
  }

  Widget _buildFullNameEditField() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Full Name',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: Colors.grey[700],
            ),
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: _fullNameController,
            decoration: InputDecoration(
              hintText: 'Enter your full name',
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 12,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: Colors.grey[300]!),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: Colors.grey[300]!),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: const BorderRadius.only(
                  topRight: Radius.circular(8),
                  bottomRight: Radius.circular(8),
                ),
                borderSide: const BorderSide(
                  color: AppColors.primary,
                  width: 2,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPhoneEditField() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Phone',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: Colors.grey[700],
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 14,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  border: Border.all(color: Colors.grey[300]!),
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(8),
                    bottomLeft: Radius.circular(8),
                  ),
                ),
                child: Text(
                  'TN',
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              Expanded(
                child: TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  maxLength: 8,
                  decoration: InputDecoration(
                    hintText: '2X XXX XXX',
                    filled: true,
                    fillColor: Colors.white,
                    counterText: '',
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 14,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.only(
                        topRight: Radius.circular(8),
                        bottomRight: Radius.circular(8),
                      ),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.only(
                        topRight: Radius.circular(8),
                        bottomRight: Radius.circular(8),
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.only(
                        topRight: Radius.circular(8),
                        bottomRight: Radius.circular(8),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Optional. Enter 8 digits (e.g., 25448885)',
            style: TextStyle(fontSize: 12, color: Colors.grey[500]),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoTile(
    IconData icon,
    String title,
    String value,
    Color iconColor, {
    String? subtitle,
    bool showArrow = true,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: iconColor.withAlpha(26),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: iconColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: Colors.grey[700],
                  ),
                ),
                if (subtitle != null)
                  Text(
                    subtitle,
                    style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                  ),
              ],
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                color: Colors.grey[900],
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.end,
            ),
          ),
          if (showArrow) ...[
            const SizedBox(width: 8),
            Icon(Icons.chevron_right, color: Colors.grey[400], size: 20),
          ],
        ],
      ),
    );
  }

  bool _shouldShowMunicipality(String role) {
    return role == 'CITIZEN' ||
        role == 'MUNICIPAL_AGENT' ||
        role == 'ADMIN' ||
        role == 'DEPARTMENT_MANAGER';
  }

  bool _shouldShowDepartment(String role, String? department) {
    return (role == 'DEPARTMENT_MANAGER' || role == 'TECHNICIAN') &&
        department != null;
  }

  Future<void> _saveProfile() async {
    setState(() => _errorMessage = null);

    try {
      final fullName = _fullNameController.text.trim();
      if (fullName.isEmpty) {
        setState(() => _errorMessage = 'Full name is required');
        return;
      }

      final nameParts = fullName.split(' ');
      final firstName = nameParts.isNotEmpty ? nameParts[0] : '';
      final lastName = nameParts.length > 1
          ? nameParts.sublist(1).join(' ')
          : '';

      await ref
          .read(authProvider.notifier)
          .updateProfile(
            firstName,
            lastName,
            _phoneController.text.isNotEmpty ? _phoneController.text : '',
          );

      if (mounted) {
        setState(() => _isEditing = false);
        setState(() {
          _successMessage = 'Profile updated successfully!';
        });
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) setState(() => _successMessage = null);
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }
}
