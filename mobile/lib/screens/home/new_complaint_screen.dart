import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:smart_city_app/core/constants/app_theme.dart';
import 'package:smart_city_app/data/tunisia_geography.dart';
import 'package:smart_city_app/providers/auth_provider.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/services/ai_service.dart';

class NewComplaintScreen extends ConsumerStatefulWidget {
  final VoidCallback? onComplaintSubmitted;
  const NewComplaintScreen({super.key, this.onComplaintSubmitted});

  @override
  ConsumerState<NewComplaintScreen> createState() => _NewComplaintScreenState();
}

class _NewComplaintScreenState extends ConsumerState<NewComplaintScreen> {
  final _formKey = GlobalKey<FormState>();
  final ComplaintService _complaintService = ComplaintService();
  final AiService _aiService = AiService();

  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _addressController = TextEditingController();
  final _phoneController = TextEditingController();

  String _selectedCategory = 'ROAD';
  String _selectedUrgency = 'LOW';
  String? _selectedGovernorate;
  String? _selectedMunicipality;
  String? _predictedCategory;
  int _aiConfidence = 0;
  bool _aiLoading = false;

  final List<File> _photos = [];
  final ImagePicker _picker = ImagePicker();
  bool _isSubmitting = false;

  final List<String> _tunisiaGovernorates = TunisiaGeography.governorateNames;

  List<String> _getMunicipalitiesByGovernorate(String governorate) {
    return TunisiaGeography.getMunicipalities(governorate);
  }

  @override
  void initState() {
    super.initState();
    final user = ref.read(authProvider).user;
    if (user?.governorate != null && user!.governorate.isNotEmpty) {
      _selectedGovernorate = user.governorate;
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _addressController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    try {
      // Simulate API call or processing
      await Future.delayed(const Duration(seconds: 1));
      
      if (widget.onComplaintSubmitted != null) {
        widget.onComplaintSubmitted!();
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Submit Complaint'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Category dropdown
              DropdownButtonFormField<String>(
                value: _selectedCategory,
                decoration: const InputDecoration(
                  labelText: 'Category',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(value: 'ROAD', child: Text('Road')),
                  DropdownMenuItem(value: 'WATER', child: Text('Water')),
                  DropdownMenuItem(value: 'ELECTRICITY', child: Text('Electricity')),
                  DropdownMenuItem(value: 'SEWERAGE', child: Text('Sewerage')),
                  DropdownMenuItem(value: 'GARBAGE', child: Text('Garbage')),
                  DropdownMenuItem(value: 'OTHER', child: Text('Other')),
                ],
                onChanged: (value) => setState(() => _selectedCategory = value!),
              ),
              const SizedBox(height: 16),

              // Governorate dropdown
              DropdownButtonFormField<String>(
                value: _selectedGovernorate,
                decoration: const InputDecoration(
                  labelText: 'Governorate',
                  border: OutlineInputBorder(),
                ),
                items: _tunisiaGovernorates.map((g) => 
                  DropdownMenuItem(value: g, child: Text(g))
                ).toList(),
                onChanged: (value) => setState(() {
                  _selectedGovernorate = value;
                  _selectedMunicipality = null;
                }),
              ),
              const SizedBox(height: 16),

              // Municipality dropdown
              if (_selectedGovernorate != null)
                DropdownButtonFormField<String>(
                  value: _selectedMunicipality,
                  decoration: const InputDecoration(
                    labelText: 'Municipality',
                    border: OutlineInputBorder(),
                  ),
                  items: _getMunicipalitiesByGovernorate(_selectedGovernorate!).map((m) => 
                    DropdownMenuItem(value: m, child: Text(m))
                  ).toList(),
                  onChanged: (value) => setState(() => _selectedMunicipality = value),
                ),
              const SizedBox(height: 16),

              // Description
              TextFormField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Description',
                  border: OutlineInputBorder(),
                ),
                maxLines: 4,
                validator: (value) => value == null || value.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),

              // Address
              TextFormField(
                controller: _addressController,
                decoration: const InputDecoration(
                  labelText: 'Address',
                  border: OutlineInputBorder(),
                ),
                validator: (value) => value == null || value.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),

              // Phone
              TextFormField(
                controller: _phoneController,
                decoration: const InputDecoration(
                  labelText: 'Phone Number',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.phone,
                validator: (value) => value == null || value.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 24),

              // Photo upload placeholder
              ElevatedButton.icon(
                onPressed: () {
                  // Photo upload logic
                },
                icon: const Icon(Icons.camera_alt),
                label: const Text('Add Photo'),
              ),
              const SizedBox(height: 24),

              // Submit button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _handleSubmit,
                  child: _isSubmitting 
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Submit'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
