/**
 * Priority & SLA Calculator - Intelligent decision engine for Smart City complaints
 * 
 * Features:
 * 1. Classify urgency based on multiple factors
 * 2. Compute priority score
 * 3. Calculate final SLA
 * 4. Monitor SLA status
 */

const CATEGORY_SCORES = {
  SAFETY: 5,
  WATER: 4,
  WASTE: 3,
  LIGHTING: 2,
  ROAD: 1,
  ROADS: 1,
  PUBLIC_PROPERTY: 2,
  OTHER: 2
};

const AI_URGENCY_SCORES = {
  CRITICAL: 3,
  HIGH: 2,
  MEDIUM: 1,
  LOW: 0
};

const LOCATION_SCORES = {
  HOSPITAL: 5,
  SCHOOL: 5,
  DENSE_AREA: 3,
  NORMAL: 1
};

const CATEGORY_BASE_SLA = {
  SAFETY: 24,
  WATER: 48,
  WASTE: 72,
  CLEANLINESS: 72,
  LIGHTING: 168,
  ROAD: 240,
  ROADS: 240,
  PUBLIC_PROPERTY: 120,
  OTHER: 120
};

const URGENCY_MULTIPLIERS = {
  CRITICAL: 0.5,
  HIGH: 0.75,
  MEDIUM: 1,
  LOW: 1.25
};

const SLA_MINIMUMS = {
  SAFETY: 12,
  WATER: 12,
  WASTE: 24,
  CLEANLINESS: 24,
  LIGHTING: 48,
  ROAD: 72,
  ROADS: 72,
  PUBLIC_PROPERTY: 48,
  OTHER: 48
};

function calculatePriorityScore({
  category,
  aiUrgencyPrediction,
  userUrgency,
  confirms = 0,
  upvotes = 0,
  locationType = 'NORMAL'
}) {
  const categoryScore = CATEGORY_SCORES[category?.toUpperCase()] || CATEGORY_SCORES.OTHER;
  
  const aiScore = AI_URGENCY_SCORES[aiUrgencyPrediction?.toUpperCase()] || 0;
  
  let userScore = 0;
  if (userUrgency) {
    const userUrgencyScore = AI_URGENCY_SCORES[userUrgency?.toUpperCase()] || 0;
    userScore = Math.min(userUrgencyScore, aiScore);
  }
  
  const confirmScore = Math.log(confirms + 1);
  const upvoteScore = Math.log(upvotes + 1);
  const socialScore = Math.min(confirmScore + upvoteScore, 3);
  
  const locationScore = LOCATION_SCORES[locationType?.toUpperCase()] || LOCATION_SCORES.NORMAL;
  
  const priorityScore = categoryScore + aiScore + userScore + socialScore + locationScore;
  
  return Math.round(priorityScore * 10) / 10;
}

function getUrgencyLevel(priorityScore) {
  if (priorityScore >= 15) return 'CRITICAL';
  if (priorityScore >= 10) return 'HIGH';
  if (priorityScore >= 6) return 'MEDIUM';
  return 'LOW';
}

function calculateSLA({
  category,
  urgency
}) {
  const normalizedCategory = category?.toUpperCase() || 'OTHER';
  const normalizedUrgency = urgency?.toUpperCase() || 'MEDIUM';
  
  let baseSLA = CATEGORY_BASE_SLA[normalizedCategory] || CATEGORY_BASE_SLA.OTHER;
  
  const multiplier = URGENCY_MULTIPLIERS[normalizedUrgency] || 1;
  
  let slaMin = SLA_MINIMUMS[normalizedCategory] || SLA_MINIMUMS.OTHER;
  
  const finalSLA = Math.max(baseSLA * multiplier, slaMin);
  
  return Math.round(finalSLA);
}

function calculateElapsedTime(createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now - created;
  const diffHours = diffMs / (1000 * 60 * 60);
  return Math.round(diffHours * 10) / 10;
}

function getSLAStatus(elapsedTime, slaFinal) {
  if (slaFinal <= 0) return 'UNKNOWN';
  
  const progress = elapsedTime / slaFinal;
  
  if (progress < 0.5) return 'NORMAL';
  if (progress < 1) return 'AT_RISK';
  return 'OVERDUE';
}

function getSLAProgress(elapsedTime, slaFinal) {
  if (slaFinal <= 0) return 0;
  return Math.min(100, Math.round((elapsedTime / slaFinal) * 100));
}

function calculatePriorityAndSLA(complaintData) {
  const {
    category,
    aiUrgencyPrediction,
    userUrgency,
    confirms = 0,
    upvotes = 0,
    locationType = 'NORMAL',
    createdAt
  } = complaintData;
  
  const priorityScore = calculatePriorityScore({
    category,
    aiUrgencyPrediction,
    userUrgency,
    confirms,
    upvotes,
    locationType
  });
  
  const urgencyLevel = getUrgencyLevel(priorityScore);
  
  const slaFinal = calculateSLA({
    category,
    urgency: urgencyLevel
  });
  
  const elapsedTime = createdAt ? calculateElapsedTime(createdAt) : 0;
  const progress = getSLAProgress(elapsedTime, slaFinal);
  const status = getSLAStatus(elapsedTime, slaFinal);
  
  return {
    priorityScore,
    urgencyLevel,
    slaFinal,
    elapsedTime,
    progress,
    status
  };
}

function explainCalculation({
  category,
  aiUrgencyPrediction,
  userUrgency,
  confirms,
  upvotes,
  locationType,
  priorityScore,
  urgencyLevel,
  slaFinal
}) {
  const categoryScore = CATEGORY_SCORES[category?.toUpperCase()] || CATEGORY_SCORES.OTHER;
  const aiScore = AI_URGENCY_SCORES[aiUrgencyPrediction?.toUpperCase()] || 0;
  let userScore = 0;
  if (userUrgency) {
    const userUrgencyScore = AI_URGENCY_SCORES[userUrgency?.toUpperCase()] || 0;
    userScore = Math.min(userUrgencyScore, aiScore);
  }
  const confirmScore = Math.log(confirms + 1);
  const upvoteScore = Math.log(upvotes + 1);
  const socialScore = Math.min(confirmScore + upvoteScore, 3);
  const locationScore = LOCATION_SCORES[locationType?.toUpperCase()] || LOCATION_SCORES.NORMAL;
  
  return {
    breakdown: {
      categoryScore: `${categoryScore} (${category || 'OTHER'})`,
      aiUrgencyScore: `${aiScore} (${aiUrgencyPrediction || 'none'})`,
      userUrgencyScore: `${userScore} (${userUrgency || 'none'})`,
      socialScore: `${socialScore.toFixed(2)} (confirms: ${confirms}, upvotes: ${upvotes})`,
      locationScore: `${locationScore} (${locationType || 'normal'})`
    },
    summary: `Priority ${priorityScore} → ${urgencyLevel} → SLA: ${slaFinal}h`
  };
}

module.exports = {
  calculatePriorityScore,
  getUrgencyLevel,
  calculateSLA,
  calculateElapsedTime,
  getSLAStatus,
  getSLAProgress,
  calculatePriorityAndSLA,
  explainCalculation,
  CATEGORY_SCORES,
  AI_URGENCY_SCORES,
  LOCATION_SCORES,
  CATEGORY_BASE_SLA,
  URGENCY_MULTIPLIERS,
  SLA_MINIMUMS
};
