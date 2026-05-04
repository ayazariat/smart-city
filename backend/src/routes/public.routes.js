const express = require("express");
const router = express.Router();
const Department = require("../models/Department");
const aiService = require("../services/ai.service");

/**
 * Helper function to predict department based on category/description
 */
const predictDepartment = (category, description) => {
  const keywords = {
    "Roads & Infrastructure": ["road", "pavement", "hole", "damage", "street", "road", "infrastructure", "bridge", "sidewalk"],
    "Public Lighting": ["light", "lamp", "路灯", "dark", "streetlight", "lighting", "electricity", "power"],
    "Waste Management": ["waste", "garbage", "trash", "bin", "clean", " collecte", "déchet", " poubelle", "salubrit"],
    "Parks & Green Spaces": ["park", "tree", "garden", "green", "vegetation", "jardin", "espace vert", "arbre"],
    "Water & Sanitation": ["water", "drainage", "sewer", "flood", "égout", "eau", "assainissement", "inondation"],
    "Traffic & Road Signage": ["traffic", "sign", "signal", "road sign", "stop", "signalisation", "panneau", "circulation"],
    "Urban Planning": ["building", "construction", "permit", "urban", "construction", "bâtiment", "permis", "urbanisme"],
    "Public Equipment": ["equipment", "bench", "furniture", "公共设施", "équipement", "banc", "mobilier"],
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
 * POST /api/public/ai/predict-category - AI category suggestion
 */
router.post("/ai/predict-category", async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ success: false, message: "Text is required" });
    }
    
    const result = await aiService.predictCategory(text);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("AI predict-category error:", error.message);
    res.status(500).json({ 
      success: false,
      data: {
        predicted: "AUTRE",
        confidence: 0,
        alternatives: [],
        reasoning: "Service error, defaulting to AUTRE"
      }
    });
  }
});

module.exports = router;