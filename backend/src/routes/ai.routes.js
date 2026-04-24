const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const aiService = require("../services/ai.service");

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
