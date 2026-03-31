
const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const Complaint = require("../models/Complaint");
const Department = require("../models/Department");
const AuditLog = require("../models/AuditLog");
const { calculatePriorityAndSLA, explainCalculation } = require("../utils/priorityCalculator");

// All citizen routes require authentication and CITIZEN role

// Category to department mapping
const categoryToDepartment = {
  ROAD: "Roads & Infrastructure",
  LIGHTING: "Public Lighting",
  WASTE: "Waste Management",
  WATER: "Water & Sanitation",
  SAFETY: "Public Equipment",
  PUBLIC_PROPERTY: "Urban Planning",
  GREEN_SPACE: "Parks & Green Spaces",
  TRAFFIC: "Traffic & Road Signage",
  URBAN_PLANNING: "Urban Planning",
  EQUIPMENT: "Public Equipment",
  OTHER: "Services Administratifs",
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
      isAnonymous,
      ownerName,
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

    // Validate location if provided and convert to GeoJSON point
    let geoLocation = {};
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
      if (location.latitude !== undefined && location.longitude !== undefined) {
        geoLocation = {
          type: 'Point',
          coordinates: [location.longitude, location.latitude],
          address: location.address,
          commune: location.commune,
          governorate: location.governorate,
          municipality: location.municipality,
        };
      } else {
        // preserve other props if only partial
        geoLocation = location;
      }
    }

    // Validate media if provided
    if (media && Array.isArray(media)) {
      const validMediaTypes = ["photo", "video"];
      for (const item of media) {
        if (!item.type || !validMediaTypes.includes(item.type)) {
          return res.status(400).json({ message: "Invalid media type" });
        }
        // Accept any string URL for now (including blob URLs and data URLs)
        // In production, this should validate proper URLs
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

    // Calculate priority score using intelligent priority calculator
    const priorityResult = calculatePriorityAndSLA({
      category,
      aiUrgencyPrediction: 'MEDIUM',
      userUrgency: urgency,
      confirms: 0,
      upvotes: 0,
      locationType: 'NORMAL',
      createdAt: new Date()
    });
    
    const { priorityScore, urgencyLevel, slaFinal } = priorityResult;

    const extractKeywords = (text) => {
      if (!text) return [];
      const raw = text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ");
      const tokens = raw.split(/\s+/).filter((t) => t.length >= 3);
      const stopwords = new Set([
        "les",
        "des",
        "dans",
        "avec",
        "pour",
        "sur",
        "une",
        "est",
        "and",
        "the",
        "this",
        "that",
        "qui",
        "que",
      ]);
      const counts = {};
      for (const t of tokens) {
        if (stopwords.has(t)) continue;
        counts[t] = (counts[t] || 0) + 1;
      }
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([word]) => word);
    };

    const keywords = extractKeywords(description);

    const complaint = new Complaint({
      title: title.trim(),
      description: description.trim(),
      category: category || "OTHER",
      urgency: urgencyLevel,
      priorityScore,
      location: Object.keys(geoLocation).length ? geoLocation : {},
      municipalityName: location?.municipality || location?.commune || "",
      media: media || [],
      isAnonymous: !!isAnonymous,
      ownerName: !isAnonymous ? ownerName : undefined,
      keywords,
      createdBy: req.user.userId,
      assignedDepartment,
      status: "SUBMITTED",
      slaDeadline: new Date(Date.now() + slaFinal * 60 * 60 * 1000),
    });

    await complaint.save();

    // Create audit log
    await AuditLog.create({
      userId: req.user.userId,
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
    const query = { createdBy: req.user.userId };
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
      createdBy: req.user.userId,
    })
      .populate("assignedDepartment", "name email phone")
      .populate("assignedTeam", "name members")
      .populate("createdBy", "fullName email phone")
      .populate("municipality", "name governorate")
      .populate("assignedTo", "fullName email");

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Add municipality to location if present
    const response = complaint.toObject();
    if (complaint.municipality) {
      response.location = response.location || {};
      response.location.municipality = complaint.municipality.name;
      response.location.governorate = complaint.municipality.governorate;
    }

    res.json({
      message: "Complaint retrieved successfully",
      complaint: response,
    });
  } catch (error) {
    console.error("Get complaint error:", error);
    res.status(500).json({ message: "Failed to retrieve complaint" });
  }
});

// PUT /api/citizen/complaints/:id - Update citizen's own complaint (only if SUBMITTED)
router.put("/complaints/:id", authenticate, authorize("CITIZEN"), async (req, res) => {
  try {
    const { title, description, category, urgency, location, media, phone } = req.body;

    // Find complaint and verify ownership
    const complaint = await Complaint.findOne({
      _id: req.params.id,
      createdBy: req.user.userId,
    });

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Only allow editing if status is SUBMITTED
    if (complaint.status !== "SUBMITTED") {
      return res.status(403).json({ 
        message: "Cannot edit complaint. It has already been processed." 
      });
    }

    // Update fields if provided
    if (title) complaint.title = title;
    if (description) complaint.description = description;
    if (category) complaint.category = category;
    if (urgency) complaint.urgency = urgency;
    if (location) {
      if (location.latitude) complaint.location.latitude = location.latitude;
      if (location.longitude) complaint.location.longitude = location.longitude;
      if (location.address) complaint.location.address = location.address;
      if (location.commune) complaint.location.commune = location.commune;
      if (location.governorate) complaint.location.governorate = location.governorate;
    }
    if (media) complaint.media = media;

    await complaint.save();

    res.json({
      message: "Complaint updated successfully",
      complaint,
    });
  } catch (error) {
    console.error("Update complaint error:", error);
    res.status(500).json({ message: "Failed to update complaint" });
  }
});

// DELETE /api/citizen/complaints/:id - Delete citizen's own complaint (only if SUBMITTED)
router.delete("/complaints/:id", authenticate, authorize("CITIZEN"), async (req, res) => {
  try {
    // Find complaint and verify ownership
    const complaint = await Complaint.findOne({
      _id: req.params.id,
      createdBy: req.user.userId,
    });

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Only allow deletion if status is SUBMITTED
    if (complaint.status !== "SUBMITTED") {
      return res.status(403).json({ 
        message: "Cannot delete complaint. It has already been processed." 
      });
    }

    await Complaint.findByIdAndDelete(req.params.id);

    res.json({
      message: "Complaint deleted successfully",
    });
  } catch (error) {
    console.error("Delete complaint error:", error);
    res.status(500).json({ message: "Failed to delete complaint" });
  }
});

// GET /api/citizen/stats - Get citizen's complaint statistics
router.get("/stats", authenticate, authorize("CITIZEN"), async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const baseQuery = { createdBy: userId, isArchived: false };
    
    const [total, submitted, inProgress, resolved, closed, rejected] = await Promise.all([
      Complaint.countDocuments(baseQuery),
      Complaint.countDocuments({ ...baseQuery, status: "SUBMITTED" }),
      Complaint.countDocuments({ ...baseQuery, status: "IN_PROGRESS" }),
      Complaint.countDocuments({ ...baseQuery, status: "RESOLVED" }),
      Complaint.countDocuments({ ...baseQuery, status: "CLOSED" }),
      Complaint.countDocuments({ ...baseQuery, status: "REJECTED" })
    ]);

    const resolvedCount = resolved + closed;
    const resolutionRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;

    const avgTimeResult = await Complaint.aggregate([
      { $match: { ...baseQuery, status: { $in: ["RESOLVED", "CLOSED"] }, resolvedAt: { $exists: true } } },
      { $group: { _id: null, avgTime: { $avg: { $subtract: ["$resolvedAt", "$createdAt"] } } } }
    ]);
    const averageResolutionTime = avgTimeResult[0] ? Math.round(avgTimeResult[0].avgTime / (1000 * 60 * 60)) : 0;

    res.json({
      success: true,
      data: {
        total,
        submitted,
        inProgress,
        resolved,
        closed,
        rejected,
        resolutionRate,
        averageResolutionTime
      }
    });
  } catch (error) {
    console.error("Citizen get stats error:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve statistics" });
  }
});

module.exports = router;
