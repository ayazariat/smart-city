const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const Complaint = require("../models/Complaint");
const RepairTeam = require("../models/RepairTeam");
const notificationService = require("../services/notification.service");

// All technician routes require authentication and TECHNICIAN role

// GET /api/technician/complaints - Get complaints assigned to technician
router.get("/complaints", authenticate, authorize("TECHNICIAN"), async (req, res) => {
  try {
    const { status, category, page = 1, limit = 50 } = req.query;
    const technicianId = req.user.userId;
    
    // Find repair teams where this technician is a member
    const teams = await RepairTeam.find({ members: technicianId }).select("_id name members").lean();
    const teamIds = teams.map(t => t._id);
    
    // Build query - filter by technician's ID (assignedTo) OR as member of repair team (assignedTeam)
    const query = {
      $or: [
        { assignedTo: technicianId },
        { assignedTeam: { $in: teamIds } }
      ]
    };
    
    // Filter by status if provided
    if (status) {
      if (status === "ALL") {
        // Show all statuses
      } else {
        query.status = status;
      }
    } else {
      // Default: show ASSIGNED, IN_PROGRESS, RESOLVED complaints
      query.status = { $in: ["ASSIGNED", "IN_PROGRESS", "RESOLVED"] };
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
          populate: {
            path: "members",
            select: "fullName"
          }
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
});

// PUT /api/technician/complaints/:id/start - Start working on a complaint
router.put("/complaints/:id/start", authenticate, authorize("TECHNICIAN"), async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    // Check if complaint is assigned to this technician (via assignedTo or assignedTeam)
    const technicianId = req.user.userId;
    const teams = await RepairTeam.find({ members: technicianId }).select("_id").lean();
    const teamIds = teams.map(t => t._id);
    
    const isAssigned = 
      complaint.assignedTo?.toString() === technicianId ||
      (complaint.assignedTeam && teamIds.some(id => id.toString() === complaint.assignedTeam?.toString()));
    
    if (!isAssigned) {
      return res.status(403).json({ success: false, message: "Complaint not assigned to you" });
    }

    // Only ASSIGNED complaints can be started
    if (complaint.status !== "ASSIGNED") {
      return res.status(400).json({ 
        success: false, 
        message: "Only assigned complaints can be started" 
      });
    }

    complaint.status = "IN_PROGRESS";
    complaint.startedAt = new Date();
    await complaint.save();

    // Notify department managers
    if (complaint.assignedDepartment) {
      await notificationService.notifyManagersByDepartment(null, complaint.assignedDepartment, {
        type: "in_progress",
        title: "Work Started",
        message: `Technician started work on "${complaint.title}".`,
        complaintId: complaint._id,
      });
    }

    // Notify citizen
    if (complaint.createdBy) {
      await notificationService.sendNotification(null, complaint.createdBy, {
        type: "in_progress",
        title: "Work Started",
        message: `Work has started on your complaint "${complaint.title}".`,
        complaintId: complaint._id,
      });
    }

    res.json({
      success: true,
      message: "Complaint started successfully",
      data: complaint
    });
  } catch (error) {
    console.error("Technician start complaint error:", error);
    res.status(500).json({ success: false, message: "Failed to start complaint" });
  }
});

// PUT /api/technician/complaints/:id/complete - Mark complaint as resolved
router.put("/complaints/:id/complete", authenticate, authorize("TECHNICIAN"), async (req, res) => {
  try {
    const { notes, beforePhotos, afterPhotos } = req.body;
    
    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    // Check if complaint is assigned to this technician (via assignedTo or assignedTeam)
    const technicianId = req.user.userId;
    const teams = await RepairTeam.find({ members: technicianId }).select("_id").lean();
    const teamIds = teams.map(t => t._id);
    
    const isAssigned = 
      complaint.assignedTo?.toString() === technicianId ||
      (complaint.assignedTeam && teamIds.some(id => id.toString() === complaint.assignedTeam?.toString()));
    
    if (!isAssigned) {
      return res.status(403).json({ success: false, message: "Complaint not assigned to you" });
    }

    // Only IN_PROGRESS complaints can be completed
    if (complaint.status !== "IN_PROGRESS") {
      return res.status(400).json({ 
        success: false, 
        message: "Only in-progress complaints can be completed" 
      });
    }

    // Add before photos if provided
    if (beforePhotos && Array.isArray(beforePhotos)) {
      complaint.beforePhotos = beforePhotos.map(photo => ({
        type: photo.type || "photo",
        url: photo.url,
        takenAt: new Date(),
        takenBy: technicianId
      }));
    }

    // Add after photos if provided
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
    if (notes) {
      complaint.resolutionNotes = notes;
    }
    await complaint.save();

    // Notify department managers and citizen
    if (complaint.assignedDepartment) {
      await notificationService.notifyManagersByDepartment(null, complaint.assignedDepartment, {
        type: "resolved",
        title: "Task Resolved",
        message: `Technician has resolved complaint "${complaint.title}".`,
        complaintId: complaint._id,
      });
    }
    
    // Notify citizen
    if (complaint.createdBy) {
      await notificationService.sendNotification(null, complaint.createdBy, {
        type: "resolved",
        title: "Complaint Resolved",
        message: `Your complaint "${complaint.title}" has been resolved.`,
        complaintId: complaint._id,
      });
    }

    res.json({
      success: true,
      message: "Complaint resolved successfully",
      data: complaint
    });
  } catch (error) {
    console.error("Technician complete complaint error:", error);
    res.status(500).json({ success: false, message: "Failed to complete complaint" });
  }
});

// POST /api/technician/complaints/:id/before-photo - Upload before photo
router.post("/complaints/:id/before-photo", authenticate, authorize("TECHNICIAN"), async (req, res) => {
  try {
    const { photoUrl, photoType = "photo" } = req.body;
    
    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    // Check if complaint is assigned to this technician
    if (complaint.assignedTo?.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: "Complaint not assigned to you" });
    }

    // Only ASSIGNED or IN_PROGRESS complaints can have photos added
    if (!["ASSIGNED", "IN_PROGRESS"].includes(complaint.status)) {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot add photos to complaint in current status" 
      });
    }

    // Add before photo
    complaint.beforePhotos = complaint.beforePhotos || [];
    complaint.beforePhotos.push({
      type: photoType,
      url: photoUrl,
      takenAt: new Date(),
      takenBy: req.user.userId
    });

    // Auto-start if in ASSIGNED status
    if (complaint.status === "ASSIGNED") {
      complaint.status = "IN_PROGRESS";
    }

    await complaint.save();

    res.json({
      success: true,
      message: "Before photo added successfully",
      data: complaint
    });
  } catch (error) {
    console.error("Technician add before photo error:", error);
    res.status(500).json({ success: false, message: "Failed to add before photo" });
  }
});

// POST /api/technician/complaints/:id/after-photo - Upload after photo
router.post("/complaints/:id/after-photo", authenticate, authorize("TECHNICIAN"), async (req, res) => {
  try {
    const { photoUrl, photoType = "photo" } = req.body;
    
    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    // Check if complaint is assigned to this technician
    if (complaint.assignedTo?.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: "Complaint not assigned to you" });
    }

    // Only IN_PROGRESS complaints can have after photos added
    if (complaint.status !== "IN_PROGRESS") {
      return res.status(400).json({ 
        success: false, 
        message: "Only in-progress complaints can have after photos added" 
      });
    }

    // Add after photo
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
});

// POST /api/technician/complaints/:id/comments - Add comment/note to complaint
router.post("/complaints/:id/comments", authenticate, authorize("TECHNICIAN"), async (req, res) => {
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

    // Verify technician is assigned to this complaint
    if (complaint.assignedTo?.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to comment on this complaint' });
    }

    // Add comment
    const comment = {
      text: content,
      type: type, // NOTE or BLOCAGE
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
});

// PUT /api/technician/complaints/:id/location - Update technician location for GPS tracking
router.put("/complaints/:id/location", authenticate, authorize("TECHNICIAN"), async (req, res) => {
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

    // Verify technician is assigned to this complaint
    if (complaint.assignedTo?.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to update location for this complaint' });
    }

    // Update or create technician location tracking
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
});

// GET /api/technician/stats - Get technician statistics
router.get("/stats", authenticate, authorize("TECHNICIAN"), async (req, res) => {
  try {
    const technicianId = req.user.userId;
    
    // Find repair teams where this technician is a member
    const teams = await RepairTeam.find({ members: technicianId }).select("_id").lean();
    const teamIds = teams.map(t => t._id);
    
    // Build query for all complaints assigned to technician (via assignedTo or assignedTeam)
    const baseQuery = {
      $or: [
        { assignedTo: technicianId },
        { assignedTeam: { $in: teamIds } }
      ]
    };

    const [total, assigned, inProgress, resolved] = await Promise.all([
      Complaint.countDocuments(baseQuery),
      Complaint.countDocuments({ ...baseQuery, status: "ASSIGNED" }),
      Complaint.countDocuments({ ...baseQuery, status: "IN_PROGRESS" }),
      Complaint.countDocuments({ ...baseQuery, status: "RESOLVED" })
    ]);

    res.json({
      success: true,
      data: {
        total,
        assigned,
        inProgress,
        resolved
      }
    });
  } catch (error) {
    console.error("Technician get stats error:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve statistics" });
  }
});

module.exports = router;
