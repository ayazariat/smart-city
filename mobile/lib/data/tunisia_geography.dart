/// Tunisia Governorates and Municipalities Data
/// This data is used for autocomplete in registration and complaint forms

class GovernorateData {
  final String name;
  final List<String> municipalities;

  const GovernorateData({required this.name, required this.municipalities});
}

class TunisiaGeography {
  static const List<GovernorateData> governorates = [
    GovernorateData(
      name: 'Ariana',
      municipalities: [
        'Ariana',
        'Raoued',
        'Sidi Thabet',
        'La Soukra',
        'Ettadhamen',
        'Mnihla',
        'Kalaat El Andalous',
        'Sidi Ameur',
      ],
    ),
    GovernorateData(
      name: 'Béja',
      municipalities: [
        'Béja',
        'Medjez El Bab',
        'Nefza',
        'Teboursouk',
        'Testour',
        'Mateur',
        'Joumine',
        'El Ma El Abiod',
      ],
    ),
    GovernorateData(
      name: 'Ben Arous',
      municipalities: [
        'Ben Arous',
        'Radès',
        'Mornag',
        'Hammam Lif',
        'Hammam Chott',
        'Ezzahra',
        'Mourouj',
        'Borj Cédria',
        'Méryana',
      ],
    ),
    GovernorateData(
      name: 'Bizerte',
      municipalities: [
        'Bizerte',
        'Mateur',
        'Ras Jebel',
        'Sejnane',
        'Menzel Bourguiba',
        'Tinja',
        'El Alia',
        'Ghar El Melh',
        'Aousja',
      ],
    ),
    GovernorateData(
      name: 'Gabès',
      municipalities: [
        'Gabès',
        'Mareth',
        'El Hamma',
        'Métouia',
        'Oudhref',
        'Ghannouch',
        'Kébili',
        'Degache',
        'Tamazret',
        'Zarat',
      ],
    ),
    GovernorateData(
      name: 'Gafsa',
      municipalities: [
        'Gafsa',
        'Métlaoui',
        'El Ksar',
        'Sidi Aïch',
        'Ouedhref',
        'Moularès',
        'Haidra',
        'Sened',
        'El Guettar',
      ],
    ),
    GovernorateData(
      name: 'Jendouba',
      municipalities: [
        'Jendouba',
        'Tabarka',
        'Aïn Draham',
        'Balta',
        'Bou Salem',
        'Fernana',
        'Ghardimaou',
        'Oued Meliz',
        'Joumine',
      ],
    ),
    GovernorateData(
      name: 'Kairouan',
      municipalities: [
        'Kairouan',
        'Sousse',
        'Kairouan Nord',
        'Kairouan Sud',
        'Oueslatia',
        'Bougarnane',
        'Sidi Jaber',
        'Haffouz',
        'Hajeb El Ayoun',
      ],
    ),
    GovernorateData(
      name: 'Kasserine',
      municipalities: [
        'Kasserine',
        'Sbeitla',
        'Thala',
        'Feriana',
        'Sbiba',
        'Djedeliane',
        'Aïn Khoucha',
      ],
    ),
    GovernorateData(
      name: 'Kébili',
      municipalities: [
        'Kébili',
        'Douz',
        'Kébili Nord',
        'Kébili Sud',
        'Razzeg',
        'Béchari',
        'El Golâa',
        'Souk Lahad',
      ],
    ),
    GovernorateData(
      name: 'Le Kef',
      municipalities: [
        'Le Kef',
        'Sakiet Sidi Youssef',
        'Tajerouine',
        'Menzel Salem',
        'Bouchemma',
        'El Krib',
        'Dahmani',
        'Bargou',
      ],
    ),
    GovernorateData(
      name: 'Mahdia',
      municipalities: [
        'Mahdia',
        'Sfax',
        'Mahdia Ville',
        'Ksour Essef',
        'Melloulèche',
        'Ouedhref',
        'Sidi Alouane',
        'El Djem',
        'Chebba',
      ],
    ),
    GovernorateData(
      name: 'Manouba',
      municipalities: [
        'Manouba',
        'Den Den',
        'Mornaguia',
        'Borj El Amri',
        'Jedaida',
        'Menzel Mahfoudh',
        'Tabarja',
      ],
    ),
    GovernorateData(
      name: 'Médenine',
      municipalities: [
        'Médenine',
        'Djerba',
        'Midoun',
        'Houmt Souk',
        'Beni Khedache',
        'Zarzis',
        'Ben Gardane',
        'Ajim',
      ],
    ),
    GovernorateData(
      name: 'Monastir',
      municipalities: [
        'Monastir',
        'Sousse',
        'Monastir Ville',
        'Skanès',
        'Mahdia',
        'Ksar Hellal',
        'Moknine',
        'Bembla',
        'Beni Hassen',
      ],
    ),
    GovernorateData(
      name: 'Nabeul',
      municipalities: [
        'Nabeul',
        'Hammamet',
        'Kelibia',
        'Menzel Temime',
        'Dar Chaâbane',
        'Beni Khiar',
        'Korba',
        'Menzel Bourguiba',
      ],
    ),
    GovernorateData(
      name: 'Sfax',
      municipalities: [
        'Sfax',
        'Sfax Ville',
        'Sfax Sud',
        'Sfax Ouest',
        'Sfax Nord',
        'Thyna',
        'Chihia',
        'El Ain',
        'Gremda',
      ],
    ),
    GovernorateData(
      name: 'Sidi Bouzid',
      municipalities: [
        'Sidi Bouzid',
        'Sidi Bouzid Ville',
        'Menzel Bouzaiane',
        'Ouled Haffouz',
        'Sidi Bennour',
        'Bir El Hafey',
        'Souk Jedid',
        'Mezzouna',
        'Regueb',
      ],
    ),
    GovernorateData(
      name: 'Siliana',
      municipalities: [
        'Siliana',
        'Siliana Nord',
        'Siliana Sud',
        'Bou Arada',
        'El Krib',
        'Ksour',
        'Maktar',
        'Rohia',
        'Tessour',
      ],
    ),
    GovernorateData(
      name: 'Sousse',
      municipalities: [
        'Sousse',
        'Sousse Ville',
        'Sousse Jawhra',
        'Sousse Riadh',
        'Sousse El Medina',
        'Sousse Boudh',
        'Ksar Hellal',
        'Moknine',
        'Bembla',
      ],
    ),
    GovernorateData(
      name: 'Tataouine',
      municipalities: [
        'Tataouine',
        'Tataouine Nord',
        'Tataouine Sud',
        'Ghomrassen',
        'Dhehiba',
        'Smâr',
        'El Ferius',
        'Chenini',
      ],
    ),
    GovernorateData(
      name: 'Tozeur',
      municipalities: [
        'Tozeur',
        'Tozeur Ville',
        'Nefta',
        'Douz',
        'El Hamma du Jérid',
        'Ksar Ghéranne',
        'Bouchebka',
        'Sidi Bouhelal',
      ],
    ),
    GovernorateData(
      name: 'Tunis',
      municipalities: [
        'Tunis',
        'Tunis Ville',
        'Le Bardo',
        'La Marsa',
        'Sidi Bou Said',
        'Carthage',
        'La Goulette',
        'El Menzah',
        'El Ouardia',
      ],
    ),
    GovernorateData(
      name: 'Zaghouan',
      municipalities: [
        'Zaghouan',
        'Zaghouan Ville',
        'Zriba',
        'Hamem',
        'El Akhou',
        'Ouedhref',
        'Saouaf',
        'Nadhour',
        'Bir Mcherga',
      ],
    ),
  ];

  /// Get list of governorate names
  static List<String> get governorateNames =>
      governorates.map((g) => g.name).toList();

  /// Get municipalities for a specific governorate
  static List<String> getMunicipalities(String governorate) {
    final found = governorates.firstWhere(
      (g) => g.name == governorate,
      orElse: () => const GovernorateData(name: '', municipalities: []),
    );
    return found.municipalities;
  }
}
