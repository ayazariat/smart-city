const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/smart-city';

const normalize = (name) => {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-''`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const MUNICIPALITY_TO_GOVERNORATE = {
  "Ariana": "Ariana", "Ariana Ville": "Ariana", "Raoued": "Ariana", "Sidi Thabet": "Ariana", "La Soukra": "Ariana", "Ettadhamen": "Ariana", "Mnihla": "Ariana", "Kalâat el-Andalous": "Ariana", "Kalaat El Andalous": "Ariana",
  "Béja": "Béja", "Béja Nord": "Béja", "Béja Sud": "Béja", "Amdoun": "Béja", "Goubellat": "Béja", "Medjez el-Bab": "Béja", "Medjez El Bab": "Béja", "Nefza": "Béja", "Téboursouk": "Béja", "Teboursouk": "Béja", "Testour": "Béja", "Thibar": "Béja",
  "Ben Arous": "Ben Arous", "Bou Mhel el-Bassatine": "Ben Arous", "El Mourouj": "Ben Arous", "Mourouj": "Ben Arous", "Ezzahra": "Ben Arous", "Fouchana": "Ben Arous", "Hammam Chott": "Ben Arous", "Hammam Lif": "Ben Arous", "Khalidia": "Ben Arous", "Mégrine": "Ben Arous", "Mohamedia": "Ben Arous", "Mornag": "Ben Arous", "Radès": "Ben Arous", "Borj Cédria": "Ben Arous",
  "Bizerte": "Bizerte", "Bizerte Nord": "Bizerte", "Bizerte Sud": "Bizerte", "El Alia": "Bizerte", "Ghar el-Melh": "Bizerte", "Ghar El Melh": "Bizerte", "Ghézala": "Bizerte", "Joumine": "Bizerte", "Mateur": "Bizerte", "Menzel Bourguiba": "Bizerte", "Menzel Jemil": "Bizerte", "Ras Jebel": "Bizerte", "Sejnane": "Bizerte", "Tinja": "Bizerte", "Utique": "Bizerte", "Zarzouna": "Bizerte",
  "Gabès": "Gabès", "Gabès Médina": "Gabès", "Gabès Ouest": "Gabès", "Gabès Sud": "Gabès", "El Hamma": "Gabès", "El Metouia": "Gabès", "Métouia": "Gabès", "Ghannouch": "Gabès", "Mareth": "Gabès", "Matmata": "Gabès", "Matmata Nouvelle": "Gabès", "Menzel el-Habib": "Gabès",
  "Gafsa": "Gafsa", "Gafsa Nord": "Gafsa", "Gafsa Sud": "Gafsa", "Belkhir": "Gafsa", "El Guettar": "Gafsa", "El Ksar": "Gafsa", "Mdhilla": "Gafsa", "Métlaoui": "Gafsa", "Moularès": "Gafsa", "Redeyef": "Gafsa", "Sened": "Gafsa", "Sidi Aïch": "Gafsa",
  "Jendouba": "Jendouba", "Jendouba Nord": "Jendouba", "Aïn Draham": "Jendouba", "Balta-Bou Aouane": "Jendouba", "Balta": "Jendouba", "Bou Salem": "Jendouba", "Fernana": "Jendouba", "Ghardimaou": "Jendouba", "Oued Meliz": "Jendouba", "Tabarka": "Jendouba",
  "Kairouan": "Kairouan", "Kairouan Nord": "Kairouan", "Kairouan Sud": "Kairouan", "Alâa": "Kairouan", "Bou Hajla": "Kairouan", "Chebika": "Kairouan", "Chrarda": "Kairouan", "Haffouz": "Kairouan", "Hajeb el-Ayoun": "Kairouan", "Hajeb El Ayoun": "Kairouan", "Nasrallah": "Kairouan", "Oueslatia": "Kairouan", "Sbikha": "Kairouan",
  "Kasserine": "Kasserine", "Kasserine Nord": "Kasserine", "Kasserine Sud": "Kasserine", "El Ayoun": "Kasserine", "Ezzouhour": "Kasserine", "Fériana": "Kasserine", "Feriana": "Kasserine", "Foussana": "Kasserine", "Haïdra": "Kasserine", "Haidra": "Kasserine", "Hassi el-Ferid": "Kasserine", "Jedeliane": "Kasserine", "Djedeliane": "Kasserine", "Majel Bel Abbès": "Kasserine", "Sbeitla": "Kasserine", "Sbiba": "Kasserine", "Thala": "Kasserine",
  "Kébili": "Kébili", "Kébili Nord": "Kébili", "Kébili Sud": "Kébili", "Douz": "Kébili", "Douz Nord": "Kébili", "Douz Sud": "Kébili", "Faouar": "Kébili", "Souk el-Ahad": "Kébili", "Souk Lahad": "Kébili",
  "Le Kef": "Le Kef", "Le Kef Est": "Le Kef", "Le Kef Ouest": "Le Kef", "Dahmani": "Le Kef", "El Ksour": "Le Kef", "El Krib": "Le Kef", "Jérissa": "Le Kef", "Kalâa Khasba": "Le Kef", "Kalâat Senan": "Le Kef", "Nebeur": "Le Kef", "Sakiet Sidi Youssef": "Le Kef", "Sers": "Le Kef", "Tajerouine": "Le Kef",
  "Mahdia": "Mahdia", "Bou Merdes": "Mahdia", "Chebba": "Mahdia", "Chorbane": "Mahdia", "El Jem": "Mahdia", "El Djem": "Mahdia", "Essouassi": "Mahdia", "Hebira": "Mahdia", "Ksour Essef": "Mahdia", "Melloulèche": "Mahdia", "Ouled Chamekh": "Mahdia", "Sidi Alouane": "Mahdia",
  "Manouba": "Manouba", "Borj el-Amri": "Manouba", "Borj El Amri": "Manouba", "Djedeida": "Manouba", "Jedaida": "Manouba", "Douar Hicher": "Manouba", "Den Den": "Manouba", "El Batan": "Manouba", "Mornaguia": "Manouba", "Oued Ellil": "Manouba", "Tébourba": "Manouba",
  "Médenine": "Médenine", "Médenine Nord": "Médenine", "Médenine Sud": "Médenine", "Ben Gardane": "Médenine", "Beni Khedache": "Médenine", "Djerba Ajim": "Médenine", "Djerba Houmt Souk": "Médenine", "Djerba Midoun": "Médenine", "Djerba": "Médenine", "Houmt Souk": "Médenine", "Midoun": "Médenine", "Ajim": "Médenine", "Sidi Makhlouf": "Médenine", "Zarzis": "Médenine",
  "Monastir": "Monastir", "Bekalta": "Monastir", "Bembla": "Monastir", "Beni Hassen": "Monastir", "Jemmal": "Monastir", "Ksar Hellal": "Monastir", "Ksibet el-Médiouni": "Monastir", "Moknine": "Monastir", "Ouerdanine": "Monastir", "Sahline": "Monastir", "Sayada-Lamta-Bou Hajar": "Monastir", "Téboulba": "Monastir", "Zéramdine": "Monastir",
  "Nabeul": "Nabeul", "Béni Khalled": "Nabeul", "Béni Khiar": "Nabeul", "Beni Khiar": "Nabeul", "Bou Argoub": "Nabeul", "Dar Chaâbane el-Fehri": "Nabeul", "Dar Chaâbane": "Nabeul", "El Haouaria": "Nabeul", "El Mida": "Nabeul", "Grombalia": "Nabeul", "Hammamet": "Nabeul", "Hammam Ghezèze": "Nabeul", "Kelibia": "Nabeul", "Korba": "Nabeul", "Menzel Bouzelfa": "Nabeul", "Menzel Temime": "Nabeul", "Slimane": "Nabeul", "Soliman": "Nabeul", "Takelsa": "Nabeul",
  "Sfax": "Sfax", "Sfax Ouest": "Sfax", "Sfax Sud": "Sfax", "Agareb": "Sfax", "Bir Ali Ben Khalifa": "Sfax", "El Amra": "Sfax", "El Hencha": "Sfax", "Ghraïba": "Sfax", "Jbeniana": "Sfax", "Kerkennah": "Sfax", "Mahrès": "Sfax", "Menzel Chaker": "Sfax", "Sakiet Eddaïer": "Sfax", "Sakiet Ezzit": "Sfax", "Skhira": "Sfax", "Thyna": "Sfax",
  "Sidi Bouzid": "Sidi Bouzid", "Sidi Bouzid Est": "Sidi Bouzid", "Sidi Bouzid Ouest": "Sidi Bouzid", "Bir el-Hafey": "Sidi Bouzid", "Bir El Hafey": "Sidi Bouzid", "Cebbala Ouled Asker": "Sidi Bouzid", "Jelma": "Sidi Bouzid", "Jilma": "Sidi Bouzid", "Mazzouna": "Sidi Bouzid", "Meknassy": "Sidi Bouzid", "Menzel Bouzaiane": "Sidi Bouzid", "Ouled Haffouz": "Sidi Bouzid", "Regueb": "Sidi Bouzid", "Sidi Ali Ben Aoun": "Sidi Bouzid",
  "Siliana": "Siliana", "Siliana Nord": "Siliana", "Siliana Sud": "Siliana", "Bargou": "Siliana", "Bou Arada": "Siliana", "El Aroussa": "Siliana", "Gaâfour": "Siliana", "Kesra": "Siliana", "Le Sers": "Siliana", "Makthar": "Siliana", "Rouhia": "Siliana",
  "Sousse": "Sousse", "Sousse Médina": "Sousse", "Sousse Riadh": "Sousse", "Sousse Jawhara": "Sousse", "Sousse Sidi Abdelhamid": "Sousse", "Akouda": "Sousse", "Bouficha": "Sousse", "Enfida": "Sousse", "Hammam Sousse": "Sousse", "Hergla": "Sousse", "Kalâa Kebira": "Sousse", "Kalâa Sghira": "Sousse", "Kondar": "Sousse", "Ksibet Thrayet": "Sousse", "M'saken": "Sousse", "Msaken": "Sousse", "Sidi Bou Ali": "Sousse", "Sidi el-Héni": "Sousse",
  "Tataouine": "Tataouine", "Tataouine Nord": "Tataouine", "Tataouine Sud": "Tataouine", "Bir Lahmar": "Tataouine", "Dehiba": "Tataouine", "Dhehiba": "Tataouine", "Ghomrassen": "Tataouine", "Remada": "Tataouine", "Smar": "Tataouine",
  "Tozeur": "Tozeur", "Degache": "Tozeur", "Hazoua": "Tozeur", "Nefta": "Tozeur", "Tameghza": "Tozeur",
  "Tunis": "Tunis", "Bab Bhar": "Tunis", "Bab Souika": "Tunis", "Carthage": "Tunis", "Cité el-Khadra": "Tunis", "Cité El Khadra": "Tunis", "Djebel Jelloud": "Tunis", "Jebel Jelloud": "Tunis", "El Kabaria": "Tunis", "El Menzah": "Tunis", "El Omrane": "Tunis", "El Omrane Supérieur": "Tunis", "El Ouardia": "Tunis", "Ettahrir": "Tunis", "Hrairia": "Tunis", "La Goulette": "Tunis", "La Marsa": "Tunis", "Le Bardo": "Tunis", "Le Kram": "Tunis", "Séjoumi": "Tunis", "Sidi Hassine": "Tunis", "Sidi el-Béchir": "Tunis",
  "Zaghouan": "Zaghouan", "Bir Mcherga": "Zaghouan", "El Fahs": "Zaghouan", "Nadhour": "Zaghouan", "Saouaf": "Zaghouan", "Zriba": "Zaghouan"
};

const CANONICAL_MUNICIPALITY_NAMES = {};
const seen = new Set();
for (const rawName of Object.keys(MUNICIPALITY_TO_GOVERNORATE)) {
  const normalized = normalize(rawName);
  if (!seen.has(normalized)) {
    seen.add(normalized);
    CANONICAL_MUNICIPALITY_NAMES[normalized] = rawName;
  }
}

function getCanonicalName(name) {
  if (!name) return '';
  const normalized = normalize(name);
  if (CANONICAL_MUNICIPALITY_NAMES[normalized]) {
    return CANONICAL_MUNICIPALITY_NAMES[normalized];
  }
  return name.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function getGovernorate(name) {
  if (!name) return '';
  const normalized = normalize(name);
  for (const [mun, gov] of Object.entries(MUNICIPALITY_TO_GOVERNORATE)) {
    if (normalize(mun) === normalized) return gov;
  }
  for (const [mun, gov] of Object.entries(MUNICIPALITY_TO_GOVERNORATE)) {
    if (normalized.includes(normalize(mun)) || normalize(mun).includes(normalized)) return gov;
  }
  return '';
}

async function runMigration() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const complaintsCol = db.collection('complaints');
  const usersCol = db.collection('users');

  console.log('\n--- Migrating Complaints ---');
  const complaints = await complaintsCol.find({
    $or: [
      { municipalityName: { $exists: true, $ne: '' } },
      { municipality: { $exists: true, $ne: '' } },
    ]
  }).toArray();

  console.log(`Found ${complaints.length} complaints with municipality data`);

  let complaintUpdated = 0;
  let complaintSkipped = 0;
  const unmatchedMun = new Set();

  for (const c of complaints) {
    const rawMunicipality = c.municipalityName || (typeof c.municipality === 'string' ? c.municipality : '') || c.location?.municipality || '';
    if (!rawMunicipality) {
      complaintSkipped++;
      continue;
    }

    const normalized = normalize(rawMunicipality);
    const canonical = getCanonicalName(rawMunicipality);
    const governorate = getGovernorate(rawMunicipality);
    const normalizedGovernorate = normalize(governorate);

    const update = { $set: {} };

    if (canonical && canonical !== c.municipalityName) {
      update.$set.municipalityName = canonical;
    }
    if (typeof c.municipality === 'string' && canonical && canonical !== c.municipality) {
      update.$set.municipality = canonical;
    }
    if (governorate && governorate !== c.governorate) {
      update.$set.governorate = governorate;
    }
    update.$set.municipalityNormalized = normalized;
    update.$set.governorateNormalized = normalizedGovernorate;

    if (c.location && (c.location.municipality || c.location.governorate)) {
      update.$set['location.municipality'] = canonical || c.location.municipality;
      if (governorate) {
        update.$set['location.governorate'] = governorate;
      }
    }

    if (Object.keys(update.$set).length > 0) {
      await complaintsCol.updateOne({ _id: c._id }, update);
      complaintUpdated++;
      if (complaintUpdated <= 5 || complaintUpdated % 100 === 0) {
        console.log(`  Updated: "${rawMunicipality}" → "${canonical}" (norm: "${normalized}", gov: "${governorate}")`);
      }
    } else {
      complaintSkipped++;
    }

    if (!canonical) {
      unmatchedMun.add(rawMunicipality);
    }
  }

  console.log(`\nComplaints: ${complaintUpdated} updated, ${complaintSkipped} skipped`);

  console.log('\n--- Migrating Users ---');
  const users = await usersCol.find({
    $or: [
      { municipalityName: { $exists: true, $ne: '' } },
    ]
  }).toArray();

  console.log(`Found ${users.length} users with municipality data`);

  let userUpdated = 0;
  let userSkipped = 0;

  for (const u of users) {
    const rawMunicipality = u.municipalityName || '';
    if (!rawMunicipality) {
      userSkipped++;
      continue;
    }

    const normalized = normalize(rawMunicipality);
    const canonical = getCanonicalName(rawMunicipality);
    const governorate = getGovernorate(rawMunicipality);
    const normalizedGovernorate = normalize(governorate);

    const update = { $set: {} };

    if (canonical && canonical !== u.municipalityName) {
      update.$set.municipalityName = canonical;
    }
    update.$set.municipalityNormalized = normalized;
    update.$set.governorateNormalized = normalizedGovernorate;

    if (Object.keys(update.$set).length > 0) {
      await usersCol.updateOne({ _id: u._id }, update);
      userUpdated++;
    } else {
      userSkipped++;
    }
  }

  console.log(`Users: ${userUpdated} updated, ${userSkipped} skipped`);

  console.log('\n--- Verification ---');
  const complaintGroups = await complaintsCol.aggregate([
    {
      $group: {
        _id: "$municipalityNormalized",
        displayNames: { $addToSet: "$municipalityName" },
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]).toArray();

  console.log('\nTop 20 normalized municipality groups:');
  for (const g of complaintGroups) {
    const dupes = g.displayNames.length > 1 ? ` VARIANTS: ${g.displayNames.join(', ')}` : '';
    console.log(`  ${g._id || '(empty)'}: ${g.count} complaints${dupes}`);
  }

  const duplicateNorm = complaintGroups.filter(g => g.displayNames.length > 1);
  if (duplicateNorm.length > 0) {
    console.log(`\n${duplicateNorm.length} normalized keys still have multiple display name variants. Re-run migration.`);
  } else {
    console.log('\nAll municipalities are correctly normalized with unique display names!');
  }

  await mongoose.disconnect();
  console.log('\nMigration complete!');
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
