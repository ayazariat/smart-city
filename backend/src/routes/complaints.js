const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const complaintController = require("../controllers/complaintController");
const Complaint = require("../models/Complaint");
const User = require("../models/User");
const { normalizeMunicipality } = require("../utils/normalize");
const { calculatePriorityAndSLA } = require("../utils/priorityCalculator");

const rateLimit = require("express-rate-limit");
const createLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: { message: "Too many submissions, please try again later." } });

// Public routes
// None for now

// Protected routes - all require authentication
router.use(authenticate);

// Citizen routes - create and manage their own complaints
router.post("/", createLimiter, complaintController.create);

// My complaints routes - must come BEFORE /:id to avoid matching issues
router.get("/my-complaints", complaintController.getMyComplaints);
router.get("/my-complaints/:id", complaintController.getComplaintById);

// Archive route - must come BEFORE /:id to avoid "archived" being treated as an ID
router.get("/archived", authenticate, async (req, res) => {
  try {
    const { filter, search, page = 1, limit = 10 } = req.query;
    
    // ONLY closed and rejected
    let query = { status: { $in: ['CLOSED', 'REJECTED'] } };
    
    // Filter by specific status
    if (filter === 'CLOSED') query.status = 'CLOSED';
    if (filter === 'REJECTED') query.status = 'REJECTED';
    
    // Search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { referenceId: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Role-based filter
    if (req.user.role === 'MUNICIPAL_AGENT') {
      const user = await User.findById(req.user.userId).select('municipality municipalityName governorate').lean();
      if (user && user.municipalityName) {
        const normalizedMun = normalizeMunicipality(user.municipalityName);
        const munRegex = new RegExp("^" + normalizedMun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "$", "i");
        query.$or = [
          { municipalityNormalized: normalizedMun },
          { municipalityName: munRegex },
          { "location.municipality": munRegex }
        ];
      }
    }
    // ADMIN sees all archived complaints - no additional filter needed
    if (req.user.role === 'DEPARTMENT_MANAGER' && req.user.department) {
      query.assignedDepartment = req.user.department;
    }
    if (req.user.role === 'TECHNICIAN') {
      query.assignedTo = req.user.userId;
      // Technicians only see CLOSED (resolved and approved), not REJECTED
      query.status = 'CLOSED';
    }
    if (req.user.role === 'CITIZEN') {
      query.createdBy = req.user.userId;
    }
    
    const total = await Complaint.countDocuments(query);
    const complaints = await Complaint.find(query)
      .populate('createdBy', 'fullName email')
      .populate('assignedDepartment', 'name')
      .populate('municipality', 'name')
      .skip((page-1)*limit)
      .limit(parseInt(limit))
      .sort({ updatedAt: -1 });
    
    res.json({ 
      success: true,
      complaints, 
      total, 
      page: parseInt(page), 
      pages: Math.ceil(total/limit) 
    });
  } catch (error) {
    console.error('Archive error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Admin/Agent routes - manage all complaints
router.get("/", authorize("ADMIN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER"), complaintController.getAllComplaints);
router.get("/stats", authorize("ADMIN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER"), complaintController.getStats);
router.get("/technicians", authorize("ADMIN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER"), complaintController.getTechnicians);
router.patch("/:id/status", authorize("ADMIN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER"), complaintController.updateStatus);
router.patch("/:id/assign", authorize("ADMIN", "DEPARTMENT_MANAGER"), complaintController.assignComplaint);
router.patch("/:id/department", authorize("ADMIN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER"), complaintController.assignDepartment);
router.patch("/:id/priority", authorize("ADMIN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER"), complaintController.updatePriority);
router.patch("/:id/archive", authorize("ADMIN"), complaintController.archiveComplaint);
router.patch("/:id/unarchive", authorize("ADMIN"), complaintController.unarchiveComplaint);

// Citizen confirmation routes (BL-28)
router.post("/:id/confirm", async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    // Only citizens can confirm
    if (req.user.role !== "CITIZEN") {
      return res.status(403).json({ success: false, message: "Only citizens can confirm complaints" });
    }

    // Cannot confirm own complaint
    const createdById = complaint.createdBy?._id?.toString() || complaint.createdBy?.toString();
    if (createdById === req.user.userId) {
      return res.status(400).json({ success: false, message: "You cannot confirm your own complaint" });
    }

    // Check if already confirmed
    const alreadyConfirmed = complaint.confirmations?.some(
      c => c.citizenId?.toString() === req.user.userId
    );
    if (alreadyConfirmed) {
      return res.status(400).json({ success: false, message: "You have already confirmed this complaint" });
    }

    // Add confirmation
    if (!complaint.confirmations) complaint.confirmations = [];
    complaint.confirmations.push({
      citizenId: req.user.userId,
      confirmedAt: new Date()
    });
    complaint.confirmationCount = (complaint.confirmationCount || 0) + 1;
    
    // Recalculate priority score using intelligent system
    const priorityResult = calculatePriorityAndSLA({
      category: complaint.category,
      aiUrgencyPrediction: 'MEDIUM',
      userUrgency: complaint.urgency,
      confirms: complaint.confirmationCount || 0,
      upvotes: complaint.upvoteCount || 0,
      locationType: 'NORMAL',
      createdAt: complaint.createdAt
    });
    complaint.priorityScore = priorityResult.priorityScore;
    complaint.urgency = priorityResult.urgencyLevel;
    complaint.slaDeadline = new Date(Date.now() + priorityResult.slaFinal * 60 * 60 * 1000);
    
    await complaint.save();

    res.json({
      success: true,
      confirmationCount: complaint.confirmationCount,
      priorityScore: complaint.priorityScore,
      urgency: complaint.urgency,
      message: "Complaint confirmed successfully"
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/:id/confirm", async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    const confirmIndex = complaint.confirmations?.findIndex(
      c => c.citizenId?.toString() === req.user.userId
    );
    if (confirmIndex === -1 || confirmIndex === undefined) {
      return res.status(400).json({ success: false, message: "You have not confirmed this complaint" });
    }

    // Check 24h limit
    const confirmedAt = complaint.confirmations[confirmIndex].confirmedAt;
    const hoursSince = (Date.now() - new Date(confirmedAt).getTime()) / 3600000;
    if (hoursSince > 24) {
      return res.status(400).json({ success: false, message: "Cannot revoke confirmation after 24 hours" });
    }

    complaint.confirmations.splice(confirmIndex, 1);
    complaint.confirmationCount = Math.max(0, (complaint.confirmationCount || 0) - 1);
    
    // Recalculate priority score using intelligent system
    const priorityResult = calculatePriorityAndSLA({
      category: complaint.category,
      aiUrgencyPrediction: 'MEDIUM',
      userUrgency: complaint.urgency,
      confirms: complaint.confirmationCount || 0,
      upvotes: complaint.upvoteCount || 0,
      locationType: 'NORMAL',
      createdAt: complaint.createdAt
    });
    complaint.priorityScore = priorityResult.priorityScore;
    complaint.urgency = priorityResult.urgencyLevel;
    complaint.slaDeadline = new Date(Date.now() + priorityResult.slaFinal * 60 * 60 * 1000);
    
    await complaint.save();

    res.json({
      success: true,
      confirmationCount: complaint.confirmationCount,
      priorityScore: complaint.priorityScore,
      urgency: complaint.urgency,
      message: "Confirmation removed"
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Citizen upvote routes (BL-28)
router.post("/:id/upvote", async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    if (req.user.role !== "CITIZEN") {
      return res.status(403).json({ success: false, message: "Only citizens can upvote complaints" });
    }

    const alreadyUpvoted = complaint.upvotes?.some(
      u => u.citizenId?.toString() === req.user.userId
    );
    if (alreadyUpvoted) {
      return res.status(400).json({ success: false, message: "You have already upvoted this complaint" });
    }

    if (!complaint.upvotes) complaint.upvotes = [];
    complaint.upvotes.push({
      citizenId: req.user.userId,
      upvotedAt: new Date()
    });
    complaint.upvoteCount = (complaint.upvoteCount || 0) + 1;
    
    // Recalculate priority score using intelligent system
    const priorityResult = calculatePriorityAndSLA({
      category: complaint.category,
      aiUrgencyPrediction: 'MEDIUM',
      userUrgency: complaint.urgency,
      confirms: complaint.confirmationCount || 0,
      upvotes: complaint.upvoteCount || 0,
      locationType: 'NORMAL',
      createdAt: complaint.createdAt
    });
    complaint.priorityScore = priorityResult.priorityScore;
    complaint.urgency = priorityResult.urgencyLevel;
    complaint.slaDeadline = new Date(Date.now() + priorityResult.slaFinal * 60 * 60 * 1000);
    
    await complaint.save();

    res.json({
      success: true,
      upvoteCount: complaint.upvoteCount,
      priorityScore: complaint.priorityScore,
      urgency: complaint.urgency,
      message: "Upvote added successfully"
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/:id/upvote", async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    const upvoteIndex = complaint.upvotes?.findIndex(
      u => u.citizenId?.toString() === req.user.userId
    );
    if (upvoteIndex === -1 || upvoteIndex === undefined) {
      return res.status(400).json({ success: false, message: "You have not upvoted this complaint" });
    }

    // Check 24h limit
    const upvotedAt = complaint.upvotes[upvoteIndex].upvotedAt;
    const hoursSince = (Date.now() - new Date(upvotedAt).getTime()) / 3600000;
    if (hoursSince > 24) {
      return res.status(400).json({ success: false, message: "Cannot revoke upvote after 24 hours" });
    }

    complaint.upvotes.splice(upvoteIndex, 1);
    complaint.upvoteCount = Math.max(0, (complaint.upvoteCount || 0) - 1);
    
    // Recalculate priority score using intelligent system
    const priorityResult = calculatePriorityAndSLA({
      category: complaint.category,
      aiUrgencyPrediction: 'MEDIUM',
      userUrgency: complaint.urgency,
      confirms: complaint.confirmationCount || 0,
      upvotes: complaint.upvoteCount || 0,
      locationType: 'NORMAL',
      createdAt: complaint.createdAt
    });
    complaint.priorityScore = priorityResult.priorityScore;
    complaint.urgency = priorityResult.urgencyLevel;
    complaint.slaDeadline = new Date(Date.now() + priorityResult.slaFinal * 60 * 60 * 1000);
    
    await complaint.save();

    res.json({
      success: true,
      upvoteCount: complaint.upvoteCount,
      priorityScore: complaint.priorityScore,
      urgency: complaint.urgency,
      message: "Upvote removed"
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/complaints/:id/priority - Get priority calculation details
router.get("/:id/priority", async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }
    
    const { calculatePriorityAndSLA, explainCalculation } = require("../utils/priorityCalculator");
    
    const priorityResult = calculatePriorityAndSLA({
      category: complaint.category,
      aiUrgencyPrediction: 'MEDIUM',
      userUrgency: complaint.urgency,
      confirms: complaint.confirmationCount || 0,
      upvotes: complaint.upvoteCount || 0,
      locationType: 'NORMAL',
      createdAt: complaint.createdAt
    });
    
    const explanation = explainCalculation({
      category: complaint.category,
      aiUrgencyPrediction: 'MEDIUM',
      userUrgency: complaint.urgency,
      confirms: complaint.confirmationCount || 0,
      upvotes: complaint.upvoteCount || 0,
      locationType: 'NORMAL',
      priorityScore: priorityResult.priorityScore,
      urgencyLevel: priorityResult.urgencyLevel,
      slaFinal: priorityResult.slaFinal
    });
    
    res.json({
      success: true,
      priorityScore: priorityResult.priorityScore,
      urgencyLevel: priorityResult.urgencyLevel,
      slaFinal: priorityResult.slaFinal,
      elapsedTime: priorityResult.elapsedTime,
      progress: priorityResult.progress,
      status: priorityResult.status,
      explanation
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Analytics endpoint added\n// Common routes - both citizens and admin can access
router.get("/:id", complaintController.getComplaintById);
router.post("/:id/comments", complaintController.addComment);

module.exports = router;

