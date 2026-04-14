import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:smart_city_app/services/api_client.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/main.dart';
import 'package:smart_city_app/data/tunisia_geography.dart';

class NewComplaintScreen extends StatefulWidget {
  final VoidCallback onComplaintSubmitted;

  const NewComplaintScreen({super.key, required this.onComplaintSubmitted});

  @override
  State<NewComplaintScreen> createState() => _NewComplaintScreenState();
}

class _NewComplaintScreenState extends State<NewComplaintScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final ApiClient _apiClient = ApiClient();
  final ComplaintService _complaintService = ComplaintService();
  final ImagePicker _picker = ImagePicker();

  String? _selectedCategory;
  String? _selectedGovernorate;
  String? _selectedMunicipality;
  List<String> _municipalities = [];
  final List<XFile> _photos = [];
  bool _isLoading = false;
  bool _gettingLocation = false;
  String? _errorMessage;
  double? _latitude;
  double? _longitude;

  static const Map<String, String> _categoryMap = {
    'ROAD': 'Road Infrastructure',
    'LIGHTING': 'Street Lighting',
    'WASTE': 'Waste Management',
    'WATER': 'Water & Sewage',
    'SAFETY': 'Public Safety',
    'PUBLIC_PROPERTY': 'Public Property',
    'GREEN_SPACE': 'Green Spaces',
    'OTHER': 'Other',
  };

  static const Map<String, IconData> _categoryIcons = {
    'ROAD': Icons.add_road,
    'LIGHTING': Icons.lightbulb,
    'WASTE': Icons.delete_sweep,
    'WATER': Icons.water_drop,
    'SAFETY': Icons.shield,
    'PUBLIC_PROPERTY': Icons.account_balance,
    'GREEN_SPACE': Icons.park,
    'OTHER': Icons.help_outline,
  };

  void _onGovernorateChanged(String? value) {
    setState(() {
      _selectedGovernorate = value;
      _selectedMunicipality = null;
      if (value != null) {
        final gov = TunisiaGeography.governorates.firstWhere(
          (g) => g.name == value,
          orElse: () => const GovernorateData(name: '', municipalities: []),
        );
        _municipalities = gov.municipalities;
      } else {
        _municipalities = [];
      }
    });
  }

  Future<void> _pickPhotos() async {
    final images = await _picker.pickMultiImage(
      imageQuality: 80,
      maxWidth: 1200,
    );
    if (images.isNotEmpty && _photos.length + images.length <= 5) {
      setState(() => _photos.addAll(images));
    } else if (_photos.length + images.length > 5) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Maximum 5 photos allowed')),
        );
      }
    }
  }

  Future<void> _takePhoto() async {
    if (_photos.length >= 5) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Maximum 5 photos allowed')));
      return;
    }
    final image = await _picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 80,
      maxWidth: 1200,
    );
    if (image != null) {
      setState(() => _photos.add(image));
    }
  }

  Future<void> _getLocation() async {
    setState(() => _gettingLocation = true);
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          throw Exception('Location permission denied');
        }
      }
      if (permission == LocationPermission.deniedForever) {
        throw Exception('Location permissions are permanently denied');
      }
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      setState(() {
        _latitude = position.latitude;
        _longitude = position.longitude;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Could not get location: $e')));
      }
    } finally {
      setState(() => _gettingLocation = false);
    }
  }

  Future<void> _submitComplaint() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCategory == null ||
        _selectedGovernorate == null ||
        _selectedMunicipality == null) {
      setState(() => _errorMessage = 'Please fill in all required fields');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Upload photos first if any
      List<Map<String, String>> mediaUrls = [];
      if (_photos.isNotEmpty) {
        final uploadResult = await _apiClient.uploadFiles(
          '/upload',
          _photos.map((p) => p.path).toList(),
          fieldName: 'photos',
        );
        if (uploadResult != null && uploadResult['urls'] != null) {
          for (final url in uploadResult['urls']) {
            mediaUrls.add({'url': url.toString(), 'type': 'photo'});
          }
        }
      }

      final body = <String, dynamic>{
        'title': _titleController.text.trim(),
        'description': _descriptionController.text.trim(),
        'category': _selectedCategory,
        'governorate': _selectedGovernorate,
        'municipality': _selectedMunicipality,
        if (mediaUrls.isNotEmpty) 'media': mediaUrls,
        if (_latitude != null && _longitude != null) 'latitude': _latitude,
        if (_latitude != null && _longitude != null) 'longitude': _longitude,
      };

      await _complaintService.createComplaint(body);

      if (mounted) {
        widget.onComplaintSubmitted();
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Complaint submitted successfully!'),
            backgroundColor: AppColors.primary,
          ),
        );
      }
    } on ApiException catch (e) {
      setState(() {
        _errorMessage = e.message;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to submit complaint';
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Report Issue'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_errorMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.error_outline,
                        color: Colors.red.shade700,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: TextStyle(color: Colors.red.shade700),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Category Selection
              const Text(
                'Category *',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _categoryMap.entries.map((entry) {
                  final selected = _selectedCategory == entry.key;
                  return ChoiceChip(
                    label: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          _categoryIcons[entry.key] ?? Icons.help_outline,
                          size: 16,
                          color: selected ? Colors.white : AppColors.primary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          entry.value,
                          style: TextStyle(
                            fontSize: 12,
                            color: selected
                                ? Colors.white
                                : AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    selected: selected,
                    selectedColor: AppColors.primary,
                    backgroundColor: AppColors.secondary,
                    onSelected: (_) =>
                        setState(() => _selectedCategory = entry.key),
                  );
                }).toList(),
              ),
              const SizedBox(height: 20),

              // Title
              TextFormField(
                controller: _titleController,
                decoration: InputDecoration(
                  labelText: 'Title *',
                  prefixIcon: const Icon(Icons.title),
                  hintText: 'Brief description of the issue',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                validator: (v) => (v == null || v.trim().isEmpty)
                    ? 'Please enter a title'
                    : null,
              ),
              const SizedBox(height: 16),

              // Description
              TextFormField(
                controller: _descriptionController,
                maxLines: 4,
                decoration: InputDecoration(
                  labelText: 'Description *',
                  prefixIcon: const Padding(
                    padding: EdgeInsets.only(bottom: 60),
                    child: Icon(Icons.description),
                  ),
                  hintText: 'Provide details about the issue...',
                  alignLabelWithHint: true,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                validator: (v) => (v == null || v.trim().isEmpty)
                    ? 'Please enter a description'
                    : null,
              ),
              const SizedBox(height: 16),

              // Governorate
              DropdownButtonFormField<String>(
                initialValue: _selectedGovernorate,
                decoration: InputDecoration(
                  labelText: 'Governorate *',
                  prefixIcon: const Icon(Icons.location_city),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                items: TunisiaGeography.governorates.map((gov) {
                  return DropdownMenuItem(
                    value: gov.name,
                    child: Text(gov.name),
                  );
                }).toList(),
                onChanged: _onGovernorateChanged,
                validator: (v) =>
                    v == null ? 'Please select a governorate' : null,
              ),
              const SizedBox(height: 16),

              // Municipality
              DropdownButtonFormField<String>(
                initialValue: _selectedMunicipality,
                decoration: InputDecoration(
                  labelText: 'Municipality *',
                  prefixIcon: const Icon(Icons.location_on),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                items: _municipalities.map((m) {
                  return DropdownMenuItem(value: m, child: Text(m));
                }).toList(),
                onChanged: (v) => setState(() => _selectedMunicipality = v),
                validator: (v) =>
                    v == null ? 'Please select a municipality' : null,
              ),
              const SizedBox(height: 20),

              // Location
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.secondary,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Row(
                  children: [
                    Icon(
                      _latitude != null
                          ? Icons.check_circle
                          : Icons.my_location,
                      color: _latitude != null
                          ? AppColors.primary
                          : AppColors.textSecondary,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _latitude != null
                            ? 'Location captured (${_latitude!.toStringAsFixed(4)}, ${_longitude!.toStringAsFixed(4)})'
                            : 'Add your current location',
                        style: TextStyle(
                          color: _latitude != null
                              ? AppColors.primary
                              : AppColors.textSecondary,
                          fontWeight: _latitude != null
                              ? FontWeight.w600
                              : FontWeight.normal,
                        ),
                      ),
                    ),
                    if (_gettingLocation)
                      const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    else
                      TextButton(
                        onPressed: _getLocation,
                        child: Text(
                          _latitude != null ? 'Update' : 'Get Location',
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Photos
              const Text(
                'Photos',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
              ),
              const SizedBox(height: 4),
              Text(
                'Add up to 5 photos (${_photos.length}/5)',
                style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 8),
              if (_photos.isNotEmpty) ...[
                SizedBox(
                  height: 100,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _photos.length,
                    itemBuilder: (context, index) {
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: Stack(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: Image.file(
                                File(_photos[index].path),
                                width: 100,
                                height: 100,
                                fit: BoxFit.cover,
                              ),
                            ),
                            Positioned(
                              top: 4,
                              right: 4,
                              child: GestureDetector(
                                onTap: () =>
                                    setState(() => _photos.removeAt(index)),
                                child: Container(
                                  padding: const EdgeInsets.all(2),
                                  decoration: const BoxDecoration(
                                    color: Colors.red,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.close,
                                    size: 14,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 8),
              ],
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _photos.length < 5 ? _pickPhotos : null,
                      icon: const Icon(Icons.photo_library),
                      label: const Text('Gallery'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _photos.length < 5 ? _takePhoto : null,
                      icon: const Icon(Icons.camera_alt),
                      label: const Text('Camera'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),

              // Submit
              ElevatedButton(
                onPressed: _isLoading ? null : _submitComplaint,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'Submit Complaint',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
