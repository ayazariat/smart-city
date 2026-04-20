// Backfill governorate field on existing complaints
// Run: mongosh smart-city backend/scripts/backfill-governorate.js

const map = {
  "Ariana": "Ariana", "Raoued": "Ariana", "Sidi Thabet": "Ariana", "La Soukra": "Ariana", "Ettadhamen": "Ariana", "Mnihla": "Ariana",
  "Bembla": "Monastir", "Beni Khiar": "Nabeul", "Béni Khiar": "Nabeul",
  "Tunis": "Tunis", "Tunis Ville": "Tunis", "Le Bardo": "Tunis",
  "Sfax": "Sfax", "Sousse": "Sousse", "Nabeul": "Nabeul", "Bizerte": "Bizerte", "Monastir": "Monastir",
  "Hammamet": "Nabeul", "Kelibia": "Nabeul", "Menzel Temime": "Nabeul", "Dar Chaâbane": "Nabeul",
  "Ben Arous": "Ben Arous", "Radès": "Ben Arous", "Mourouj": "Ben Arous",
  "Manouba": "Manouba", "Kairouan": "Kairouan", "Gabès": "Gabès", "Médenine": "Médenine",
  "Gafsa": "Gafsa", "Jendouba": "Jendouba", "Kasserine": "Kasserine", "Béja": "Béja",
  "Kébili": "Kébili", "Le Kef": "Le Kef", "Mahdia": "Mahdia", "Sidi Bouzid": "Sidi Bouzid",
  "Siliana": "Siliana", "Tataouine": "Tataouine", "Tozeur": "Tozeur", "Zaghouan": "Zaghouan"
};

let updated = 0;
db.complaints.find({ $or: [{ governorate: null }, { governorate: "" }, { governorate: { $exists: false } }] }).forEach(c => {
  const mun = (c.municipalityName || "").trim();
  const gov = map[mun] || null;
  if (gov) {
    db.complaints.updateOne({ _id: c._id }, { $set: { governorate: gov } });
    updated++;
    print("  Updated: " + mun + " -> " + gov);
  }
});
print("\nBackfilled " + updated + " complaints");
print("\nGovernorate distribution:");
printjson(db.complaints.aggregate([{ $group: { _id: "$governorate", count: { $sum: 1 } } }]).toArray());
