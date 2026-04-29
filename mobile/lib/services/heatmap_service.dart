import 'api_client.dart';

class HeatmapService {
  final ApiClient _apiClient = ApiClient();

  Future<List<Map<String, dynamic>>> getHeatmapData({
    String? category,
    String? status,
    String? municipality,
    String? department,
  }) async {
    String endpoint = '/heatmap';
    final params = <String, String>{};
    if (category != null && category.isNotEmpty) {
      params['category'] = category;
    }
    if (status != null && status.isNotEmpty) params['status'] = status;
    if (municipality != null && municipality.isNotEmpty) {
      params['municipality'] = municipality;
    }
    if (department != null && department.isNotEmpty) {
      params['department'] = department;
    }
    if (params.isNotEmpty) {
      final query = params.entries.map((e) => '${e.key}=${e.value}').join('&');
      endpoint += '?$query';
    }
    final response = await _apiClient.get(endpoint);
    final data = response['data'] ?? response;
    final list = data is Map ? (data['points'] ?? data['data'] ?? []) : data;
    return (list as List).cast<Map<String, dynamic>>();
  }

  Future<List<String>> getCategories() async {
    final response = await _apiClient.get('/heatmap/categories');
    final cats = response['categories'] ?? response['data'] ?? [];
    return (cats as List).cast<String>();
  }
}
