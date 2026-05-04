/**
 * MIGRATE ALL COMPLAINT CATEGORIES TO LOWERCASE
 * Run: cd backend && node scripts/migrate-categories.js
 */
require("dotenv").config();
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/smart-city";

const CATEGORY_MAP = {
  'ROAD': 'roads',
  'LIGHTING': 'lighting',
  'WASTE': 'waste',
  'WATER': 'water',
  'SAFETY': 'safety',
  'PUBLIC_PROPERTY': 'property',
  'GREEN_SPACE': 'parks',
  'OTHER': 'other',
  'TRAFFIC': 'roads',
  'URBAN_PLANNING': 'other',
  'EQUIPMENT': 'property'
};

async function migrateCategories() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const Complaint = mongoose.model("Complaint", new mongoose.Schema({}, { strict: false }));
    const Department = mongoose.model("Department", new mongoose.Schema({}, { strict: false }));

    // 1. Migrate Complaints
    const complaints = await Complaint.find({ category: { $regex: /^[A-Z_]+$/ } });
    console.log(`📋 Found ${complaints.length} complaints to migrate`);

    let updated = 0;
    for (const complaint of complaints) {
      var oldCat = complaint.category;
      var newCat = CATEGORY_MAP[oldCat];
      if (newCat && oldCat !== newCat) {
        await Complaint.updateOne({ _id: complaint._id }, { $set: { category: newCat } });
        updated++;
        console.log(`🔄 ${oldCat} → ${newCat} (${complaint._id.toString().slice(-6)})`);
      }
    }
    console.log(`✅ Updated ${updated} complaints`);

    // 2. Migrate Departments
    const departments = await Department.find({});
    console.log(`🏢 Found ${departments.length} departments to migrate`);

    let deptUpdated = 0;
    for (const dept of departments) {
      var newCategories = (dept.categories || []).map(function(cat) { 
        return CATEGORY_MAP[cat] || cat; 
      });
      if (JSON.stringify(newCategories) !== JSON.stringify(dept.categories || [])) {
        await Department.updateOne({ _id: dept._id }, { $set: { categories: newCategories } });
        deptUpdated++;
        console.log(`🏢 ${dept.name}: ${dept.categories} → ${newCategories}`);
      }
    }
    console.log(`✅ Updated ${deptUpdated} departments`);

    console.log("\n🎉 MIGRATION COMPLETE!");
    console.log("🔄 RESTART your backend server NOW");
    console.log("✅ Then refresh admin/complaints → should show proper names!");
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrateCategories();

