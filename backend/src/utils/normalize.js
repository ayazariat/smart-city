const normalizeMunicipality = (name) => {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove diacritics (é→e, è→e, etc.)
    .replace(/[-''`]/g, ' ')            // hyphens/apostrophes → space
    .replace(/\s+/g, ' ')              // collapse multiple spaces
    .trim();
};

// Municipality → Governorate mapping for auto-population
const MUNICIPALITY_TO_GOVERNORATE = {
  // Ariana
  "Ariana": "Ariana", "Ariana Ville": "Ariana", "Raoued": "Ariana", "Sidi Thabet": "Ariana", "La Soukra": "Ariana", "Ettadhamen": "Ariana", "Mnihla": "Ariana", "Kalâat el-Andalous": "Ariana", "Kalaat El Andalous": "Ariana",
  // Béja
  "Béja": "Béja", "Béja Nord": "Béja", "Béja Sud": "Béja", "Amdoun": "Béja", "Goubellat": "Béja", "Medjez el-Bab": "Béja", "Medjez El Bab": "Béja", "Nefza": "Béja", "Téboursouk": "Béja", "Teboursouk": "Béja", "Testour": "Béja", "Thibar": "Béja",
  // Ben Arous
  "Ben Arous": "Ben Arous", "Bou Mhel el-Bassatine": "Ben Arous", "El Mourouj": "Ben Arous", "Mourouj": "Ben Arous", "Ezzahra": "Ben Arous", "Fouchana": "Ben Arous", "Hammam Chott": "Ben Arous", "Hammam Lif": "Ben Arous", "Khalidia": "Ben Arous", "Mégrine": "Ben Arous", "Mohamedia": "Ben Arous", "Mornag": "Ben Arous", "Radès": "Ben Arous", "Borj Cédria": "Ben Arous",
  // Bizerte
  "Bizerte": "Bizerte", "Bizerte Nord": "Bizerte", "Bizerte Sud": "Bizerte", "El Alia": "Bizerte", "Ghar el-Melh": "Bizerte", "Ghar El Melh": "Bizerte", "Ghézala": "Bizerte", "Joumine": "Bizerte", "Mateur": "Bizerte", "Menzel Bourguiba": "Bizerte", "Menzel Jemil": "Bizerte", "Ras Jebel": "Bizerte", "Sejnane": "Bizerte", "Tinja": "Bizerte", "Utique": "Bizerte", "Zarzouna": "Bizerte",
  // Gabès
  "Gabès": "Gabès", "Gabès Médina": "Gabès", "Gabès Ouest": "Gabès", "Gabès Sud": "Gabès", "El Hamma": "Gabès", "El Metouia": "Gabès", "Métouia": "Gabès", "Ghannouch": "Gabès", "Mareth": "Gabès", "Matmata": "Gabès", "Matmata Nouvelle": "Gabès", "Menzel el-Habib": "Gabès",
  // Gafsa
  "Gafsa": "Gafsa", "Gafsa Nord": "Gafsa", "Gafsa Sud": "Gafsa", "Belkhir": "Gafsa", "El Guettar": "Gafsa", "El Ksar": "Gafsa", "Mdhilla": "Gafsa", "Métlaoui": "Gafsa", "Moularès": "Gafsa", "Redeyef": "Gafsa", "Sened": "Gafsa", "Sidi Aïch": "Gafsa",
  // Jendouba
  "Jendouba": "Jendouba", "Jendouba Nord": "Jendouba", "Aïn Draham": "Jendouba", "Balta-Bou Aouane": "Jendouba", "Balta": "Jendouba", "Bou Salem": "Jendouba", "Fernana": "Jendouba", "Ghardimaou": "Jendouba", "Oued Meliz": "Jendouba", "Tabarka": "Jendouba",
  // Kairouan
  "Kairouan": "Kairouan", "Kairouan Nord": "Kairouan", "Kairouan Sud": "Kairouan", "Alâa": "Kairouan", "Bou Hajla": "Kairouan", "Chebika": "Kairouan", "Chrarda": "Kairouan", "Haffouz": "Kairouan", "Hajeb el-Ayoun": "Kairouan", "Hajeb El Ayoun": "Kairouan", "Nasrallah": "Kairouan", "Oueslatia": "Kairouan", "Sbikha": "Kairouan",
  // Kasserine
  "Kasserine": "Kasserine", "Kasserine Nord": "Kasserine", "Kasserine Sud": "Kasserine", "El Ayoun": "Kasserine", "Ezzouhour": "Kasserine", "Fériana": "Kasserine", "Feriana": "Kasserine", "Foussana": "Kasserine", "Haïdra": "Kasserine", "Haidra": "Kasserine", "Hassi el-Ferid": "Kasserine", "Jedeliane": "Kasserine", "Djedeliane": "Kasserine", "Majel Bel Abbès": "Kasserine", "Sbeitla": "Kasserine", "Sbiba": "Kasserine", "Thala": "Kasserine",
  // Kébili
  "Kébili": "Kébili", "Kébili Nord": "Kébili", "Kébili Sud": "Kébili", "Douz": "Kébili", "Douz Nord": "Kébili", "Douz Sud": "Kébili", "Faouar": "Kébili", "Souk el-Ahad": "Kébili", "Souk Lahad": "Kébili",
  // Le Kef
  "Le Kef": "Le Kef", "Le Kef Est": "Le Kef", "Le Kef Ouest": "Le Kef", "Dahmani": "Le Kef", "El Ksour": "Le Kef", "El Krib": "Le Kef", "Jérissa": "Le Kef", "Kalâa Khasba": "Le Kef", "Kalâat Senan": "Le Kef", "Nebeur": "Le Kef", "Sakiet Sidi Youssef": "Le Kef", "Sers": "Le Kef", "Tajerouine": "Le Kef",
  // Mahdia
  "Mahdia": "Mahdia", "Bou Merdes": "Mahdia", "Chebba": "Mahdia", "Chorbane": "Mahdia", "El Jem": "Mahdia", "El Djem": "Mahdia", "Essouassi": "Mahdia", "Hebira": "Mahdia", "Ksour Essef": "Mahdia", "Melloulèche": "Mahdia", "Ouled Chamekh": "Mahdia", "Sidi Alouane": "Mahdia",
  // Manouba
  "Manouba": "Manouba", "Borj el-Amri": "Manouba", "Borj El Amri": "Manouba", "Djedeida": "Manouba", "Jedaida": "Manouba", "Douar Hicher": "Manouba", "Den Den": "Manouba", "El Batan": "Manouba", "Mornaguia": "Manouba", "Oued Ellil": "Manouba", "Tébourba": "Manouba",
  // Médenine
  "Médenine": "Médenine", "Médenine Nord": "Médenine", "Médenine Sud": "Médenine", "Ben Gardane": "Médenine", "Beni Khedache": "Médenine", "Djerba Ajim": "Médenine", "Djerba Houmt Souk": "Médenine", "Djerba Midoun": "Médenine", "Djerba": "Médenine", "Houmt Souk": "Médenine", "Midoun": "Médenine", "Ajim": "Médenine", "Sidi Makhlouf": "Médenine", "Zarzis": "Médenine",
  // Monastir
  "Monastir": "Monastir", "Bekalta": "Monastir", "Bembla": "Monastir", "Beni Hassen": "Monastir", "Jemmal": "Monastir", "Ksar Hellal": "Monastir", "Ksibet el-Médiouni": "Monastir", "Moknine": "Monastir", "Ouerdanine": "Monastir", "Sahline": "Monastir", "Sayada-Lamta-Bou Hajar": "Monastir", "Téboulba": "Monastir", "Zéramdine": "Monastir",
  // Nabeul
  "Nabeul": "Nabeul", "Béni Khalled": "Nabeul", "Béni Khiar": "Nabeul", "Beni Khiar": "Nabeul", "Bou Argoub": "Nabeul", "Dar Chaâbane el-Fehri": "Nabeul", "Dar Chaâbane": "Nabeul", "El Haouaria": "Nabeul", "El Mida": "Nabeul", "Grombalia": "Nabeul", "Hammamet": "Nabeul", "Hammam Ghezèze": "Nabeul", "Kelibia": "Nabeul", "Korba": "Nabeul", "Menzel Bouzelfa": "Nabeul", "Menzel Temime": "Nabeul", "Slimane": "Nabeul", "Soliman": "Nabeul", "Takelsa": "Nabeul",
  // Sfax
  "Sfax": "Sfax", "Sfax Ouest": "Sfax", "Sfax Sud": "Sfax", "Agareb": "Sfax", "Bir Ali Ben Khalifa": "Sfax", "El Amra": "Sfax", "El Hencha": "Sfax", "Ghraïba": "Sfax", "Jbeniana": "Sfax", "Kerkennah": "Sfax", "Mahrès": "Sfax", "Menzel Chaker": "Sfax", "Sakiet Eddaïer": "Sfax", "Sakiet Ezzit": "Sfax", "Skhira": "Sfax", "Thyna": "Sfax",
  // Sidi Bouzid
  "Sidi Bouzid": "Sidi Bouzid", "Sidi Bouzid Est": "Sidi Bouzid", "Sidi Bouzid Ouest": "Sidi Bouzid", "Bir el-Hafey": "Sidi Bouzid", "Bir El Hafey": "Sidi Bouzid", "Cebbala Ouled Asker": "Sidi Bouzid", "Jelma": "Sidi Bouzid", "Jilma": "Sidi Bouzid", "Mazzouna": "Sidi Bouzid", "Meknassy": "Sidi Bouzid", "Menzel Bouzaiane": "Sidi Bouzid", "Ouled Haffouz": "Sidi Bouzid", "Regueb": "Sidi Bouzid", "Sidi Ali Ben Aoun": "Sidi Bouzid",
  // Siliana
  "Siliana": "Siliana", "Siliana Nord": "Siliana", "Siliana Sud": "Siliana", "Bargou": "Siliana", "Bou Arada": "Siliana", "El Aroussa": "Siliana", "El Krib": "Siliana", "Gaâfour": "Siliana", "Kesra": "Siliana", "Le Sers": "Siliana", "Makthar": "Siliana", "Rouhia": "Siliana",
  // Sousse
  "Sousse": "Sousse", "Sousse Médina": "Sousse", "Sousse Riadh": "Sousse", "Sousse Jawhara": "Sousse", "Sousse Sidi Abdelhamid": "Sousse", "Akouda": "Sousse", "Bouficha": "Sousse", "Enfida": "Sousse", "Hammam Sousse": "Sousse", "Hergla": "Sousse", "Kalâa Kebira": "Sousse", "Kalâa Sghira": "Sousse", "Kondar": "Sousse", "Ksibet Thrayet": "Sousse", "M'saken": "Sousse", "Msaken": "Sousse", "Sidi Bou Ali": "Sousse", "Sidi el-Héni": "Sousse",
  // Tataouine
  "Tataouine": "Tataouine", "Tataouine Nord": "Tataouine", "Tataouine Sud": "Tataouine", "Bir Lahmar": "Tataouine", "Dehiba": "Tataouine", "Dhehiba": "Tataouine", "Ghomrassen": "Tataouine", "Remada": "Tataouine", "Smar": "Tataouine",
  // Tozeur
  "Tozeur": "Tozeur", "Degache": "Tozeur", "Hazoua": "Tozeur", "Nefta": "Tozeur", "Tameghza": "Tozeur",
  // Tunis
  "Tunis": "Tunis", "Bab Bhar": "Tunis", "Bab Souika": "Tunis", "Carthage": "Tunis", "Cité el-Khadra": "Tunis", "Cité El Khadra": "Tunis", "Djebel Jelloud": "Tunis", "Jebel Jelloud": "Tunis", "El Kabaria": "Tunis", "El Menzah": "Tunis", "El Omrane": "Tunis", "El Omrane Supérieur": "Tunis", "El Ouardia": "Tunis", "Ettahrir": "Tunis", "Hrairia": "Tunis", "La Goulette": "Tunis", "La Marsa": "Tunis", "Le Bardo": "Tunis", "Le Kram": "Tunis", "Séjoumi": "Tunis", "Sidi Hassine": "Tunis", "Sidi el-Béchir": "Tunis",
  // Zaghouan
  "Zaghouan": "Zaghouan", "Bir Mcherga": "Zaghouan", "El Fahs": "Zaghouan", "Nadhour": "Zaghouan", "Saouaf": "Zaghouan", "Zriba": "Zaghouan"
};

const getMunicipalityGovernorate = (municipalityName) => {
  if (!municipalityName) return null;
  const trimmed = municipalityName.trim();
  // Direct match
  if (MUNICIPALITY_TO_GOVERNORATE[trimmed]) return MUNICIPALITY_TO_GOVERNORATE[trimmed];
  // Case-insensitive match
  for (const [mun, gov] of Object.entries(MUNICIPALITY_TO_GOVERNORATE)) {
    if (mun.toLowerCase() === trimmed.toLowerCase()) return gov;
  }
  // Partial match
  for (const [mun, gov] of Object.entries(MUNICIPALITY_TO_GOVERNORATE)) {
    if (trimmed.toLowerCase().includes(mun.toLowerCase()) || mun.toLowerCase().includes(trimmed.toLowerCase())) return gov;
  }
  return null;
};

module.exports = { normalizeMunicipality, getMunicipalityGovernorate, MUNICIPALITY_TO_GOVERNORATE };
