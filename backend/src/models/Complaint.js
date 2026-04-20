const mongoose = require("mongoose");

// Get SLA status with detailed info
function getSlaStatus(deadline, createdAt, status) {
  if (!deadline || status === 'RESOLVED' || status === 'CLOSED') {
    return { status: 'COMPLETED', progress: 100, remainingHours: 0, isOverdue: false, isAtRisk: false, deadline };
  }
  
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const created = createdAt ? new Date(createdAt) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const totalMs = deadlineDate - created;
  const elapsedMs = now - created;
  
  if (totalMs <= 0) {
    return { status: 'OVERDUE', progress: 100, remainingHours: 0, isOverdue: true, isAtRisk: false, deadline: deadlineDate };
  }
  
  const progress = Math.min(100, (elapsedMs / totalMs) * 100);
  const remainingHours = Math.max(0, (deadlineDate - now) / (1000 * 60 * 60));
  const isOverdue = now > deadlineDate;
  const isAtRisk = progress >= 80 && !isOverdue;
  
  let slaStatusValue = 'ON_TRACK';
  if (isOverdue) {
    slaStatusValue = 'OVERDUE';
  } else if (isAtRisk) {
    slaStatusValue = 'AT_RISK';
  }
  
  return {
    status: slaStatusValue,
    progress: Math.round(progress),
    remainingHours: Math.round(remainingHours * 10) / 10,
    isOverdue,
    isAtRisk,
    deadline: deadlineDate,
  };
}

const complaintSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ["WASTE", "ROAD", "LIGHTING", "WATER", "SAFETY", "PUBLIC_PROPERTY", "GREEN_SPACE", "OTHER"],
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
        "ARCHIVED",
      ],
      default: "SUBMITTED",
    },
    // Status history for audit trail (BL-21)
    statusHistory: [{
      status: {
        type: String,
        enum: ["SUBMITTED", "VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REJECTED", "ARCHIVED"],
        required: true
      },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      updatedAt: { type: Date, default: Date.now },
      notes: String
    }],
    priorityScore: { type: Number, default: 0 },
    urgency: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
      address: String,
      commune: String,
      governorate: String,
      municipality: String,
    },
    isAnonymous: { type: Boolean, default: false },
    ownerName: { type: String },
    keywords: [{ type: String }],
    rejectionReason: String,
    resolutionNotes: String,
    resolvedAt: Date,
    media: [
      {
        type: { type: String, enum: ["photo", "video"] },
        url: String,
      },
    ],
    // Photos taken by technician before starting work
    beforePhotos: [
      {
        type: { type: String, enum: ["photo", "video"] },
        url: String,
        takenAt: { type: Date, default: Date.now },
        takenBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    // Photos taken by technician after completing work
    afterPhotos: [
      {
        type: { type: String, enum: ["photo", "video"] },
        url: String,
        takenAt: { type: Date, default: Date.now },
        takenBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    assignedTeam: { type: mongoose.Schema.Types.ObjectId, ref: "RepairTeam" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    comments: [{
      text: String,
      author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      authorName: String,
      authorRole: String,
      type: { type: String, enum: ["NOTE", "BLOCAGE", "PUBLIC"], default: "NOTE" },
      isInternal: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now }
    }],
    municipality: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Municipality',
      default: null
    },
    municipalityName: {
      type: String,
      default: "",
    },
    governorate: {
      type: String,
      default: "",
    },
    municipalityNormalized: {
      type: String,
      index: true,
      default: "",
    },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // SLA fields
    slaDeadline: { type: Date },
    slaStatus: { type: String, enum: ['ON_TRACK', 'AT_RISK', 'OVERDUE', 'COMPLETED'], default: 'ON_TRACK' },
    // Resolution tracking
    resolutionNote: String,
    proofPhotos: [String],
    materialsUsed: [String],
    resolutionTimeHours: Number,
    // Validation/rejection tracking
    validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    validatedAt: Date,
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectedAt: Date,
    // Assignment tracking
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedAt: Date,
    startedAt: Date,
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    closedAt: Date,
    // Rating
    rating: {
      score: { type: Number, min: 1, max: 5 },
      comment: String,
      createdAt: Date
    },
    // Report viewing tracking
    reportSubmittedAt: { type: Date },
    reportViewedAt: { type: Date },
    resolutionRejectionReason: String,
    // Reference ID for display
    referenceId: String,
    // Citizen confirmations (BL-28)
    confirmations: [{
      citizenId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      confirmedAt: { type: Date, default: Date.now }
    }],
    confirmationCount: { type: Number, default: 0, min: 0 },
    // Citizen upvotes (BL-28)
    upvotes: [{
      citizenId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      upvotedAt: { type: Date, default: Date.now }
    }],
    upvoteCount: { type: Number, default: 0, min: 0 },
    // View tracking
    viewsCount: { type: Number, default: 0, min: 0 },
    // AI fields for BL-24, BL-25, BL-37
    aiUrgencyPrediction: { type: Object, default: null },
    aiPredictedUrgency: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', null], default: null },
    aiDuplicateCheck: { type: Object, default: null },
    duplicateStatus: { type: String, enum: ['NOT_DUPLICATE', 'POSSIBLE_DUPLICATE', 'PROBABLE_DUPLICATE', 'CONFIRMED_DUPLICATE', null], default: null },
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', default: null },
    finalUrgencyHuman: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', null], default: null },
  },
  { timestamps: true }
);

// Status transition validation (BL-21)
complaintSchema.statics.VALID_TRANSITIONS = {
  SUBMITTED: ['VALIDATED', 'REJECTED'],
  VALIDATED: ['ASSIGNED'],          // AGENT assigns to department
  ASSIGNED: ['IN_PROGRESS'],        // TECH starts work
  IN_PROGRESS: ['RESOLVED'],       // TECH resolves
  RESOLVED: ['CLOSED'],            // AGENT closes
  CLOSED: ['ARCHIVED'],
  ARCHIVED: [],
  REJECTED: []                     // AGENT can reopen via separate endpoint
};

// Role permissions for status transitions (Agent-Centric Workflow)
complaintSchema.statics.ROLE_PERMISSIONS = {
  CITIZEN: [],                                    // Citizens cannot change status
  MUNICIPAL_AGENT: ['VALIDATED', 'REJECTED', 'ASSIGNED', 'CLOSED'],  // AGENT centralizes workflow
  DEPARTMENT_MANAGER: ['ASSIGNED'],               // Can assign but primary is AGENT
  TECHNICIAN: ['IN_PROGRESS', 'RESOLVED'],        // TECH handles assigned → resolved
  ADMIN: ['VALIDATED', 'REJECTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']  // Full access
};

// Method to update status with history
complaintSchema.methods.updateStatus = function(newStatus, userId, notes = '') {
  const currentStatus = this.status;
  const validTransitions = this.constructor.VALID_TRANSITIONS;
  
  // Check if transition is valid
  if (!validTransitions[currentStatus]?.includes(newStatus)) {
    throw new Error(`Invalid transition from ${currentStatus} to ${newStatus}`);
  }
  
  // Add to status history
  this.statusHistory.push({
    status: newStatus,
    updatedBy: userId,
    notes: notes
  });
  
  // Update status
  this.status = newStatus;
  
  // Set resolvedAt for RESOLVED status
  if (newStatus === 'RESOLVED') {
    this.resolvedAt = new Date();
  }
  
  return this.save();
};

// Pre-save hook to initialize status history
complaintSchema.pre('save', async function() {
  if (this.isNew && this.status === 'SUBMITTED') {
    this.statusHistory = [{
      status: 'SUBMITTED',
      updatedBy: this.createdBy,
      updatedAt: new Date()
    }];
  }
});

// Indexes for performance
complaintSchema.index({ createdBy: 1 });
complaintSchema.index({ assignedDepartment: 1 });
complaintSchema.index({ assignedTo: 1 });
complaintSchema.index({ municipality: 1 });
complaintSchema.index({ municipalityName: 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ location: "2dsphere" });
complaintSchema.index({ isArchived: 1 });

// Method to calculate SLA status - now uses category-based config
complaintSchema.methods.calculateSLAStatus = function() {
  if (!this.slaDeadline || this.status === 'RESOLVED' || this.status === 'CLOSED') {
    return { status: 'COMPLETED', progress: 100, remainingHours: 0, isOverdue: false, isAtRisk: false };
  }
  
  return getSlaStatus(this.slaDeadline, this.createdAt, this.status);
};

// Pre-save hook to update SLA status
complaintSchema.pre('save', async function() {
  if (this.slaDeadline) {
    // If complaint is resolved or closed, mark SLA as completed
    if (this.status === 'RESOLVED' || this.status === 'CLOSED') {
      this.slaStatus = 'COMPLETED';
    } else {
      const slaStatus = this.calculateSLAStatus();
      this.slaStatus = slaStatus.status;
    }
  }
});

module.exports = mongoose.model("Complaint", complaintSchema);
