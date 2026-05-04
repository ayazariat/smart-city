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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
    } catch (error) {
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
async function predictDepartment(category, description = '', municipality = '') {
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
  } catch (error) {
    return {
      suggestedDepartment: null,
      departmentName: 'Services Généraux',
      confidence: 50,
      message: 'Default department suggested'
    };
  }
}

module.exports = {
  predictCategory,
  predictDepartment,
  extractKeywords,
  calculateSLA,
  processNewComplaint,
  recalculateSLA
};
