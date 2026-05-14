const express = require("express");
const router = express.Router();
const Complaint = require("../models/Complaint");
const Department = require("../models/Department");
const { getSlaHours, getSlaHoursByCategory } = require("../utils/slaConfig");
const { authenticate, optionalAuth } = require("../middleware/auth");

/**
 * GET /api/public/complaints - public complaint feed for transparency pages
 */
router.get("/complaints", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const requestedStatuses =
      typeof req.query.status === "string"
        ? req.query.status
          .split(",")
          .map((status) => status.trim().toUpperCase())
          .filter(Boolean)
        : [];
    const publicStatuses = ["VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];
    const statuses = requestedStatuses.length > 0
      ? requestedStatuses.filter((status) => publicStatuses.includes(status))
      : publicStatuses;

    const query = {
      status: { $in: statuses },
      isArchived: { $ne: true },
    };

    const skip = (page - 1) * limit;
    const [complaints, totalCount] = await Promise.all([
      Complaint.find(query)
        .select("_id title description category status urgency priorityScore resolvedAt createdAt updatedAt municipality municipalityName governorate location assignedDepartment media beforePhotos afterPhotos proofPhotos confirmationCount upvoteCount referenceId")
        .populate("municipality", "name governorate")
        .sort({ resolvedAt: -1, updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Complaint.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        complaints,
        pagination: {
          total: totalCount,
          totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    console.error("Public complaints error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch public complaints" });
  }
});

/**
 * GET /api/public/complaints/:id - get single complaint details for public view
 */
router.get("/complaints/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const complaint = await Complaint.findOne({ _id: id, isArchived: { $ne: true } })
      .select("_id title description category status urgency priorityScore resolvedAt createdAt updatedAt createdBy municipality municipalityName governorate location assignedDepartment assignedTeam assignedTo media beforePhotos afterPhotos proofPhotos confirmationCount upvoteCount referenceId resolutionNote statusHistory viewsCount")
      .populate("assignedTeam", "name members")
      .populate("assignedTo", "fullName email")
      .populate("municipality", "name governorate")
      .lean();

    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    // Increment view count
    await Complaint.findByIdAndUpdate(id, { $inc: { viewsCount: 1 } });

    // Only show complaints that are in public statuses
    const publicStatuses = ["VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];
    if (!publicStatuses.includes(complaint.status)) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    const response = {
      ...complaint,
      isOwnComplaint: Boolean(
        req.user?.userId &&
        complaint.createdBy?.toString?.() === req.user.userId?.toString()
      ),
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Public complaint detail error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch complaint details" });
  }
});

/**
 * GET /api/public/complaints/:id/comments - get public comments for a complaint
 */
router.get("/complaints/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const Comment = require("../models/Comment");

    const comments = await Comment.find({ complaint: id })
      .populate("author", "fullName name role")
      .sort({ createdAt: -1 })
      .lean();

    const formattedComments = comments.map(comment => ({
      _id: comment._id,
      text: comment.content || comment.text || "",
      authorName: comment.isAnonymous ? "Anonymous" : (comment.author?.fullName || comment.author?.name || "Unknown"),
      authorRoleLabel: comment.isAnonymous ? undefined : (comment.author?.role || "User"),
      createdAt: comment.createdAt,
    }));

    res.json({
      success: true,
      data: formattedComments,
    });
  } catch (error) {
    console.error("Public comments error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch comments" });
  }
});

/**
 * POST /api/public/complaints/:id/comment - post a public comment (requires authentication)
 */
router.post("/complaints/:id/comment", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { text, anonymous } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Comment text is required" });
    }

    const User = require("../models/User");
    const userId = req.user.userId || req.user.id || req.user._id;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    const user = await User.findById(userId).select("fullName name").lean();
    const authorName = user?.fullName || user?.name || "Anonymous";

    const Comment = require("../models/Comment");
    const comment = new Comment({
      complaint: id,
      content: text.trim(),
      author: userId,
      authorName,
      isAnonymous: !!anonymous,
      createdAt: new Date(),
    });

    await comment.save();

    // Also add to complaint's embedded comments array used by authenticated detail views.
    await Complaint.findByIdAndUpdate(id, {
      $push: {
        comments: {
          text: comment.content,
          author: userId,
          authorName: anonymous ? "Anonymous" : authorName,
          authorRole: req.user.role || "CITIZEN",
          type: "PUBLIC",
          isInternal: false,
          createdAt: comment.createdAt
        }
      }
    });

    res.json({
      success: true,
      message: "Comment posted successfully",
      data: {
        _id: comment._id,
        text: comment.content,
        authorName: anonymous ? "Anonymous" : authorName,
        createdAt: comment.createdAt,
      },
    });
  } catch (error) {
    console.error("Public comment error:", error);
    res.status(500).json({ success: false, message: "Failed to post comment" });
  }
});

/**
 * POST /api/public/complaints/:id/upvote - upvote a complaint (requires authentication)
 */
router.post("/complaints/:id/upvote", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id || req.user._id;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    if (complaint.createdBy?.toString?.() === userId?.toString()) {
      return res.status(400).json({ success: false, message: "You cannot like your own complaint" });
    }

    // Check if user already upvoted
    if (!complaint.upvotes) complaint.upvotes = [];
    if (complaint.upvotes.some((vote) => vote.citizenId?.toString() === userId?.toString())) {
      return res.json({ success: true, upvoteCount: complaint.upvoteCount || complaint.upvotes.length, message: "Already liked" });
    }

    // Add upvote
    complaint.upvotes.push({ citizenId: userId, upvotedAt: new Date() });
    complaint.upvoteCount = (complaint.upvoteCount || 0) + 1;
    await complaint.save();

    res.json({
      success: true,
      upvoteCount: complaint.upvoteCount,
    });
  } catch (error) {
    console.error("Public upvote error:", error);
    res.status(500).json({ success: false, message: "Failed to upvote complaint" });
  }
});

/**
 * GET /api/public/my-municipality-complaints - get complaints for citizen's municipality
 */
router.get("/my-municipality-complaints", authenticate, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const status = req.query.status;

    const User = require("../models/User");
    const user = await User.findById(req.user.userId || req.user.id || req.user._id)
      .populate("municipality", "name governorate");

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    const userMunicipality = user.municipalityName || (typeof user.municipality === 'object' ? user.municipality?.name : user.municipality);
    console.log("User municipality:", userMunicipality, "User role:", user.role, "User ID:", user._id);
    
    if (!userMunicipality) {
      const fallbackQuery = {
        status: { $in: ["SUBMITTED", "VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"] },
        isArchived: { $ne: true },
      };

      if (user.role === "TECHNICIAN") {
        fallbackQuery.$or = [
          { assignedTo: user._id },
          { "assignedTeam.members": user._id },
        ];
      } else if (user.role === "DEPARTMENT_MANAGER" && user.department) {
        fallbackQuery.$or = [
          { assignedDepartment: user.department },
          { "assignedDepartment.id": user.department },
        ];
      } else {
        console.error("User municipality not set for user:", user._id);
        return res.status(400).json({ success: false, message: "User municipality not set" });
      }

      if (status) {
        const statuses = status.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
        if (statuses.length > 0) fallbackQuery.status = { $in: statuses };
      }

      const complaints = await Complaint.find(fallbackQuery)
        .select("_id title description category status urgency priorityScore resolvedAt createdAt updatedAt createdBy municipality municipalityName governorate location assignedDepartment media beforePhotos afterPhotos proofPhotos confirmations upvotes confirmationCount upvoteCount referenceId")
        .populate("municipality", "name governorate")
        .sort({ createdAt: -1, updatedAt: -1 })
        .limit(limit)
        .lean();

      return res.json({ success: true, complaints });
    }

    const normalizeMunicipality = require("../utils/normalize").normalizeMunicipality;
    const normalizedUserMunicipality = normalizeMunicipality(userMunicipality);
    console.log("Normalized municipality:", normalizedUserMunicipality);

    const munRegex = new RegExp(userMunicipality.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const query = {
      $or: [
        { municipalityNormalized: normalizedUserMunicipality },
        { municipalityName: munRegex },
        { "location.municipality": munRegex },
      ],
      status: { $in: ["SUBMITTED", "VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"] },
      isArchived: { $ne: true },
    };

    if (status) {
      const statuses = status.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (statuses.length > 0) {
        query.status = { $in: statuses };
      }
    }

    console.log("Query:", JSON.stringify(query, null, 2));

    const complaints = await Complaint.find(query)
      .select("_id title description category status urgency priorityScore resolvedAt createdAt updatedAt createdBy municipality municipalityName governorate location assignedDepartment media beforePhotos afterPhotos proofPhotos confirmations upvotes confirmationCount upvoteCount referenceId")
      .populate("municipality", "name governorate")
      .sort({ createdAt: -1, updatedAt: -1 })
      .limit(limit)
      .lean();

    console.log("Found complaints:", complaints.length);
    
    res.json({
      success: true,
      complaints,
    });
  } catch (error) {
    console.error("My municipality complaints error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch municipality complaints" });
  }
});

/**
 * POST /api/public/complaints/:id/rate - rate a resolved complaint (requires authentication)
 */
router.post("/complaints/:id/rate", async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : req.headers.token;
    const { rating, comment } = req.body;

    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }

    const jwt = require("jsonwebtoken");
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
      userId = decoded.userId || decoded.id || decoded._id;
    } catch {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    if (!["RESOLVED", "CLOSED"].includes(complaint.status)) {
      return res.status(400).json({ success: false, message: "Only resolved complaints can be rated" });
    }

    // Check if user already rated
    if (!complaint.ratings) complaint.ratings = [];
    const existingRating = complaint.ratings.find((r) => r.userId === userId);
    if (existingRating) {
      existingRating.rating = rating;
      existingRating.comment = comment || existingRating.comment;
      existingRating.updatedAt = new Date();
    } else {
      complaint.ratings.push({
        userId,
        rating,
        comment: comment || "",
        createdAt: new Date(),
      });
    }

    // Calculate average rating
    const totalRating = complaint.ratings.reduce((sum, r) => sum + r.rating, 0);
    complaint.averageRating = totalRating / complaint.ratings.length;
    complaint.ratingCount = complaint.ratings.length;

    await complaint.save();

    res.json({
      success: true,
      averageRating: complaint.averageRating,
      ratingCount: complaint.ratingCount,
    });
  } catch (error) {
    console.error("Public rate error:", error);
    res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
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

    // Current period stats - fetch all base counts
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
      totalResolvedForSatisfaction,
      resolvedWithConfirmation,
      resolvedWithRatings,
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
        createdAt: { $exists: true },
      }).select("resolvedAt createdAt updatedAt slaDeadline urgency category"),
      Complaint.countDocuments({
        ...match,
        status: { $in: ["RESOLVED", "CLOSED"] },
        resolvedAt: { $exists: true },
      }),
      Complaint.countDocuments({
        status: { $in: ["VALIDATED", "ASSIGNED", "IN_PROGRESS"] }
      }),
      Complaint.countDocuments({ ...match, status: { $in: ["RESOLVED", "CLOSED"] } }),
      Complaint.countDocuments({ ...match, status: { $in: ["RESOLVED", "CLOSED"] }, confirmationCount: { $gt: 0 } }),
      Complaint.find({
        ...match,
        status: { $in: ["RESOLVED", "CLOSED"] },
        ratings: { $exists: true, $ne: [] },
      }).select("ratings averageRating"),
    ]);

    const resolvedCount = resolved + closed;
    const resolutionRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;

    // ===== PART A: Avg Fix Time (decimal days, null when no resolved) =====
    let avgFixTime = null;
    let totalResolutionMs = 0;
    let validResolutionCount = 0;
    for (const c of resolvedComplaints) {
      const resolved = new Date(c.resolvedAt || c.updatedAt || c.createdAt).getTime();
      const created = new Date(c.createdAt).getTime();
      if (!isNaN(resolved) && !isNaN(created) && resolved > created) {
        totalResolutionMs += (resolved - created);
        validResolutionCount++;
      }
    }
    if (validResolutionCount > 0 && totalResolutionMs > 0) {
      avgFixTime = Math.round((totalResolutionMs / validResolutionCount) / (1000 * 60 * 60 * 24) * 10) / 10;
    }

    // ===== PART B: Resolved On Time using slaDeadline =====
    let onTimeCount = 0;
    let validOnTimeCount = 0;
    for (const c of resolvedComplaints) {
      if (!c.createdAt) continue;
      const createdAt = new Date(c.createdAt);
      const resolvedAt = new Date(c.resolvedAt || c.updatedAt || c.createdAt);
      validOnTimeCount++;

      // Use slaDeadline if present; otherwise compute from urgency/category
      let slaDeadline = c.slaDeadline;
      if (!slaDeadline) {
        const slaHours = getSlaHours(c.urgency) || getSlaHoursByCategory(c.category) || 168; // Default to 168 hours (7 days) if not set
        slaDeadline = new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);
      }

      if (resolvedAt <= slaDeadline) {
        onTimeCount++;
      }
    }

    let resolvedOnTime = null;
    if (validOnTimeCount > 0) {
      resolvedOnTime = Math.round((onTimeCount / validOnTimeCount) * 100);
    }

    // ===== PART C: Citizen Satisfaction =====
    let satisfactionValue = null;
    let totalRated = 0;
    let totalRatingSum = 0;
    let ratingCount = 0;
    const resolvedWithRatingsArray = Array.isArray(resolvedWithRatings) ? resolvedWithRatings : [];
    for (const complaint of resolvedWithRatingsArray) {
      if (complaint.averageRating) {
        totalRatingSum += Math.min(Math.max(Number(complaint.averageRating) || 0, 0), 5);
        ratingCount++;
      } else if (complaint.ratings && complaint.ratings.length > 0) {
        const safeRatings = complaint.ratings
          .map((r) => Math.min(Math.max(Number(r.rating) || 0, 0), 5))
          .filter((rating) => rating > 0);
        const sum = safeRatings.reduce((acc, rating) => acc + rating, 0);
        totalRatingSum += safeRatings.length > 0 ? sum / safeRatings.length : 0;
        ratingCount++;
      }
    }
    satisfactionValue = ratingCount > 0 ? Math.min(Math.round((totalRatingSum / ratingCount) * 20), 100) : null; // Convert 1-5 scale to 0-100, cap at 100
    totalRated = ratingCount;
    // Fallback to confirmation-based calculation if no ratings
    let notConfirmed = 0;
    if (satisfactionValue === null && totalResolvedForSatisfaction > 0) {
      satisfactionValue = Math.round((resolvedWithConfirmation / totalResolvedForSatisfaction) * 100);
      totalRated = totalResolvedForSatisfaction;
      notConfirmed = totalResolvedForSatisfaction - resolvedWithConfirmation;
    }

    // ===== TRENDS (only if period != 'all') =====
    let trends = {};
    if (period !== "all") {
      const nowDate = new Date();
      const currentStartDate = new Date();
      switch (period) {
        case "week": currentStartDate.setDate(nowDate.getDate() - 7); break;
        case "month": currentStartDate.setMonth(nowDate.getMonth() - 1); break;
        case "year": currentStartDate.setFullYear(nowDate.getFullYear() - 1); break;
        default: break;
      }
      const durationMs = nowDate.getTime() - currentStartDate.getTime();
      const prevStartDate = new Date(currentStartDate.getTime() - durationMs);
      const prevEndDate = currentStartDate;
      const prevMatch = { createdAt: { $gte: prevStartDate, $lt: prevEndDate } };

      const [
        prevTotal,
        prevResolved,
        prevClosed,
        prevResolvedComplaints,
        prevTotalResolved,
        prevConfirmedResolved,
      ] = await Promise.all([
        Complaint.countDocuments(prevMatch),
        Complaint.countDocuments({ ...prevMatch, status: "RESOLVED" }),
        Complaint.countDocuments({ ...prevMatch, status: "CLOSED" }),
        Complaint.find({
          ...prevMatch,
          status: { $in: ["RESOLVED", "CLOSED"] },
          createdAt: { $exists: true },
        }).select("resolvedAt createdAt updatedAt slaDeadline urgency category"),
        Complaint.countDocuments({ ...prevMatch, status: { $in: ["RESOLVED", "CLOSED"] } }),
        Complaint.countDocuments({ ...prevMatch, status: { $in: ["RESOLVED", "CLOSED"] }, confirmationCount: { $gt: 0 } }),
      ]);

      const prevResolvedCount = prevResolved + prevClosed;

      // Previous avg fix time
      let prevTotalMs = 0;
      let prevValidCount = 0;
      for (const c of prevResolvedComplaints) {
        const r = new Date(c.resolvedAt || c.updatedAt || c.createdAt).getTime();
        const cr = new Date(c.createdAt).getTime();
        if (!isNaN(r) && !isNaN(cr) && r > cr) {
          prevTotalMs += (r - cr);
          prevValidCount++;
        }
      }
      const prevAvgFixTime = prevValidCount > 0 ? Math.round((prevTotalMs / prevValidCount) / (1000 * 60 * 60 * 24) * 10) / 10 : null;

      // Previous on-time count
      let prevOnTimeCount = 0;
      let prevValidOnTimeCount = 0;
      for (const c of prevResolvedComplaints) {
        if (!c.createdAt) continue;
        const cr = new Date(c.createdAt);
        const r = new Date(c.resolvedAt || c.updatedAt || c.createdAt);
        prevValidOnTimeCount++;
        let slaDeadline = c.slaDeadline;
        if (!slaDeadline) {
          const slaHours = getSlaHours(c.urgency) || getSlaHoursByCategory(c.category) || 72; // Default to 72 hours (3 days) if not set
          slaDeadline = new Date(cr.getTime() + slaHours * 60 * 60 * 1000);
        }
        if (r <= slaDeadline) prevOnTimeCount++;
      }
      const prevResolvedOnTime = prevValidOnTimeCount > 0 ? Math.round((prevOnTimeCount / prevValidOnTimeCount) * 100 * 10) / 10 : null;

      // Previous citizen satisfaction
      const prevSatisfactionRate = prevTotalResolved > 0
        ? Math.round((prevConfirmedResolved / prevTotalResolved) * 100 * 10) / 10
        : null;

      // Previous resolution rate
      const prevResolutionRate = prevTotal > 0 ? Math.round((prevResolvedCount / prevTotal) * 100) : 0;

      // Trends (percentage change)
      const totalTrend = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : 0;
      const resolvedTrend = prevResolvedCount > 0 ? Math.round(((resolvedCount - prevResolvedCount) / prevResolvedCount) * 100) : 0;
      const resolutionRateTrend = prevResolutionRate > 0 ? Math.round(((resolutionRate - prevResolutionRate) / prevResolutionRate) * 100) : 0;

      const avgFixTimeTrend = (prevAvgFixTime !== null && avgFixTime !== null && prevAvgFixTime > 0)
        ? Math.round(((avgFixTime - prevAvgFixTime) / prevAvgFixTime) * 100)
        : null;

      const resolvedOnTimeTrend = (prevResolvedOnTime !== null && resolvedOnTime !== null && prevResolvedOnTime > 0)
        ? Math.round(((resolvedOnTime - prevResolvedOnTime) / prevResolvedOnTime) * 100)
        : null;

      const satisfactionTrend = (prevSatisfactionRate !== null && satisfactionValue !== null && prevSatisfactionRate > 0)
        ? Math.max(-100, Math.min(100, Math.round(((satisfactionValue - prevSatisfactionRate) / prevSatisfactionRate) * 100)))
        : null;

      trends = { totalTrend, resolvedTrend, resolutionRateTrend, avgFixTimeTrend, resolvedOnTimeTrend, satisfactionTrend };
    }

    // Build response with new format including all dashboard data
    // Fetch additional data needed for public dashboard
    const [categoryStats, municipalityStats, monthlyTrends, recentComplaints, zoneStats, topRecurring, allMunicipalityStats] = await Promise.all([
      // Category stats
      Complaint.aggregate([
        { $match: { ...match, status: { $nin: ["DELETED", "REJECTED"] } } },
        {
          $group: {
            _id: "$category",
            total: { $sum: 1 },
            resolved: { $sum: { $cond: [{ $in: ["$status", ["RESOLVED", "CLOSED"]] }, 1, 0] } }
          }
        },
        { $sort: { total: -1 } }
      ]),
      // Municipality stats with avg fix time calculation - grouped by municipalityNormalized
      Complaint.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$municipalityNormalized",
            municipalityName: { $first: "$municipalityName" },
            governorate: { $first: "$governorate" },
            totalComplaints: { $sum: 1 },
            resolvedCount: {
              $sum: {
                $cond: [
                  { $in: ["$status", ["RESOLVED", "CLOSED"]] },
                  1,
                  0
                ]
              }
            },
            totalResolutionMs: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $in: ["$status", ["RESOLVED", "CLOSED"]] },
                      { $ne: ["$resolvedAt", null] },
                      { $ne: ["$createdAt", null] }
                    ]
                  },
                  { $subtract: [{ $ifNull: ["$resolvedAt", "$updatedAt"] }, "$createdAt"] },
                  0
                ]
              }
            },
            resolvedWithValidTime: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $in: ["$status", ["RESOLVED", "CLOSED"]] },
                      { $ne: ["$resolvedAt", null] },
                      { $ne: ["$createdAt", null] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            onTimeCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $in: ["$status", ["RESOLVED", "CLOSED"]] },
                      { $eq: ["$slaStatus", "COMPLETED"] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $addFields: {
            avgResolutionTime: {
              $cond: [
                { $gt: ["$resolvedWithValidTime", 0] },
                { $divide: ["$totalResolutionMs", "$resolvedWithValidTime"] },
                null
              ]
            }
          }
        },
        { $sort: { totalComplaints: -1 } },
        { $limit: 20 }
      ]),
      // Monthly trends (last 6 months)
      Complaint.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: { $substr: [{ $dateToString: { format: "%Y-%m", date: "$createdAt" } }, 0, 7] },
            submitted: { $sum: 1 },
            resolved: { $sum: { $cond: [{ $in: ["$status", ["RESOLVED", "CLOSED"]] }, 1, 0] } }
          }
        },
        { $sort: { _id: 1 } },
        { $limit: 6 }
      ]),
      // Recent complaints (for resolutions section)
      Complaint.find({
        status: { $in: ["RESOLVED", "CLOSED"] },
        isArchived: { $ne: true }
      })
        .select("_id title description category status urgency resolvedAt createdAt updatedAt municipalityName location media afterPhotos proofPhotos")
        .sort({ resolvedAt: -1 })
        .limit(9)
        .lean(),
      // Zone stats (all-time)
      Complaint.aggregate([
        { $match: { status: { $nin: ["DELETED", "REJECTED"] } } },
        {
          $group: {
            _id: "$governorate",
            total: { $sum: 1 },
            resolved: { $sum: { $cond: [{ $in: ["$status", ["RESOLVED", "CLOSED"]] }, 1, 0] } }
          }
        },
        { $sort: { total: -1 } }
      ]),
      // Top recurring issues (only recurring problems - count > 1) grouped by municipalityNormalized
      Complaint.aggregate([
        { $match: { status: { $nin: ["DELETED", "REJECTED"] }, createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: { category: "$category", municipalityNormalized: "$municipalityNormalized" },
            municipalityName: { $first: "$municipalityName" },
            count: { $sum: 1 },
            resolved: { $sum: { $cond: [{ $in: ["$status", ["RESOLVED", "CLOSED"]] }, 1, 0] } }
          }
        },
        { $match: { count: { $gt: 1 } } }, // Only include recurring problems (count > 1)
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      // All municipalities (all-time) grouped by municipalityNormalized
      Complaint.aggregate([
        { $match: { status: { $nin: ["DELETED", "REJECTED"] } } },
        {
          $group: {
            _id: "$municipalityNormalized",
            municipalityName: { $first: "$municipalityName" },
            governorate: { $first: "$governorate" },
            total: { $sum: 1 },
            resolved: { $sum: { $cond: [{ $in: ["$status", ["RESOLVED", "CLOSED"]] }, 1, 0] } }
          }
        },
        { $sort: { total: -1 } }
      ])
    ]);

    // Format category stats
    const allCategories = [
      { category: "waste", label: "Waste & Cleanliness" },
      { category: "roads", label: "Roads & Traffic" },
      { category: "lighting", label: "Street Lighting" },
      { category: "water", label: "Water & Drainage" },
      { category: "safety", label: "Public Safety & Noise" },
      { category: "property", label: "Public Property" },
      { category: "parks", label: "Parks & Green Spaces" },
      { category: "other", label: "Other" }
    ];
    const categoryMap = {};
    categoryStats.forEach(item => {
      categoryMap[item._id] = {
        total: item.total,
        resolved: item.resolved,
        resolutionRate: item.total > 0 ? Math.round((item.resolved / item.total) * 100 * 10) / 10 : 0
      };
    });
    const formattedCategoryStats = allCategories.map(cat => ({
      category: cat.category,
      label: cat.label,
      total: (categoryMap[cat.category] || {}).total || 0,
      resolved: (categoryMap[cat.category] || {}).resolved || 0,
      rate: (categoryMap[cat.category] || {}).resolutionRate || 0
    }));

    // Format municipality stats - now grouped by municipalityNormalized for deduplication
    const formattedMunicipalityStats = (municipalityStats || []).map((item, idx) => ({
      name: item.municipalityName || item._id || 'Unknown',
      governorate: item.governorate || 'Unknown',
      total: item.totalComplaints || 0,
      resolved: item.resolvedCount || 0,
      rate: item.totalComplaints > 0 ? Math.round((item.resolvedCount / item.totalComplaints) * 100) : 0,
      rank: idx + 1,
      tma: item.avgResolutionTime ? Math.round(item.avgResolutionTime / (1000 * 60 * 60 * 24) * 10) / 10 : null,
      slaCompliance: item.resolvedCount > 0 ? Math.round((item.onTimeCount / item.resolvedCount) * 100) : null
    }));

    // Format monthly trends - ensure 6 months with proper formatting
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, "0")}`;

      // Format month label as "Dec '25", "Jan '26", etc.
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthLabel = `${monthNames[month - 1]} '${String(year).slice(2)}`;

      const trend = monthlyTrends.find(t => t._id === key);
      months.push({
        month: monthLabel,
        submitted: trend ? trend.submitted : 0,
        resolved: trend ? trend.resolved : 0
      });
    }
    const formattedMonthlyTrends = months;

    // Format zone stats
    const formattedZoneStats = {};
    zoneStats.forEach(item => {
      formattedZoneStats[item._id] = {
        total: item.total,
        resolved: item.resolved,
        rate: item.total > 0 ? Math.round((item.resolved / item.total) * 100) : 0
      };
    });

    // Format top recurring - only recurring problems with count > 1
    const formattedTopRecurring = topRecurring
      .filter(item => item.count > 1) // Only include recurring problems
      .map(item => ({
        category: item._id.category,
        municipality: item.municipalityName || item._id.municipalityNormalized,
        count: item.count,
        resolvedCount: item.resolved,
        status: item.resolved > 0 && item.resolved === item.count ? 'All Resolved' :
          item.resolved > 0 ? 'Being Addressed' : 'Pending'
      }));

    // Format all municipalities
    const formattedAllMunicipalityStats = allMunicipalityStats.map(item => ({
      name: item.municipalityName || item._id,
      governorate: item.governorate,
      total: item.total,
      resolved: item.resolved,
      rate: item.total > 0 ? Math.round((item.resolved / item.total) * 100) : 0
    }));

    // Aggregate by governorate for governorate overview - send as object for mobile app compatibility
    const byGovernorate = {};
    (formattedAllMunicipalityStats || []).forEach(mun => {
      if (!mun.governorate) return;
      if (!byGovernorate[mun.governorate]) {
        byGovernorate[mun.governorate] = { total: 0, resolved: 0 };
      }
      byGovernorate[mun.governorate].total += mun.total || 0;
      byGovernorate[mun.governorate].resolved += mun.resolved || 0;
    });

    // Add resolution rate to each governorate
    Object.keys(byGovernorate).forEach(governorate => {
      const data = byGovernorate[governorate];
      data.resolutionRate = data.total > 0 ? Math.round((data.resolved / data.total) * 100) : null;
    });

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
        avgFixTime: avgFixTime !== null
          ? {
            value: avgFixTime,
            unit: "days",
            vsLast: trends.avgFixTimeTrend ?? null,
            trend: trends.avgFixTimeTrend !== null
              ? (trends.avgFixTimeTrend > 0 ? "up" : trends.avgFixTimeTrend < 0 ? "down" : "no_change")
              : "no_change",
          }
          : { value: null, unit: "days", vsLast: null, trend: "no_change" },
        resolvedOnTime: resolvedOnTime !== null
          ? {
            value: resolvedOnTime,
            vsLast: trends.resolvedOnTimeTrend ?? null,
            trend: trends.resolvedOnTimeTrend !== null
              ? (trends.resolvedOnTimeTrend > 0 ? "up" : trends.resolvedOnTimeTrend < 0 ? "down" : "no_change")
              : "no_change",
          }
          : { value: null, vsLast: null, trend: "no_change" },
        byGovernorate,
        citizenSatisfaction: {
          value: satisfactionValue !== null ? Math.min(Math.max(satisfactionValue, 0), 100) : null,
          totalRated: totalRated,
          notConfirmed: notConfirmed >= 0 ? notConfirmed : 0,
          vsLast: trends.satisfactionTrend ?? null,
        },
        ...trends,
        // Additional consolidated data
        byCategory: formattedCategoryStats,
        byMunicipality: formattedMunicipalityStats,
        monthlyTrends: formattedMonthlyTrends,
        recentComplaints,
        zoneStats: formattedZoneStats,
        topRecurring: formattedTopRecurring,
        allMunicipalities: formattedAllMunicipalityStats,
      },
    });
  } catch (error) {
    console.error("Public stats error:", error);
    res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
});

/**
 * GET /api/public/stats/by-category - category breakdown with resolution rates
 */
router.get("/stats/by-category", async (req, res) => {
  try {
    const { period } = req.query;
    const match = buildPeriodMatch(period);

    // Define all 8 categories with their labels
    const allCategories = [
      { category: "waste", label: "Waste & Cleanliness" },
      { category: "roads", label: "Roads & Traffic" },
      { category: "lighting", label: "Street Lighting" },
      { category: "water", label: "Water & Drainage" },
      { category: "safety", label: "Public Safety & Noise" },
      { category: "property", label: "Public Property" },
      { category: "parks", label: "Parks & Green Spaces" },
      { category: "other", label: "Other" }
    ];

    // Get actual stats from database
    const byCategory = await Complaint.aggregate([
      { $match: { ...match, status: { $nin: ["DELETED", "REJECTED"] } } },
      {
        $group: {
          _id: "$category",
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $in: ["$status", ["RESOLVED", "CLOSED"]] }, 1, 0] } }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Create a map of category -> stats
    const categoryMap = {};
    byCategory.forEach(item => {
      categoryMap[item._id] = {
        total: item.total,
        resolved: item.resolved,
        resolutionRate: item.total > 0 ? Math.round((item.resolved / item.total) * 100 * 10) / 10 : 0
      };
    });

    // Build response with all 8 categories, even if count is 0
    const result = allCategories.map(cat => {
      const stats = categoryMap[cat.category] || { total: 0, resolved: 0, resolutionRate: 0 };
      return {
        category: cat.category,
        label: cat.label,
        total: stats.total,
        resolved: stats.resolved,
        resolutionRate: stats.resolutionRate
      };
    }).sort((a, b) => b.total - a.total); // Sort by total descending

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Public stats by-category error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch category statistics" });
  }
});

/**
 * GET /api/public/stats/by-municipality - municipality breakdown with avg fix time and on-time rate
 */
router.get("/stats/by-municipality", async (req, res) => {
  try {
    const { period } = req.query;
    const match = buildPeriodMatch(period);

    const byMunicipality = await Complaint.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$municipalityNormalized",
          municipalityName: { $first: "$municipalityName" },
          governorate: { $first: "$governorate" },
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $in: ["$status", ["RESOLVED", "CLOSED"]] }, 1, 0] } },
          avgFixTime: { $avg: { $cond: [{ $in: ["$status", ["RESOLVED", "CLOSED"]] }, { $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 86400000] }, null] } },
          onTimeCount: { $sum: { $cond: [{ $and: [{ $in: ["$status", ["RESOLVED", "CLOSED"]] }, { $eq: ["$slaStatus", "ON_TRACK"] }] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const result = byMunicipality.map((item) => ({
      municipality: item.municipalityName || item._id || "Unknown",
      governorate: item.governorate || "",
      total: item.total,
      resolved: item.resolved,
      rate: item.total > 0 ? Math.round((item.resolved / item.total) * 100) : 0,
      avgFixTime: item.avgFixTime ? Math.round(item.avgFixTime * 10) / 10 : 0,
      slaCompliance: item.resolved > 0 ? Math.round((item.onTimeCount / item.resolved) * 100) : 0
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Public stats by-municipality error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch municipality statistics" });
  }
});

router.get("/stats/by-zone", async (req, res) => {
  try {
    const { period } = req.query;
    const match = buildPeriodMatch(period);
    const allGovernorates = ["Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", "Zaghouan", "Bizerte", "Béja", "Jendouba", "Le Kef", "Siliana", "Kasserine", "Sidi Bouzid", "Kairouan", "Mahdia", "Monastir", "Sousse", "Sfax", "Gafsa", "Tozeur", "Kébili", "Gabès", "Médenine", "Tataouine"];

    const byZone = await Complaint.aggregate([
      { $match: match },
      {
        $addFields: {
          effectiveGovNormalized: {
            $ifNull: ["$governorateNormalized", { $toLower: { $trim: { input: "$governorate" } } }]
          }
        }
      },
      {
        $group: {
          _id: "$effectiveGovNormalized",
          governorateDisplay: { $first: "$governorate" },
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $in: ["$status", ["RESOLVED", "CLOSED"]] }, 1, 0] } }
        }
      },
      { $sort: { total: -1 } }
    ]);

    console.log("By-zone aggregation result:", JSON.stringify(byZone.slice(0, 5)));

    const governorateMap = {};
    byZone.forEach(item => {
      const govKey = item._id || "";
      governorateMap[govKey] = {
        total: item.total,
        resolved: item.resolved,
        resolutionRate: item.total > 0 ? Math.round((item.resolved / item.total) * 100) : 0,
        displayName: item.governorateDisplay || ""
      };
    });

    const result = allGovernorates.map(gov => {
      const govKey = gov.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const stats = governorateMap[govKey] || { total: 0, resolved: 0, resolutionRate: 0 };
      return { governorate: gov, total: stats.total, resolved: stats.resolved, resolutionRate: stats.resolutionRate };
    }).sort((a, b) => b.total - a.total);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Public stats by-zone error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch zone statistics" });
  }
});

/**
 * GET /api/public/stats/monthly-trends - monthly complaint trends (last 6 months)
 */
router.get("/stats/monthly-trends", async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const now = new Date();

    // Calculate date range: from 1st day of month that is (months-1) months ago through last day of current month
    const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endDate.setHours(23, 59, 59, 999);

    const trends = await Complaint.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $nin: ["DELETED", "REJECTED"] }
        }
      },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          submitted: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $in: ["$status", ["RESOLVED", "CLOSED"]] }, 1, 0] } }
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const trendsMap = {};
    trends.forEach(t => {
      const key = `${t._id.year}-${String(t._id.month).padStart(2, "0")}`;
      trendsMap[key] = t;
    });

    // Generate all 6 months, filling in missing months with zeros
    const result = [];
    for (let i = 0; i < months; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, "0")}`;

      // Format month label as "Dec '25", "Jan '26", etc.
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthLabel = `${monthNames[month - 1]} '${String(year).slice(2)}`;

      const trend = trendsMap[key];
      result.push({
        month: monthLabel,
        submitted: trend ? trend.submitted : 0,
        resolved: trend ? trend.resolved : 0
      });
    }

    res.json({ success: true, data: result });
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
          _id: "$municipalityNormalized",
          municipalityName: { $first: "$municipalityName" },
          governorate: { $first: "$governorate" },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
    ]);
    res.json({
      success: true,
      data: all.map((item) => ({
        municipality: item.municipalityName || item._id || "Unknown",
        governorate: item.governorate || "",
        count: item.count,
      })),
    });
  } catch (error) {
    console.error("Public all municipalities error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch municipalities data" });
  }
});

/**
 * GET /api/public/top-recurring - top recurring complaint categories/issues
 */
router.get("/top-recurring", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 5, 20);
    const { period } = req.query;
    const match = buildPeriodMatch(period);

    const topRecurring = await Complaint.aggregate([
      { $match: { ...match, status: { $nin: ["DELETED", "REJECTED"] } } },
      {
        $group: {
          _id: { category: "$category", title: "$title" },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);

    const result = topRecurring.map((item) => ({
      category: item._id.category || "Unknown",
      title: item._id.title || "N/A",
      count: item.count,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Public top-recurring error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch recurring complaints" });
  }
});

/**
 * GET /api/public/stats/most-reported-issues - most reported categories with status
 */
router.get("/stats/most-reported-issues", async (req, res) => {
  try {
    const { governorate, municipality } = req.query;
    const limit = 7;

    // Build match filter with geographic scope if provided
    const match = {
      status: { $nin: ["DELETED", "REJECTED"] }
    };

    if (governorate) {
      match.governorate = governorate;
    }
    if (municipality) {
      match.$or = [
        { municipalityName: municipality },
        { "location.municipality": municipality }
      ];
    }

    // Get category stats with status breakdown
    const categoryStats = await Complaint.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$category",
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $in: ["$status", ["RESOLVED", "CLOSED"]] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $in: ["$status", ["ASSIGNED", "IN_PROGRESS"]] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $in: ["$status", ["SUBMITTED", "VALIDATED"]] }, 1, 0] } }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Build response with computed status - return top categories with actual data
    const result = categoryStats.slice(0, limit).map(item => {
      const category = (item._id || "").toLowerCase();
      let status;
      if (item.resolved === item.total) {
        status = "All Resolved";
      } else if (item.inProgress > 0 || item.resolved > 0) {
        status = "Being Addressed";
      } else {
        status = "Pending";
      }

      // Get label from category
      const categoryLabels = {
        waste: "Waste & Cleanliness",
        roads: "Roads & Traffic",
        lighting: "Street Lighting",
        water: "Water & Drainage",
        safety: "Public Safety & Noise",
        property: "Public Property",
        parks: "Parks & Green Spaces",
        green_space: "Parks & Green Spaces",
        public_property: "Public Property",
        other: "Other"
      };

      return {
        category: category,
        label: categoryLabels[category] || category,
        count: item.total,
        resolvedCount: item.resolved,
        status: status
      };
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Public most-reported-issues error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch most reported issues" });
  }
});

/**
 * Helper: build MongoDB match filter based on period query param
 */
function buildPeriodMatch(period) {
  const now = new Date();
  let startDate = new Date();
  switch (period) {
    case "today":
      startDate.setHours(0, 0, 0, 0);
      break;
    case "week": startDate.setDate(now.getDate() - 7); break;
    case "month": startDate.setMonth(now.getMonth() - 1); break;
    case "year": startDate.setFullYear(now.getFullYear() - 1); break;
    case "all":
    default: return {};
  }
  return { createdAt: { $gte: startDate } };
}

module.exports = router;
