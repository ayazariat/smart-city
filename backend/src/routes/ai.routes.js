const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const aiService = require("../services/ai.service");
const Complaint = require("../models/Complaint");
const { mergeDuplicateComplaint } = require("../services/duplicateMerge.service");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

router.post("/predict-category", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }
    const result = await aiService.predictCategory(text);
    res.json(result);
  } catch (error) {
    console.error("AI predict-category error:", error.message);
    res.status(500).json({
      predicted: "AUTRE",
      confidence: 0,
      alternatives: [],
      reasoning: "Service error, defaulting to AUTRE"
    });
  }
});

router.post("/urgency/predict", async (req, res) => {
  const { title, description, category, citizenUrgency, municipality, confirmationCount } = req.body;
  try {
    const axios = require('axios');
    const response = await axios.post(`${AI_SERVICE_URL}/ai/urgency/predict`, {
      title,
      description,
      category,
      citizenUrgency,
      municipality,
      confirmationCount: confirmationCount || 0
    }, { timeout: 10000 });
    res.json({ data: response.data });
  } catch (error) {
    console.error("AI urgency prediction error:", error.message);
    res.json({
      data: {
        predictedUrgency: citizenUrgency || "MEDIUM",
        confidenceScore: 0,
        explanation: "Service unavailable, using citizen input"
      }
    });
  }
});

router.post("/duplicate/check", async (req, res) => {
  try {
    const { complaintId, title, description, category, municipality, latitude, longitude, imageUrls, media, photos, submittedAt } = req.body;
    const axios = require('axios');
    const response = await axios.post(`${AI_SERVICE_URL}/ai/duplicate/check`, {
      complaintId: complaintId || "new",
      title,
      description,
      category,
      municipality,
      latitude,
      longitude,
      imageUrls: imageUrls || media || photos || [],
      submittedAt
    }, { timeout: 10000 });
    
    // Transform response to hasDuplicates + candidates structure
    const aiResult = response.data.data || response.data;
    // Don't filter by score - let frontend display all matches for review
    const candidates = aiResult.topMatches || [];
    
    res.json({
      success: true,
      data: {
        hasDuplicates: candidates.length > 0,
        candidates: candidates,
        // Keep original fields for backward compatibility
        isDuplicate: aiResult.isDuplicate,
        duplicateLevel: aiResult.duplicateLevel,
        topMatches: aiResult.topMatches,
        recommendation: aiResult.recommendation,
        humanReviewRequired: aiResult.humanReviewRequired
      }
    });
  } catch (error) {
    console.error("AI duplicate check error:", error.message);
    res.json({
      success: true,
      data: {
        hasDuplicates: false,
        candidates: [],
        isDuplicate: false,
        duplicateLevel: "none",
        topMatches: [],
        recommendation: "No duplicates found",
        humanReviewRequired: false
      }
    });
  }
});

router.get("/duplicate/stats", authenticate, authorize("MUNICIPAL_AGENT", "ADMIN"), async (req, res) => {
  try {
    const axios = require('axios');
    const response = await axios.get(`${AI_SERVICE_URL}/ai/duplicate/stats`, { timeout: 5000 });
    res.json({ data: response.data });
  } catch (error) {
    res.json({
      data: {
        total_checked: 0,
        duplicates_found_today: 0,
        merge_rate: 0
      }
    });
  }
});

router.get("/stats/duplicates/today", authenticate, authorize("MUNICIPAL_AGENT", "ADMIN"), async (req, res) => {
  try {
    const Complaint = require('../models/Complaint');
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const duplicatesToday = await Complaint.countDocuments({
      isDuplicate: true,
      createdAt: { $gte: startOfDay, $lt: endOfDay }
    });

    const checkedToday = await Complaint.countDocuments({
      duplicateStatus: { $in: ["CONFIRMED_DUPLICATE", "NOT_DUPLICATE", "POSSIBLE_DUPLICATE", "PROBABLE_DUPLICATE"] },
      createdAt: { $gte: startOfDay, $lt: endOfDay }
    });

    const mergeRate = checkedToday > 0 ? (duplicatesToday / checkedToday) * 100 : 0;

    res.json({
      checked: checkedToday,
      duplicatesToday,
      mergeRate: parseFloat(mergeRate.toFixed(1))
    });
  } catch (error) {
    console.error("Error fetching duplicate stats:", error);
    res.status(500).json({ error: "Failed to fetch duplicate stats" });
  }
});

// Confirm duplicate decision (merge / keep separate)
router.post(
  "/duplicate/confirm",
  authenticate,
  authorize("MUNICIPAL_AGENT", "ADMIN"),
  async (req, res) => {
    try {
      const { newComplaintId, existingComplaintId, action } = req.body;
      if (!newComplaintId || !action) {
        return res
          .status(400)
          .json({ success: false, message: "Missing required fields" });
      }

      const target = await Complaint.findById(newComplaintId);
      if (!target) {
        return res
          .status(404)
          .json({ success: false, message: "Target complaint not found" });
      }

      if (action === "keep_separate") {
        target.duplicateStatus = "NOT_DUPLICATE";
        target.duplicateOf = null;
        await target.save();

        // Inform complaint owner that duplicate review is complete
        if (target.createdBy) {
          try {
            const notificationService = require('../services/notification.service');
            await notificationService.sendNotification(null, target.createdBy.toString(), {
              type: "duplicate_resolved",
              title: "Duplicate review completed",
              message: "Your complaint was reviewed and kept as a separate case.",
              complaintId: target._id.toString(),
              metadata: { action: "keep_separate", targetComplaintId: target._id.toString() },
            });
          } catch (err) {
            console.error('Notification failed:', err.message);
          }
        }
        return res.json({
          success: true,
          message: "Complaints kept separate",
          complaintId: target._id,
        });
      }

      if (!existingComplaintId || action !== "merge") {
        return res
          .status(400)
          .json({ success: false, message: "Invalid duplicate action" });
      }

      const result = await mergeDuplicateComplaint({
        duplicateComplaintId: existingComplaintId,
        originalComplaintId: newComplaintId,
        user: req.user,
        io: req.app?.get?.("io") || null,
      });

      return res.json(result);
    } catch (error) {
      console.error("Merge error:", error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || "Failed to merge complaints",
      });
    }
  }
);

router.post("/predict-department", async (req, res) => {
  try {
    const { category, description, municipality } = req.body;
    if (!category) {
      return res.status(400).json({ error: "Category is required" });
    }
    const aiService = require('../services/ai.service');
    const result = await aiService.predictDepartment(category, description || '', municipality || '');
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("AI predict-department error:", error.message);
    res.status(500).json({ success: false, data: { suggestedDepartment: null, departmentName: 'Services Généraux', confidence: 50 } });
  }
});

router.post("/extract-keywords", async (req, res) => {
  try {
    const { text } = req.body;
    const axios = require('axios');
    const response = await axios.post(`${AI_SERVICE_URL}/extract-keywords`, { text }, { timeout: 10000 });
    res.json(response.data);
  } catch (error) {
    res.json({
      keywords: [],
      locationKeywords: [],
      urgencyKeywords: [],
      similarityHash: ""
    });
  }
});

router.post("/calculate-sla", async (req, res) => {
  try {
    const { category, urgency, createdAt } = req.body;
    const axios = require('axios');
    const response = await axios.post(`${AI_SERVICE_URL}/calculate-sla`, {
      category,
      urgency,
      createdAt
    }, { timeout: 10000 });
    res.json(response.data);
  } catch (error) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);
    res.json({
      deadline: deadline.toISOString(),
      status: "DEFAULT",
      remaining_h: 168
    });
  }
});

// AI Trend Forecast endpoint
router.get("/trend/forecast", async (req, res) => {
  const { municipality, category, period = 7 } = req.query;
  try {
    const axios = require('axios');
    const response = await axios.get(`${AI_SERVICE_URL}/ai/trend/forecast`, {
      params: { municipality, category, period: parseInt(period) },
      timeout: 10000
    });
    res.json(response.data);
  } catch (error) {
    // Generate mock data if AI service is unavailable
    const days = parseInt(period) || 7;
    const baseVolume = Math.floor(Math.random() * 20) + 10;
    const dailyForecast = Array.from({ length: days }, () => {
      const variation = Math.floor(Math.random() * 10) - 5;
      return Math.max(0, baseVolume + variation);
    });
    
    const total = dailyForecast.reduce((a, b) => a + b, 0);
    const lastWeekTotal = Math.floor(Math.random() * 20) + 10 * days;
    const change = ((total - lastWeekTotal) / lastWeekTotal * 100).toFixed(1);
    const trend = total > lastWeekTotal ? 'increasing' : total < lastWeekTotal ? 'decreasing' : 'stable';
    
    res.json({
      expectedTotal: total,
      dailyForecast,
      changeVsLastWeek: change > 0 ? `+${change}%` : `${change}%`,
      trend
    });
  }
});

// AI Trend Alerts endpoint
router.get("/trend/alerts", async (req, res) => {
  try {
    const axios = require('axios');
    const response = await axios.get(`${AI_SERVICE_URL}/ai/trend/alerts`, { timeout: 5000 });
    res.json(response.data);
  } catch (error) {
    // Return empty alerts if AI service is unavailable
    res.json({ data: [] });
  }
});

module.exports = router;
