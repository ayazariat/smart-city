const MILLI_PER_HOUR = 3_600_000;

// Urgency is mapped to 1–4 in the original spec, but in this codebase we
// already use string levels: LOW, MEDIUM, HIGH, URGENT.
// We keep a simple matrix that can be tuned later.
const SLA_MATRIX = {
  URGENT: {
    SAFETY: 8,
    WATER: 8,
    ROAD: 12,
    LIGHTING: 24,
    WASTE: 48,
    PUBLIC_PROPERTY: 48,
    OTHER: 72,
  },
  HIGH: {
    SAFETY: 24,
    WATER: 24,
    ROAD: 48,
    LIGHTING: 72,
    WASTE: 120,
    PUBLIC_PROPERTY: 120,
    OTHER: 168,
  },
  MEDIUM: {
    SAFETY: 72,
    WATER: 72,
    ROAD: 120,
    LIGHTING: 168,
    WASTE: 240,
    PUBLIC_PROPERTY: 240,
    OTHER: 336,
  },
  LOW: {
    SAFETY: 168,
    WATER: 168,
    ROAD: 240,
    LIGHTING: 336,
    WASTE: 480,
    PUBLIC_PROPERTY: 480,
    OTHER: 672,
  },
};

function calculate(urgency, category) {
  const urgencyKey = urgency || "MEDIUM";
  const catKey = category || "OTHER";
  const hours =
    (SLA_MATRIX[urgencyKey] &&
      SLA_MATRIX[urgencyKey][catKey]) ||
    168;
  return new Date(Date.now() + hours * MILLI_PER_HOUR);
}

function getStatus(slaDeadline) {
  if (!slaDeadline) return null;
  const deadline = new Date(slaDeadline);
  const diff = deadline.getTime() - Date.now();

  if (diff > 6 * MILLI_PER_HOUR) return "ON_TRACK";
  if (diff > 0) return "AT_RISK";
  return "OVERDUE";
}

module.exports = { calculate, getStatus };

