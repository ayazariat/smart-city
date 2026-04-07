// Tunisia Governorates and Municipalities Data
// This data is used for autocomplete functionality in registration, admin, and complaints

export interface GovernorateData {
  governorate: string;
  municipalities: string[];
}

export const TUNISIA_GEOGRAPHY: GovernorateData[] = [
  {
    governorate: "Ariana",
    municipalities: ["Ariana Ville", "Raoued", "Sidi Thabet", "La Soukra", "Ettadhamen", "Mnihla", "Kalâat el-Andalous"]
  },
  {
    governorate: "Béja",
    municipalities: ["Béja", "Béja Nord", "Béja Sud", "Amdoun", "Goubellat", "Medjez el-Bab", "Nefza", "Téboursouk", "Testour", "Thibar"]
  },
  {
    governorate: "Ben Arous",
    municipalities: ["Ben Arous", "Bou Mhel el-Bassatine", "El Mourouj", "Ezzahra", "Fouchana", "Hammam Chott", "Hammam Lif", "Khalidia", "Mégrine", "Mohamedia", "Mornag", "Radès"]
  },
  {
    governorate: "Bizerte",
    municipalities: ["Bizerte", "Bizerte Nord", "Bizerte Sud", "El Alia", "Ghar el-Melh", "Ghézala", "Joumine", "Mateur", "Menzel Bourguiba", "Menzel Jemil", "Ras Jebel", "Sejnane", "Tinja", "Utique", "Zarzouna"]
  },
  {
    governorate: "Gabès",
    municipalities: ["Gabès Médina", "Gabès Ouest", "Gabès Sud", "El Hamma", "El Metouia", "Ghannouch", "Mareth", "Matmata", "Matmata Nouvelle", "Menzel el-Habib"]
  },
  {
    governorate: "Gafsa",
    municipalities: ["Gafsa", "Gafsa Nord", "Gafsa Sud", "Belkhir", "El Guettar", "El Ksar", "Mdhilla", "Métlaoui", "Moularès", "Redeyef", "Sened", "Sidi Aïch"]
  },
  {
    governorate: "Jendouba",
    municipalities: ["Jendouba", "Jendouba Nord", "Aïn Draham", "Balta-Bou Aouane", "Bou Salem", "Fernana", "Ghardimaou", "Oued Meliz", "Tabarka"]
  },
  {
    governorate: "Kairouan",
    municipalities: ["Kairouan", "Kairouan Nord", "Kairouan Sud", "Alâa", "Bou Hajla", "Chebika", "Chrarda", "Haffouz", "Hajeb el-Ayoun", "Nasrallah", "Oueslatia", "Sbikha"]
  },
  {
    governorate: "Kasserine",
    municipalities: ["Kasserine", "Kasserine Nord", "Kasserine Sud", "El Ayoun", "Ezzouhour", "Fériana", "Foussana", "Haïdra", "Hassi el-Ferid", "Jedeliane", "Majel Bel Abbès", "Sbeitla", "Sbiba", "Thala"]
  },
  {
    governorate: "Kébili",
    municipalities: ["Kébili", "Kébili Nord", "Kébili Sud", "Douz", "Douz Nord", "Douz Sud", "Faouar", "Souk el-Ahad"]
  },
  {
    governorate: "Le Kef",
    municipalities: ["Le Kef", "Le Kef Est", "Le Kef Ouest", "Dahmani", "El Ksour", "Jérissa", "Kalâa Khasba", "Kalâat Senan", "Nebeur", "Sakiet Sidi Youssef", "Sers", "Tajerouine"]
  },
  {
    governorate: "Mahdia",
    municipalities: ["Mahdia", "Bou Merdes", "Chebba", "Chorbane", "El Jem", "Essouassi", "Hebira", "Ksour Essef", "Melloulèche", "Ouled Chamekh", "Sidi Alouane"]
  },
  {
    governorate: "Manouba",
    municipalities: ["Manouba", "Borj el-Amri", "Djedeida", "Douar Hicher", "El Batan", "Mornaguia", "Oued Ellil", "Tébourba"]
  },
  {
    governorate: "Médenine",
    municipalities: ["Médenine", "Médenine Nord", "Médenine Sud", "Ben Gardane", "Beni Khedache", "Djerba Ajim", "Djerba Houmt Souk", "Djerba Midoun", "Sidi Makhlouf", "Zarzis"]
  },
  {
    governorate: "Monastir",
    municipalities: ["Monastir", "Bekalta", "Bembla", "Beni Hassen", "Jemmal", "Ksar Hellal", "Ksibet el-Médiouni", "Moknine", "Ouerdanine", "Sahline", "Sayada-Lamta-Bou Hajar", "Téboulba", "Zéramdine"]
  },
  {
    governorate: "Nabeul",
    municipalities: ["Nabeul", "Béni Khalled", "Béni Khiar", "Bou Argoub", "Dar Chaâbane el-Fehri", "El Haouaria", "El Mida", "Grombalia", "Hammamet", "Hammam Ghezèze", "Kelibia", "Korba", "Menzel Bouzelfa", "Menzel Temime", "Slimane", "Soliman", "Takelsa"]
  },
  {
    governorate: "Sfax",
    municipalities: ["Sfax", "Sfax Ouest", "Sfax Sud", "Agareb", "Bir Ali Ben Khalifa", "El Amra", "El Hencha", "Ghraïba", "Jbeniana", "Kerkennah", "Mahrès", "Menzel Chaker", "Sakiet Eddaïer", "Sakiet Ezzit", "Skhira", "Thyna"]
  },
  {
    governorate: "Sidi Bouzid",
    municipalities: ["Sidi Bouzid", "Sidi Bouzid Est", "Sidi Bouzid Ouest", "Bir el-Hafey", "Cebbala Ouled Asker", "Jelma", "Jilma", "Mazzouna", "Meknassy", "Menzel Bouzaiane", "Ouled Haffouz", "Regueb", "Sidi Ali Ben Aoun"]
  },
  {
    governorate: "Siliana",
    municipalities: ["Siliana", "Siliana Nord", "Siliana Sud", "Bargou", "Bou Arada", "El Aroussa", "El Krib", "Gaâfour", "Kesra", "Le Sers", "Makthar", "Rouhia"]
  },
  {
    governorate: "Sousse",
    municipalities: ["Sousse Médina", "Sousse Riadh", "Sousse Jawhara", "Sousse Sidi Abdelhamid", "Akouda", "Bouficha", "Enfida", "Hammam Sousse", "Hergla", "Kalâa Kebira", "Kalâa Sghira", "Kondar", "Ksibet Thrayet", "M'saken", "Sidi Bou Ali", "Sidi el-Héni"]
  },
  {
    governorate: "Tataouine",
    municipalities: ["Tataouine", "Tataouine Nord", "Tataouine Sud", "Bir Lahmar", "Dehiba", "Ghomrassen", "Remada", "Smar"]
  },
  {
    governorate: "Tozeur",
    municipalities: ["Tozeur", "Degache", "Hazoua", "Nefta", "Tameghza"]
  },
  {
    governorate: "Tunis",
    municipalities: ["Tunis", "Bab Bhar", "Bab Souika", "Carthage", "Cité el-Khadra", "Djebel Jelloud", "El Kabaria", "El Menzah", "El Omrane", "El Omrane Supérieur", "El Ouardia", "Ettahrir", "Ezzouhour", "Hrairia", "La Goulette", "La Marsa", "Le Bardo", "Le Kram", "Séjoumi", "Sidi Hassine", "Sidi el-Béchir"]
  },
  {
    governorate: "Zaghouan",
    municipalities: ["Zaghouan", "Bir Mcherga", "El Fahs", "Nadhour", "Saouaf", "Zriba"]
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
