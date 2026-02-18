const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const Complaint = require("../models/Complaint");
const Department = require("../models/Department");
const AuditLog = require("../models/AuditLog");

// All citizen routes require authentication and CITIZEN role

// Category to department mapping
const categoryToDepartment = {
  ROAD: "Roads",
  LIGHTING: "Lighting",
  WASTE: "Waste Management",
  WATER: "Water",
  SAFETY: "Public Safety",
  PUBLIC_PROPERTY: "Public Property",
  OTHER: "General",
};

// Priority scores based on urgency
const urgencyPriorityScore = {
  LOW: 1,
  MEDIUM: 5,
  HIGH: 8,
  URGENT: 10,
};

router.get("/profile", authenticate, authorize("CITIZEN"), (req, res) => {
  res.json({
    message: "Citizen profile access granted",
    user: req.user,
  });
});

// POST /api/citizen/complaints - Submit a new complaint
router.post("/complaints", authenticate, authorize("CITIZEN"), async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      urgency,
      location,
      media,
    } = req.body;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ message: "Description is required" });
    }

    // Validate title length
    if (title.trim().length < 5) {
      return res.status(400).json({ message: "Title must be at least 5 characters" });
    }

    // Validate description length
    if (description.trim().length < 20) {
      return res.status(400).json({ message: "Description must be at least 20 characters" });
    }

    // Validate category
    const validCategories = ["ROAD", "LIGHTING", "WASTE", "WATER", "SAFETY", "PUBLIC_PROPERTY", "OTHER"];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    // Validate urgency
    const validUrgencies = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    if (urgency && !validUrgencies.includes(urgency)) {
      return res.status(400).json({ message: "Invalid urgency level" });
    }

    // Validate location if provided
    if (location) {
      if (location.latitude !== undefined) {
        if (typeof location.latitude !== "number" || location.latitude < -90 || location.latitude > 90) {
          return res.status(400).json({ message: "Invalid latitude" });
        }
      }
      if (location.longitude !== undefined) {
        if (typeof location.longitude !== "number" || location.longitude < -180 || location.longitude > 180) {
          return res.status(400).json({ message: "Invalid longitude" });
        }
      }
    }

    // Validate media if provided
    if (media && Array.isArray(media)) {
      const validMediaTypes = ["photo", "video"];
      for (const item of media) {
        if (!item.type || !validMediaTypes.includes(item.type)) {
          return res.status(400).json({ message: "Invalid media type" });
        }
        if (!item.url || typeof item.url !== "string") {
          return res.status(400).json({ message: "Invalid media URL" });
        }
      }
    }

    // Find department based on category
    let assignedDepartment = null;
    const departmentName = categoryToDepartment[category] || "General";
    const department = await Department.findOne({ name: departmentName });
    if (department) {
      assignedDepartment = department._id;
    }

    // Calculate priority score
    const priorityScore = urgencyPriorityScore[urgency] || urgencyPriorityScore.MEDIUM;

    // Create complaint
    const complaint = new Complaint({
      title: title.trim(),
      description: description.trim(),
      category: category || "OTHER",
      urgency: urgency || "MEDIUM",
      priorityScore,
      location: location || {},
      media: media || [],
      createdBy: req.user._id,
      assignedDepartment,
      status: "SUBMITTED",
    });

    await complaint.save();

    // Create audit log
    await AuditLog.create({
      userId: req.user._id,
      action: "COMPLAINT_CREATED",
      details: { complaintId: complaint._id, category: complaint.category },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json({
      message: "Complaint submitted successfully",
      complaint: {
        id: complaint._id,
        title: complaint.title,
        description: complaint.description,
        category: complaint.category,
        urgency: complaint.urgency,
        status: complaint.status,
        location: complaint.location,
        media: complaint.media,
        createdAt: complaint.createdAt,
      },
    });
  } catch (error) {
    console.error("Complaint submission error:", error);
    res.status(500).json({ message: "Failed to submit complaint" });
  }
});

// GET /api/citizen/complaints - Get citizen's complaints
router.get("/complaints", authenticate, authorize("CITIZEN"), async (req, res) => {
  try {
    const { status, category, sort = "-createdAt", limit = 20, page = 1 } = req.query;

    // Build query
    const query = { createdBy: req.user._id };
    if (status) {
      query.status = status;
    }
    if (category) {
      query.category = category;
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const complaints = await Complaint.find(query)
      .populate("assignedDepartment", "name email")
      .populate("assignedTeam", "name")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Complaint.countDocuments(query);

    res.json({
      message: "Complaints retrieved successfully",
      complaints,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get complaints error:", error);
    res.status(500).json({ message: "Failed to retrieve complaints" });
  }
});

// GET /api/citizen/complaints/:id - Get single complaint
router.get("/complaints/:id", authenticate, authorize("CITIZEN"), async (req, res) => {
  try {
    const complaint = await Complaint.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    })
      .populate("assignedDepartment", "name email phone")
      .populate("assignedTeam", "name members")
      .populate("createdBy", "fullName email phone");

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    res.json({
      message: "Complaint retrieved successfully",
      complaint,
    });
  } catch (error) {
    console.error("Get complaint error:", error);
    res.status(500).json({ message: "Failed to retrieve complaint" });
  }
});

module.exports = router;
