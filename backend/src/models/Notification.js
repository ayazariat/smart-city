const mongoose = require("mongoose");

// All notification types - comprehensive enum for validation
const NOTIFICATION_TYPES = [
  // Complaint lifecycle (lowercase)
  "submitted", "validated", "rejected", "assigned", "in_progress",
  "resolved", "closed",
  
  // Complaint lifecycle (uppercase variants - for backward compatibility)
  "SUBMITTED", "VALIDATED", "REJECTED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED",
  
  // Complaint-specific with prefix
  "complaint_submitted", "complaint_validated", "complaint_rejected",
  "complaint_assigned", "complaint_in_progress", "complaint_resolved", "complaint_closed",
  
  // Resolution workflow
  "resolution_approved", "resolution_rejected", "report_submitted", "complaint_rated",
  
  // Priority
  "priority_changed",
  
  // User interactions
  "public_note", "comment", "upvote", "upvoted", "confirm", "confirmed",
  
  // Assignment variations
  "assignment", "assigned_department", "unassigned", "new_complaint_municipality", "department_assigned",
  
  // Duplicate detection
  "duplicate_detected", "duplicate_resolved", "duplicate_merged", "complaint_merged_as_duplicate",
  
  // Technician/Manager communication
  "technician_message", "manager_warning",
  
  // System/General
  "system", "info", "warning", "error", "success",
  "welcome", "SYSTEM", "SLA_ALERT", "BLOCKAGE", "note", "blocage",
  "COMMENT", "CONFIRMATION", "CONFIRMATION_RECEIVED",
];

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // index for querying by user
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      default: "system",
      required: true,
      index: true, // index for filtering by type
    },
    message: {
      type: String,
      required: true,
      text: true, // text index for search if needed
    },
    title: {
      type: String,
      default: "Notification",
      index: true,
    },
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      index: true,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    messageKey: String,
    messageVariables: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    mergedComplaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      index: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true, // compound index with userId already covers, but add for clarity
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      expires: 0, // TTL: MongoDB auto-deletes when this date passes
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.isRead = ret.read; // alias for frontend
        // Convert ObjectIds to strings
        if (ret.userId) ret.userId = ret.userId.toString();
        if (ret.complaintId) ret.complaintId = ret.complaintId.toString();
        if (ret.relatedId) ret.relatedId = ret.relatedId.toString();
      },
    },
    toObject: {
      transform(doc, ret) {
        ret.isRead = ret.read;
      },
    },
  }
);

// Composite indexes for common queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
// TTL index is created automatically by Mongoose due to expires: 0

module.exports = mongoose.model("Notification", notificationSchema);
