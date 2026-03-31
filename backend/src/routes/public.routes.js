const express = require("express");
const router = express.Router();
const Complaint = require("../models/Complaint");
const User = require("../models/User");
const { authenticate, authorize } = require("../middleware/auth");
const { normalizeMunicipality } = require("../utils/normalize");

// Public routes - NO authentication required

// GET /api/public/stats - Get aggregated statistics
router.get("/stats", async (req, res) => {
  try {
    const { period = "month" } = req.query;
    
    // Calculate date range based on period
    let startDate = new Date();
    if (period === "today") {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "week") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === "month") {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === "year") {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    // Get complaints within period
    const complaints = await Complaint.find({
      createdAt: { $gte: startDate }
    });

    // Total counts
    const total = complaints.length;
    const resolved = complaints.filter(c => c.status === "RESOLVED" || c.status === "CLOSED").length;
    const inProgress = complaints.filter(c => ["ASSIGNED", "IN_PROGRESS"].includes(c.status)).length;
    const pending = complaints.filter(c => c.status === "SUBMITTED" || c.status === "VALIDATED").length;

    // Calculate average resolution time (for resolved complaints)
    const resolvedComplaints = complaints.filter(c => c.resolvedAt && c.createdAt);
    let avgResolutionDays = 0;
    if (resolvedComplaints.length > 0) {
      const totalHours = resolvedComplaints.reduce((sum, c) => {
        return sum + (new Date(c.resolvedAt).getTime() - new Date(c.createdAt).getTime());
      }, 0);
      avgResolutionDays = (totalHours / resolvedComplaints.length / (1000 * 60 * 60 * 24)).toFixed(1);
    }

    // Count overdue (SLA overdue or > 7 days)
    const overdue = complaints.filter(c => {
      if (c.slaDeadline && new Date(c.slaDeadline) < new Date()) return true;
      if (["ASSIGNED", "IN_PROGRESS"].includes(c.status)) {
        const daysOpen = (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return daysOpen > 7;
      }
      return false;
    }).length;

    res.json({
      success: true,
      data: {
        period,
        total,
        resolved,
        inProgress,
        pending,
        overdue,
        resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
        avgResolutionDays: parseFloat(avgResolutionDays),
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Public stats error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch statistics" });
  }
});

// GET /api/public/stats/by-category - Get statistics by category
router.get("/stats/by-category", async (req, res) => {
  try {
    const { period = "month" } = req.query;
    
    let startDate = new Date();
    if (period === "week") startDate.setDate(startDate.getDate() - 7);
    else if (period === "month") startDate.setMonth(startDate.getMonth() - 1);
    else if (period === "year") startDate.setFullYear(startDate.getFullYear() - 1);
    else startDate.setHours(0, 0, 0, 0);

    const complaints = await Complaint.find({ createdAt: { $gte: startDate } });

    const categoryStats = {};
    const categories = ["ROAD", "LIGHTING", "WASTE", "WATER", "SAFETY", "PUBLIC_PROPERTY", "GREEN_SPACE", "TRAFFIC", "BUILDING", "NOISE", "EQUIPMENT", "URBAN_PLANNING", "OTHER"];
    
    for (const cat of categories) {
      const catComplaints = complaints.filter(c => c.category === cat);
      const resolved = catComplaints.filter(c => c.status === "RESOLVED" || c.status === "CLOSED").length;
      categoryStats[cat] = {
        total: catComplaints.length,
        resolved,
        rate: catComplaints.length > 0 ? Math.round((resolved / catComplaints.length) * 100) : 0
      };
    }

    res.json({
      success: true,
      data: categoryStats
    });
  } catch (error) {
    console.error("Category stats error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch category statistics" });
  }
});

// GET /api/public/stats/by-municipality - Get statistics by municipality/zone
router.get("/stats/by-municipality", async (req, res) => {
  try {
    const { period = "month" } = req.query;
    
    let startDate = new Date();
    if (period === "week") startDate.setDate(startDate.getDate() - 7);
    else if (period === "month") startDate.setMonth(startDate.getMonth() - 1);
    else if (period === "year") startDate.setFullYear(startDate.getFullYear() - 1);
    else startDate.setHours(0, 0, 0, 0);

    const complaints = await Complaint.find({ createdAt: { $gte: startDate } });

    // Group by municipality/commune
    const municipalityStats = {};
    
    for (const complaint of complaints) {
      const municipality = complaint.location?.commune || complaint.municipalityName || "Unknown";
      if (!municipalityStats[municipality]) {
        municipalityStats[municipality] = { total: 0, resolved: 0 };
      }
      municipalityStats[municipality].total++;
      if (complaint.status === "RESOLVED" || complaint.status === "CLOSED") {
        municipalityStats[municipality].resolved++;
      }
    }

    // Convert to array with rates
    const result = Object.entries(municipalityStats).map(([name, stats]) => ({
      name,
      total: stats.total,
      resolved: stats.resolved,
      rate: stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0
    })).sort((a, b) => b.total - a.total);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Municipality stats error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch municipality statistics" });
  }
});

// GET /api/public/top-urgent - Get top urgent complaints (>5 confirms)
router.get("/top-urgent", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    const urgentComplaints = await Complaint.find({
      $expr: { $gte: [{ $size: { $ifNull: ["$confirmations", []] } }, 5] },
      status: { $nin: ["CLOSED", "REJECTED"] }
    })
      .select("title category status confirmationCount location createdAt")
      .sort({ confirmationCount: -1, createdAt: -1 })
      .limit(limit);

    res.json({
      success: true,
      data: urgentComplaints
    });
  } catch (error) {
    console.error("Top urgent error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch urgent complaints" });
  }
});

// GET /api/public/resolution-times - Get average resolution times
router.get("/resolution-times", async (req, res) => {
  try {
    const { period = "month" } = req.query;
    
    let startDate = new Date();
    if (period === "week") startDate.setDate(startDate.getDate() - 7);
    else if (period === "month") startDate.setMonth(startDate.getMonth() - 1);
    else if (period === "year") startDate.setFullYear(startDate.getFullYear() - 1);
    else startDate.setHours(0, 0, 0, 0);

    const complaints = await Complaint.find({ 
      createdAt: { $gte: startDate },
      resolvedAt: { $exists: true }
    });

    // Group by category
    const categoryTimes = {};
    const categories = ["ROAD", "LIGHTING", "WASTE", "WATER", "SAFETY", "PUBLIC_PROPERTY", "GREEN_SPACE", "TRAFFIC", "BUILDING", "NOISE", "EQUIPMENT", "URBAN_PLANNING", "OTHER"];
    
    for (const cat of categories) {
      const catComplaints = complaints.filter(c => c.category === cat);
      if (catComplaints.length > 0) {
        const avgHours = catComplaints.reduce((sum, c) => {
          return sum + (new Date(c.resolvedAt).getTime() - new Date(c.createdAt).getTime());
        }, 0) / catComplaints.length;
        
        categoryTimes[cat] = {
          count: catComplaints.length,
          avgDays: (avgHours / (1000 * 60 * 60 * 24)).toFixed(1)
        };
      }
    }

    res.json({
      success: true,
      data: categoryTimes
    });
  } catch (error) {
    console.error("Resolution times error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch resolution times" });
  }
});

// GET /api/public/complaints - Get public complaints (validated, assigned, in_progress, resolved)
router.get("/complaints", async (req, res) => {
  try {
    const { 
      category, 
      status, 
      municipality,
      page = 1, 
      limit = 20,
      sort = "newest"
    } = req.query;
    
    const query = {
      // Only show public statuses
      status: { $in: ["VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED"] }
    };
    
    if (category) {
      query.category = category;
    }
    
    if (status) {
      // Support comma-separated status values
      const statusList = status.split(',').map(s => s.trim().toUpperCase());
      if (statusList.length > 1) {
        query.status = { $in: statusList };
      } else {
        query.status = statusList[0];
      }
    }
    
    if (municipality) {
      query["location.municipality"] = municipality;
    }
    
    const sortOptions = {};
    if (sort === "oldest") {
      sortOptions.createdAt = 1;
    } else if (sort === "priority") {
      sortOptions.priorityScore = -1;
    } else {
      sortOptions.createdAt = -1; // newest first
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .select("title description category status location createdAt priorityScore confirmationCount upvoteCount media municipalityName referenceId")
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Complaint.countDocuments(query)
    ]);
    
    res.json({
      success: true,
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
    console.error("Public complaints error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch complaints" });
  }
});

// GET /api/public/complaints/:id - Get single complaint by ID (public, no personal data)
router.get("/complaints/:id", async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .select("title description category status priorityScore municipalityName location createdAt updatedAt media confirmationCount upvoteCount")
      .lean();
    
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }
    
    // Only show public statuses
    const publicStatuses = ["VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED"];
    if (!publicStatuses.includes(complaint.status)) {
      return res.status(404).json({ success: false, message: "Complaint not available" });
    }
    
    res.json({
      success: true,
      data: complaint
    });
  } catch (error) {
    console.error("Public complaint detail error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch complaint" });
  }
});

// GET /api/public/my-municipality-complaints - Get complaints for citizen's municipality (requires auth)
router.get("/my-municipality-complaints", authenticate, authorize("CITIZEN"), async (req, res) => {
  try {
    const { category, status, page = 1, limit = 20 } = req.query;
    
    // Get citizen's municipality from their profile
    const user = await User.findById(req.user.userId).select('municipality municipalityName').lean();
    const userMunicipality = user?.municipalityName || "";
    const normalizedMun = normalizeMunicipality(userMunicipality);
    
    if (!normalizedMun) {
      return res.json({ success: true, complaints: [], total: 0, page: 1, pages: 1 });
    }
    
    const munRegex = new RegExp("^" + normalizedMun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "$", "i");
    
    const query = {
      $or: [
        { municipalityNormalized: normalizedMun },
        { municipalityName: munRegex },
        { "location.municipality": munRegex }
      ],
      status: { $in: ["VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED"] }
    };
    
    if (category) {
      query.category = category;
    }
    
    if (status) {
      const statusList = status.split(",");
      query.status = { $in: statusList };
    }
    
    const total = await Complaint.countDocuments(query);
    const complaints = await Complaint.find(query)
      .select('title description category status priorityScore municipalityName location createdAt upvotes confirmations referenceId media')
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      complaints,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error("My municipality complaints error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch complaints" });
  }
});

// POST /api/public/complaints/:id/confirm - Confirm a complaint (requires auth)
router.post("/complaints/:id/confirm", authenticate, authorize("CITIZEN"), async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }
    
    // Check if already confirmed
    const existingIndex = (complaint.confirmations || []).findIndex(
      c => c.userId.toString() === req.user.userId.toString()
    );
    
    if (existingIndex >= 0) {
      // Remove confirmation
      complaint.confirmations.splice(existingIndex, 1);
    } else {
      // Add confirmation
      complaint.confirmations = complaint.confirmations || [];
      complaint.confirmations.push({
        userId: req.user.userId,
        confirmedAt: new Date()
      });
    }
    
    await complaint.save();
    
    res.json({
      success: true,
      message: existingIndex >= 0 ? "Confirmation removed" : "Complaint confirmed",
      confirmationCount: complaint.confirmations?.length || 0
    });
  } catch (error) {
    console.error("Confirm error:", error);
    res.status(500).json({ success: false, message: "Failed to confirm complaint" });
  }
});

// POST /api/public/complaints/:id/upvote - Upvote a complaint (requires auth)
router.post("/complaints/:id/upvote", authenticate, authorize("CITIZEN"), async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }
    
    // Check if already upvoted
    const existingIndex = (complaint.votes || []).findIndex(
      v => v.userId.toString() === req.user.userId.toString()
    );
    
    if (existingIndex >= 0) {
      // Remove upvote
      complaint.votes.splice(existingIndex, 1);
    } else {
      // Add upvote
      complaint.votes = complaint.votes || [];
      complaint.votes.push({
        userId: req.user.userId,
        votedAt: new Date()
      });
    }
    
    await complaint.save();
    
    res.json({
      success: true,
      message: existingIndex >= 0 ? "Upvote removed" : "Complaint upvoted",
      voteCount: complaint.votes?.length || 0
    });
  } catch (error) {
    console.error("Upvote error:", error);
    res.status(500).json({ success: false, message: "Failed to upvote complaint" });
  }
});

module.exports = router;
