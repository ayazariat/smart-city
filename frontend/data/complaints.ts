// Category labels for complaints - single source of truth
// Must match backend model and Report Issue page
export const categoryLabels: Record<string, string> = {
  WASTE: "Waste & Cleanliness",
  ROAD: "Roads & Traffic",
  LIGHTING: "Street Lighting",
  WATER: "Water & Drainage",
  SAFETY: "Public Safety & Noise",
  PUBLIC_PROPERTY: "Public Property",
  GREEN_SPACE: "Parks & Green Spaces",
  OTHER: "Other",
};

// Status labels with colors
export const statusConfig: Record<string, { label: string; bgClass: string; textClass: string }> = {
  SUBMITTED: { label: "SUBMITTED", bgClass: "bg-yellow-100", textClass: "text-yellow-800" },
  VALIDATED: { label: "VALIDATED", bgClass: "bg-blue-100", textClass: "text-blue-800" },
  ASSIGNED: { label: "ASSIGNED", bgClass: "bg-purple-100", textClass: "text-purple-800" },
  IN_PROGRESS: { label: "IN PROGRESS", bgClass: "bg-orange-100", textClass: "text-orange-800" },
  RESOLVED: { label: "RESOLVED", bgClass: "bg-green-100", textClass: "text-green-800" },
  CLOSED: { label: "CLOSED", bgClass: "bg-gray-100", textClass: "text-gray-800" },
  REJECTED: { label: "REJECTED", bgClass: "bg-red-100", textClass: "text-red-800" },
};

// Urgency labels
export const urgencyLabels: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};
