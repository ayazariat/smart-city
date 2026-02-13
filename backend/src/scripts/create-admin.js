/**
 * Script to create an admin user
 * Run: node src/scripts/create-admin.js
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

// Connect to database
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/smart-city";

mongoose.connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// User schema
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["CITIZEN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER", "TECHNICIAN", "ADMIN"], default: "CITIZEN" },
  phone: String,
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: true },
  mfaEnabled: { type: Boolean, default: false },
  refreshToken: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

async function createAdmin() {
  const adminEmail = process.argv[2] || "admin@smartcity.tn";
  const adminPassword = process.argv[3] || "Admin123!@#";
  const adminName = process.argv[4] || "System Administrator";

  try {
    // Check if admin already exists
    const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });

    if (existingUser) {
      console.log(`Admin user with email ${adminEmail} already exists.`);
      console.log(`Updating role to ADMIN...`);
      
      existingUser.role = "ADMIN";
      existingUser.isActive = true;
      existingUser.isVerified = true;
      await existingUser.save();
      
      console.log("Admin role updated successfully!");
    } else {
      // Hash password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      // Create admin user
      await User.create({
        fullName: adminName,
        email: adminEmail.toLowerCase(),
        password: hashedPassword,
        role: "ADMIN",
        phone: "+21600000000",
        isActive: true,
        isVerified: true,
      });

      console.log(`Admin user created successfully!`);
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
      console.log(`Role: ADMIN`);
    }

    console.log("\nYou can now login with these credentials.");
    process.exit(0);
  } catch (error) {
    console.error("Error creating admin user:", error);
    process.exit(1);
  }
}

createAdmin();
