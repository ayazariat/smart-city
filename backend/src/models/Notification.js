const mongoose = require("mongoose");

const NOTIFICATION_TYPES = [
  // Status changes (lowercase - used by notification service)
  "submitted", "validated", "rejected", "assigned", "in_progress", 
  "resolved", "closed", "report_accepted", "report_rejected",
  
  // Status changes (uppercase - alternative)
  "VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REJECTED",
  
  // System notifications
  "welcome", "SYSTEM", "SLA_ALERT", "priority_changed",
  
  // User interactions
  "COMMENT", "CONFIRMATION", "CONFIRMATION_RECEIVED",
  "public_note", "blocage", "note",
  "upvote", "upvoted", "confirm",
  
  // Complaint related
  "COMPLAINT", "ASSIGNMENT", "complaint_submitted",
  "new_complaint_municipality", "department_assigned",
  
  // Technician related
  "technician_message", "manager_warning",
  
  // General
  "info", "warning", "error", "success"
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      default: "info"
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
