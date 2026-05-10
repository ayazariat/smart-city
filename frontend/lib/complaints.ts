/**
 * Shared complaint constants and utilities.
 * Single source of truth used across all complaint-related pages.
 */

export const statusConfig: Record<string, { labelKey: string; bgClass: string; textClass: string; dotClass: string }> = {
  SUBMITTED: { labelKey: "status.SUBMITTED", bgClass: "bg-amber-50", textClass: "text-amber-700", dotClass: "bg-amber-500" },
  VALIDATED: { labelKey: "status.VALIDATED", bgClass: "bg-blue-50", textClass: "text-blue-700", dotClass: "bg-blue-500" },
  ASSIGNED: { labelKey: "status.ASSIGNED", bgClass: "bg-purple-50", textClass: "text-purple-700", dotClass: "bg-purple-500" },
  IN_PROGRESS: { labelKey: "status.IN_PROGRESS", bgClass: "bg-orange-50", textClass: "text-orange-700", dotClass: "bg-orange-500" },
  RESOLVED: { labelKey: "status.RESOLVED", bgClass: "bg-green-50", textClass: "text-green-700", dotClass: "bg-green-500" },
  CLOSED: { labelKey: "status.CLOSED", bgClass: "bg-slate-100", textClass: "text-slate-600", dotClass: "bg-slate-500" },
  REJECTED: { labelKey: "status.REJECTED", bgClass: "bg-red-50", textClass: "text-red-700", dotClass: "bg-red-500" },
  RESOLUTION_REJECTED: { labelKey: "status.RESOLUTION_REJECTED", bgClass: "bg-red-50", textClass: "text-red-700", dotClass: "bg-red-500" },
};

export * from './categories';


export type CategoryValue = string;

export const STATUS_OPTIONS = [
  { value: "SUBMITTED", label: "status.SUBMITTED" },
  { value: "VALIDATED", label: "status.VALIDATED" },
  { value: "ASSIGNED", label: "status.ASSIGNED" },
  { value: "IN_PROGRESS", label: "status.IN_PROGRESS" },
  { value: "RESOLVED", label: "status.RESOLVED" },
  { value: "CLOSED", label: "status.CLOSED" },
  { value: "REJECTED", label: "status.REJECTED" },
] as const;

export const getComplaintIdDisplay = (id: string): string => `RC-${id.slice(-6).toUpperCase()}`;
