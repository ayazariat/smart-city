// Tunisia Governorates and Municipalities Data
// This data is used for autocomplete functionality in registration, admin, and complaints

export interface GovernorateData {
  governorate: string;
  municipalities: string[];
}

export const TUNISIA_GEOGRAPHY: GovernorateData[] = [
  {
    governorate: "Ariana",
    municipalities: ["Ariana", "Raoued", "Sidi Thabet", "La Soukra", "Ettadhamen", "Mnihla", "Kalaat El Andalous", "Sidi Ameur"]
  },
  {
    governorate: "Béja",
    municipalities: ["Béja", "Medjez El Bab", "Nefza", "Teboursouk", "Testour", "Mateur", "Joumine", "El Ma El Abiod"]
  },
  {
    governorate: "Ben Arous",
    municipalities: ["Ben Arous", "Radès", "Mornag", "Hammam Lif", "Hammam Chott", "Ezzahra", "Mourouj", "Borj Cédria", "Méryana"]
  },
  {
    governorate: "Bizerte",
    municipalities: ["Bizerte", "Mateur", "Ras Jebel", "Sejnane", "Menzel Bourguiba", "Tinja", "El Alia", "Ghar El Melh", "Aousja"]
  },
  {
    governorate: "Gabès",
    municipalities: ["Gabès", "Mareth", "El Hamma", "Métouia", "Oudhref", "Ghannouch", "Kébili", "Degache", "Tamazret", "Zarat"]
  },
  {
    governorate: "Gafsa",
    municipalities: ["Gafsa", "Métlaoui", "El Ksar", "Sidi Aïch", "Ouedhref", "Moularès", "Haidra", "Sened", "El Guettar"]
  },
  {
    governorate: "Jendouba",
    municipalities: ["Jendouba", "Tabarka", "Aïn Draham", "Balta", "Bou Salem", "Fernana", "Ghardimaou", "Oued Meliz", "Joumine"]
  },
  {
    governorate: "Kairouan",
    municipalities: ["Kairouan", "Kairouan Nord", "Kairouan Sud", "Oueslatia", "Bougarnane", "Sidi Jaber", "Haffouz", "Hajeb El Ayoun"]
  },
  {
    governorate: "Kasserine",
    municipalities: ["Kasserine", "Sbeitla", "Thala", "Feriana", "Sbiba", "Djedeliane", "Aïn Khoucha"]
  },
  {
    governorate: "Kébili",
    municipalities: ["Kébili", "Douz", "Kébili Nord", "Kébili Sud", "Razzeg", "Béchari", "El Golâa", "Souk Lahad"]
  },
  {
    governorate: "Le Kef",
    municipalities: ["Le Kef", "Sakiet Sidi Youssef", "Tajerouine", "Menzel Salem", "Bouchemma", "El Krib", "Dahmani", "Bargou"]
  },
  {
    governorate: "Mahdia",
    municipalities: ["Mahdia", "Mahdia Ville", "Ksour Essef", "Melloulèche", "Ouedhref", "Sidi Alouane", "El Djem", "Chebba"]
  },
  {
    governorate: "Manouba",
    municipalities: ["Manouba", "Den Den", "Mornaguia", "Ouedhref", "Borj El Amri", "Jedaida", "Menzel Mahfoudh", "Tabarja"]
  },
  {
    governorate: "Médenine",
    municipalities: ["Médenine", "Djerba", "Midoun", "Houmt Souk", "Beni Khedache", "Zarzis", "Ben Gardane", "Ajim"]
  },
  {
    governorate: "Monastir",
    municipalities: ["Monastir", "Monastir Ville", "Skanès", "Ksar Hellal", "Moknine", "Bembla", "Beni Hassen"]
  },
  {
    governorate: "Nabeul",
    municipalities: ["Nabeul", "Hammamet", "Kelibia", "Menzel Temime", "Dar Chaâbane", "Beni Khiar", "Sousse", "Kairouan", "Sidi Thabet"]
  },
  {
    governorate: "Sfax",
    municipalities: ["Sfax", "Sfax Ville", "Sfax Sud", "Sfax Nord", "Thyna", "Chihia", "Jedeni", "Menzel Chaker", "Agareb"]
  },
  {
    governorate: "Sidi Bouzid",
    municipalities: ["Sidi Bouzid", "Menzel Bouzaiane", "Sidi Ali Ben Aoun", "Ouled Haffouz", "Melloulèche", "Bir El Hafey", "Sahline"]
  },
  {
    governorate: "Siliana",
    municipalities: ["Siliana", "Bousalem", "El Krib", "Bargou", "Kesra", "Makthar", "Bou Arada", "Sidi Morocco", "Gaâfour"]
  },
  {
    governorate: "Sousse",
    municipalities: ["Sousse", "Sousse Ville", "Ksibet Thrayet", "Msaken", "Sidi Bou Ali", "Hammam Sousse", "Kantaoui", "Kalâa Kebira"]
  },
  {
    governorate: "Tataouine",
    municipalities: ["Tataouine", "Tataouine Nord", "Tataouine Sud", "Ghomrassen", "Dhehiba", "Remada", "El Ferch", "Smar"]
  },
  {
    governorate: "Tozeur",
    municipalities: ["Tozeur", "Nefta", "Degache", "Tameghza", "El Hamma du Jérid", "Kebili"]
  },
  {
    governorate: "Tunis",
    municipalities: ["Tunis", "Tunis Ville", "Cité El Khadra", "El Ouardia", "El Menzah", "Bhar Lazreg", "Le Bardo", "Sidi Hassine", "Jebel Jelloud"]
  },
  {
    governorate: "Zaghouan",
    municipalities: ["Zaghouan", "Zaghouan Ville", "Nadhour", "Bir Mcherga", "Zriba", "El Amaiem", "Fountain", "Jedaida"]
  }
];

// Helper function to get all municipalities for autocomplete
export const getAllMunicipalities = (): string[] => {
  return TUNISIA_GEOGRAPHY.flatMap(g => g.municipalities).sort();
};

// Helper function to search municipalities by query
export const searchMunicipalities = (query: string): string[] => {
  if (!query || query.length < 2) return [];
  const lowerQuery = query.toLowerCase();
  return getAllMunicipalities().filter(m => 
    m.toLowerCase().includes(lowerQuery)
  ).slice(0, 10); // Limit to 10 results
};

// Helper function to search governorates by query
export const searchGovernorates = (query: string): string[] => {
  if (!query || query.length < 2) return [];
  const lowerQuery = query.toLowerCase();
  return TUNISIA_GEOGRAPHY.filter(g => 
    g.governorate.toLowerCase().includes(lowerQuery)
  ).map(g => g.governorate).slice(0, 10);
};

// Get municipalities for a specific governorate
export const getMunicipalitiesByGovernorate = (governorate: string): string[] => {
  const found = TUNISIA_GEOGRAPHY.find(g => 
    g.governorate.toLowerCase() === governorate.toLowerCase()
  );
  return found ? found.municipalities : [];
};
