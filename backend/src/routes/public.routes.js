const express = require("express");
const router = express.Router();
const Complaint = require("../models/Complaint");
const Department = require("../models/Department");
const aiService = require("../services/ai.service");
const { authenticate } = require("../middleware/auth");

// Cache control middleware (optional, can be adjusted)
const setCacheHeaders = (req, res, next) => {
  res.set("Cache-Control", "public, max-age=60"); // 1 minute cache
  next();
};
router.use(setCacheHeaders);

/**
 * Helper function to predict department based on category/description
 */
const predictDepartment = (category, description) => {
  const keywords = {
    "Roads & Infrastructure": ["road", "pavement", "hole", "damage", "street", "road", "infrastructure", "bridge", "sidewalk"],
    "Public Lighting": ["light", "lamp", "dark", "streetlight", "lighting", "electricity", "power"],
    "Waste Management": ["waste", "garbage", "trash", "bin", "clean", " collecte", "déchet", " poubelle", "salubrit"],
    "Parks & Green Spaces": ["park", "tree", "garden", "green", "vegetation", "jardin", "espace vert", "arbre"],
    "Water & Sanitation": ["water", "drainage", "sewer", "flood", "égout", "eau", "assainissement", "inondation"],
    "Traffic & Road Signage": ["traffic", "sign", "signal", "road sign", "stop", "signalisation", "panneau", "circulation"],
    "Urban Planning": ["building", "construction", "permit", "urban", "construction", "bâtiment", "permis", "urbanisme"],
    "Public Equipment": ["equipment", "bench", "furniture", "équipement", "banc", "mobilier"],
  };
  
  const categoryMap = {
    "ROAD": "Roads & Infrastructure",
    "LIGHTING": "Public Lighting",
    "WASTE": "Waste Management",
    "WATER": "Water & Sanitation",
    "SAFETY": "Traffic & Road Signage",
    "PUBLIC_PROPERTY": "Public Equipment",
    "GREEN_SPACE": "Parks & Green Spaces",
    "BUILDING": "Urban Planning",
    "NOISE": "Waste Management",
    "OTHER": "Roads & Infrastructure",
  };
  
  // First try category mapping
  if (category && categoryMap[category]) {
    return { department: categoryMap[category], confidence: 75 };
  }
  
  // Then try keyword matching in description
  const descLower = (description || "").toLowerCase();
  let bestMatch = { department: "Roads & Infrastructure", confidence: 40 };
  
  for (const [dept, words] of Object.entries(keywords)) {
    let matches = 0;
    for (const word of words) {
      if (descLower.includes(word.toLowerCase())) matches++;
    }
    if (matches > 0) {
      const confidence = Math.min(95, 50 + (matches * 15));
      if (confidence > bestMatch.confidence) {
        bestMatch = { department: dept, confidence };
      }
    }
  }
  
  return bestMatch;
};

/**
 * POST /api/public/ai/predict-department - AI department suggestion
 */
router.post("/ai/predict-department", async (req, res) => {
  try {
    const { category, description } = req.body;
    
    const prediction = predictDepartment(category, description);
    
    // Find the department by name
    const department = await Department.findOne({ name: prediction.department });
    
    res.json({
      success: true,
      data: {
        suggestedDepartment: department?._id,
        departmentName: prediction.department,
        confidence: prediction.confidence,
        message: `AI suggests: ${prediction.department} (${prediction.confidence}% confidence)`
      }
    });
  } catch (error) {
    console.error("AI prediction error:", error);
    res.status(500).json({ success: false, message: "Failed to predict department" });
  }
});

/**
 * GET /api/public/stats - overall aggregated statistics
 * Query params: period (optional: week/month/year/all)
 */
router.get("/stats", async (req, res) => {
  try {
    const { period } = req.query;
    const match = buildPeriodMatch(period);

    // Current period stats
    const [
      total,
      submitted,
      validated,
      assigned,
      inProgress,
      resolved,
      closed,
      overdue,
      pending,
      resolvedComplaints,
      byCategory,
      byMonth,
      atRisk,
    ] = await Promise.all([
      Complaint.countDocuments(match),
      Complaint.countDocuments({ ...match, status: "SUBMITTED" }),
      Complaint.countDocuments({ ...match, status: "VALIDATED" }),
      Complaint.countDocuments({ ...match, status: "ASSIGNED" }),
      Complaint.countDocuments({ ...match, status: "IN_PROGRESS" }),
      Complaint.countDocuments({ ...match, status: "RESOLVED" }),
      Complaint.countDocuments({ ...match, status: "CLOSED" }),
      Complaint.countDocuments({
        ...match,
        slaStatus: "OVERDUE",
        status: { $in: ["VALIDATED", "ASSIGNED", "IN_PROGRESS"] },
      }),
      Complaint.countDocuments({
        ...match,
        status: { $in: ["SUBMITTED", "VALIDATED", "ASSIGNED"] },
      }),
      Complaint.find({
        ...match,
        status: { $in: ["RESOLVED", "CLOSED"] },
        resolvedAt: { $exists: true },
        createdAt: { $exists: true },
      }).select("resolvedAt createdAt slaStatus"),
      Complaint.aggregate([
        { $match: { ...match, status: { $in: ["SUBMITTED", "VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"] } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Complaint.aggregate([
        { $match: { ...match, createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { $substr: [{$dateToString: { format: "%Y-%m", date: "$createdAt" }}, 0, 7] }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $limit: 6 }
      ]),
      Complaint.countDocuments({
        ...match,
        slaStatus: "AT_RISK",
        status: { $in: ["VALIDATED", "ASSIGNED", "IN_PROGRESS"] }
      }),
    ]);

    const resolvedCount = resolved + closed;
    const resolutionRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;

    // Compute avg resolution days and SLA compliance for current period
    let totalResolutionDays = 0;
    let onTimeCount = 0;
    resolvedComplaints.forEach((c) => {
      const resolved = new Date(c.resolvedAt).getTime();
      const created = new Date(c.createdAt).getTime();
      if (!isNaN(resolved) && !isNaN(created) && resolved > created) {
        totalResolutionDays += Math.round((resolved - created) / (1000 * 60 * 60 * 24));
      }
      if (c.slaStatus === "COMPLETED") {
        onTimeCount++;
      }
    });

    const avgResolutionDays = resolvedCount > 0 ? Math.round(totalResolutionDays / resolvedCount) : 0;
    const slaComplianceRate = resolvedCount > 0 ? Math.round((onTimeCount / resolvedCount) * 100) : 0;

    // Compute trends vs previous period (skip for 'all' period)
    let trends = {};
    if (period !== "all") {
      const nowDate = new Date();
      const currentStartDate = new Date();
      switch (period) {
        case "week":
          currentStartDate.setDate(nowDate.getDate() - 7);
          break;
        case "month":
          currentStartDate.setMonth(nowDate.getMonth() - 1);
          break;
        case "year":
          currentStartDate.setFullYear(nowDate.getFullYear() - 1);
          break;
        default:
          break;
      }
      const durationMs = nowDate.getTime() - currentStartDate.getTime();
      const prevStartDate = new Date(currentStartDate.getTime() - durationMs);
      const prevEndDate = currentStartDate;

      const prevMatch = {
        createdAt: { $gte: prevStartDate, $lt: prevEndDate },
      };

      const [
        prevTotal,
        prevResolved,
        prevClosed,
        prevResolvedComplaints,
      ] = await Promise.all([
        Complaint.countDocuments(prevMatch),
        Complaint.countDocuments({ ...prevMatch, status: "RESOLVED" }),
        Complaint.countDocuments({ ...prevMatch, status: "CLOSED" }),
        Complaint.find({
          ...prevMatch,
          status: { $in: ["RESOLVED", "CLOSED"] },
          resolvedAt: { $exists: true },
          createdAt: { $exists: true },
        }).select("resolvedAt createdAt slaStatus"),
      ]);

      const prevResolvedCount = prevResolved + prevClosed;
      const prevResolutionRate = prevTotal > 0 ? Math.round((prevResolvedCount / prevTotal) * 100) : 0;

      let prevTotalResolutionDays = 0;
      let prevOnTimeCount = 0;
      prevResolvedComplaints.forEach((c) => {
        const resolved = new Date(c.resolvedAt).getTime();
        const created = new Date(c.createdAt).getTime();
        if (!isNaN(resolved) && !isNaN(created) && resolved > created) {
          prevTotalResolutionDays += Math.round((resolved - created) / (1000 * 60 * 60 * 24));
        }
        if (c.slaStatus === "COMPLETED") {
          prevOnTimeCount++;
        }
      });
      const prevAvgResolutionDays = prevResolvedCount > 0 ? Math.round(prevTotalResolutionDays / prevResolvedCount) : 0;
      const prevSlaComplianceRate = prevResolvedCount > 0 ? Math.round((prevOnTimeCount / prevResolvedCount) * 100) : 0;

      // Calculate trends as percentage change
      const totalTrend = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : 0;
      const resolvedTrend = prevResolvedCount > 0 ? Math.round(((resolvedCount - prevResolvedCount) / prevResolvedCount) * 100) : 0;
      const resolutionRateTrend = prevResolutionRate > 0 ? Math.round(((resolutionRate - prevResolutionRate) / prevResolutionRate) * 100) : 0;
      const avgResolutionTrend = prevAvgResolutionDays > 0 ? Math.round(((avgResolutionDays - prevAvgResolutionDays) / prevAvgResolutionDays) * 100) : 0;
      const slaComplianceTrend = prevSlaComplianceRate > 0 ? Math.round(((slaComplianceRate - prevSlaComplianceRate) / prevSlaComplianceRate) * 100) : 0;

      trends = { totalTrend, resolvedTrend, resolutionRateTrend, avgResolutionTrend, slaComplianceTrend };
    }

    res.json({
      success: true,
      data: {
        total,
        submitted,
        validated,
        assigned,
        inProgress,
        resolved: resolvedCount,
        closed,
        pending,
        overdue,
        resolutionRate,
        avgResolutionDays,
        slaComplianceRate,
        ...trends,
      },
    });
  } catch (error) {
    console.error("Public stats error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch statistics" });
  }
});

/**
 * GET /api/public/stats/by-category - category breakdown
 */
router.get("/stats/by-category", async (req, res) => {
  try {
    const { period } = req.query;
    const match = buildPeriodMatch(period);

    const byCategory = await Complaint.aggregate([
      { $match: match },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      data: byCategory.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    });
  } catch (error) {
    console.error("Public stats by-category error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch category statistics" });
  }
});

/**
 * GET /api/public/stats/by-municipality - municipality breakdown
 */
router.get("/stats/by-municipality", async (req, res) => {
  try {
    const { period } = req.query;
    const match = buildPeriodMatch(period);

    // Get counts by municipality
    const byMunicipality = await Complaint.aggregate([
      { $match: match },
      {
        $group: {
          _id: { name: "$municipalityName", governorate: "$governorate" },
          total: { $sum: 1 },
          resolved: {
            $sum: {
              $cond: [{ $in: ["$status", ["RESOLVED", "CLOSED"]] }, 1, 0],
            },
          },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Map to expected shape with computed rate
    const result = byMunicipality.map((item) => ({
      municipality: item._id.name || "Unknown",
      governorate: item._id.governorate || "",
      total: item.total,
      resolved: item.resolved,
      rate: item.total > 0 ? Math.round((item.resolved / item.total) * 100) : 0,
    }));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Public stats by-municipality error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch municipality statistics" });
  }
});

/**
 * GET /api/public/stats/by-zone - governorate (zone) breakdown
 */
router.get("/stats/by-zone", async (req, res) => {
  try {
    const { period } = req.query;
    const match = buildPeriodMatch(period);

    const byZone = await Complaint.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$governorate",
          total: { $sum: 1 },
          resolved: {
            $sum: {
              $cond: [{ $in: ["$status", ["RESOLVED", "CLOSED"]] }, 1, 0],
            },
          },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const result = byZone.map((item) => ({
      governorate: item._id || "Unknown",
      total: item.total,
      resolved: item.resolved,
      rate: item.total > 0 ? Math.round((item.resolved / item.total) * 100) : 0,
    }));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Public stats by-zone error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch zone statistics" });
  }
});

/**
 * GET /api/public/stats/monthly-trends - monthly complaint trends
 * Query: months (default 6)
 */
router.get("/stats/monthly-trends", async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const trends = await Complaint.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $nin: ["DELETED", "REJECTED"] }, // Exclude certain statuses
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Format as array
    const formatted = trends.map((t) => ({
      month: `${t._id.year}-${String(t._id.month).padStart(2, "0")}`,
      submitted: t.count,
      resolved: 0,
      avgResolutionDays: 0,
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error("Public monthly trends error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch trends" });
  }
});

/**
 * GET /api/public/stats/all-municipalities - all municipalities with counts
 */
router.get("/stats/all-municipalities", async (req, res) => {
  try {
    const { period } = req.query;
    const match = buildPeriodMatch(period);

    const all = await Complaint.aggregate([
      { $match: match },
      {
        $group: {
          _id: { municipality: "$municipalityName", governorate: "$governorate" },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      data: all.map((item) => ({
        municipality: item._id.municipality || "Unknown",
        governorate: item._id.governorate || "",
        count: item.count,
      })),
    });
  } catch (error) {
    console.error("Public all municipalities error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch municipalities data" });
  }
});

/**
 * Helper: build MongoDB match filter based on period query param
 */
function buildPeriodMatch(period) {
  const now = new Date();
  let startDate = new Date();

  switch (period) {
    case "week":
      startDate.setDate(now.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(now.getMonth() - 1);
      break;
    case "year":
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case "all":
    default:
      return {}; // no filter
  }

  return {
    createdAt: { $gte: startDate },
  };
}

/**
 * GET /api/public/my-municipality-complaints - Complaints in user's municipality (authenticated)
 * Requires authentication. Returns VALIDATED, ASSIGNED, IN_PROGRESS, RESOLVED complaints.
 */
router.get("/my-municipality-complaints", authenticate, async (req, res) => {
  try {
    const user = req.user; // set by authenticate middleware
    const { limit = 20, status, sort = "-updatedAt" } = req.query;
    const limitNum = Math.min(parseInt(limit) || 20, 100);

    // Build query: user's municipality (from user profile)
    const municipalityName = user.municipalityName || (user.municipality && user.municipality.name) || "";

    if (!municipalityName) {
      return res.json({ success: true, data: { complaints: [], total: 0 } });
    }

    const query = { municipalityName: municipalityName };

    // Filter by statuses if provided, else default set
    if (status) {
      query.status = { $in: status.split(",") };
    } else {
      query.status = { $in: ["VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED"] };
    }

    // Exclude archived
    query.isArchived = false;

    const complaints = await Complaint.find(query)
      .populate("createdBy", "fullName")
      .populate("assignedTo", "fullName")
      .populate("assignedDepartment", "name")
      .sort(sort)
      .limit(limitNum);

    const total = await Complaint.countDocuments(query);

    // Serialize
    const complaintsData = complaints.map(c => {
      const obj = c.toObject();
      // SimplifySome fields for public view
      return {
        _id: obj._id,
        title: obj.title,
        description: obj.description,
        category: obj.category,
        status: obj.status,
        municipalityName: obj.municipalityName,
        location: obj.location,
        media: obj.media,
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt,
        assignedDepartment: obj.assignedDepartment,
        assignedTo: obj.assignedTo,
        createdBy: obj.createdBy,
        slaDeadline: obj.slaDeadline,
        slaStatus: obj.slaStatus,
        urgency: obj.urgency,
        priorityScore: obj.priorityScore,
      };
    });

    res.json({
      success: true,
      data: {
        complaints: complaintsData,
        pagination: { total, limit: limitNum },
      },
    });
  } catch (error) {
    console.error("Public my-municipality-complaints error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch municipality complaints" });
  }
});

/**
 * GET /api/public/top-recurring - top recurring complaint categories/locations
 * Query: limit (default 5)
 */
router.get("/top-recurring", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 5, 20);
    // Group by category
    const byCategory = await Complaint.aggregate([
      { $match: { status: { $in: ["VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED"] } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);
    const result = byCategory.map((item) => ({
      category: item._id,
      count: item.count,
      label: capitalize(item._id),
    }));
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Public top-recurring error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch recurring issues" });
  }
});

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * GET /api/public/complaints - List public complaints (read-only)
 * Query params: limit, status, page, sort
 */
router.get("/complaints", async (req, res) => {
  try {
    const { limit = 20, status, page = 1, sort = "-createdAt" } = req.query;
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (parseInt(page) - 1) * limitNum;

    const query = { isArchived: false };
    if (status) {
      query.status = { $in: status.split(",") };
    }

    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .populate("createdBy", "fullName")
        .populate("assignedTo", "fullName")
        .populate("assignedDepartment", "name")
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Complaint.countDocuments(query),
    ]);

    const data = complaints.map((c) => {
      const obj = c.toObject();
      return {
        _id: obj._id,
        title: obj.title,
        description: obj.description,
        category: obj.category,
        status: obj.status,
        location: obj.location,
        municipalityName: obj.municipalityName,
        governorate: obj.governorate,
        media: obj.media,
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt,
        assignedDepartment: obj.assignedDepartment,
        assignedTo: obj.assignedTo,
        createdBy: obj.createdBy,
        slaDeadline: obj.slaDeadline,
        slaStatus: obj.slaStatus,
        urgency: obj.urgency,
        priorityScore: obj.priorityScore,
      };
    });

    res.json({
      success: true,
      data: data,
      pagination: { total, page: parseInt(page), limit: limitNum, pages: Math.ceil(total / limitNum) },
     });
   } catch (error) {
     console.error("Public complaints list error:", error);
     res.status(500).json({ success: false, message: "Failed to fetch complaints" });
   }
 });

 module.exports = router;