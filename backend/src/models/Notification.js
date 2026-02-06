const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Notification", notificationSchema);
