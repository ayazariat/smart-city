const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const aiService = require("../services/ai.service");

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

module.exports = router;
