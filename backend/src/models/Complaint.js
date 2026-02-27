const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ["ROAD", "LIGHTING", "WASTE", "WATER", "SAFETY", "PUBLIC_PROPERTY", "OTHER"],
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
    // Status history for audit trail (BL-21)
    statusHistory: [{
      status: {
        type: String,
        enum: ["SUBMITTED", "VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REJECTED"],
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
    resolvedAt: Date,
    media: [
      {
        type: { type: String, enum: ["photo", "video"] },
        url: String,
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    assignedTeam: { type: mongoose.Schema.Types.ObjectId, ref: "RepairTeam" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    municipality: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Municipality',
      default: null
    },
    municipalityName: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Status transition validation (BL-21)
complaintSchema.statics.VALID_TRANSITIONS = {
  SUBMITTED: ['VALIDATED', 'REJECTED'],
  VALIDATED: ['ASSIGNED', 'REJECTED'],
  ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
  REJECTED: []
};

// Role permissions for status transitions (BL-21)
complaintSchema.statics.ROLE_PERMISSIONS = {
  CITIZEN: [],
  MUNICIPAL_AGENT: ['SUBMITTED', 'VALIDATED', 'REJECTED'],
  DEPARTMENT_MANAGER: ['VALIDATED', 'ASSIGNED', 'RESOLVED', 'CLOSED'],
  TECHNICIAN: ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED'],
  ADMIN: ['SUBMITTED', 'VALIDATED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED']
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
complaintSchema.pre('save', function(next) {
  if (this.isNew && this.status === 'SUBMITTED') {
    this.statusHistory = [{
      status: 'SUBMITTED',
      updatedAt: new Date()
    }];
  }
  next();
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

module.exports = mongoose.model("Complaint", complaintSchema);
