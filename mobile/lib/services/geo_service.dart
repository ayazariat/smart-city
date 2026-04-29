import '../data/tunisia_geography.dart';

class GeoService {
  /// Get all governorates
  List<String> getGovernorates() {
    return TunisiaGeography.governorateNames;
  }

  /// Get municipalities for a governorate
  List<String> getMunicipalities(String governorate) {
    return TunisiaGeography.getMunicipalities(governorate);
  }

  /// Search governorates by query
  List<String> searchGovernorates(String query) {
    final q = query.toLowerCase();
    return TunisiaGeography.governorateNames
        .where((g) => g.toLowerCase().contains(q))
        .toList();
  }

  /// Search municipalities by query within a governorate
  List<String> searchMunicipalities(String governorate, String query) {
    final q = query.toLowerCase();
    final municipalities = TunisiaGeography.getMunicipalities(governorate);
    return municipalities.where((m) => m.toLowerCase().contains(q)).toList();
  }

  /// Get full geography data as a map
  Map<String, List<String>> getAllGeography() {
    final map = <String, List<String>>{};
    for (final gov in TunisiaGeography.governorates) {
      map[gov.name] = gov.municipalities;
    }
    return map;
  }
}
