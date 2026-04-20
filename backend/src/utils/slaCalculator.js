/**
 * SLA Calculator - Calculate deadlines and status based on complaint urgency
 * 
 * SLA Times:
 * - CRITICAL: 8 hours
 * - HIGH: 48 hours  
 * - MEDIUM: 168 hours (7 days)
 * - LOW: 336 hours (14 days)
 */

const SLA_TIMES = {
  CRITICAL: 8,      // 8 hours
  HIGH: 48,        // 48 hours
  MEDIUM: 168,     // 168 hours (7 days)
  LOW: 336,        // 336 hours (14 days)
  DEFAULT: 168     // Default to medium
};

/**
 * Get SLA time in hours for a given urgency level
 * @param {string} urgency - URGENT, HIGH, MEDIUM, LOW
 * @returns {number} - Hours allowed
 */
const getSlaTime = (urgency) => {
  return SLA_TIMES[urgency?.toUpperCase()] || SLA_TIMES.DEFAULT;
};

/**
 * Calculate SLA deadline from creation date
 * @param {Date|string} createdAt - Complaint creation date
 * @param {string} urgency - Complaint urgency level
 * @returns {Date} - Deadline date
 */
const calculateDeadline = (createdAt, urgency) => {
  const created = new Date(createdAt);
  const hours = getSlaTime(urgency);
  const deadline = new Date(created.getTime() + hours * 60 * 60 * 1000);
  return deadline;
};

/**
 * Get SLA status based on deadline
 * @param {Date|string} deadline - SLA deadline
 * @returns {object} - { status, remainingHours, isOverdue, isAtRisk }
 */
const getStatus = (deadline) => {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  
  const diffMs = deadlineDate - now;
  const diffHours = diffMs / (1000 * 60 * 60);
  
  let status = 'ON_TRACK';
  let isOverdue = false;
  let isAtRisk = false;
  
  if (diffMs < 0) {
    // Overdue
    status = 'OVERDUE';
    isOverdue = true;
  } else if (diffHours < 6) {
    // Less than 6 hours remaining - at risk
    status = 'AT_RISK';
    isAtRisk = true;
  }
  
  return {
    status,
    remainingHours: Math.max(0, diffHours),
    isOverdue,
    isAtRisk,
    deadline: deadlineDate
  };
};

/**
 * Format remaining time for display
 * @param {number} hours - Remaining hours
 * @returns {string} - Formatted string like "2d 14h 30m"
 */
const formatRemainingTime = (hours) => {
  if (hours < 0) {
    return 'OVERDUE';
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = Math.floor(hours % 24);
  const minutes = Math.floor((hours % 1) * 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (remainingHours > 0) parts.push(`${remainingHours}h`);
  if (minutes > 0 && days === 0) parts.push(`${minutes}m`);
  
  return parts.length > 0 ? parts.join(' ') : '< 1m';
};

module.exports = {
  getSlaTime,
  calculateDeadline,
  getStatus,
  formatRemainingTime,
  SLA_TIMES
};
