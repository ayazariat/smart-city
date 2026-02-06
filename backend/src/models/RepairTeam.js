const mongoose = require("mongoose");

const repairTeamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("RepairTeam", repairTeamSchema);
