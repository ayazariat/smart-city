const mongoose = require("mongoose");

const confirmationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["ME_TOO", "UPVOTE"],
      required: true,
    },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Confirmation", confirmationSchema);
