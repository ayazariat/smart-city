/**
 * Shared complaint constants and utilities.
 * Single source of truth used across all complaint-related pages.
 */

export const statusConfig: Record<string, { label: string; bgClass: string; textClass: string }> = {
  SUBMITTED:   { label: "SUBMITTED",   bgClass: "bg-yellow-100", textClass: "text-yellow-800" },
  VALIDATED:   { label: "VALIDATED",   bgClass: "bg-blue-100",   textClass: "text-blue-800"   },
  ASSIGNED:    { label: "ASSIGNED",    bgClass: "bg-purple-100", textClass: "text-purple-800" },
  IN_PROGRESS: { label: "IN PROGRESS", bgClass: "bg-orange-100", textClass: "text-orange-800" },
  RESOLVED:    { label: "RESOLVED",    bgClass: "bg-green-100",  textClass: "text-green-800"  },
  CLOSED:      { label: "CLOSED",      bgClass: "bg-gray-100",   textClass: "text-gray-700"   },
  REJECTED:    { label: "REJECTED",    bgClass: "bg-red-100",    textClass: "text-red-800"    },
};

export const categoryLabels: Record<string, string> = {
  ROAD:           "Roads",
  LIGHTING:       "Lighting",
  WASTE:          "Waste",
  WATER:          "Water",
  SAFETY:         "Safety",
  PUBLIC_PROPERTY:"Public Property",
  GREEN_SPACE:    "Green Spaces",
  TRAFFIC:        "Traffic",
  URBAN_PLANNING: "Urban Planning",
  EQUIPMENT:      "Equipment",
  BUILDING:       "Buildings",
  NOISE:          "Noise",
  OTHER:          "Other",
};

export const STATUS_OPTIONS = [
  { value: "SUBMITTED",   label: "Submitted"   },
  { value: "VALIDATED",   label: "Validated"   },
  { value: "ASSIGNED",    label: "Assigned"    },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED",    label: "Resolved"    },
  { value: "CLOSED",      label: "Closed"      },
  { value: "REJECTED",    label: "Rejected"    },
] as const;

export const getComplaintIdDisplay = (id: string): string =>
  `RC-${id.slice(-6).toUpperCase()}`;
