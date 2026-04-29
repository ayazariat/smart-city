import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_client.dart';

class AiService {
  final ApiClient _apiClient = ApiClient();

  /// Predict category using AI
  Future<Map<String, dynamic>> predictCategory(String text) async {
    try {
      final response = await _apiClient.post('/ai/predict-category', {
        'text': text,
      });
      return response ??
          {
            'predicted': 'AUTRE',
            'confidence': 0,
            'alternatives': [],
            'reasoning': '',
          };
    } catch (e) {
      return {
        'predicted': 'AUTRE',
        'confidence': 0,
        'alternatives': [],
        'reasoning': 'AI unavailable',
      };
    }
  }

  /// Predict urgency using AI (BL-24)
  Future<Map<String, dynamic>?> predictUrgency(
    String title,
    String description,
    String category,
    String citizenUrgency,
    String municipality,
  ) async {
    try {
      final response = await _apiClient.post('/ai/urgency/predict', {
        'title': title,
        'description': description,
        'category': category,
        'citizenUrgency': citizenUrgency,
        'municipality': municipality,
        'confirmationCount': 0,
      });
      return response?['data'];
    } catch (e) {
      return null;
    }
  }

  /// Extract keywords using AI
  Future<Map<String, dynamic>> extractKeywords(String text) async {
    try {
      final aiUrl = _getAiServiceUrl();
      final response = await http
          .post(
            Uri.parse('$aiUrl/extract-keywords'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'text': text}),
          )
          .timeout(const Duration(seconds: 4));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (_) {}
    return {
      'keywords': [],
      'locationKeywords': [],
      'urgencyKeywords': [],
      'similarityHash': '',
    };
  }

  /// Get trend forecast (BL-37)
  Future<Map<String, dynamic>?> getTrendForecast(
    String municipality,
    String category, {
    int period = 7,
  }) async {
    try {
      final aiUrl = _getAiServiceUrl();
      final response = await http
          .get(
            Uri.parse(
              '$aiUrl/ai/trend/forecast?municipality=${Uri.encodeComponent(municipality)}&category=${Uri.encodeComponent(category)}&period=$period',
            ),
          )
          .timeout(const Duration(seconds: 4));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['data'];
      }
    } catch (_) {}
    return null;
  }

  /// Get all trend alerts (BL-37)
  Future<List<dynamic>> getTrendAlerts() async {
    try {
      final aiUrl = _getAiServiceUrl();
      final response = await http
          .get(Uri.parse('$aiUrl/ai/trend/alerts'))
          .timeout(const Duration(seconds: 3));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['data'] ?? [];
      }
    } catch (_) {}
    return [];
  }

  /// Check for duplicate complaints (BL-25)
  Future<Map<String, dynamic>?> checkDuplicate({
    required String title,
    required String description,
    required String category,
    required String municipality,
    double? latitude,
    double? longitude,
  }) async {
    try {
      final response = await _apiClient.post('/ai/duplicate/check', {
        'title': title,
        'description': description,
        'category': category,
        'municipality': municipality,
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
      });
      return response?['data'];
    } catch (e) {
      return null;
    }
  }

  /// Get duplicate detection stats
  Future<Map<String, dynamic>?> getDuplicateStats() async {
    try {
      final aiUrl = _getAiServiceUrl();
      final response = await http
          .get(Uri.parse('$aiUrl/ai/duplicate/stats'))
          .timeout(const Duration(seconds: 3));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['data'] ?? data;
      }
    } catch (_) {}
    return null;
  }

  String _getAiServiceUrl() {
    final apiUrl = ApiClient.baseUrl;
    return apiUrl;
  }
}
