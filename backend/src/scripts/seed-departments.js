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
  { 
    name: "Déchets et Propreté", 
    description: "Poubelles, bennes débordantes, décharges illégales, nettoyage des rues",
    categories: ["waste"],
    phone: "+216 71 234 567",
    email: "dechets@smartcity.tn"
  },
  { 
    name: "Routes et Circulation", 
    description: "Routes endommagées, trottoirs, stationnement, signalisation",
    categories: ["roads"],
    phone: "+216 71 234 568",
    email: "routes@smartcity.tn"
  },
  { 
    name: "Éclairage public", 
    description: "Lampadaires cassés, rues sombres, éclairage instable",
    categories: ["lighting"],
    phone: "+216 71 234 569",
    email: "eclairage@smartcity.tn"
  },
  { 
    name: "Eau et Drainage", 
    description: "Fuites, zones inondées, canalisations bouchées, eaux usées",
    categories: ["water"],
    phone: "+216 71 234 570",
    email: "eau@smartcity.tn"
  },
  { 
    name: "Sécurité et Bruit", 
    description: "Situations dangereuses, accidents, bruit, zones à risque",
    categories: ["safety"],
    phone: "+216 71 234 571",
    email: "securite@smartcity.tn"
  },
  { 
    name: "Propriété publique", 
    description: "Bâtiments municipaux, mobilier urbain, monuments",
    categories: ["property"],
    phone: "+216 71 234 572",
    email: "propriete@smartcity.tn"
  },
  { 
    name: "Parcs et Espaces verts", 
    description: "Parcs, jardins, arbres, entretien des espaces verts",
    categories: ["parks"],
    phone: "+216 71 234 573",
    email: "parcs@smartcity.tn"
  },
  { 
    name: "Services Généraux", 
    description: "Tout ce qui ne correspond pas aux autres catégories",
    categories: ["other"],
    phone: "+216 71 234 574",
    email: "general@smartcity.tn"
  }
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
