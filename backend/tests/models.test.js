const mongoose = require("mongoose");

// Import models
const User = require("./src/models/User");
const Department = require("./src/models/Department");
const RepairTeam = require("./src/models/RepairTeam");
const Complaint = require("./src/models/Complaint");
const Comment = require("./src/models/Comment");
const Notification = require("./src/models/Notification");
const Confirmation = require("./src/models/Confirmation");

// Connect to MongoDB
mongoose
  .connect("mongodb://127.0.0.1:27017/smartcitydb")
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.log("❌ MongoDB connection error:", err));

async function runTests() {
  try {
    // Clear collections (optional)
    await User.deleteMany();
    await Department.deleteMany();
    await RepairTeam.deleteMany();
    await Complaint.deleteMany();
    await Comment.deleteMany();
    await Notification.deleteMany();
    await Confirmation.deleteMany();

    // Create a user
    const user = await User.create({
      fullName: "John Doe",
      email: "john@example.com",
      password: "securepassword123",
      role: "CITIZEN",
      phone: "+1234567890",
    });

    console.log("User created:", user);

    // Create a department
    const department = await Department.create({
      name: "Road Maintenance",
      description: "Handles all road-related issues",
      email: "road@city.gov",
      phone: "+1987654321",
    });

    console.log("Department created:", department);

    // Create a repair team
    const repairTeam = await RepairTeam.create({
      name: "Team A",
      members: [user._id],
      department: department._id,
    });

    console.log("RepairTeam created:", repairTeam);

    // Create a complaint
    const complaint = await Complaint.create({
      title: "Broken Street Light",
      description: "The lamp near my house is not working",
      category: "LIGHTING",
      status: "SUBMITTED",
      priorityScore: 5,
      location: {
        latitude: 40.7128,
        longitude: -74.006,
        address: "123 Main St, City",
      },
      photos: ["photo1.jpg"],
      videos: [],
      createdBy: user._id,
      assignedDepartment: department._id,
      assignedTeam: repairTeam._id,
    });

    console.log("Complaint created:", complaint);

    // Add a comment
    const comment = await Comment.create({
      content: "Please fix this ASAP",
      author: user._id,
      complaint: complaint._id,
    });

    console.log("Comment created:", comment);

    // Create a notification
    const notification = await Notification.create({
      message: "Your complaint has been submitted",
      recipient: user._id,
      complaint: complaint._id,
    });

    console.log("Notification created:", notification);

    // Add a confirmation
    const confirmation = await Confirmation.create({
      type: "ME_TOO",
      confirmedBy: user._id,
      complaint: complaint._id,
    });

    console.log("Confirmation created:", confirmation);
  } catch (err) {
    console.error("❌ Test error:", err);
  } finally {
    mongoose.connection.close();
  }
}

runTests();
