const Complaint = require("../models/Complaint");
const User = require("../models/User");
const Department = require("../models/Department");
const { normalizeMunicipality } = require("../utils/normalize");
const notificationService = require("../services/notification.service");
const { calculateSLADeadline } = require("../utils/sla");

const ACTIVE_STATUSES = [
  "SUBMITTED",
  "VALIDATED",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
];

async function getAgentMunicipality(userId) {
  const user = await User.findById(userId)
    .populate('municipality', 'name governorate')
    .select("municipality municipalityName governorate");
  
  let municipalityName = user?.municipalityName || "";
  
  if (user?.municipality && typeof user.municipality === 'object') {
    municipalityName = user.municipality.name || municipalityName;
  }
  
  return {
    ...user?.toObject(),
    municipalityName,
  };
}

function checkMunicipalityMatch(userMunicipality, complaint, userRole) {
  const complaintMunicipalityNormalized = complaint.municipalityNormalized || "";
  const complaintMunicipalityName = complaint.municipalityName || "";
  const complaintLocationMunicipality = complaint.location?.municipality || "";
  const complaintLocationCommune = complaint.location?.commune || "";

  return (
    userRole === "ADMIN" ||
    userMunicipality === complaintMunicipalityNormalized ||
    userMunicipality.toLowerCase() === complaintMunicipalityName.toLowerCase() ||
    userMunicipality.toLowerCase() === complaintLocationMunicipality.toLowerCase() ||
    userMunicipality.toLowerCase() === complaintLocationCommune.toLowerCase()
  );
}

class AgentController {
  async getComplaints(req, res) {
    try {
      const user = await getAgentMunicipality(req.user.userId);
      const userMunicipality = normalizeMunicipality(user?.municipalityName || req.user.municipalityName || "");

      const { status, category, page = 1, limit = 50 } = req.query;

      if (!userMunicipality) {
        return res.status(400).json({ message: "Municipality not configured for this user" });
      }

      const munRegex = new RegExp("^" + userMunicipality.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "$", "i");

      const query = {
        $or: [
          { municipalityNormalized: userMunicipality },
          { municipalityName: munRegex },
          { "location.municipality": munRegex }
        ],
        isArchived: { $ne: true }
      };

      if (status && status !== "ALL") {
        if (status.includes(",")) {
          query.status = { $in: status.split(",") };
        } else {
          query.status = status;
        }
      } else {
        query.status = { $in: ACTIVE_STATUSES };
      }

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

      const complaintsResponse = complaints.map(c => {
        const complaint = c.toObject();
        if (complaint.slaDeadline && !['RESOLVED', 'CLOSED', 'REJECTED'].includes(complaint.status)) {
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
  }

  async getQueue(req, res) {
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
  }

  async validate(req, res) {
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
      
      if (!complaint.statusHistory) complaint.statusHistory = [];
      complaint.statusHistory.push({
        status: "VALIDATED",
        updatedBy: req.user.userId,
        updatedAt: new Date()
      });
      
      await complaint.save();

      if (complaint.createdBy) {
        try {
          await notificationService.sendNotification(req.app?.get?.('io'), complaint.createdBy, {
            type: "validated",
            title: "notification.status.validated",
            message: `notification.status.validated.desc`,
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
  }

  async reject(req, res) {
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
      
      if (!complaint.statusHistory) complaint.statusHistory = [];
      complaint.statusHistory.push({
        status: "REJECTED",
        updatedBy: req.user.userId,
        updatedAt: new Date(),
        notes: reason
      });
      
      await complaint.save();

      if (complaint.createdBy) {
        try {
          await notificationService.sendNotification(req.app?.get?.('io'), complaint.createdBy, {
            type: "rejected",
            title: "notification.status.rejected",
            message: `notification.status.rejected.desc`,
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
  }

  async close(req, res) {
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

      const hasResolutionReport = complaint.resolutionNotes || 
                                   (complaint.afterPhotos && complaint.afterPhotos.length > 0);
      
      if (!hasResolutionReport) {
        return res.status(400).json({ 
          message: "Resolution report required. Technician must submit resolution notes or proof photos before closing.",
          requiresResolutionReport: true 
        });
      }

      complaint.reportViewedAt = new Date();
      await complaint.save();
      
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
  }

  async assignDepartment(req, res) {
    try {
      const { departmentId } = req.body;

      if (!departmentId) {
        return res.status(400).json({ success: false, message: "Department ID is required" });
      }

      const complaint = await Complaint.findById(req.params.id);

      if (!complaint) {
        return res.status(404).json({ message: "Complaint not found" });
      }

      const department = await Department.findById(departmentId);
      if (!department) {
        return res.status(404).json({ success: false, message: "Department not found" });
      }

      complaint.assignedDepartment = departmentId;
      
      if (!complaint.slaDeadline) {
        const slaDeadline = calculateSLADeadline(
          complaint.category,
          complaint.urgency,
          new Date()
        );
        complaint.slaDeadline = slaDeadline;
      }
      
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

      await notificationService.notifyManagersByDepartment(req.app?.get?.('io'), departmentId, {
        type: "assigned",
        title: "notification.status.assigned",
        message: "notification.status.assigned.desc",
        complaintId: complaint._id,
      });
      
      if (complaint.createdBy) {
        await notificationService.sendNotification(req.app?.get?.('io'), complaint.createdBy, {
          type: "assigned",
          title: "notification.status.assigned",
          message: "notification.status.assigned.desc",
          complaintId: complaint._id,
        });
      }

      res.json({ success: true, message: "Complaint assigned to department", data: complaint });
    } catch (error) {
      console.error("Error assigning department:", error);
      res.status(500).json({ message: "Failed to assign department" });
    }
  }

  async getDepartments(req, res) {
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
  }

  async approveResolution(req, res) {
    try {
      const complaint = await Complaint.findById(req.params.id);

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      const user = await getAgentMunicipality(req.user.userId);
      const userMunicipality = normalizeMunicipality(user?.municipalityName || req.user.municipalityName || "");

      if (!checkMunicipalityMatch(userMunicipality, complaint, req.user.role)) {
        return res.status(403).json({ success: false, message: "Complaint does not belong to your municipality" });
      }

      if (complaint.status !== "RESOLVED") {
        return res.status(400).json({ success: false, message: "Only RESOLVED complaints can have their resolution approved" });
      }

      complaint.status = "CLOSED";
      complaint.closedAt = new Date();
      complaint.closedBy = req.user.userId;
      
      if (!complaint.statusHistory) complaint.statusHistory = [];
      complaint.statusHistory.push({
        status: "CLOSED",
        updatedBy: req.user.userId,
        updatedAt: new Date(),
        notes: "Resolution approved"
      });
      
      const savedComplaint = await complaint.save();

      try {
        const citizenId = typeof complaint.createdBy === 'object' ? complaint.createdBy._id : complaint.createdBy;
        if (citizenId) {
          await notificationService.sendNotification(req.app?.get?.('io'), citizenId, {
            type: "closed",
            title: "notification.status.closed",
            message: "notification.status.closed.desc",
            complaintId: complaint._id,
          });
        }
      } catch (e) { console.error("Citizen notif error:", e.message); }

      try {
        const techId = typeof complaint.assignedTo === 'object' ? complaint.assignedTo._id : (complaint.assignedTo?._id || complaint.assignedTo);
        if (techId) {
          await notificationService.sendNotification(req.app?.get?.('io'), techId, {
            type: "resolution_approved",
            title: "Resolution Approved",
            message: `Your resolution for "${complaint.title}" has been approved by the agent.`,
            complaintId: complaint._id,
          });
        }
      } catch (e) { console.error("Tech notif error:", e.message); }

      res.json({ success: true, message: "Resolution approved and complaint closed", data: savedComplaint });
    } catch (error) {
      console.error("Error approving resolution:", error.message);
      res.status(500).json({ success: false, message: "Failed to approve resolution" });
    }
  }

  async rejectResolution(req, res) {
    try {
      const rejectionReason = req.body?.rejectionReason || req.body?.reason;
      
      if (!rejectionReason) {
        return res.status(400).json({ success: false, message: "Rejection reason is required" });
      }

      const complaint = await Complaint.findById(req.params.id);

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      const user = await getAgentMunicipality(req.user.userId);
      const userMunicipality = normalizeMunicipality(user?.municipalityName || req.user.municipalityName || "");

      if (!checkMunicipalityMatch(userMunicipality, complaint, req.user.role)) {
        return res.status(403).json({ success: false, message: "Complaint does not belong to your municipality" });
      }

      if (complaint.status !== "RESOLVED") {
        return res.status(400).json({ success: false, message: "Only RESOLVED complaints can have their resolution rejected" });
      }

      complaint.status = "IN_PROGRESS";
      complaint.resolutionRejectionReason = rejectionReason;
      
      if (!complaint.statusHistory) complaint.statusHistory = [];
      complaint.statusHistory.push({
        status: "IN_PROGRESS",
        updatedBy: req.user.userId,
        updatedAt: new Date(),
        notes: `Resolution rejected: ${rejectionReason}`
      });
      
      await complaint.save();

      try {
        const techId = typeof complaint.assignedTo === 'object' ? complaint.assignedTo._id : (complaint.assignedTo?._id || complaint.assignedTo);
        if (techId) {
          await notificationService.sendNotification(req.app?.get?.('io'), techId, {
            type: "resolution_rejected",
            title: "Resolution Rejected - Action Required",
            message: `Your resolution for "${complaint.title}" was rejected. Reason: ${rejectionReason}. Please complete the work properly.`,
            complaintId: complaint._id,
          });
        }
      } catch (notifErr) {
        console.error("Error sending technician notification:", notifErr);
      }

      try {
        const citizenId = typeof complaint.createdBy === 'object' ? complaint.createdBy._id : complaint.createdBy;
        if (citizenId) {
          await notificationService.sendNotification(req.app?.get?.('io'), citizenId, {
            type: "resolution_rejected",
            title: "notification.status.inProgress",
            message: "notification.status.inProgress.desc",
            complaintId: complaint._id,
          });
        }
      } catch (notifErr) {
        console.error("Error sending citizen notification:", notifErr);
      }

      try {
        const deptId = typeof complaint.assignedDepartment === 'object' ? complaint.assignedDepartment._id : complaint.assignedDepartment;
        if (deptId) {
          await notificationService.notifyManagersByDepartment(req.app?.get?.('io'), deptId, {
            type: "resolution_rejected",
            title: "Resolution Rejected",
            message: `Resolution for "${complaint.title}" was rejected by agent. Reason: ${rejectionReason}`,
            complaintId: complaint._id,
          });
        }
      } catch (notifErr) {
        console.error("Error sending manager notification:", notifErr);
      }

      res.json({ success: true, message: "Resolution rejected, complaint returned to IN_PROGRESS", data: complaint });
    } catch (error) {
      console.error("Error rejecting resolution:", error);
      res.status(500).json({ success: false, message: "Failed to reject resolution" });
    }
  }
}

module.exports = new AgentController();
