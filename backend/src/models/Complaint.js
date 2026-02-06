const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ["ROAD", "LIGHTING", "WASTE", "WATER", "OTHER"],
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
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
    },
    photos: [String],
    videos: [String],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    assignedTeam: { type: mongoose.Schema.Types.ObjectId, ref: "RepairTeam" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Complaint", complaintSchema);
