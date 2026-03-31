const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["VALIDATED", "ASSIGNED", "IN_PROGRESS", "IN_PROGRESS", "RESOLVED", "CLOSED", "REJECTED", "SLA_ALERT", "COMMENT", "CONFIRMATION", "COMPLAINT", "ASSIGNMENT", "SYSTEM", "public_note", "resolved", "in_progress", "assigned", "rejected", "submitted", "upvote", "confirm"],
      default: "COMPLAINT"
    },
    title: { type: String, default: "Notification" },
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
