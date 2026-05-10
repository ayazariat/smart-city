// SLA Configuration for Smart City Tunisia
// This module provides SLA hours based on urgency and category
// Now reads from database instead of hardcoded values

const SLARule = require('../models/SLARule');

// SLA hours by urgency level (fallback defaults)
const SLA_HOURS = {
  URGENT: 4,      // 4 hours
  HIGH: 24,       // 24 hours (1 day)
  MEDIUM: 72,     // 72 hours (3 days)
  LOW: 168,       // 168 hours (7 days)
  DEFAULT: 72     // Default to medium
};

// SLA hours by category (fallback defaults)
const SLA_BY_CATEGORY = {
  ROAD: 72,
  LIGHTING: 48,
  WASTE: 24,
  WATER: 72,
  SAFETY: 48,
  PUBLIC_PROPERTY: 96,
  GREEN_SPACE: 120,
  BUILDING: 120,
  OTHER: 120,
  DEFAULT: 72
};

/**
 * Get SLA hours from database based on category and urgency
 * Falls back to hardcoded values if database is empty or unavailable
 * @param {string} category - Category name
 * @param {string} urgency - Urgency level (URGENT, HIGH, MEDIUM, LOW)
 * @returns {Promise<number>} - Hours allowed
 */
async function getSlaHoursFromDB(category, urgency) {
  try {
    const normalizedCategory = category ? category.toUpperCase() : null;
    const normalizedUrgency = urgency ? urgency.toUpperCase() : null;

    if (normalizedCategory && normalizedUrgency) {
      const rule = await SLARule.findOne({
        category: normalizedCategory,
        urgency: normalizedUrgency,
        isActive: true
      });

      if (rule) {
        return rule.deadlineHours;
      }
    }

    // Fallback to urgency-based default if no category-specific rule
    if (normalizedUrgency) {
      const rule = await SLARule.findOne({
        urgency: normalizedUrgency,
        isActive: true
      });

      if (rule) {
        return rule.deadlineHours;
      }
    }

    // Return hardcoded fallback
    if (normalizedUrgency) {
      return SLA_HOURS[normalizedUrgency] || SLA_HOURS.DEFAULT;
    }

    return SLA_HOURS.DEFAULT;
  } catch (error) {
    console.error('Error fetching SLA from database, using fallback:', error);
    // Fallback to hardcoded values on error
    if (urgency) {
      return SLA_HOURS[urgency.toUpperCase()] || SLA_HOURS.DEFAULT;
    }
    return SLA_HOURS.DEFAULT;
  }
}

/**
 * Get SLA hours based on urgency level (synchronous fallback)
 * @param {string} urgency - URGENT, HIGH, MEDIUM, LOW
 * @returns {number} - Hours allowed
 */
function getSlaHours(urgency) {
  if (!urgency) return SLA_HOURS.DEFAULT;
  const key = urgency.toUpperCase();
  return SLA_HOURS[key] || SLA_HOURS.DEFAULT;
}

/**
 * Get SLA hours based on category (returns medium urgency hours for that category)
 * @param {string} category - Category name
 * @returns {number} - Hours allowed
 */
function getSlaHoursByCategory(category) {
  if (!category) return SLA_BY_CATEGORY.DEFAULT;
  const key = category.toUpperCase();
  return SLA_BY_CATEGORY[key] || SLA_BY_CATEGORY.DEFAULT;
}

module.exports = {
  SLA_HOURS,
  getSlaHours,
  getSlaHoursByCategory,
  SLA_BY_CATEGORY,
  getSlaHoursFromDB
};
