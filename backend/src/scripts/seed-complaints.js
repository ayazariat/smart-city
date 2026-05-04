/**
 * Seed script for sample complaints with mixed categories/statuses
 * Run: cd backend && node src/scripts/seed-complaints.js
 * Creates 30 complaints across all categories, various statuses, images from uploads
 */
require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/smart-city";

const Complaint = require("../models/Complaint");
const Department = require("../models/Department");
const Municipality = require("../models/Municipality");

// Sample images from uploads dir
const SAMPLE_IMAGES = [
  "backend/uploads/0b1b4ccb-e7c8-4c5e-b0df-2216d4e5e61a.png",
  "backend/uploads/30c0caa3-c107-4bc9-857f-b6dbde720936.png",
  "backend/uploads/838a0a09-eef5-4eb0-be9b-54680eacc6d9.png",
  "backend/uploads/e38ca0ce-c610-4a74-808c-1267c49fb3a7.png",
  "backend/uploads/f03aade2-97c7-4025-8ba4-df1d9561ad90.png",
  "backend/uploads/2344c953-079f-4783-8f62-924134f7ec43.jfif"
];

const CATEGORIES = ["waste", "roads", "lighting", "water", "safety", "property", "parks", "other"];
const STATUSES = ["SUBMITTED", "VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED"];
const MUNICIPALITIES = ["Tunis", "Ariana", "Carthage", "Le Bardo"];

const SAMPLE_COMPLAINTS = [
  { title: "Poubelle débordante rue principale", description: "Benna pleine depuis 3 jours", category: "waste", municipalityName: "Tunis" },
  { title: "Trottoir endommagé avenue Habib Bourguiba", description: "Dangereux pour piétons", category: "roads", municipalityName: "Tunis" },
  { title: "Lampadaire cassé croisement rue 1 et 2", description: "Rue sombre la nuit", category: "lighting", municipalityName: "Ariana" },
  { title: "Fuite d'eau chaussée", description: "Eau stagnante depuis 2 jours", category: "water", municipalityName: "Carthage" },
  { title: "Bruit excessif chantier nuit", description: "Impossible de dormir", category: "safety", municipalityName: "Le Bardo" },
  { title: "Banc public cassé parc central", description: "Mobilier urbain dégradé", category: "property", municipalityName: "Tunis" },
  { title: "Arbre tombé espace vert", description: "Danger pour passants", category: "parks", municipalityName: "Ariana" },
  { title: "Problème signalisation non classé", description: "Autre problème", category: "other", municipalityName: "Carthage" },
  // Add more for 30 total...
];

async function seedComplaints() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing complaints
    const deleted = await Complaint.deleteMany({});
    console.log(`🗑️  Deleted ${deleted.deletedCount} complaints`);

    const departments = await Department.find({});
    const municipalities = await Municipality.find({});

    if (departments.length === 0) {
      console.log("⚠️ No departments found. Run seed-departments.js first.");
      return;
    }

    const complaintsData = [];
    const statuses = ["SUBMITTED", "VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];

    for (let i = 0; i < 30; i++) {
      const catIndex = i % CATEGORIES.length;
      const dept = departments[catIndex % departments.length];
      const mun = municipalities[Math.floor(i / 5) % municipalities.length];

      complaintsData.push({
        title: `Complaint #${i + 1} - ${CATEGORIES[catIndex]}`,
        description: `Description pour catégorie ${CATEGORIES[catIndex]}. Localisation: ${mun.name}, ${mun.governorate}.`,
        category: CATEGORIES[catIndex],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        assignedDepartment: { id: dept._id, name: dept.name },
        municipality: mun._id,
        municipalityName: mun.name,
        governorate: mun.governorate,
        location: {
          type: "Point",
          coordinates: [mun.coordinates?.longitude || 10.165, mun.coordinates?.latitude || 36.8065],
          address: `${mun.name} - Test address`,
          municipality: mun.name
        },
        media: [{
          type: "photo",
          url: SAMPLE_IMAGES[Math.floor(Math.random() * SAMPLE_IMAGES.length)]
        }],
        urgency: ["LOW", "MEDIUM", "HIGH", "URGENT"][Math.floor(Math.random() * 4)],
        priorityScore: Math.floor(Math.random() * 20) + 1,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
        referenceId: `RC${String(i + 1000).padStart(4, '0')}`,
        confirmationCount: Math.floor(Math.random() * 5),
        upvoteCount: Math.floor(Math.random() * 10)
      });
    }

    const created = await Complaint.insertMany(complaintsData);
    console.log(`✅ Created ${created.length} sample complaints`);

    // Stats verification
    const stats = await Complaint.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log("\n📊 Category Stats:", stats);

    const statusStats = await Complaint.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    console.log("📊 Status Stats:", statusStats);

    console.log("\n🎉 Seed complete! Stats endpoints should now show data.");
    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

seedComplaints();

