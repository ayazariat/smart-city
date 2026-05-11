// Tunisia Governorates and Municipalities Data — Complete list matching the web
class GovernorateData {
  final String name;
  final List<String> municipalities;
  const GovernorateData({required this.name, required this.municipalities});
}

class TunisiaGeography {
  static const List<GovernorateData> governorates = [
    GovernorateData(name: 'Ariana', municipalities: [
      'Ariana Ville', 'Ettadhamen', 'Kalaat El Andalous', 'La Soukra',
      'Mnihla', 'Raoued', 'Sidi Thabet', 'Borj Louzir', 'Cité El Khadra',
    ]),
    GovernorateData(name: 'Béja', municipalities: [
      'Béja Nord', 'Béja Sud', 'Amdoun', 'Goubellat', 'Medjez El Bab',
      'Nefza', 'Teboursouk', 'Testour', 'Thibar',
    ]),
    GovernorateData(name: 'Ben Arous', municipalities: [
      'Ben Arous', 'Bou Mhel El Bassatine', 'El Mourouj', 'Ezzahra',
      'Fouchana', 'Hammam Chott', 'Hammam Lif', 'Medina Jedida',
      'Mégrine', 'Mornag', 'Nouvelle Médina', 'Radès',
    ]),
    GovernorateData(name: 'Bizerte', municipalities: [
      'Bizerte Nord', 'Bizerte Sud', 'El Alia', 'Ghar El Melh',
      'Ghezala', 'Joumine', 'Mateur', 'Menzel Bourguiba', 'Menzel Jemil',
      'Ras Jebel', 'Sejnane', 'Tinja', 'Utique',
    ]),
    GovernorateData(name: 'Gabès', municipalities: [
      'Gabès Médina', 'Gabès Ouest', 'Gabès Sud', 'El Hamma',
      'Ghannouch', 'Mareth', 'Matmata', 'Métouia', 'Menzel El Habib',
      'Nouvelle Matmata', 'Oudhref', 'Zarat',
    ]),
    GovernorateData(name: 'Gafsa', municipalities: [
      'Gafsa Nord', 'Gafsa Sud', 'Belkhir', 'El Guettar', 'El Ksar',
      'Mdhilla', 'Métlaoui', 'Moularès', 'Redeyef', 'Sened', 'Sidi Aïch',
    ]),
    GovernorateData(name: 'Jendouba', municipalities: [
      'Jendouba', 'Jendouba Nord', 'Aïn Draham', 'Balta Bou Aouane',
      'Bou Salem', 'Fernana', 'Ghardimaou', 'Oued Meliz', 'Tabarka',
    ]),
    GovernorateData(name: 'Kairouan', municipalities: [
      'Kairouan Nord', 'Kairouan Sud', 'Bou Hajla', 'Chebika',
      'Cherarda', 'El Alaa', 'Haffouz', 'Hajeb El Ayoun', 'Nasrallah',
      'Oueslatia', 'Sbikha',
    ]),
    GovernorateData(name: 'Kasserine', municipalities: [
      'Kasserine Nord', 'Kasserine Sud', 'Aïn Jedey', 'El Ayoun',
      'Ezzouhour', 'Feriana', 'Foussana', 'Hassi El Ferid',
      'Hidra', 'Jedeliane', 'Majel Bel Abbès', 'Sbeitla', 'Sbiba', 'Thala',
    ]),
    GovernorateData(name: 'Kébili', municipalities: [
      'Kébili Nord', 'Kébili Sud', 'Douz Nord', 'Douz Sud',
      'El Faouar', 'Souk Lahad',
    ]),
    GovernorateData(name: 'Le Kef', municipalities: [
      'Le Kef Est', 'Le Kef Ouest', 'Dahmani', 'El Ksour', 'Jerissa',
      'Kalaat Senan', 'Kalaat Khasba', 'Nebeur', 'Sakiet Sidi Youssef',
      'Tajerouine',
    ]),
    GovernorateData(name: 'Mahdia', municipalities: [
      'Mahdia', 'Bou Merdes', 'Chebba', 'Chorbane', 'El Bradaa',
      'El Djem', 'Essouassi', 'Hebira', 'Ksour Essef', 'La Chebba',
      'Melloulèche', 'Ouled Chamekh', 'Sidi Alouane',
    ]),
    GovernorateData(name: 'Manouba', municipalities: [
      'Manouba', 'Borj El Amri', 'Den Den', 'Douar Hicher',
      'El Battan', 'Jedaida', 'Mornaguia', 'Oued Ellil', 'Tebourba',
    ]),
    GovernorateData(name: 'Médenine', municipalities: [
      'Médenine Nord', 'Médenine Sud', 'Ben Gardane', 'Beni Khedache',
      'Djerba Ajim', 'Djerba Houmt Souk', 'Djerba Midoun',
      'Sidi Makhlouf', 'Zarzis',
    ]),
    GovernorateData(name: 'Monastir', municipalities: [
      'Monastir', 'Bembla', 'Beni Hassen', 'Jammel', 'Ksar Hellal',
      'Ksibet El Mediouni', 'Moknine', 'Ouerdanine', 'Sahline',
      'Sayada Lamta Bou Hajar', 'Téboulba', 'Zeramdine',
    ]),
    GovernorateData(name: 'Nabeul', municipalities: [
      'Nabeul', 'Beni Khiar', 'Bou Argoub', 'Dar Chaâbane El Fehri',
      'El Haouaria', 'El Mida', 'Grombalia', 'Hammamet', 'Kelibia',
      'Korba', 'Menzel Bouzelfa', 'Menzel Temime', 'Soliman',
      'Takelsa',
    ]),
    GovernorateData(name: 'Sfax', municipalities: [
      'Sfax Ville', 'Sfax Ouest', 'Sfax Sud', 'Agareb', 'Bir Ali Ben Khalifa',
      'Djebeniana', 'El Amra', 'El Ghraiba', 'Ghraiba', 'Hencha',
      'Jebiniana', 'Kerkennah', 'Mahres', 'Menzel Chaker', 'Sakiet Eddaïer',
      'Sakiet Ezzit', 'Skhira', 'Thyna',
    ]),
    GovernorateData(name: 'Sidi Bouzid', municipalities: [
      'Sidi Bouzid Est', 'Sidi Bouzid Ouest', 'Ben Oun', 'Bir El Hafey',
      'Cebbala Ouled Asker', 'Jilma', 'Mazzouna', 'Meknassy',
      'Menzel Bouzaiane', 'Ouled Haffouz', 'Regueb', 'Sidi Ali Ben Aoun',
      'Souk Jedid',
    ]),
    GovernorateData(name: 'Siliana', municipalities: [
      'Siliana Nord', 'Siliana Sud', 'Bargou', 'Bou Arada', 'El Aroussa',
      'El Krib', 'Gaâfour', 'Kesra', 'Makthar', 'Rohia', 'Sidi Bou Rouis',
    ]),
    GovernorateData(name: 'Sousse', municipalities: [
      'Sousse Médina', 'Sousse Riadh', 'Sousse Jawhara', 'Sousse Sidi Abdelhamid',
      'Akouda', 'Bou Ficha', 'Enfidha', 'Hammam Sousse', 'Hergla',
      'Kalaa Kebira', 'Kalaa Seghira', 'Kondar', 'Ksar Hellal',
      'Ksibet Thrayet', 'Messaadine', 'Msaken', 'Sidi Bou Ali',
      'Sidi El Hani',
    ]),
    GovernorateData(name: 'Tataouine', municipalities: [
      'Tataouine Nord', 'Tataouine Sud', 'Bir Lahmar', 'Dehiba',
      'Ghomrassen', 'Remada', 'Smar',
    ]),
    GovernorateData(name: 'Tozeur', municipalities: [
      'Tozeur', 'Degache', 'El Hamma du Jérid', 'Hazoua', 'Nefta',
      'Tameghza',
    ]),
    GovernorateData(name: 'Tunis', municipalities: [
      'Tunis', 'Bab Bhar', 'Bab Souika', 'Carthage', 'Cité El Khadra',
      'El Hrairia', 'El Kabaria', 'El Menzah', 'El Omrane',
      'El Omrane Supérieur', 'El Ouardia', 'Ettahrir', 'Ezzouhour',
      'Hraïria', 'Jebel Jelloud', 'La Goulette', 'La Marsa',
      'Le Bardo', 'Le Kram', 'Médina', 'Séjoumi', 'Sidi El Béchir',
      'Sidi Hassine',
    ]),
    GovernorateData(name: 'Zaghouan', municipalities: [
      'Zaghouan', 'Bir Mcherga', 'El Fahs', 'En Nadhour', 'Hammam Zriba',
      'Saouaf', 'Zriba',
    ]),
  ];

  static List<String> get governorateNames =>
      governorates.map((g) => g.name).toList();

  static List<String> getMunicipalities(String governorate) {
    final found = governorates.firstWhere(
      (g) => g.name == governorate,
      orElse: () => const GovernorateData(name: '', municipalities: []),
    );
    return found.municipalities;
  }

  /// Find governorate for a given municipality name (fuzzy match)
  static String? findGovernorateForMunicipality(String municipalityName) {
    final normalized = municipalityName.toLowerCase().trim();
    for (final gov in governorates) {
      for (final mun in gov.municipalities) {
        if (mun.toLowerCase() == normalized ||
            mun.toLowerCase().contains(normalized) ||
            normalized.contains(mun.toLowerCase())) {
          return gov.name;
        }
      }
    }
    return null;
  }

  /// Find best matching municipality in a governorate
  static String? findMunicipalityInGovernorate(String governorate, String query) {
    final muns = getMunicipalities(governorate);
    final q = query.toLowerCase().trim();
    // Exact match first
    for (final m in muns) {
      if (m.toLowerCase() == q) return m;
    }
    // Contains match
    for (final m in muns) {
      if (m.toLowerCase().contains(q) || q.contains(m.toLowerCase())) return m;
    }
    return muns.isNotEmpty ? muns.first : null;
  }
}
