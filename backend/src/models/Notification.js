const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "REJECTED", "SLA_ALERT", "COMMENT", "CONFIRMATION", "COMPLAINT", "ASSIGNMENT", "SYSTEM"]
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint" },
    relatedId: { type: mongoose.Schema.Types.ObjectId },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index for efficient querying
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
