require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");

const testUsers = [
  {
    fullName: "Admin User",
    email: "admin@smartcity.tn",
    password: "Admin123!",
    role: "ADMIN",
    phone: "20000000",
    isVerified: true,
    isActive: true,
    municipality: "Tunis",
    municipalityName: "Tunis",
    governorate: "Tunis",
  },
  {
    fullName: "Agent Test",
    email: "agent@test.com",
    password: "test1234",
    role: "MUNICIPAL_AGENT",
    phone: "21000000",
    isVerified: true,
    isActive: true,
    municipality: "Tunis",
    municipalityName: "Tunis",
    governorate: "Tunis",
  },
  {
    fullName: "Tech Test",
    email: "tech@test.com",
    password: "test1234",
    role: "TECHNICIAN",
    phone: "22000000",
    isVerified: true,
    isActive: true,
    municipality: "Tunis",
    municipalityName: "Tunis",
    governorate: "Tunis",
  },
  {
    fullName: "Manager Test",
    email: "manager@test.com",
    password: "test1234",
    role: "DEPARTMENT_MANAGER",
    phone: "23000000",
    isVerified: true,
    isActive: true,
    municipality: "Tunis",
    municipalityName: "Tunis",
    governorate: "Tunis",
  },
  {
    fullName: "Citizen Test",
    email: "citizen@test.com",
    password: "test1234",
    role: "CITIZEN",
    phone: "24000000",
    isVerified: true,
    isActive: true,
    municipality: "Tunis",
    municipalityName: "Tunis",
    governorate: "Tunis",
  },
];

async function createTestUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/smart-city");
    console.log("Connected to MongoDB");

    for (const userData of testUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`User ${userData.email} already exists, updating...`);
        existingUser.password = await bcrypt.hash(userData.password, 10);
        existingUser.isActive = true;
        existingUser.isVerified = true;
        await existingUser.save();
        console.log(`Updated ${userData.email}`);
      } else {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        await User.create({ ...userData, password: hashedPassword });
        console.log(`Created ${userData.email}`);
      }
    }

    console.log("\nTest users ready:");
    console.log("Admin: admin@smartcity.tn / Admin123!");
    console.log("Agent: agent@test.com / test1234");
    console.log("Tech: tech@test.com / test1234");
    console.log("Manager: manager@test.com / test1234");
    console.log("Citizen: citizen@test.com / test1234");

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

createTestUsers();
