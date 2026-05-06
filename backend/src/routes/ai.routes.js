const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const aiService = require("../services/ai.service");
const Complaint = require("../models/Complaint");
const Notification = require("../models/Notification");

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
  try {
    const { title, description, category, citizenUrgency, municipality, confirmationCount } = req.body;
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
    const { complaintId, title, description, category, municipality, latitude, longitude, submittedAt } = req.body;
    const axios = require('axios');
    const response = await axios.post(`${AI_SERVICE_URL}/ai/duplicate/check`, {
      complaintId: complaintId || "new",
      title,
      description,
      category,
      municipality,
      latitude,
      longitude,
      submittedAt
    }, { timeout: 10000 });
    res.json({ data: response.data });
  } catch (error) {
    console.error("AI duplicate check error:", error.message);
    res.json({
      data: {
        isDuplicate: false,
        duplicateLevel: "none",
        topMatches: [],
        recommendation: "No duplicates found",
        humanReviewRequired: false
      }
    });
  }
});

router.get("/duplicate/stats", async (req, res) => {
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

router.get("/stats/duplicates/today", authenticate, async (req, res) => {
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
  authorize("MUNICIPAL_AGENT"),
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

      const notificationService = require('../services/notification.service');
      const targetUser = await User.findById(target.createdBy).select('_id').lean();

      if (action === "keep_separate") {
        target.duplicateStatus = "NOT_DUPLICATE";
        target.duplicateOf = null;
        await target.save();

        // Inform complaint owner that duplicate review is complete
        if (target.createdBy) {
          try {
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
      }

      if (!existingComplaintId || action !== "merge") {
        return res
          .status(400)
          .json({ success: false, message: "Invalid duplicate action" });
      }

      const source = await Complaint.findById(existingComplaintId);
      if (!source) {
        return res
          .status(404)
          .json({ success: false, message: "Source complaint not found" });
      }
      if (source._id.toString() === target._id.toString()) {
        return res
          .status(400)
          .json({ success: false, message: "Cannot merge same complaint" });
      }

      const ensureCitizenConfirmation = (citizenId) => {
        if (!citizenId) return;
        target.confirmations = target.confirmations || [];
        const alreadyConfirmed = target.confirmations.some(
          (c) => (c.citizenId || c.userId)?.toString() === citizenId.toString()
        );
        if (!alreadyConfirmed) {
          target.confirmations.push({
            citizenId,
            confirmedAt: new Date(),
          });
        }
      };

      // Preserve traceability: source owner + source confirmations become confirmations on target.
      ensureCitizenConfirmation(source.createdBy);
      for (const confirmation of source.confirmations || []) {
        ensureCitizenConfirmation(confirmation.citizenId || confirmation.userId);
      }

      target.confirmationCount = target.confirmations?.length || 0;
      target.duplicateStatus = "CONFIRMED_DUPLICATE";
      await target.save();

      source.duplicateStatus = "CONFIRMED_DUPLICATE";
      source.duplicateOf = target._id;
      source.isArchived = true;
      source.archivedAt = new Date();
      await source.save();

      const notificationService = require('../services/notification.service');

      // Notify source and target complaint owners for traceability/transparency
      const notificationJobs = [];
      if (source.createdBy) {
        notificationJobs.push(
          notificationService.sendNotification(null, source.createdBy.toString(), {
            type: "duplicate_merged",
            title: "Complaint merged",
            message: "Your complaint has been merged with a similar case to centralize resolution.",
            complaintId: target._id.toString(),
            metadata: { action: "merge", sourceComplaintId: source._id.toString(), targetComplaintId: target._id.toString() },
          })
        );
      }
      if (target.createdBy) {
        notificationJobs.push(
          notificationService.sendNotification(null, target.createdBy.toString(), {
            type: "duplicate_merged",
            title: "Community support updated",
            message: "A similar complaint was merged into your case. Support confirmations were updated.",
            complaintId: target._id.toString(),
            metadata: { action: "merge", sourceComplaintId: source._id.toString(), targetComplaintId: target._id.toString() },
          })
        );
      }
      if (notificationJobs.length > 0) {
        await Promise.all(notificationJobs);
      }

      return res.json({
        success: true,
        message: "Complaints merged successfully",
        targetComplaintId: target._id,
        sourceComplaintId: source._id,
        confirmationCount: target.confirmationCount,
      });
    } catch (error) {
      console.error("Duplicate confirm error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to process duplicate decision" });
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

module.exports = router;
