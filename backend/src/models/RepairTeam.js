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

repairTeamSchema.index({ department: 1 });
repairTeamSchema.index({ isAvailable: 1 });

module.exports = mongoose.model("RepairTeam", repairTeamSchema);
