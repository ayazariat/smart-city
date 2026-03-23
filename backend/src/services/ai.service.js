/**
 * AI Service - Bridge between backend and Python AI services
 * 
 * This service calls the Python AI microservices for:
 * - Category prediction
 * - Keyword extraction
 * - SLA calculation
 */

const axios = require('axios');

// Service URLs (configure via environment variables)
const CATEGORY_SERVICE_URL = process.env.CATEGORY_SERVICE_URL || 'http://localhost:8001';
const KEYWORD_SERVICE_URL = process.env.KEYWORD_SERVICE_URL || 'http://localhost:8002';
const SLA_SERVICE_URL = process.env.SLA_SERVICE_URL || 'http://localhost:8003';

/**
 * Predict category from complaint text
 * @param {string} description - Complaint description
 * @returns {Promise<{predicted: string, confidence: number, alternatives: string[], reasoning: string}>}
 */
async function predictCategory(description) {
  try {
    const response = await axios.post(`${CATEGORY_SERVICE_URL}/predict-category`, {
      text: description
    }, {
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error('[AI Service] Category prediction error:', error.message);
    // Always fallback on error - never block HTTP
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
    const response = await axios.post(`${KEYWORD_SERVICE_URL}/extract-keywords`, {
      text: description
    }, {
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error('[AI Service] Keyword extraction error:', error.message);
    // Return empty keywords on error - never block HTTP
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
    const response = await axios.post(`${SLA_SERVICE_URL}/calculate-sla`, {
      category,
      urgency,
      createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt
    }, {
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error('[AI Service] SLA calculation error:', error.message);
    // Default SLA on error - 7 days for MEDIUM
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
            'aiData.keywords': keywords.keywords,
            'aiData.locationKeywords': keywords.locationKeywords,
            'aiData.urgencyKeywords': keywords.urgencyKeywords,
            'aiData.similarityHash': keywords.similarityHash
          }
        });
      }
    } catch (error) {
      console.error('[AI Service] Error processing new complaint:', error.message);
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

module.exports = {
  predictCategory,
  extractKeywords,
  calculateSLA,
  processNewComplaint,
  recalculateSLA
};
