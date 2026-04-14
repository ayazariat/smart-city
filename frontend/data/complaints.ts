// Re-export from the single source of truth
export { statusConfig, categoryLabels, CATEGORY_LABELS } from "@/lib/complaints";

// Duplicate-safe category labels for backward compat
// (kept in case some imports still point here)
export const categoryLabelsLocal: Record<string, string> = {
  WASTE: "Waste & Cleanliness",
  ROAD: "Roads & Traffic",
  LIGHTING: "Street Lighting",
  WATER: "Water & Drainage",
  SAFETY: "Public Safety & Noise",
  PUBLIC_PROPERTY: "Public Property",
  GREEN_SPACE: "Parks & Green Spaces",
  OTHER: "Other",
};

// Urgency labels
export const urgencyLabels: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};
