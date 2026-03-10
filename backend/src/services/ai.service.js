/**
 * AI Service - Connects to Python microservices for AI features
 * 
 * - Category prediction
 * - Keyword extraction
 * - SLA calculation
 * 
 * All calls are non-blocking (setImmediate) to avoid blocking HTTP responses
 */

const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Category predictor endpoint
const CATEGORY_ENDPOINT = `${AI_SERVICE_URL}/ai/predict-category`;
// Keyword extractor endpoint  
const KEYWORD_ENDPOINT = `${AI_SERVICE_URL}/ai/extract-keywords`;
// SLA calculator endpoint
const SLA_ENDPOINT = `${AI_SERVICE_URL}/ai/calculate-sla`;

/**
 * Predict category using AI
 * @param {string} title - Complaint title
 * @param {string} description - Complaint description
 * @returns {Promise<{predicted: string, confidence: number, alternatives: string[], reasoning: string}>}
 */
async function predictCategory(title, description) {
  try {
    const response = await axios.post(CATEGORY_ENDPOINT, {
      title,
      description
    }, {
      timeout: 10000 // 10 second timeout
    });
    return response.data;
  } catch (error) {
    console.error('AI Category Prediction Error:', error.message);
    // Return fallback
    return {
      predicted: 'AUTRE',
      confidence: 0,
      alternatives: [],
      reasoning: 'AI service unavailable. Please select category manually.'
    };
  }
}

/**
 * Extract keywords using AI
 * @param {string} title - Complaint title
 * @param {string} description - Complaint description
 * @param {string} category - Category
 * @param {string} municipality - Municipality name
 * @returns {Promise<{keywords: string[], locationKeywords: string[], urgencyKeywords: string[], similarityHash: string}>}
 */
async function extractKeywords(title, description, category = 'AUTRE', municipality = '') {
  try {
    const response = await axios.post(KEYWORD_ENDPOINT, {
      title,
      description,
      category,
      municipality
    }, {
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error('AI Keyword Extraction Error:', error.message);
    // Return fallback
    return {
      keywords: [],
      locationKeywords: [],
      urgencyKeywords: [],
      similarityHash: '000000000000'
    };
  }
}

/**
 * Calculate SLA using AI
 * @param {string} urgency - Urgency level (CRITICAL, HIGH, MEDIUM, LOW)
 * @param {string} category - Category
 * @param {string} createdAt - ISO format creation date (optional)
 * @returns {Promise<{deadline: string, status: string, remaining_hours: number, total_hours: number}>}
 */
async function calculateSLA(urgency, category, createdAt = null) {
  try {
    const response = await axios.post(SLA_ENDPOINT, {
      urgency,
      category,
      created_at: createdAt
    }, {
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error('AI SLA Calculation Error:', error.message);
    // Return fallback (7 days default)
    const now = new Date();
    const deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
      deadline: deadline.toISOString(),
      status: 'ON_TRACK',
      remaining_hours: 168,
      total_hours: 168
    };
  }
}

/**
 * Process new complaint - extract keywords asynchronously
 * This is called after complaint is created
 * 
 * @param {Object} complaint - The created complaint object
 * @param {Object} ComplaintModel - Mongoose model for updating
 */
async function processNewComplaint(complaint, ComplaintModel) {
  // Non-blocking call
  setImmediate(async () => {
    try {
      console.log(`[AI] Processing new complaint ${complaint._id}`);
      
      const municipalityName = complaint.municipality?.name || 
                              (typeof complaint.municipality === 'string' ? complaint.municipality : '');
      
      // Extract keywords
      const keywordsResult = await extractKeywords(
        complaint.title,
        complaint.description,
        complaint.category,
        municipalityName
      );
      
      // Update complaint with extracted keywords
      await ComplaintModel.findByIdAndUpdate(complaint._id, {
        $set: {
          keywords: keywordsResult.keywords,
          aiData: {
            locationKeywords: keywordsResult.locationKeywords,
            urgencyKeywords: keywordsResult.urgencyKeywords,
            similarityHash: keywordsResult.similarityHash,
            keywordExtractedAt: new Date()
          }
        }
      });
      
      console.log(`[AI] Keywords extracted for complaint ${complaint._id}`);
    } catch (error) {
      console.error(`[AI] Error processing complaint ${complaint._id}:`, error.message);
    }
  });
}

/**
 * Process assigned complaint - calculate SLA asynchronously
 * This is called after complaint is assigned to a department/technician
 * 
 * @param {Object} complaint - The assigned complaint object
 * @param {Object} ComplaintModel - Mongoose model for updating
 */
async function processAssignedComplaint(complaint, ComplaintModel) {
  // Non-blocking call
  setImmediate(async () => {
    try {
      console.log(`[AI] Processing SLA for complaint ${complaint._id}`);
      
      // Calculate SLA
      const slaResult = await calculateSLA(
        complaint.urgency,
        complaint.category,
        complaint.createdAt
      );
      
      // Update complaint with SLA deadline
      await ComplaintModel.findByIdAndUpdate(complaint._id, {
        $set: {
          slaDeadline: slaResult.deadline,
          slaStatus: slaResult.status,
          slaCalculatedAt: new Date()
        }
      });
      
      console.log(`[AI] SLA calculated for complaint ${complaint._id}: ${slaResult.status}`);
    } catch (error) {
      console.error(`[AI] Error calculating SLA for complaint ${complaint._id}:`, error.message);
    }
  });
}

module.exports = {
  predictCategory,
  extractKeywords,
  calculateSLA,
  processNewComplaint,
  processAssignedComplaint
};
