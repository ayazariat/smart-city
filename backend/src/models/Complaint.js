const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ["ROAD", "LIGHTING", "WASTE", "WATER", "SAFETY", "PUBLIC_PROPERTY", "OTHER"],
      default: "OTHER",
    },
    status: {
      type: String,
      enum: [
        "SUBMITTED",
        "VALIDATED",
        "ASSIGNED",
        "IN_PROGRESS",
        "RESOLVED",
        "CLOSED",
        "REJECTED",
      ],
      default: "SUBMITTED",
    },
    priorityScore: { type: Number, default: 0 },
    urgency: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
    },
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
      commune: String,
      governorate: String,
    },
    media: [
      {
        type: { type: String, enum: ["photo", "video"] },
        url: String,
      },
    ],
    // Reference to the citizen who created the complaint
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    assignedTeam: { type: mongoose.Schema.Types.ObjectId, ref: "RepairTeam" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Complaint", complaintSchema);
