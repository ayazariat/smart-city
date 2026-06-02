/**
 * AI Service - Bridge between backend and Python AI services
 * 
 * This service calls the Python AI microservices for:
 * - Category prediction
 * - Keyword extraction
 * - SLA calculation
 */

const axios = require('axios');

// Service URL (all AI services run on a single FastAPI server)
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Predict category from complaint text
 * @param {string} description - Complaint description
 * @returns {Promise<{predicted: string, confidence: number, alternatives: string[], reasoning: string}>}
 */
async function predictCategory(description) {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/predict-category`, {
      text: description
    }, {
      timeout: 10000
    });
    return response.data;
  } catch {
    return {
      predicted: 'AUTRE',
      confidence: 0,
      alternatives: [],
      reasoning: 'Service unavailable, defaulting to AUTRE category'
    };
  }
}

/**
 * Extract keywords from complaint text
 * @param {string} description - Complaint description
 * @returns {Promise<{keywords: string[], locationKeywords: string[], urgencyKeywords: string[], similarityHash: string}>}
 */
async function extractKeywords(description) {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/extract-keywords`, {
      text: description
    }, {
      timeout: 10000
    });
    return response.data;
  } catch {
    return {
      keywords: [],
      locationKeywords: [],
      urgencyKeywords: [],
      similarityHash: ''
    };
  }
}

/**
 * Calculate SLA deadline based on category and urgency
 * @param {string} category - Complaint category
 * @param {string} urgency - Urgency level (CRITICAL, HIGH, MEDIUM, LOW)
 * @param {Date} createdAt - Complaint creation date
 * @returns {Promise<{deadline: Date, status: string, remaining_h: number}>}
 */
async function calculateSLA(category, urgency, createdAt) {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/calculate-sla`, {
      category,
      urgency,
      createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt
    }, {
      timeout: 10000
    });
    return response.data;
  } catch {
    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 7);
    return {
      deadline: defaultDeadline,
      status: 'UNKNOWN',
      remaining_h: 168
    };
  }
}

/**
 * Process new complaint with AI services
 * Called after complaint is created
 * @param {Object} complaint - Complaint object
 */
async function processNewComplaint(complaint) {
  // Run async - don't block the HTTP response
  setImmediate(async () => {
    try {
      // Extract keywords in background
      const keywords = await extractKeywords(complaint.description || '');
      
      // Update complaint with keywords if needed
      if (keywords.keywords && keywords.keywords.length > 0) {
        const Complaint = require('../models/Complaint');
        await Complaint.findByIdAndUpdate(complaint._id, {
          $set: {
            keywords: keywords.keywords
          }
        });
      }
    } catch {
      // Never throw - this runs in background
    }
  });
}

/**
 * Recalculate SLA after department assignment
 * Called after complaint is assigned to a department
 * @param {Object} complaint - Complaint object
 */
async function recalculateSLA(complaint) {
  // Run async - don't block the HTTP response
  setImmediate(async () => {
    try {
      const sla = await calculateSLA(
        complaint.category,
        complaint.urgency,
        complaint.createdAt
      );
      
      // Update complaint with SLA deadline
      const Complaint = require('../models/Complaint');
      await Complaint.findByIdAndUpdate(complaint._id, {
        $set: {
          slaDeadline: sla.deadline
        }
      });
    } catch (error) {
      console.error('[AI Service] Error calculating SLA:', error.message);
      // Never throw - this runs in background
    }
  });
}

/**
 * Predict department from category + other factors
 */
async function predictDepartment(category) {
  try {
    // Static mapping from categories to departments (based on seed data)
    const categoryToDepartment = {
      'waste': { id: '671f1b4a8f4a5c4b4d2b4f1a', name: 'Déchets et Propreté' },
      'roads': { id: '671f1b4a8f4a5c4b4d2b4f1b', name: 'Routes et Circulation' },
      'lighting': { id: '671f1b4a8f4a5c4b4d2b4f1c', name: 'Éclairage public' },
      'water': { id: '671f1b4a8f4a5c4b4d2b4f1d', name: 'Eau et Drainage' },
      'safety': { id: '671f1b4a8f4a5c4b4d2b4f1e', name: 'Sécurité et Bruit' },
      'property': { id: '671f1b4a8f4a5c4b4d2b4f1f', name: 'Propriété publique' },
      'parks': { id: '671f1b4a8f4a5c4b4d2b4f20', name: 'Parcs et Espaces verts' },
      'other': { id: '671f1b4a8f4a5c4b4d2b4f21', name: 'Services Généraux' }
    };

    const dept = categoryToDepartment[category] || categoryToDepartment['other'];
    
    // Boost confidence for clear category match
    let confidence = 0.95;
    if (category === 'other') confidence = 0.7;

    return {
      suggestedDepartment: dept.id,
      departmentName: dept.name,
      confidence: Math.round(confidence * 100),
      message: `Matched category "${category}" to ${dept.name}`
    };
  } catch {
    return {
      suggestedDepartment: null,
      departmentName: 'Services Généraux',
      confidence: 50,
      message: 'Default department suggested'
    };
  }
}

const URGENCY_KEYWORDS = {
  CRITICAL: ['danger', 'mort', 'accident', 'effondrement', 'incendie', 'explosion', 'électrocut', 'urgence vital', 'grave', 'blessé', 'urgence', 'urgent', 'collapse', 'fire', 'explosion', 'injury', 'fatal'],
  HIGH: ['risque', 'danger', 'dégât', 'fuite gaz', 'casse', 'brisé', 'cassé', 'endommagé', 'obstrué', 'bouché', 'débord', 'inondation', 'flood', 'leak', 'broken', 'damage', 'hazard', 'safety'],
  MEDIUM: ['problème', 'panne', 'dysfonctionnement', 'casse', 'trou', 'mauvais', 'abîmé', 'usé', 'dégradé', 'saleté', 'encombrant', 'issue', 'broken', 'worn', 'dirty', 'clogged'],
  LOW: ['info', 'renseignement', 'suggestion', 'demande', 'question', 'information', 'request', 'suggestion', 'inquiry']
};

const CATEGORY_URGENCY = {
  safety: 5, water: 4, waste: 3, roads: 2,
  lighting: 2, property: 2, parks: 1, other: 1
};

const CITIZEN_URGENCY_SCORE = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };

function computeLocalUrgencyPrediction({ title, description, category, citizenUrgency, confirmationCount = 0 }) {
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  const textKeywords = text.split(/\s+/);

  let maxScore = 0;
  for (const [, keywords] of Object.entries(URGENCY_KEYWORDS)) {
    const score = keywords.filter(kw => textKeywords.some(w => w.includes(kw))).length;
    if (score > maxScore) {
      maxScore = score;
    }
  }

  const textScore = Math.min(maxScore / 3, 1);
  const categoryScore = CATEGORY_URGENCY[category] || 1;
  const citizenScore = CITIZEN_URGENCY_SCORE[citizenUrgency] || 1;
  const communityScore = Math.min(Math.log(confirmationCount + 1) / 2, 1);
  const isNight = new Date().getHours() < 6 || new Date().getHours() > 20;
  const timeScore = isNight ? 1 : 0;

  const total = textScore * 3 + categoryScore + citizenScore + communityScore + timeScore;
  let predictedUrgency;
  if (total >= 9) predictedUrgency = 'CRITICAL';
  else if (total >= 6) predictedUrgency = 'HIGH';
  else if (total >= 3) predictedUrgency = 'MEDIUM';
  else predictedUrgency = 'LOW';

  const confidenceScore = Math.min((total / 12) * 0.8 + 0.15, 0.95);

  const factors = [];
  if (textScore > 0) factors.push(`${Math.round(textScore * 100)}% urgency keywords in text`);
  factors.push(`${Math.round(categoryScore / 5 * 100)}% category base (${category})`);
  factors.push(`${Math.round(citizenScore / 3 * 100)}% citizen assessment`);
  if (communityScore > 0) factors.push(`confirmed by ${confirmationCount} people`);
  if (isNight) factors.push('submitted during nighttime (higher risk)');

  return {
    predictedUrgency,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    breakdown: {
      textScore: Math.round(textScore * 100) / 100,
      categoryBaseScore: Math.round((categoryScore / 5) * 100) / 100,
      citizenUrgencyScore: Math.round((citizenScore / 3) * 100) / 100,
      communityScore: communityScore,
      timeScore: timeScore,
      sensitiveZoneBonus: 0
    },
    isRuleBased: true,
    explanation: `Rule-based: ${factors.join(', ')}`
  };
}

async function predictUrgency({ title, description, category, citizenUrgency, municipality, latitude, longitude, confirmationCount }) {
  try {
    const axios = require('axios');
    const response = await axios.post(`${AI_SERVICE_URL}/ai/urgency/predict`, {
      title, description, category, citizenUrgency: citizenUrgency || 'MEDIUM',
      municipality: municipality || '', latitude, longitude,
      confirmationCount: confirmationCount || 0, submittedAt: new Date()
    }, { timeout: 5000 });
    if (response.data?.data) {
      return { ...response.data.data, isRemote: true };
    }
  } catch {
    // Python service unavailable — use local fallback
  }
  return computeLocalUrgencyPrediction({ title, description, category, citizenUrgency, confirmationCount, latitude, longitude });
}

module.exports = {
  predictCategory,
  predictDepartment,
  extractKeywords,
  calculateSLA,
  processNewComplaint,
  recalculateSLA,
  predictUrgency,
  computeLocalUrgencyPrediction
};
