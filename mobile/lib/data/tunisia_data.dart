class TunisiaData {
  static const List<Map<String, dynamic>> governorates = [
    {'governorate': 'Ariana', 'municipalities': ['Ariana', 'Raoued', 'Sidi Thabet', 'La Soukra', 'Ettadhamen Mnihla']},
    {'governorate': 'Béja', 'municipalities': ['Béja', 'Medjez El Bab', 'Nébeur', 'Téboursouk', 'Testour']},
    {'governorate': 'Ben Arous', 'municipalities': ['Ben Arous', 'Megrine', 'Rades', 'Hammam Lif', 'Hammam Chott', 'Boumhel', 'Ezzahra', 'Mornag']},
    {'governorate': 'Bizerte', 'municipalities': ['Bizerte', 'Mateur', 'Menzel Bourguiba', 'Ras Jebel', 'Sejnane', 'Tinja', 'El Alia']},
    {'governorate': 'Gabès', 'municipalities': ['Gabès', 'Gabès Médina', 'Gabès Ouest', 'Mareth', 'Menzel El Habib', 'Hamma', 'El Hamma', 'Ksar Helal']},
    {'governorate': 'Gafsa', 'municipalities': ['Gafsa', 'Gafsa Nord', 'Gafsa Sud', 'El Ksar', 'Sidi Aïch', 'Belkhir', 'Métlaoui']},
    {'governorate': 'Jendouba', 'municipalities': ['Jendouba', 'Jendouba Nord', 'Tabarka', 'Aïn Draham', 'Fernana', 'Bousalem']},
    {'governorate': 'Kairouan', 'municipalities': ['Kairouan', 'Kairouan Nord', 'Kairouan Sud', 'Oueslatia', 'Sbikha', 'Chebika', 'Tessour']},
    {'governorate': 'Kasserine', 'municipalities': ['Kasserine', 'Kasserine Nord', 'Sbeitla', 'Thala', 'Feriana', 'Fériana', 'Maknassy']},
    {'governorate': 'Kébili', 'municipalities': ['Kébili', 'Kébili Nord', 'Kébili Sud', 'Douz', 'Douz Nord', 'Douz Sud', 'Rafraf']},
    {'governorate': 'Kef', 'municipalities': ['Le Kef', 'Le Kef Est', 'Le Kef Ouest', 'Sakiet Sidi Youssef', 'Tajerouine', 'Ksar', 'Jérissa']},
    {'governorate': 'Mahdia', 'municipalities': ['Mahdia', 'Mahdia Médina', 'Mahdia Riadh', 'Sidi Bouzid', 'Ksour Essef', 'Melloulèche', 'Ouled Chamekh']},
    {'governorate': 'Manouba', 'municipalities': ['Manouba', 'Den Den', 'Mornaguia', 'Ouedhref', 'Borj El Amri', 'Djedeida', 'Tebourba']},
    {'governorate': 'Médenine', 'municipalities': ['Médenine', 'Médenine Nord', 'Médenine Sud', 'Djerba', 'Houmt Souk', 'Midoun', 'Beni Khedache', 'Zarzis']},
    {'governorate': 'Monastir', 'municipalities': ['Monastir', 'Monastir Médina', 'Monastir Riadh', 'Skanes', 'Bembla', 'Menzel Kamel', 'Jemmal', 'Ksar Hellal']},
    {'governorate': 'Nabeul', 'municipalities': ['Nabeul', 'Nabeul Médina', 'Nabeul Hammamet', 'Hammamet', 'Sidi Thabet', 'Mornag', 'Menzel Temime', 'Kélibia', 'El Haouaria']},
    {'governorate': 'Sfax', 'municipalities': ['Sfax', 'Sfax Médina', 'Sfax Sud', 'Sfax Nord', 'Sakiet Ezzit', 'Sakiet Sidi Youssef', 'Thyna', 'Chihia', 'Gremda']},
    {'governorate': 'Sidi Bouzid', 'municipalities': ['Sidi Bouzid', 'Sidi Bouzid Médina', 'Sidi Bouzid Riadh', 'Menzel Bouzaiane', 'Ouled Haffouz', 'Mezzouna', 'Regueb']},
    {'governorate': 'Siliana', 'municipalities': ['Siliana', 'Siliana Nord', 'Siliana Sud', 'Bou Arada', 'Makthar', 'Gaâfour', 'Kesra', 'Bargou']},
    {'governorate': 'Sousse', 'municipalities': ['Sousse', 'Sousse Médina', 'Sousse Riadh', 'Sousse Jawhara', 'Sousse Port', 'Ksibet Thrayet', 'Messaadine', 'Akouda', 'Kalâa Seghira']},
    {'governorate': 'Tataouine', 'municipalities': ['Tataouine', 'Tataouine Nord', 'Tataouine Sud', 'Ghomrassen', 'Dhehiba', 'Remada', 'Smâr']},
    {'governorate': 'Tozeur', 'municipalities': ['Tozeur', 'Tozeur Nord', 'Tozeur Sud', 'Degache', 'El Ouaja', 'Nefta', 'Hezoua']},
    {'governorate': 'Tunis', 'municipalities': ['Tunis', 'Tunis Médina', 'Tunis Riadh', 'Tunis Carthage', 'Le Bardo', 'Sidi Hassine', 'Sijoumi', 'Othman', 'Cité El Khadra']},
    {'governorate': 'Zaghouan', 'municipalities': ['Zaghouan', 'Zaghouan Nord', 'Zaghouan Sud', 'El Fahs', 'Nadhour', 'Bir Mcherga', 'Zriba']},
  ];

  static const Map<String, String> categoryLabels = {
    'WASTE_MANAGEMENT': 'Waste Management',
    'ROAD_INFRASTRUCTURE': 'Road Infrastructure',
    'PUBLIC_LIGHTING': 'Public Lighting',
    'GREEN_SPACES': 'Green Spaces',
    'WATER_SUPPLY': 'Water Supply',
    'SANITATION': 'Sanitation',
    'PUBLIC_TRANSPORT': 'Public Transport',
    'NOISE_POLLUTION': 'Noise Pollution',
    'AIR_POLLUTION': 'Air Pollution',
    'OTHER': 'Other',
  };

  static const Map<String, String> urgencyLabels = {
    'LOW': 'Low',
    'MEDIUM': 'Medium',
    'HIGH': 'High',
    'URGENT': 'Urgent',
  };

  static const Map<String, String> statusLabels = {
    'SUBMITTED': 'Submitted',
    'VALIDATED': 'Validated',
    'ASSIGNED': 'Assigned',
    'IN_PROGRESS': 'In Progress',
    'RESOLVED': 'Resolved',
    'CLOSED': 'Closed',
    'REJECTED': 'Rejected',
  };

  static List<String> getMunicipalities(String governorate) {
    final found = governorates.firstWhere(
      (g) => g['governorate'].toLowerCase() == governorate.toLowerCase(),
      orElse: () => {'municipalities': <String>[]},
    );
    return List<String>.from(found['municipalities']);
  }

  static List<String> getGovernorates() {
    return governorates.map((g) => g['governorate'] as String).toList();
  }
}
