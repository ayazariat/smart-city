/**
 * Shared complaint constants and utilities.
 * Single source of truth used across all complaint-related pages.
 */

export const statusConfig: Record<string, { label: string; bgClass: string; textClass: string; dotClass: string }> = {
  SUBMITTED:   { label: "Submitted",   bgClass: "bg-amber-50",  textClass: "text-amber-700",  dotClass: "bg-amber-500"  },
  VALIDATED:   { label: "Validated",   bgClass: "bg-blue-50",   textClass: "text-blue-700",   dotClass: "bg-blue-500"   },
  ASSIGNED:    { label: "Assigned",    bgClass: "bg-purple-50", textClass: "text-purple-700", dotClass: "bg-purple-500" },
  IN_PROGRESS: { label: "In Progress", bgClass: "bg-orange-50", textClass: "text-orange-700", dotClass: "bg-orange-500" },
  RESOLVED:    { label: "Resolved",    bgClass: "bg-green-50",  textClass: "text-green-700",  dotClass: "bg-green-500"  },
  CLOSED:      { label: "Closed",      bgClass: "bg-slate-100", textClass: "text-slate-600",  dotClass: "bg-slate-500"  },
  REJECTED:    { label: "Rejected",    bgClass: "bg-red-50",    textClass: "text-red-700",    dotClass: "bg-red-500"    },
  RESOLUTION_REJECTED: { label: "Rework Needed", bgClass: "bg-red-50", textClass: "text-red-700", dotClass: "bg-red-500" },
};

export const CATEGORY_LABELS: Record<string, string> = {
  ROAD:            "Roads & Infrastructure",
  LIGHTING:        "Public Lighting",
  WASTE:           "Waste Management",
  WATER:           "Water & Sanitation",
  SAFETY:          "Public Safety",
  PUBLIC_PROPERTY: "Public Property",
  GREEN_SPACE:     "Parks & Green Spaces",
  OTHER:           "Other",
};

export const categoryLabels = CATEGORY_LABELS;

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
