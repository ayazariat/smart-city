import 'dart:io';
import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:smart_city_app/core/constants/app_theme.dart';
import 'package:smart_city_app/data/tunisia_geography.dart';
import 'package:smart_city_app/providers/auth_provider.dart';
import 'package:smart_city_app/services/complaint_service.dart';
import 'package:smart_city_app/services/api_client.dart';
import 'package:smart_city_app/widgets/location_picker_map.dart';
import 'package:smart_city_app/widgets/toast.dart';
import 'package:smart_city_app/widgets/confirmation_dialog.dart';

class NewComplaintScreen extends ConsumerStatefulWidget {
  final VoidCallback? onComplaintSubmitted;
  final VoidCallback? onBack;

  const NewComplaintScreen({super.key, this.onComplaintSubmitted, this.onBack});

  @override
  ConsumerState<NewComplaintScreen> createState() => _NewComplaintScreenState();
}

class _NewComplaintScreenState extends ConsumerState<NewComplaintScreen> {
  final _formKey = GlobalKey<FormState>();
  final ComplaintService _complaintService = ComplaintService();
  final ScrollController _scrollController = ScrollController();

  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _phoneController = TextEditingController();

  String _selectedCategory = '';
  String _selectedUrgency = 'LOW';
  String? _selectedGovernorate;
  String? _selectedMunicipality;
  DateTime? _selectedDateTime;
  bool _isAnonymous = false;

  final List<File> _photos = [];
  final ImagePicker _picker = ImagePicker();
  bool _isSubmitting = false;

  // Location state
  double? _latitude;
  double? _longitude;
  String? _locationAddress;

  // AI Services state
  String? _aiPredictedCategory;
  int? _aiCategoryConfidence;
  bool _isAiLoadingCategory = false;
  bool _hasDuplicateWarning = false;
  Map<String, dynamic>? _duplicateComplaint;
  String? _aiPredictedUrgency;
  int? _aiUrgencyConfidence;

  // Debounce timers for AI calls
  Timer? _categoryDebounce;
  Timer? _duplicateDebounce;
  Timer? _urgencyDebounce;

  final List<String> _tunisiaGovernorates = TunisiaGeography.governorateNames;

  // Categories with icons
  static const Map<String, Map<String, dynamic>> categories = {
    'ROAD': {'icon': Icons.route, 'label': 'Routes & Trafic', 'color': Color(0xFF3B82F6)},
    'LIGHTING': {'icon': Icons.lightbulb, 'label': 'Éclairage Public', 'color': Color(0xFFF59E0B)},
    'WASTE': {'icon': Icons.delete, 'label': 'Déchets & Propreté', 'color': Color(0xFF10B981)},
    'WATER': {'icon': Icons.water_drop, 'label': 'Eau & Drainage', 'color': Color(0xFF06B6D4)},
    'SAFETY': {'icon': Icons.security, 'label': 'Sécurité & Bruit', 'color': Color(0xFFEF4444)},
    'PROPERTY': {'icon': Icons.domain, 'label': 'Biens Publics', 'color': Color(0xFF8B5CF6)},
    'PARKS': {'icon': Icons.park, 'label': 'Parcs & Espaces Verts', 'color': Color(0xFF22C55E)},
    'OTHER': {'icon': Icons.more_horiz, 'label': 'Autre', 'color': Color(0xFF64748B)},
  };

  // Urgency levels
  static const Map<String, Map<String, dynamic>> urgencyLevels = {
    'LOW': {'label': 'Faible', 'color': Color(0xFF22C55E)},
    'MEDIUM': {'label': 'Moyenne', 'color': Color(0xFFF59E0B)},
    'HIGH': {'label': 'Haute', 'color': Color(0xFFF97316)},
    'CRITICAL': {'label': 'Urgente', 'color': Color(0xFFEF4444)},
  };

  List<String> _getMunicipalitiesByGovernorate(String governorate) {
    return TunisiaGeography.getMunicipalities(governorate);
  }

  @override
  void initState() {
    super.initState();
    final user = ref.read(authProvider).user;
    if (user?.governorate != null && user!.governorate!.isNotEmpty) {
      _selectedGovernorate = user.governorate;
    }
    if (user?.phone != null && user!.phone!.isNotEmpty) {
      _phoneController.text = user!.phone!;
    }
    _selectedDateTime = DateTime.now();

    // Setup AI prediction on description change
    _descriptionController.addListener(_onDescriptionChanged);
  }

  @override
  void dispose() {
    _categoryDebounce?.cancel();
    _duplicateDebounce?.cancel();
    _urgencyDebounce?.cancel();
    _titleController.dispose();
    _descriptionController.removeListener(_onDescriptionChanged);
    _descriptionController.dispose();
    _phoneController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onDescriptionChanged() {
    final description = _descriptionController.text;
    // Trigger AI category prediction after 800ms debounce, min 20 chars
    if (description.length >= 20) {
      _categoryDebounce?.cancel();
      _categoryDebounce = Timer(const Duration(milliseconds: 800), () {
        if (!_isAiLoadingCategory && mounted) {
          _predictCategory(description);
        }
      });
    }
    // Trigger duplicate check after 800ms debounce
    if (description.length >= 20 && _titleController.text.length >= 5) {
      _duplicateDebounce?.cancel();
      _duplicateDebounce = Timer(const Duration(milliseconds: 800), () {
        if (mounted) _checkDuplicates();
      });
    }
  }

  Future<void> _predictCategory(String description) async {
    if (!mounted) return;
    setState(() => _isAiLoadingCategory = true);
    try {
      final prediction = await _complaintService.predictCategory(description)
          .timeout(const Duration(seconds: 5));
      if (!mounted) return;
      setState(() {
        _aiPredictedCategory = prediction['category']?.toString();
        final conf = prediction['confidence'];
        _aiCategoryConfidence = conf is int ? conf : (conf is double ? conf.round() : null);
        // Auto-select if no category chosen yet
        if (_selectedCategory.isEmpty && _aiPredictedCategory != null) {
          _selectedCategory = _aiPredictedCategory!;
        }
      });
    } catch (_) {
      // Fail silently — never block form
    } finally {
      if (mounted) setState(() => _isAiLoadingCategory = false);
    }
  }

  Future<void> _checkDuplicates() async {
    if (_titleController.text.trim().length < 5 || _descriptionController.text.trim().length < 20) return;
    try {
      final body = <String, dynamic>{
        'title': _titleController.text.trim(),
        'description': _descriptionController.text.trim(),
      };
      if (_selectedCategory.isNotEmpty) body['category'] = _selectedCategory;
      if (_selectedMunicipality != null) body['municipality'] = _selectedMunicipality;
      if (_latitude != null) body['latitude'] = _latitude;
      if (_longitude != null) body['longitude'] = _longitude;

      final result = await _complaintService.checkDuplicate(
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim(),
        category: _selectedCategory.isNotEmpty ? _selectedCategory : 'OTHER',
        municipality: _selectedMunicipality ?? '',
        latitude: _latitude,
        longitude: _longitude,
      ).timeout(const Duration(seconds: 5));

      if (!mounted) return;
      final topMatches = result['topMatches'] as List?;
      if (topMatches != null && topMatches.isNotEmpty) {
        final first = topMatches[0] as Map<String, dynamic>?;
        final score = (first?['overallScore'] ?? first?['similarity'] ?? 0);
        final scoreDouble = score is num ? score.toDouble() : 0.0;
        if (scoreDouble >= 0.65) {
          setState(() {
            _hasDuplicateWarning = true;
            _duplicateComplaint = first;
          });
        }
      }
    } catch (_) {
      // Fail silently
    }
  }

  Future<void> _predictUrgency(String category) async {
    if (!mounted) return;
    _urgencyDebounce?.cancel();
    _urgencyDebounce = Timer(const Duration(milliseconds: 500), () async {
      try {
        final prediction = await _complaintService.predictUrgency({
          'category': category,
          'description': _descriptionController.text,
        }).timeout(const Duration(seconds: 5));
        if (!mounted) return;
        setState(() {
          _aiPredictedUrgency = prediction['urgency']?.toString();
          final conf = prediction['confidence'];
          _aiUrgencyConfidence = conf is int ? conf : (conf is double ? conf.round() : null);
          if (_aiPredictedUrgency != null) {
            _selectedUrgency = _aiPredictedUrgency!;
          }
        });
      } catch (_) {
        // Fail silently
      }
    });
  }

  Future<void> _reverseGeocode(double lat, double lng) async {
    try {
      final client = HttpClient();
      final request = await client.getUrl(Uri.parse(
          'https://nominatim.openstreetmap.org/reverse?lat=$lat&lon=$lng&format=json&accept-language=fr'));
      request.headers.set('User-Agent', 'SmartCityTunisia/1.0');
      final response = await request.close();
      if (response.statusCode == 200) {
        final body = await response.transform(utf8.decoder).join();
        final data = jsonDecode(body) as Map<String, dynamic>?;
        if (data != null) {
          final address = data['address'] as Map<String, dynamic>?;
          if (address != null) {
            final city = address['city'] as String?;
            final town = address['town'] as String?;
            final municipality = address['municipality'] as String?;
            final village = address['village'] as String?;
            final county = address['county'] as String?;
            final state = address['state'] as String?;
            final stateDistrict = address['state_district'] as String?;
            final road = address['road'] as String?;

            final bestMunicipalityMatch = municipality ?? city ?? town ?? village ?? county;
            final bestGovernorateMatch = state ?? stateDistrict;

            // Build display address
            final parts = <String>[];
            if (road != null && road.isNotEmpty) parts.add(road);
            if (bestMunicipalityMatch != null && bestMunicipalityMatch.isNotEmpty) parts.add(bestMunicipalityMatch);
            if (bestGovernorateMatch != null && bestGovernorateMatch.isNotEmpty) parts.add(bestGovernorateMatch);
            if (parts.isNotEmpty) {
              setState(() => _locationAddress = parts.join(', '));
            }

            // Try to match against Tunisian geography data
            if (bestGovernorateMatch != null) {
              final gov = TunisiaGeography.governorates.firstWhere(
                (g) =>
                    g.name.toLowerCase().contains(bestGovernorateMatch.toLowerCase()) ||
                    bestGovernorateMatch.toLowerCase().contains(g.name.toLowerCase()),
                orElse: () => const GovernorateData(name: '', municipalities: []),
              );

              if (gov.municipalities.isNotEmpty) {
                String matchedMunicipality = gov.municipalities.first;
                if (bestMunicipalityMatch != null) {
                  matchedMunicipality = gov.municipalities.firstWhere(
                    (m) =>
                        m.toLowerCase().contains(bestMunicipalityMatch.toLowerCase()) ||
                        bestMunicipalityMatch.toLowerCase().contains(m.toLowerCase()),
                    orElse: () => gov.municipalities.first,
                  );
                }
                if (mounted) {
                  setState(() {
                    _selectedGovernorate = gov.name;
                    _selectedMunicipality = matchedMunicipality;
                  });
                }
                return;
              }
            }

            // Fallback: set raw values
            if (mounted) {
              setState(() {
                if (bestGovernorateMatch != null && bestGovernorateMatch.isNotEmpty) {
                  _selectedGovernorate = bestGovernorateMatch;
                }
                if (bestMunicipalityMatch != null && bestMunicipalityMatch.isNotEmpty) {
                  _selectedMunicipality = bestMunicipalityMatch;
                }
              });
            }
          }
        }
      }
      client.close();
    } catch (e) {
      debugPrint('Reverse geocoding error: $e');
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      if (_photos.length >= 5) {
        Toast.error(context, 'Maximum 5 photos autorisées');
        return;
      }
      final XFile? image = await _picker.pickImage(
        source: source,
        imageQuality: 80,
        maxWidth: 1200,
      );
      if (image != null) {
        final file = File(image.path);
        final fileSizeMB = await file.length() / (1024 * 1024);
        if (fileSizeMB > 10) {
          if (mounted) Toast.error(context, 'L\'image ne doit pas dépasser 10MB');
          return;
        }
        if (mounted) setState(() => _photos.add(file));
      }
    } catch (e) {
      if (mounted) {
        final msg = e.toString().toLowerCase();
        if (msg.contains('permission') || msg.contains('denied')) {
          Toast.error(context, 'Permission refusée. Veuillez l\'activer dans les paramètres de votre appareil.');
        } else {
          Toast.error(context, 'Erreur lors de la sélection de l\'image');
        }
      }
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedCategory.isEmpty) {
      Toast.error(context, 'Veuillez sélectionner une catégorie');
      return;
    }

    if (_hasDuplicateWarning) {
      final confirmed = await ConfirmationDialog.show(
        context: context,
        title: 'Signalement similaire détecté',
        message: 'Un signalement similaire existe déjà: "${_duplicateComplaint?['title']}". Voulez-vous quand même soumettre?',
      );
      if (!confirmed) return;
    }

    setState(() => _isSubmitting = true);

    try {
      // Upload photos first if any
      List<Map<String, String>> mediaUrls = [];
      if (_photos.isNotEmpty) {
        try {
          // Backend expects field name "media" (not "photos")
          final uploadResult = await ApiClient().uploadFiles(
            '/upload',
            _photos.map((f) => f.path).toList(),
            fieldName: 'media',
          );
          // Response: {success: true, data: [{type, url, publicId, ...}]}
          if (uploadResult != null) {
            final dataList = uploadResult['data'] as List?;
            if (dataList != null) {
              for (final item in dataList) {
                if (item is Map && item['url'] != null) {
                  mediaUrls.add({
                    'url': item['url'].toString(),
                    'type': (item['type'] ?? 'photo').toString(),
                  });
                }
              }
            }
          }
        } catch (e) {
          debugPrint('Photo upload error: $e');
          // Continue without photos rather than blocking submission
        }
      }

      final body = <String, dynamic>{
        'title': _titleController.text.trim(),
        'description': _descriptionController.text.trim(),
        'category': _selectedCategory,
        'urgency': _selectedUrgency,
        'governorate': _selectedGovernorate ?? '',
        'municipality': _selectedMunicipality ?? '',
        'phone': _phoneController.text.trim(),
        'isAnonymous': _isAnonymous,
        'incidentDate': _selectedDateTime?.toIso8601String(),
        if (mediaUrls.isNotEmpty) 'media': mediaUrls,
        // Send location as both flat fields and nested object for backend compatibility
        if (_latitude != null && _longitude != null) 'latitude': _latitude,
        if (_latitude != null && _longitude != null) 'longitude': _longitude,
        if (_latitude != null && _longitude != null) 'location': {
          'latitude': _latitude,
          'longitude': _longitude,
          if (_locationAddress != null) 'address': _locationAddress,
          if (_selectedMunicipality != null) 'municipality': _selectedMunicipality,
          if (_selectedGovernorate != null) 'governorate': _selectedGovernorate,
        },
      };

      await _complaintService.createComplaint(body);

      Toast.success(context, 'Signalement soumis avec succès');
      if (widget.onComplaintSubmitted != null) {
        widget.onComplaintSubmitted!();
      }
      if (mounted) Navigator.pop(context);
    } catch (e) {
      Toast.error(context, 'Erreur lors de la soumission: $e');
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
        title: const Text('Nouveau Signalement'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (widget.onBack != null) {
              widget.onBack!();
            } else {
              Navigator.pop(context);
            }
          },
        ),
      ),
      body: SingleChildScrollView(
        controller: _scrollController,
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Title
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(
                  labelText: 'Titre *',
                  hintText: 'Min 5 caractères, max 100',
                  border: OutlineInputBorder(),
                ),
                maxLength: 100,
                onChanged: (_) {
                  if (_titleController.text.length >= 5 && _descriptionController.text.length >= 20) {
                    _duplicateDebounce?.cancel();
                    _duplicateDebounce = Timer(const Duration(milliseconds: 800), () {
                      if (mounted) _checkDuplicates();
                    });
                  }
                },
                validator: (value) {
                  if (value == null || value.isEmpty) return 'Ce champ est requis';
                  if (value.length < 5) return 'Minimum 5 caractères requis';
                  return null;
                },
              ),
              const SizedBox(height: 20),

              // Description
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextFormField(
                    controller: _descriptionController,
                    decoration: const InputDecoration(
                      labelText: 'Description *',
                      hintText: 'Min 20 caractères, max 1000',
                      border: OutlineInputBorder(),
                    ),
                    maxLines: 5,
                    maxLength: 1000,
                    validator: (value) {
                      if (value == null || value.isEmpty) return 'Ce champ est requis';
                      if (value.length < 20) return 'Minimum 20 caractères requis';
                      return null;
                    },
                  ),
                  if (_descriptionController.text.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        '${_descriptionController.text.length}/1000',
                        style: TextStyle(
                          fontSize: 12,
                          color: _descriptionController.text.length > 900
                              ? Colors.red
                              : AppTheme.textSecondary,
                        ),
                      ),
                    ),
                  // AI Category Suggestion
                  if (_isAiLoadingCategory)
                    const Padding(
                      padding: EdgeInsets.only(top: 8),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                          SizedBox(width: 8),
                          Text('IA analyse la catégorie...', style: TextStyle(fontSize: 12)),
                        ],
                      ),
                    ),
                  if (_aiPredictedCategory != null && !_isAiLoadingCategory)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppTheme.primary.withOpacity(0.3)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.auto_awesome, size: 16, color: AppTheme.primary),
                            const SizedBox(width: 8),
                            Text(
                              'IA Suggérée: ${categories[_aiPredictedCategory]?['label']} ($_aiCategoryConfidence%)',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppTheme.primary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 20),

              // Duplicate Warning
              if (_hasDuplicateWarning && _duplicateComplaint != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 20),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFFECACA)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.warning, color: Color(0xFFEF4444), size: 20),
                          const SizedBox(width: 8),
                          const Text(
                            'Signalement similaire détecté',
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              color: Color(0xFFEF4444),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '"${_duplicateComplaint!['title']}" - soumis le ${_duplicateComplaint!['createdAt']}',
                        style: const TextStyle(fontSize: 13),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          TextButton(
                            onPressed: () => setState(() => _hasDuplicateWarning = false),
                            child: const Text('Ignorer', style: TextStyle(fontSize: 12)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

              // Category Selector (Grid)
              const Text(
                'Catégorie *',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.3,
                children: categories.entries.map((entry) {
                  final isSelected = _selectedCategory == entry.key;
                  final category = entry.value;
                  return InkWell(
                    onTap: () {
                      setState(() => _selectedCategory = entry.key);
                      _predictUrgency(entry.key);
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      decoration: BoxDecoration(
                        color: isSelected
                            ? (category['color'] as Color).withOpacity(0.2)
                            : AppTheme.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected
                              ? (category['color'] as Color)
                              : AppTheme.border,
                          width: isSelected ? 2 : 1,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            category['icon'] as IconData,
                            color: isSelected
                                ? (category['color'] as Color)
                                : AppTheme.textSecondary,
                            size: 28,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            category['label'] as String,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                              color: isSelected
                                  ? (category['color'] as Color)
                                  : AppTheme.textPrimary,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 20),

              // Urgency Level Selector
              const Text(
                'Niveau d\'urgence *',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                children: urgencyLevels.entries.map((entry) {
                  final isSelected = _selectedUrgency == entry.key;
                  final level = entry.value;
                  return InkWell(
                    onTap: () => setState(() => _selectedUrgency = entry.key),
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? (level['color'] as Color)
                            : (level['color'] as Color).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isSelected
                              ? (level['color'] as Color)
                              : Colors.transparent,
                        ),
                      ),
                      child: Text(
                        level['label'] as String,
                        style: TextStyle(
                          color: isSelected
                              ? Colors.white
                              : (level['color'] as Color),
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              // AI Urgency Prediction
              if (_aiPredictedUrgency != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    'IA Prédit: ${urgencyLevels[_aiPredictedUrgency]?['label']} ($_aiUrgencyConfidence%)',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.primary,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ),
              const SizedBox(height: 20),

              // Location Section
              const Text(
                'Localisation *',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              LocationPickerMap(
                initialLatitude: _latitude,
                initialLongitude: _longitude,
                address: _locationAddress,
                onLocationSelected: (lat, lng) {
                  setState(() {
                    _latitude = lat;
                    _longitude = lng;
                  });
                  _reverseGeocode(lat, lng);
                },
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _selectedGovernorate,
                      decoration: const InputDecoration(
                        labelText: 'Gouvernorat *',
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 16),
                      ),
                      items: _tunisiaGovernorates.map((g) =>
                        DropdownMenuItem(value: g, child: Text(g))
                      ).toList(),
                      onChanged: (value) => setState(() {
                        _selectedGovernorate = value;
                        _selectedMunicipality = null;
                      }),
                      validator: (value) => value == null ? 'Ce champ est requis' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (_selectedGovernorate != null)
                DropdownButtonFormField<String>(
                  value: _selectedMunicipality,
                  decoration: const InputDecoration(
                    labelText: 'Municipalité *',
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 16),
                  ),
                  items: _getMunicipalitiesByGovernorate(_selectedGovernorate!)
                      .map((m) => DropdownMenuItem(value: m, child: Text(m)))
                      .toList(),
                  onChanged: (value) => setState(() => _selectedMunicipality = value),
                  validator: (value) => value == null ? 'Ce champ est requis' : null,
                ),
              const SizedBox(height: 20),

              // Date/Time
              ListTile(
                title: const Text('Date et heure de l\'incident'),
                subtitle: Text(
                  _selectedDateTime != null
                      ? '${_selectedDateTime!.day}/${_selectedDateTime!.month}/${_selectedDateTime!.year} ${_selectedDateTime!.hour}:${_selectedDateTime!.minute}'
                      : 'Sélectionner',
                ),
                trailing: const Icon(Icons.calendar_today),
                onTap: () async {
                  final DateTime? picked = await showDatePicker(
                    context: context,
                    initialDate: DateTime.now(),
                    firstDate: DateTime.now().subtract(const Duration(days: 365)),
                    lastDate: DateTime.now(),
                  );
                  if (picked != null) {
                    final TimeOfDay? time = await showTimePicker(
                      context: context,
                      initialTime: TimeOfDay.now(),
                    );
                    if (time != null && mounted) {
                      setState(() {
                        _selectedDateTime = DateTime(
                          picked.year,
                          picked.month,
                          picked.day,
                          time.hour,
                          time.minute,
                        );
                      });
                    }
                  }
                },
              ),
              const SizedBox(height: 20),

              // Phone
              TextFormField(
                controller: _phoneController,
                decoration: const InputDecoration(
                  labelText: 'Téléphone (optionnel)',
                  hintText: '+216 XX XXX XXX',
                  prefixIcon: Icon(Icons.phone),
                  border: OutlineInputBorder(),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 16),
                ),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 20),

              // Anonymous Toggle
              SwitchListTile(
                title: const Text('Soumettre anonymement'),
                subtitle: const Text('Votre nom ne sera pas affiché publiquement'),
                value: _isAnonymous,
                onChanged: (value) => setState(() => _isAnonymous = value),
                activeColor: AppTheme.primary,
              ),
              const SizedBox(height: 20),

              // Photo Upload
              const Text(
                'Photos/Vidéos (Max 5 fichiers, 10MB chacun)',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  ElevatedButton.icon(
                    onPressed: () => _pickImage(ImageSource.camera),
                    icon: const Icon(Icons.camera_alt),
                    label: const Text('Appareil photo'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      foregroundColor: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton.icon(
                    onPressed: () => _pickImage(ImageSource.gallery),
                    icon: const Icon(Icons.photo_library),
                    label: const Text('Galerie'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.surface,
                      foregroundColor: AppTheme.textPrimary,
                      side: BorderSide(color: AppTheme.border),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (_photos.isNotEmpty)
                SizedBox(
                  height: 80,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _photos.length,
                    itemBuilder: (context, index) {
                      return Stack(
                        children: [
                          Container(
                            width: 80,
                            height: 80,
                            margin: const EdgeInsets.only(right: 8),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(8),
                              image: DecorationImage(
                                image: FileImage(_photos[index]),
                                fit: BoxFit.cover,
                              ),
                            ),
                          ),
                          Positioned(
                            top: 4,
                            right: 12,
                            child: GestureDetector(
                              onTap: () => setState(() => _photos.removeAt(index)),
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: BoxDecoration(
                                  color: Colors.black54,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.close, color: Colors.white, size: 16),
                              ),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ),
              const SizedBox(height: 24),

              // Submit Button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _handleSubmit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Text(
                          'Soumettre le signalement',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}
