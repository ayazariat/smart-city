import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:smart_city_app/services/api_client.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/core/constants/colors.dart';
import 'package:smart_city_app/data/tunisia_geography.dart';
import 'package:smart_city_app/screens/complaint_detail_screen.dart';
import 'package:smart_city_app/widgets/location_picker_map.dart';

class NewComplaintScreen extends StatefulWidget {
  final VoidCallback onComplaintSubmitted;
  final VoidCallback? onBack;

  const NewComplaintScreen({
    super.key,
    required this.onComplaintSubmitted,
    this.onBack,
  });

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
  String? _address;
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

  static const Map<String, String> _categoryDescriptions = {
    'ROAD': 'Potholes, damaged roads, traffic signs',
    'LIGHTING': 'Street lights, broken lamps, dark areas',
    'WASTE': 'Garbage collection, overflowing bins',
    'WATER': 'Leaks, flooding, drainage issues',
    'SAFETY': 'Public hazards, dangerous areas',
    'PUBLIC_PROPERTY': 'Damaged buildings, public facilities',
    'GREEN_SPACE': 'Parks maintenance, trees, gardens',
    'OTHER': 'Other urban issues',
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

  @override
  void initState() {
    super.initState();
    _titleController.addListener(_onTextChanged);
    _descriptionController.addListener(_onTextChanged);
  }

  void _onTextChanged() {
    if (_titleController.text.trim().length >= 5 &&
        _descriptionController.text.trim().length >= 20 &&
        _selectedCategory != null &&
        _selectedMunicipality != null) {
      _checkDuplicates();
    }
  }

  // Duplicate detection state
  List<Map<String, dynamic>> _proactiveDuplicates = [];
  bool _isCheckingDuplicates = false;
  bool _duplicateOverride = false;

  String? _matchComplaintId(Map<String, dynamic> match) {
    final id =
        match['complaintId'] ??
        match['id'] ??
        match['_id'] ??
        match['existingComplaintId'];
    return id?.toString();
  }

  // Check for duplicates proactively
  Future<void> _checkDuplicates() async {
    if (_titleController.text.trim().length < 5 ||
        _descriptionController.text.trim().length < 20 ||
        _selectedCategory == null ||
        _selectedMunicipality == null ||
        _duplicateOverride) {
      return;
    }

    setState(() => _isCheckingDuplicates = true);

    try {
      final result = await _complaintService.checkDuplicate(
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim(),
        category: _selectedCategory!,
        municipality: _selectedMunicipality!,
        latitude: _latitude,
        longitude: _longitude,
      );

      if (result['topMatches'] != null &&
          (result['topMatches'] as List).isNotEmpty) {
        setState(() {
          _proactiveDuplicates = (result['topMatches'] as List)
              .take(3)
              .cast<Map<String, dynamic>>()
              .toList();
        });
      }
    } catch (e) {
      setState(() => _proactiveDuplicates = []);
    } finally {
      setState(() => _isCheckingDuplicates = false);
    }
  }

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
    try {
      final image = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 80,
        maxWidth: 1200,
      );
      if (image != null) {
        setState(() => _photos.add(image));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error taking photo: $e')),
        );
      }
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
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );
      setState(() {
        _latitude = position.latitude;
        _longitude = position.longitude;
      });
      await _reverseGeocode(position.latitude, position.longitude);
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

  Future<void> _reverseGeocode(double lat, double lng) async {
    try {
      final client = HttpClient();
      final request = await client.getUrl(Uri.parse(
          'https://nominatim.openstreetmap.org/reverse?lat=$lat&lon=$lng&format=json&accept-language=fr'));
      final response = await request.close();
      if (response.statusCode == 200) {
        final body = await response.transform(utf8.decoder).join();
        final data = jsonDecode(body) as Map<String, dynamic>?;
        if (data != null) {
          final address = data['address'] as Map<String, dynamic>?;
          if (address != null) {
            String? city = address['city'] as String?;
            String? town = address['town'] as String?;
            String? municipality = address['municipality'] as String?;
            String? village = address['village'] as String?;
            String? county = address['county'] as String?;
            String? state = address['state'] as String?;
            String? stateDistrict = address['state_district'] as String?;
            
            // Try to find the best match for Tunisian municipality
            String? bestMunicipalityMatch = municipality ?? city ?? town ?? village ?? county;
            String? bestGovernorateMatch = state ?? stateDistrict;
            
            // Try to match against Tunisian geography data
            if (bestMunicipalityMatch != null && bestGovernorateMatch != null) {
              final gov = TunisiaGeography.governorates.firstWhere(
                (g) => g.name.toLowerCase().contains(bestGovernorateMatch!.toLowerCase()) ||
                        bestGovernorateMatch.toLowerCase().contains(g.name.toLowerCase()),
                orElse: () => const GovernorateData(name: '', municipalities: []),
              );
              
              if (gov.municipalities.isNotEmpty) {
                // Find closest matching municipality
                final matchedMunicipality = gov.municipalities.firstWhere(
                  (m) => m.toLowerCase().contains(bestMunicipalityMatch!.toLowerCase()) ||
                          bestMunicipalityMatch.toLowerCase().contains(m.toLowerCase()),
                  orElse: () => gov.municipalities.first,
                );
                
                setState(() {
                  _selectedGovernorate = gov.name;
                  _selectedMunicipality = matchedMunicipality;
                });
                return;
              }
            }
            
            setState(() {
              if (bestMunicipalityMatch != null && bestMunicipalityMatch.isNotEmpty) {
                _selectedMunicipality = bestMunicipalityMatch;
              }
              if (bestGovernorateMatch != null && bestGovernorateMatch.isNotEmpty) {
                _selectedGovernorate = bestGovernorateMatch;
              }
            });
          }
        }
      }
      client.close();
    } catch (e) {
      debugPrint('Reverse geocoding error: $e');
    }
  }

  Future<String?> _getAddressFromLocation() async {
    if (_latitude == null || _longitude == null) return null;
    
    try {
      final client = HttpClient();
      final request = await client.getUrl(Uri.parse(
          'https://nominatim.openstreetmap.org/reverse?lat=$_latitude&lon=$_longitude&format=json&accept-language=en'));
      final response = await request.close();
      if (response.statusCode == 200) {
        final body = await response.transform(utf8.decoder).join();
        final data = jsonDecode(body) as Map<String, dynamic>?;
        if (data != null) {
          final addressData = data['address'] as Map<String, dynamic>?;
          if (addressData != null) {
            String? road = addressData['road'] as String?;
            String? houseNumber = addressData['house_number'] as String?;
            String? city = addressData['city'] as String?;
            String? town = addressData['town'] as String?;
            String? village = addressData['village'] as String?;
            
            List<String> addressParts = [];
            if (houseNumber != null && houseNumber.isNotEmpty) addressParts.add(houseNumber);
            if (road != null && road.isNotEmpty) addressParts.add(road);
            if (city != null && city.isNotEmpty) {
              addressParts.add(city);
            } else if (town != null && town.isNotEmpty) addressParts.add(town);
            else if (village != null && village.isNotEmpty) addressParts.add(village);
            
            if (addressParts.isNotEmpty) {
              return addressParts.join(', ');
            }
          }
        }
      }
      client.close();
    } catch (e) {
      debugPrint('Error getting address: $e');
    }
    return null;
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
      appBar: AppBar(title: const Text('Report Issue'), centerTitle: true),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Duplicate warning
              if (_proactiveDuplicates.isNotEmpty)
                Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.amber.shade200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.content_copy,
                            size: 20,
                            color: Colors.amber.shade700,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Similar complaint found!',
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                color: Colors.amber.shade700,
                              ),
                            ),
                          ),
                          if (!_duplicateOverride)
                            GestureDetector(
                              onTap: () =>
                                  setState(() => _duplicateOverride = true),
                              child: Icon(
                                Icons.close,
                                size: 18,
                                color: Colors.amber.shade700,
                              ),
                            ),
                        ],
                      ),
                      ..._proactiveDuplicates.take(2).map((m) {
                        final complaintId = _matchComplaintId(m);
                        return Container(
                          margin: const EdgeInsets.only(top: 8),
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: Colors.amber.shade200),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                m['title']?.toString() ?? 'Similar complaint',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.amber.shade900,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Similarity: ${(((m['overallScore'] ?? 0) as num).toDouble() * 100).round()}%',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.amber.shade700,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton(
                                      onPressed: complaintId == null
                                          ? null
                                          : () {
                                              Navigator.push(
                                                context,
                                                MaterialPageRoute(
                                                  builder: (_) =>
                                                      ComplaintDetailScreen(
                                                        complaintId: complaintId,
                                                      ),
                                                ),
                                              );
                                            },
                                      child: const Text('Confirm existing'),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: ElevatedButton(
                                      onPressed: () => setState(
                                        () => _duplicateOverride = true,
                                      ),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppColors.primary,
                                      ),
                                      child: const Text(
                                        'Ignore and continue',
                                        style: TextStyle(color: Colors.white),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
                ),
              if (_isCheckingDuplicates)
                Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Checking for duplicates...',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),

              // Header
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.primary, AppColors.primaryDark],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white.withAlpha(51),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.report_problem,
                        color: Colors.white,
                        size: 32,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Report an Issue',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Help improve your city by reporting urban issues',
                      style: TextStyle(
                        color: Colors.white.withAlpha(204),
                        fontSize: 13,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              if (_errorMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFFCA5A5)),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.error_outline,
                        color: Color(0xFFDC2626),
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(color: Color(0xFFDC2626)),
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
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 2.0,
                children: _categoryMap.entries.map((entry) {
                  final selected = _selectedCategory == entry.key;
                  return GestureDetector(
                    onTap: () => setState(() => _selectedCategory = entry.key),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: selected 
                            ? AppColors.primary.withAlpha(26)
                            : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: selected ? AppColors.primary : const Color(0xFFE2E8F0),
                          width: selected ? 2 : 1,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            _categoryIcons[entry.key] ?? Icons.help_outline,
                            size: 24,
                            color: selected ? AppColors.primary : AppColors.textSecondary,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            entry.value,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: selected ? AppColors.primary : AppColors.textPrimary,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _categoryDescriptions[entry.key] ?? '',
                            style: TextStyle(
                              fontSize: 10,
                              color: AppColors.textSecondary,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
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

              // Location Picker with Interactive Map
              const Text(
                'Location *',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
              ),
              const SizedBox(height: 8),
              LocationPickerMap(
                initialLatitude: _latitude,
                initialLongitude: _longitude,
                address: _address,
                onLocationSelected: (lat, lng) {
                  setState(() {
                    _latitude = lat;
                    _longitude = lng;
                    _selectedMunicipality = null;
                    _selectedGovernorate = null;
                  });
                  _getAddressFromLocation().then((address) {
                    setState(() {
                      _address = address;
                    });
                  });
                  _reverseGeocode(lat, lng);
                },
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
                              top: 0,
                              right: 0,
                              child: GestureDetector(
                                onTap: () =>
                                    setState(() => _photos.removeAt(index)),
                                child: Container(
                                  width: 24,
                                  height: 24,
                                  decoration: const BoxDecoration(
                                    color: Colors.red,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.close,
                                    size: 16,
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
