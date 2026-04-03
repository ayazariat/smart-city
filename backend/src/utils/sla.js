// SLA Configuration and utilities for Smart City Tunisia

// SLA Configuration by Category and Urgency (in hours)
// Working days are Mon-Fri, excluding Tunis holidays
const SLA_CONFIG = {
  ROAD: { LOW: 7 * 24, MEDIUM: 3 * 24, HIGH: 24, URGENT: 4 },
  LIGHTING: { LOW: 5 * 24, MEDIUM: 2 * 24, HIGH: 12, URGENT: 2 },
  WASTE: { LOW: 3 * 24, MEDIUM: 24, HIGH: 6, URGENT: 2 },
  WATER: { LOW: 7 * 24, MEDIUM: 3 * 24, HIGH: 12, URGENT: 1 },
  SAFETY: { LOW: 5 * 24, MEDIUM: 48, HIGH: 6, URGENT: 0.5 },
  PUBLIC_PROPERTY: { LOW: 10 * 24, MEDIUM: 4 * 24, HIGH: 24, URGENT: 2 },
  GREEN_SPACE: { LOW: 10 * 24, MEDIUM: 5 * 24, HIGH: 48, URGENT: 1 },
  BUILDING: { LOW: 10 * 24, MEDIUM: 5 * 24, HIGH: 48, URGENT: 4 },
  OTHER: { LOW: 10 * 24, MEDIUM: 5 * 24, HIGH: 48, URGENT: 4 },
};

function addWorkingDays(startDate, days) {
  const result = new Date(startDate);
  let daysAdded = 0;
  
  while (daysAdded < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      daysAdded++;
    }
  }
  
  return result;
}

function calculateSLADeadline(category, urgency, assignedAt) {
  const categorySLA = SLA_CONFIG[category] || SLA_CONFIG.OTHER;
  const urgencyKey = urgency?.toUpperCase() || 'MEDIUM';
  const hours = categorySLA[urgencyKey] || categorySLA.MEDIUM;
  
  return new Date(assignedAt.getTime() + hours * 60 * 60 * 1000);
}

function getSlaStatus(deadline, createdAt, status) {
  if (!deadline || status === 'RESOLVED' || status === 'CLOSED') {
    return { status: 'COMPLETED', progress: 100, remainingHours: 0, isOverdue: false, isAtRisk: false, deadline };
  }
  
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const created = createdAt ? new Date(createdAt) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const totalMs = deadlineDate - created;
  const elapsedMs = now - created;
  
  if (totalMs <= 0) {
    return { status: 'OVERDUE', progress: 100, remainingHours: 0, isOverdue: true, isAtRisk: false, deadline: deadlineDate };
  }
  
  const progress = Math.min(100, (elapsedMs / totalMs) * 100);
  const remainingHours = Math.max(0, (deadlineDate - now) / (1000 * 60 * 60));
  const isOverdue = now > deadlineDate;
  const isAtRisk = progress >= 80 && !isOverdue;
  
  let slaStatus = 'ON_TRACK';
  if (isOverdue) {
    slaStatus = 'OVERDUE';
  } else if (isAtRisk) {
    slaStatus = 'AT_RISK';
  }
  
  return {
    status: slaStatus,
    progress: Math.round(progress),
    remainingHours: Math.round(remainingHours * 10) / 10,
    isOverdue,
    isAtRisk,
    deadline: deadlineDate,
  };
}

// Format remaining time for display
function formatRemainingTime(remainingHours) {
  if (remainingHours <= 0) {
    return { text: "Overdue", color: "text-red-600" };
  }
  if (remainingHours < 1) {
    const mins = Math.round(remainingHours * 60);
    return { text: `${mins}m`, color: "text-red-600" };
  }
  if (remainingHours < 24) {
    return { text: `${Math.round(remainingHours)}h`, color: remainingHours < 12 ? "text-red-600" : "text-orange-600" };
  }
  const days = Math.round(remainingHours / 24);
  return { text: `${days}d`, color: "text-green-600" };
}

module.exports = {
  SLA_CONFIG,
  calculateSLADeadline,
  getSlaStatus,
  formatRemainingTime,
  addWorkingDays,
};
