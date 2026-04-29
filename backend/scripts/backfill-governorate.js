// Backfill governorate field on existing complaints
// Run: mongosh smart-city backend/scripts/backfill-governorate.js

const MUNICIPALITY_TO_GOVERNORATE = {
  ariana: "Ariana",
  raoued: "Ariana",
  "sidi thabet": "Ariana",
  "la soukra": "Ariana",
  ettadhamen: "Ariana",
  mnihla: "Ariana",

  bembla: "Monastir",
  "beni khiar": "Nabeul",
  "beni khiyar": "Nabeul",

  tunis: "Tunis",
  "tunis ville": "Tunis",
  "le bardo": "Tunis",

  sfax: "Sfax",
  sousse: "Sousse",
  nabeul: "Nabeul",
  bizerte: "Bizerte",
  monastir: "Monastir",
  mahdia: "Mahdia",

  hammamet: "Nabeul",
  kelibia: "Nabeul",
  "menzel temime": "Nabeul",
  "dar chaabane": "Nabeul",
  "dar chaabane el fehri": "Nabeul",

  "ben arous": "Ben Arous",
  rades: "Ben Arous",
  "el mourouj": "Ben Arous",
  mourouj: "Ben Arous",

  manouba: "Manouba",
  kairouan: "Kairouan",
  gabes: "Gab\u00e8s",
  medenine: "M\u00e9denine",
  gafsa: "Gafsa",
  jendouba: "Jendouba",
  kasserine: "Kasserine",
  beja: "B\u00e9ja",
  kebili: "K\u00e9bili",
  "le kef": "Le Kef",
  "sidi bouzid": "Sidi Bouzid",
  siliana: "Siliana",
  tataouine: "Tataouine",
  tozeur: "Tozeur",
  zaghouan: "Zaghouan",
};

function normalize(value) {
  return (value || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function resolveMunicipality(complaint) {
  return (
    complaint.municipalityName ||
    complaint.location?.municipality ||
    complaint.municipality?.name ||
    ""
  );
}

const missingGovernorateQuery = {
  $or: [
    { governorate: null },
    { governorate: "" },
    { governorate: { $exists: false } },
  ],
};

let updated = 0;
let skipped = 0;
const unmatchedMunicipalities = new Set();

print("Scanning complaints without governorate...");

db.complaints.find(missingGovernorateQuery).forEach((complaint) => {
  const municipality = resolveMunicipality(complaint);
  const normalizedMunicipality = normalize(municipality);
  const governorate = MUNICIPALITY_TO_GOVERNORATE[normalizedMunicipality] || null;

  if (!governorate) {
    skipped += 1;
    if (municipality) {
      unmatchedMunicipalities.add(municipality);
    }
    return;
  }

  db.complaints.updateOne(
    { _id: complaint._id },
    { $set: { governorate } }
  );

  updated += 1;
  print(`Updated: ${municipality} -> ${governorate}`);
});

print(`\nBackfilled ${updated} complaints`);
print(`Skipped ${skipped} complaints`);

if (unmatchedMunicipalities.size > 0) {
  print("\nUnmatched municipalities:");
  Array.from(unmatchedMunicipalities)
    .sort((a, b) => a.localeCompare(b))
    .forEach((name) => print(`- ${name}`));
}

print("\nGovernorate distribution:");
printjson(
  db.complaints
    .aggregate([
      { $group: { _id: "$governorate", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ])
    .toArray()
);
