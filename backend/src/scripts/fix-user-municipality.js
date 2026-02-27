/**
 * Script to fix user municipality field using raw MongoDB
 * Run: node src/scripts/fix-user-municipality.js
 */
require("dotenv").config();
const mongoose = require("mongoose");

// Connect to database
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/smart-city";

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Fix all users with empty string municipality using raw MongoDB update
    const result = await usersCollection.updateMany(
      { municipality: "" },
      { $set: { municipality: null } }
    );
    
    console.log(`Fixed ${result.modifiedCount} users with empty municipality`);
    
    console.log("\nDone! Users fixed successfully.");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error fixing users:", error);
    process.exit(1);
  }
}

main();
