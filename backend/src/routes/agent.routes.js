const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const Complaint = require("../models/Complaint");
const User = require("../models/User");
const Department = require("../models/Department");
const { normalizeMunicipality } = require("../utils/normalize");
const notificationService = require("../services/notification.service");

// All agent routes require authentication and MUNICIPAL_AGENT role

// Get agent's municipality from user profile
async function getAgentMunicipality(userId) {
  const user = await User.findById(userId)
    .populate('municipality', 'name governorate')
    .select("municipality municipalityName governorate");
  
  // Get municipality name from either populated municipality or municipalityName field
  let municipalityName = user?.municipalityName || "";
  
  // If municipality is populated, use its name
  if (user?.municipality && typeof user.municipality === 'object') {
    municipalityName = user.municipality.name || municipalityName;
  }
  
  return {
    ...user?.toObject(),
    municipalityName,
  };
}

// GET /api/agent/complaints - Get complaints for agent's municipality
router.get("/complaints", authenticate, authorize("MUNICIPAL_AGENT"), async (req, res) => {
  try {
    const user = await getAgentMunicipality(req.user.userId);
    const userMunicipality = normalizeMunicipality(user?.municipalityName || req.user.municipalityName || "");

    const { status, category, page = 1, limit = 50 } = req.query;

    if (!userMunicipality) {
      return res.status(400).json({ message: "Municipality not configured for this user" });
    }

    // Create case-insensitive regex for municipality matching
    const munRegex = new RegExp("^" + userMunicipality.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "$", "i");

    // Build query with MongoDB regex for municipality fields
    const query = {
      $or: [
        { municipalityNormalized: userMunicipality },
        { municipalityName: munRegex },
        { "location.municipality": munRegex }
      ],
      isArchived: { $ne: true }
    };

    // Apply status filter
    if (status && status !== "ALL") {
      if (status.includes(",")) {
        query.status = { $in: status.split(",") };
      } else {
        query.status = status;
      }
    }

    // Apply category filter
    if (category) {
      query.category = category;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .populate("createdBy", "fullName email")
        .populate("assignedTo", "fullName")
        .populate("assignedDepartment", "name")
        .populate("municipality", "name governorate")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Complaint.countDocuments(query)
    ]);

    // Calculate SLA status for each complaint on the fly
    const complaintsResponse = complaints.map(c => {
      const complaint = c.toObject();
      if (complaint.slaDeadline && !['RESOLVED', 'CLOSED'].includes(complaint.status)) {
        const now = new Date();
        const deadline = new Date(complaint.slaDeadline);
        const created = new Date(complaint.createdAt);
        const totalMs = deadline - created;
        const elapsedMs = now - created;
        
        if (totalMs > 0) {
          const progress = (elapsedMs / totalMs) * 100;
          if (progress >= 100) complaint.slaStatus = 'OVERDUE';
          else if (progress >= 80) complaint.slaStatus = 'AT_RISK';
          else complaint.slaStatus = 'ON_TRACK';
        } else {
          complaint.slaStatus = 'OVERDUE';
        }
      }
      return complaint;
    });

    res.json({
      success: true,
      message: "Complaints fetched successfully",
      data: {
        complaints: complaintsResponse,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        municipalityName: user.municipalityName || userMunicipality
      },
    });
  } catch (error) {
    console.error("Error fetching agent complaints:", error);
    res.status(500).json({ message: "Failed to fetch complaints" });
  }
});

// GET /api/agent/queue - Get pending complaints in agent's municipality queue
router.get("/queue", authenticate, authorize("MUNICIPAL_AGENT"), async (req, res) => {
  try {
    const user = await getAgentMunicipality(req.user.userId);
    const userMunicipality = normalizeMunicipality(user?.municipalityName || req.user.municipalityName || "");

    if (!userMunicipality) {
      return res.status(400).json({ message: "Municipality not configured" });
    }

    const allComplaints = await Complaint.find({})
      .populate("createdBy", "fullName email phone")
      .populate("assignedDepartment", "name")
      .sort({ createdAt: -1 });

    const complaints = allComplaints.filter(c => {
      const cMun = normalizeMunicipality(c.municipalityName || c.municipality?.name || "");
      const cMunLoc = normalizeMunicipality(c.location?.municipality || "");
      return (cMun === userMunicipality || cMunLoc === userMunicipality) && ["SUBMITTED", "VALIDATED"].includes(c.status);
    });

    res.json(complaints);
  } catch (error) {
    console.error("Error fetching agent queue:", error);
    res.status(500).json({ message: "Failed to fetch queue" });
  }
});

// PUT /api/agent/complaints/:id/validate - Validate a complaint
router.put("/complaints/:id/validate", authenticate, authorize("MUNICIPAL_AGENT"), async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const user = await getAgentMunicipality(req.user.userId);
    const userMunicipality = normalizeMunicipality(user?.municipalityName || req.user.municipalityName || "");
    const complaintMunicipality = complaint.municipalityNormalized || normalizeMunicipality(complaint.municipalityName || complaint.municipality?.name || complaint.location?.municipality || "");

    if (userMunicipality !== complaintMunicipality) {
      return res.status(403).json({ message: "Complaint does not belong to your municipality" });
    }

    if (complaint.status !== "SUBMITTED") {
      return res.status(400).json({ message: "Only SUBMITTED complaints can be validated" });
    }

    complaint.status = "VALIDATED";
    complaint.validatedAt = new Date();
    complaint.validatedBy = req.user.userId;
    
    // Add to status history
    if (!complaint.statusHistory) complaint.statusHistory = [];
    complaint.statusHistory.push({
      status: "VALIDATED",
      updatedBy: req.user.userId,
      updatedAt: new Date()
    });
    
    await complaint.save();

    // Notify citizen that complaint was validated (don't fail if notification fails)
    if (complaint.createdBy) {
      try {
        await notificationService.sendNotification(req.app?.get?.('io'), complaint.createdBy, {
          type: "validated",
          title: "Complaint Validated",
          message: `Your complaint "${complaint.title}" has been validated and is being processed.`,
          complaintId: complaint._id,
        });
      } catch (notifError) {
        console.error("Failed to notify citizen:", notifError);
      }
    }

    res.json({ success: true, message: "Complaint validated successfully", data: complaint });
  } catch (error) {
    console.error("Error validating complaint:", error);
    res.status(500).json({ message: "Failed to validate complaint" });
  }
});

// PUT /api/agent/complaints/:id/reject - Reject a complaint
router.put("/complaints/:id/reject", authenticate, authorize("MUNICIPAL_AGENT"), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const user = await getAgentMunicipality(req.user.userId);
    const userMunicipality = normalizeMunicipality(user?.municipalityName || req.user.municipalityName || "");
    const complaintMunicipality = complaint.municipalityNormalized || normalizeMunicipality(complaint.municipalityName || complaint.municipality?.name || complaint.location?.municipality || "");

    if (userMunicipality !== complaintMunicipality) {
      return res.status(403).json({ message: "Complaint does not belong to your municipality" });
    }

    if (complaint.status !== "SUBMITTED") {
      return res.status(400).json({ message: "Only SUBMITTED complaints can be rejected" });
    }

    complaint.status = "REJECTED";
    complaint.rejectionReason = reason;
    complaint.rejectedAt = new Date();
    complaint.rejectedBy = req.user.userId;
    
    // Add to status history
    if (!complaint.statusHistory) complaint.statusHistory = [];
    complaint.statusHistory.push({
      status: "REJECTED",
      updatedBy: req.user.userId,
      updatedAt: new Date(),
      notes: reason
    });
    
    await complaint.save();

    // Notify citizen that complaint was rejected (don't fail if notification fails)
    if (complaint.createdBy) {
      try {
        await notificationService.sendNotification(req.app?.get?.('io'), complaint.createdBy, {
          type: "rejected",
          title: "Complaint Rejected",
          message: `Your complaint "${complaint.title}" has been rejected. Reason: ${reason}`,
          complaintId: complaint._id,
        });
      } catch (notifError) {
        console.error("Failed to notify citizen:", notifError);
      }
    }

    res.json({ success: true, message: "Complaint rejected", data: complaint });
  } catch (error) {
    console.error("Error rejecting complaint:", error);
    res.status(500).json({ message: "Failed to reject complaint" });
  }
});

// PUT /api/agent/complaints/:id/close - Close a resolved complaint (REQUIRES resolution report review)
router.put("/complaints/:id/close", authenticate, authorize("MUNICIPAL_AGENT"), async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate("assignedTo", "fullName")
      .populate("beforePhotos.takenBy", "fullName")
      .populate("afterPhotos.takenBy", "fullName");

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const user = await getAgentMunicipality(req.user.userId);
    const userMunicipality = normalizeMunicipality(user?.municipalityName || req.user.municipalityName || "");
    const complaintMunicipality = complaint.municipalityNormalized || normalizeMunicipality(complaint.municipalityName || complaint.municipality?.name || complaint.location?.municipality || "");

    if (userMunicipality !== complaintMunicipality) {
      return res.status(403).json({ message: "Complaint does not belong to your municipality" });
    }

    if (complaint.status !== "RESOLVED") {
      return res.status(400).json({ message: "Only RESOLVED complaints can be closed" });
    }

    // Check if resolution report exists
    const hasResolutionReport = complaint.resolutionNotes || 
                                 (complaint.afterPhotos && complaint.afterPhotos.length > 0);
    
    if (!hasResolutionReport) {
      return res.status(400).json({ 
        message: "Resolution report required. Technician must submit resolution notes or proof photos before closing.",
        requiresResolutionReport: true 
      });
    }

    // Mark report as viewed by agent
    complaint.reportViewedAt = new Date();
    await complaint.save();
    
    // Return resolution report for agent to review
    res.json({ 
      success: true, 
      message: "Resolution report available for review",
      data: {
        complaint,
        resolutionReport: {
          technicianName: complaint.assignedTo?.fullName || "Unknown",
          resolvedAt: complaint.resolvedAt,
          resolutionNotes: complaint.resolutionNotes,
          beforePhotos: complaint.beforePhotos || [],
          afterPhotos: complaint.afterPhotos || [],
        }
      },
      requiresApproval: true
    });
  } catch (error) {
    console.error("Error reviewing resolution:", error);
    res.status(500).json({ message: "Failed to review resolution" });
  }
});

// PUT /api/agent/complaints/:id/assign-department - Assign complaint to department
router.put("/complaints/:id/assign-department", authenticate, authorize("MUNICIPAL_AGENT"), async (req, res) => {
  try {
    const { departmentId } = req.body;

    if (!departmentId) {
      return res.status(400).json({ success: false, message: "Department ID is required" });
    }

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Verify department exists
    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    complaint.assignedDepartment = departmentId;
    
    // If status is VALIDATED and we're assigning department, change to ASSIGNED
    // This is the correct workflow: VALIDATED → department assigned → ASSIGNED (ready for technician)
    if (complaint.status === "VALIDATED") {
      complaint.status = "ASSIGNED";
      if (!complaint.statusHistory) complaint.statusHistory = [];
      complaint.statusHistory.push({
        status: "ASSIGNED",
        updatedBy: req.user.userId,
        updatedAt: new Date(),
        notes: "Department assigned by agent"
      });
    }
    
    await complaint.save();

    // Notify department managers about the new assignment
    await notificationService.notifyManagersByDepartment(req.app?.get?.('io'), departmentId, {
      type: "assigned",
      title: "New Complaint Assigned",
      message: `Complaint "${complaint.title || 'Unknown'}" has been assigned to ${department.name}.`,
      complaintId: complaint._id,
    });
    
    // Also notify citizen if exists
    if (complaint.createdBy) {
      await notificationService.sendNotification(req.app?.get?.('io'), complaint.createdBy, {
        type: "assigned",
        title: "Complaint Assigned",
        message: `Your complaint "${complaint.title || 'Unknown'}" has been assigned to ${department.name}.`,
        complaintId: complaint._id,
      });
    }

    res.json({ success: true, message: "Complaint assigned to department", data: complaint });
  } catch (error) {
    console.error("Error assigning department:", error);
    res.status(500).json({ message: "Failed to assign department" });
  }
});

// GET /api/agent/departments - Get ALL departments (agents can assign to any department)
router.get("/departments", authenticate, authorize("MUNICIPAL_AGENT"), async (req, res) => {
  try {
    const departments = await Department.find({})
      .select("_id name email phone municipality municipalityName description")
      .sort({ name: 1 });

    res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json({ message: "Failed to fetch departments" });
  }
});

// POST /api/agent/complaints/:id/approve-resolution - Approve technician resolution
router.post("/complaints/:id/approve-resolution", authenticate, authorize("MUNICIPAL_AGENT"), async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    // Check municipality
    const user = await getAgentMunicipality(req.user.userId);
    const userMunicipality = normalizeMunicipality(user?.municipalityName || req.user.municipalityName || "");
    const complaintMunicipality = complaint.municipalityNormalized || normalizeMunicipality(complaint.municipalityName || complaint.municipality?.name || complaint.location?.municipality || "");

    if (userMunicipality !== complaintMunicipality) {
      return res.status(403).json({ success: false, message: "Complaint does not belong to your municipality" });
    }

    if (complaint.status !== "RESOLVED") {
      return res.status(400).json({ success: false, message: "Only RESOLVED complaints can have their resolution approved" });
    }

    complaint.status = "CLOSED";
    complaint.closedAt = new Date();
    complaint.closedBy = req.user.userId;
    
    // Add to status history
    if (!complaint.statusHistory) complaint.statusHistory = [];
    complaint.statusHistory.push({
      status: "CLOSED",
      updatedBy: req.user.userId,
      updatedAt: new Date(),
      notes: "Resolution approved"
    });
    
    await complaint.save();

    // Notify citizen
    if (complaint.createdBy) {
      await notificationService.sendNotification(req.app?.get?.('io'), complaint.createdBy, {
        type: "closed",
        title: "Complaint Closed",
        message: `Your complaint "${complaint.title}" has been resolved and closed.`,
        complaintId: complaint._id,
      });
    }

    // Notify technician who submitted the resolution
    if (complaint.assignedTo) {
      await notificationService.sendNotification(req.app?.get?.('io'), complaint.assignedTo, {
        type: "resolution_approved",
        title: "Resolution Approved",
        message: `Your resolution for "${complaint.title}" has been approved by the agent.`,
        complaintId: complaint._id,
      });
    }

    res.json({ success: true, message: "Resolution approved and complaint closed", data: complaint });
  } catch (error) {
    console.error("Error approving resolution:", error);
    res.status(500).json({ success: false, message: "Failed to approve resolution" });
  }
});

// POST /api/agent/complaints/:id/reject-resolution - Reject technician resolution
router.post("/complaints/:id/reject-resolution", authenticate, authorize("MUNICIPAL_AGENT"), async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    
    if (!rejectionReason) {
      return res.status(400).json({ success: false, message: "Rejection reason is required" });
    }

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    // Check municipality
    const user = await getAgentMunicipality(req.user.userId);
    const userMunicipality = normalizeMunicipality(user?.municipalityName || req.user.municipalityName || "");
    const complaintMunicipality = complaint.municipalityNormalized || normalizeMunicipality(complaint.municipalityName || complaint.municipality?.name || complaint.location?.municipality || "");

    if (userMunicipality !== complaintMunicipality) {
      return res.status(403).json({ success: false, message: "Complaint does not belong to your municipality" });
    }

    if (complaint.status !== "RESOLVED") {
      return res.status(400).json({ success: false, message: "Only RESOLVED complaints can have their resolution rejected" });
    }

    // Revert status back to IN_PROGRESS
    complaint.status = "IN_PROGRESS";
    complaint.resolutionRejectionReason = rejectionReason;
    
    // Add to status history
    if (!complaint.statusHistory) complaint.statusHistory = [];
    complaint.statusHistory.push({
      status: "IN_PROGRESS",
      updatedBy: req.user.userId,
      updatedAt: new Date(),
      notes: `Resolution rejected: ${rejectionReason}`
    });
    
    await complaint.save();

    // Notify technician who submitted the resolution
    if (complaint.assignedTo) {
      await notificationService.sendNotification(req.app?.get?.('io'), complaint.assignedTo, {
        type: "resolution_rejected",
        title: "Resolution Rejected",
        message: `Your resolution for "${complaint.title}" was rejected. Reason: ${rejectionReason}`,
        complaintId: complaint._id,
      });
    }

    // Notify citizen that the resolution was rejected and work continues
    if (complaint.createdBy) {
      await notificationService.sendNotification(req.app?.get?.('io'), complaint.createdBy, {
        type: "resolution_rejected",
        title: "Resolution Under Review",
        message: `The proposed resolution for "${complaint.title}" requires additional work. The technician will continue working on it.`,
        complaintId: complaint._id,
      });
    }

    // Notify department managers
    if (complaint.assignedDepartment) {
      await notificationService.notifyManagersByDepartment(req.app?.get?.('io'), complaint.assignedDepartment, {
        type: "resolution_rejected",
        title: "Resolution Rejected",
        message: `Resolution for "${complaint.title}" was rejected by agent. Reason: ${rejectionReason}`,
        complaintId: complaint._id,
      });
    }

    res.json({ success: true, message: "Resolution rejected, complaint returned to IN_PROGRESS", data: complaint });
  } catch (error) {
    console.error("Error rejecting resolution:", error);
    res.status(500).json({ success: false, message: "Failed to reject resolution" });
  }
});

module.exports = router;
