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
    name: "Roads & Infrastructure", 
    description: "Roads, sidewalks, and infrastructure maintenance",
    categories: ["ROAD"]
  },
  { 
    name: "Public Lighting", 
    description: "Streetlights and public area electrical maintenance",
    categories: ["LIGHTING"]
  },
  { 
    name: "Waste Management", 
    description: "Garbage collection and street cleaning",
    categories: ["WASTE"]
  },
  { 
    name: "Parks & Green Spaces", 
    description: "Parks, trees, and green space maintenance",
    categories: ["GREEN_SPACE"]
  },
  { 
    name: "Water & Sanitation", 
    description: "Water leaks, sewage, and local flooding",
    categories: ["WATER"]
  },
  { 
    name: "Traffic & Road Signage", 
    description: "Traffic lights, road signs, and markings",
    categories: ["TRAFFIC"]
  },
  { 
    name: "Urban Planning", 
    description: "Illegal construction, public space permits",
    categories: ["URBAN_PLANNING", "PUBLIC_PROPERTY"]
  },
  { 
    name: "Public Equipment", 
    description: "Benches, bus stops, playground equipment",
    categories: ["EQUIPMENT"]
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
