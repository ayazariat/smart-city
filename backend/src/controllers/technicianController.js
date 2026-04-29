const Complaint = require("../models/Complaint");
const RepairTeam = require("../models/RepairTeam");
const notificationService = require("../services/notification.service");

const TECHNICIAN_ACTIVE_STATUSES = [
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
];

class TechnicianController {
  async getComplaints(req, res) {
    try {
      const { status, category, page = 1, limit = 50 } = req.query;
      const technicianId = req.user.userId;
      
      const teams = await RepairTeam.find({ members: technicianId }).select("_id name members").lean();
      const teamIds = teams.map(t => t._id);
      
      const query = {
        $or: [
          { assignedTo: technicianId },
          { assignedTeam: { $in: teamIds } }
        ]
      };
      
      if (status && status !== "ALL") {
        query.status = status;
      } else {
        query.status = { $in: TECHNICIAN_ACTIVE_STATUSES };
      }
      
      if (category) {
        query.category = category;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const [complaints, total] = await Promise.all([
        Complaint.find(query)
          .populate("createdBy", "fullName email phone")
          .populate("assignedDepartment", "name")
          .populate("assignedTo", "fullName")
          .populate({
            path: "assignedTeam",
            select: "name members",
            populate: { path: "members", select: "fullName" }
          })
          .populate("municipality", "name governorate")
          .populate("beforePhotos.takenBy", "fullName")
          .populate("afterPhotos.takenBy", "fullName")
          .sort({ priorityScore: -1, createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Complaint.countDocuments(query)
      ]);

      res.json({
        success: true,
        message: "Complaints retrieved successfully",
        data: {
          complaints,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error("Technician get complaints error:", error);
      res.status(500).json({ success: false, message: "Failed to retrieve complaints" });
    }
  }

  async getComplaintById(req, res) {
    try {
      const complaint = await Complaint.findById(req.params.id)
        .populate("createdBy", "fullName email phone")
        .populate("assignedTo", "fullName")
        .populate("assignedDepartment", "name")
        .populate({
          path: "assignedTeam",
          select: "name members",
          populate: { path: "members", select: "fullName" }
        })
        .populate("municipality", "name governorate")
        .populate("beforePhotos.takenBy", "fullName")
        .populate("afterPhotos.takenBy", "fullName")
        .populate("statusHistory.updatedBy", "fullName");
      
      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      const technicianId = req.user.userId;
      const teams = await RepairTeam.find({ members: technicianId }).select("_id").lean();
      const teamIds = teams.map(t => t._id.toString());
      
      const assignedToId = complaint.assignedTo?._id?.toString() || complaint.assignedTo?.toString();
      const assignedTeamId = complaint.assignedTeam?._id?.toString() || complaint.assignedTeam?.toString();
      
      const isAssigned = 
        assignedToId === technicianId ||
        (assignedTeamId && teamIds.includes(assignedTeamId));
      
      if (!isAssigned) {
        return res.status(403).json({ success: false, message: "Complaint not assigned to you" });
      }

      res.json({
        success: true,
        message: "Complaint retrieved successfully",
        data: complaint
      });
    } catch (error) {
      console.error("Technician get complaint error:", error);
      res.status(500).json({ success: false, message: "Failed to retrieve complaint" });
    }
  }

  async start(req, res) {
    try {
      const complaint = await Complaint.findById(req.params.id);
      
      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      const technicianId = req.user.userId;
      const teams = await RepairTeam.find({ members: technicianId }).select("_id").lean();
      const teamIds = teams.map(t => t._id.toString());
      
      const assignedToId = complaint.assignedTo?._id?.toString() || complaint.assignedTo?.toString();
      const assignedTeamId = complaint.assignedTeam?._id?.toString() || complaint.assignedTeam?.toString();
      
      const isAssigned = 
        assignedToId === technicianId ||
        (assignedTeamId && teamIds.includes(assignedTeamId));
      
      if (!isAssigned) {
        return res.status(403).json({ 
          success: false, 
          message: `Not assigned. assignedTo: ${assignedToId}, yourId: ${technicianId}`
        });
      }

      if (complaint.status !== "ASSIGNED") {
        return res.status(400).json({ 
          success: false, 
          message: `Wrong status: ${complaint.status}. Need ASSIGNED.` 
        });
      }

      complaint.status = "IN_PROGRESS";
      complaint.startedAt = new Date();
      
      if (!complaint.statusHistory) complaint.statusHistory = [];
      complaint.statusHistory.push({
        status: "IN_PROGRESS",
        updatedBy: req.user.userId,
        updatedAt: new Date(),
        notes: "Work started by technician"
      });
      
      await complaint.save();

      const io = req.app?.get?.('io');
      if (io && complaint.assignedDepartment) {
        try {
          await notificationService.notifyManagersByDepartment(io, complaint.assignedDepartment, {
            type: "in_progress",
            title: "Work Started",
            message: `Technician started work on "${complaint.title}".`,
            complaintId: complaint._id,
          });
        } catch (notifError) {
          console.error("Failed to notify managers:", notifError);
        }
      }

      if (io && complaint.createdBy) {
        try {
          await notificationService.sendNotification(io, complaint.createdBy, {
            type: "in_progress",
            title: "notification.status.inProgress",
            message: "notification.status.inProgress.desc",
            complaintId: complaint._id,
          });
        } catch (notifError) {
          console.error("Failed to notify citizen:", notifError);
        }
      }

      res.json({
        success: true,
        message: "Complaint started successfully",
        data: complaint
      });
    } catch (error) {
      console.error("Technician start error:", error.message, error.stack);
      res.status(500).json({ success: false, message: `Failed to start: ${error.message}` });
    }
  }

  async complete(req, res) {
    try {
      const { notes, beforePhotos, afterPhotos } = req.body;
      
      const complaint = await Complaint.findById(req.params.id);
      
      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      const technicianId = req.user.userId;
      const teams = await RepairTeam.find({ members: technicianId }).select("_id").lean();
      const teamIds = teams.map(t => t._id.toString());
      
      const assignedToId = complaint.assignedTo?._id?.toString() || complaint.assignedTo?.toString();
      const assignedTeamId = complaint.assignedTeam?._id?.toString() || complaint.assignedTeam?.toString();
      
      const isAssigned = 
        assignedToId === technicianId ||
        (assignedTeamId && teamIds.includes(assignedTeamId));
      
      if (!isAssigned) {
        return res.status(403).json({ 
          success: false, 
          message: `Not assigned. assignedTo: ${assignedToId}, yourId: ${technicianId}`
        });
      }

      if (complaint.status !== "IN_PROGRESS") {
        return res.status(400).json({ 
          success: false, 
          message: `Wrong status: ${complaint.status}. Need IN_PROGRESS.` 
        });
      }

      if (beforePhotos && Array.isArray(beforePhotos)) {
        complaint.beforePhotos = beforePhotos.map(photo => ({
          type: photo.type || "photo",
          url: photo.url,
          takenAt: new Date(),
          takenBy: technicianId
        }));
      }

      if (afterPhotos && Array.isArray(afterPhotos)) {
        complaint.afterPhotos = afterPhotos.map(photo => ({
          type: photo.type || "photo",
          url: photo.url,
          takenAt: new Date(),
          takenBy: technicianId
        }));
      }

      complaint.status = "RESOLVED";
      complaint.resolvedAt = new Date();
      complaint.reportSubmittedAt = new Date();
      if (notes) {
        complaint.resolutionNotes = notes;
      }
      
      if (!complaint.statusHistory) complaint.statusHistory = [];
      complaint.statusHistory.push({
        status: "RESOLVED",
        updatedBy: req.user.userId,
        updatedAt: new Date(),
        notes: notes || "Resolved by technician"
      });
      
      await complaint.save();

      const io = req.app?.get?.('io');
      if (io && complaint.assignedDepartment) {
        try {
          await notificationService.notifyManagersByDepartment(io, complaint.assignedDepartment, {
            type: "resolved",
            title: "Task Resolved",
            message: `Technician resolved complaint "${complaint.title}".`,
            complaintId: complaint._id,
          });
        } catch (notifError) {
          console.error("Failed to notify managers:", notifError);
        }
      }
      
      if (io && complaint.createdBy) {
        try {
          await notificationService.sendNotification(io, complaint.createdBy, {
            type: "resolved",
            title: "notification.status.resolved",
            message: "notification.status.resolved.desc",
            complaintId: complaint._id,
          });
        } catch (notifError) {
          console.error("Failed to notify citizen:", notifError);
        }
      }

      if (io && complaint.validatedBy) {
        try {
          await notificationService.sendNotification(io, complaint.validatedBy, {
            type: "report_submitted",
            title: "Resolution Pending Review",
            message: `Technician submitted a resolution report for "${complaint.title}". Please review.`,
            complaintId: complaint._id,
          });
        } catch (notifError) {
          console.error("Failed to notify agent:", notifError);
        }
      }

      res.json({
        success: true,
        message: "Complaint resolved successfully",
        data: complaint
      });
    } catch (error) {
      console.error("Technician complete error:", error.message, error.stack);
      res.status(500).json({ success: false, message: `Failed to complete: ${error.message}` });
    }
  }

  async addBeforePhoto(req, res) {
    try {
      const { photoUrl, photoType = "photo" } = req.body;
      
      const complaint = await Complaint.findById(req.params.id);
      
      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      if (complaint.assignedTo?.toString() !== req.user.userId) {
        return res.status(403).json({ success: false, message: "Complaint not assigned to you" });
      }

      if (!["ASSIGNED", "IN_PROGRESS"].includes(complaint.status)) {
        return res.status(400).json({ 
          success: false, 
          message: "Cannot add photos to complaint in current status" 
        });
      }

      complaint.beforePhotos = complaint.beforePhotos || [];
      complaint.beforePhotos.push({
        type: photoType,
        url: photoUrl,
        takenAt: new Date(),
        takenBy: req.user.userId
      });

      const transitionedToInProgress = complaint.status === "ASSIGNED";
      if (transitionedToInProgress) {
        complaint.status = "IN_PROGRESS";
        if (!complaint.statusHistory) complaint.statusHistory = [];
        complaint.statusHistory.push({
          status: "IN_PROGRESS",
          updatedBy: req.user.userId,
          updatedAt: new Date(),
          notes: "Work started via before-photo upload"
        });
      }

      await complaint.save();

      if (transitionedToInProgress) {
        const io = req.app?.get?.('io');
        if (io && complaint.assignedDepartment) {
          try {
            await notificationService.notifyManagersByDepartment(io, complaint.assignedDepartment, {
              type: "in_progress",
              title: "Work Started",
              message: `Technician started work on "${complaint.title}".`,
              complaintId: complaint._id,
            });
          } catch (notifError) {
            console.error("Failed to notify managers:", notifError);
          }
        }
        if (io && complaint.createdBy) {
          try {
            await notificationService.sendNotification(io, complaint.createdBy, {
              type: "in_progress",
              title: "notification.status.inProgress",
              message: "notification.status.inProgress.desc",
              complaintId: complaint._id,
            });
          } catch (notifError) {
            console.error("Failed to notify citizen:", notifError);
          }
        }
      }

      res.json({
        success: true,
        message: "Before photo added successfully",
        data: complaint
      });
    } catch (error) {
      console.error("Technician add before photo error:", error);
      res.status(500).json({ success: false, message: "Failed to add before photo" });
    }
  }

  async addAfterPhoto(req, res) {
    try {
      const { photoUrl, photoType = "photo" } = req.body;
      
      const complaint = await Complaint.findById(req.params.id);
      
      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      if (complaint.assignedTo?.toString() !== req.user.userId) {
        return res.status(403).json({ success: false, message: "Complaint not assigned to you" });
      }

      if (complaint.status !== "IN_PROGRESS") {
        return res.status(400).json({ 
          success: false, 
          message: "Only in-progress complaints can have after photos added" 
        });
      }

      complaint.afterPhotos = complaint.afterPhotos || [];
      complaint.afterPhotos.push({
        type: photoType,
        url: photoUrl,
        takenAt: new Date(),
        takenBy: req.user.userId
      });

      await complaint.save();

      res.json({
        success: true,
        message: "After photo added successfully",
        data: complaint
      });
    } catch (error) {
      console.error("Technician add after photo error:", error);
      res.status(500).json({ success: false, message: "Failed to add after photo" });
    }
  }

  async addComment(req, res) {
    try {
      const { id } = req.params;
      const { content, type = 'NOTE' } = req.body;

      if (!content) {
        return res.status(400).json({ success: false, message: 'Comment content is required' });
      }

      const complaint = await Complaint.findById(id);
      if (!complaint) {
        return res.status(404).json({ success: false, message: 'Complaint not found' });
      }

      if (complaint.assignedTo?.toString() !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Not authorized to comment on this complaint' });
      }

      const comment = {
        text: content,
        type: type,
        author: req.user.userId,
        createdAt: new Date()
      };

      if (!complaint.comments) {
        complaint.comments = [];
      }
      complaint.comments.push(comment);
      await complaint.save();

      res.json({
        success: true,
        message: 'Comment added successfully',
        data: {
          _id: comment._id,
          text: comment.text,
          type: comment.type,
          author: { _id: req.user.userId, fullName: req.user.name },
          createdAt: comment.createdAt
        }
      });
    } catch (error) {
      console.error('Technician add comment error:', error);
      res.status(500).json({ success: false, message: 'Failed to add comment' });
    }
  }

  async updateLocation(req, res) {
    try {
      const { id } = req.params;
      const { latitude, longitude, timestamp } = req.body;

      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
      }

      const complaint = await Complaint.findById(id);
      if (!complaint) {
        return res.status(404).json({ success: false, message: 'Complaint not found' });
      }

      if (complaint.assignedTo?.toString() !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Not authorized to update location for this complaint' });
      }

      if (!complaint.technicianLocations) {
        complaint.technicianLocations = [];
      }
      complaint.technicianLocations.push({
        technician: req.user.userId,
        latitude,
        longitude,
        timestamp: timestamp || new Date()
      });

      await complaint.save();

      res.json({
        success: true,
        message: 'Location updated successfully'
      });
    } catch (error) {
      console.error('Technician update location error:', error);
      res.status(500).json({ success: false, message: 'Failed to update location' });
    }
  }

  async getStats(req, res) {
    try {
      const technicianId = req.user.userId;
      
      const teams = await RepairTeam.find({ members: technicianId }).select("_id").lean();
      const teamIds = teams.map(t => t._id);
      
      const historicalBaseQuery = {
        $or: [
          { assignedTo: technicianId },
          { assignedTeam: { $in: teamIds } }
        ],
      };
      const activeBaseQuery = {
        ...historicalBaseQuery,
        isArchived: false,
        status: { $in: TECHNICIAN_ACTIVE_STATUSES },
      };

      const [historicalTotal, total, assigned, inProgress, resolved, closed, rejected, overdue, atRisk] = await Promise.all([
        Complaint.countDocuments(historicalBaseQuery),
        Complaint.countDocuments(activeBaseQuery),
        Complaint.countDocuments({ ...activeBaseQuery, status: "ASSIGNED" }),
        Complaint.countDocuments({ ...activeBaseQuery, status: "IN_PROGRESS" }),
        Complaint.countDocuments({ ...activeBaseQuery, status: "RESOLVED" }),
        Complaint.countDocuments({ ...historicalBaseQuery, status: "CLOSED" }),
        Complaint.countDocuments({ ...historicalBaseQuery, status: "REJECTED" }),
        Complaint.countDocuments({ ...activeBaseQuery, slaStatus: "OVERDUE", status: { $in: ["ASSIGNED", "IN_PROGRESS"] } }),
        Complaint.countDocuments({ ...activeBaseQuery, slaStatus: "AT_RISK", status: { $in: ["ASSIGNED", "IN_PROGRESS"] } })
      ]);

      const resolvedCount = resolved + closed;
      const resolutionRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;

      const avgTimeResult = await Complaint.aggregate([
        { $match: { ...historicalBaseQuery, status: { $in: ["RESOLVED", "CLOSED"] }, resolvedAt: { $exists: true } } },
        { $group: { _id: null, avgTime: { $avg: { $subtract: ["$resolvedAt", "$createdAt"] } } } }
      ]);
      const averageResolutionTime = avgTimeResult[0] ? Math.round(avgTimeResult[0].avgTime / (1000 * 60 * 60)) : 0;

      res.json({
        success: true,
        data: {
          total,
          historicalTotal,
          assigned,
          inProgress,
          resolved,
          closed,
          rejected,
          totalOverdue: overdue,
          totalAtRisk: atRisk,
          resolutionRate,
          averageResolutionTime
        }
      });
    } catch (error) {
      console.error("Technician get stats error:", error);
      res.status(500).json({ success: false, message: "Failed to retrieve statistics" });
    }
  }
}

module.exports = new TechnicianController();
