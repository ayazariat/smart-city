/**
 * Seed script for departments and municipalities
 * Run: node src/scripts/seed-departments.js
 */
require("dotenv").config();
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/smart-city";

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  phone: String,
  email: String,
  responsable: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  municipality: { type: mongoose.Schema.Types.ObjectId, ref: 'Municipality' },
}, { timestamps: true });

const municipalitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  governorate: { type: String, required: true },
  code: String,
  description: String,
  phone: String,
  email: String,
  coordinates: { latitude: Number, longitude: Number }
}, { timestamps: true });

const TUNISIA_GEOGRAPHY = {
  Ariana: ["Ariana", "Raoued", "Sidi Thabet", "La Soukra"],
  Beja: ["Beja", "Medjez El Bab", "Nefza"],
  BenArous: ["Ben Arous", "Rades", "Mornag"],
  Bizerte: ["Bizerte", "Mateur", "Ras Jebel"],
  Tunis: ["Tunis", "Carthage", "Le Bardo"]
};

const DEPARTMENTS = [
  { name: "Voirie et Infrastructure", description: "Entretien des routes et trottoirs" },
  { name: "Eclairage Public", description: "Maintenance de l'eclairage public" },
  { name: "Proprete et Environnement", description: "Collecte des dechets" },
  { name: "Espaces Verts", description: "Entretien des parcs" },
  { name: "Eau et Assainissement", description: "Gestion des canalisations" },
  { name: "Urbanisme", description: "Controle des permis" },
  { name: "Circulation", description: "Gestion des feux" },
  { name: "Services Administratifs", description: "Traitement des reclamations" }
];

async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const Department = mongoose.model("Department", departmentSchema);
    const Municipality = mongoose.model("Municipality", municipalitySchema);

    await Department.deleteMany({});
    await Municipality.deleteMany({});
    console.log("Cleared existing data");

    const municipalities = [];
    for (const [gov, towns] of Object.entries(TUNISIA_GEOGRAPHY)) {
      for (const town of towns) {
        const m = await Municipality.create({ name: town, governorate: gov });
        municipalities.push(m);
      }
    }
    console.log(`Created ${municipalities.length} municipalities`);

    const departments = [];
    for (const dept of DEPARTMENTS) {
      const d = await Department.create({ ...dept, municipality: municipalities[0]._id });
      departments.push(d);
    }
    console.log(`Created ${departments.length} departments`);

    console.log("\n=== Seed Complete ===");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

seedDatabase();
