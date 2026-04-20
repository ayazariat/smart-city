/**
 * SLA Countdown Hook
 * 
 * Provides live countdown to SLA deadline:
 * - setInterval(1000) updates every second
 * - Format: "2j 14h 30m"
 * - OVERDUE → red + shake animation
 * - AT_RISK → orange + pulse (< 6h)
 * - ON_TRACK → green
 */

import { useState, useEffect, useCallback, useRef } from "react";

export type SLAStatus = "ON_TRACK" | "AT_RISK" | "OVERDUE";

export interface SLARemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalHours: number;
  status: SLAStatus;
  formatted: string;
  percentage: number; // 0-100, how much time is left
}

/**
 * Calculate SLA status based on remaining hours
 */
function calculateStatus(remainingHours: number): SLAStatus {
  if (remainingHours <= 0) return "OVERDUE";
  if (remainingHours < 6) return "AT_RISK";
  return "ON_TRACK";
}

/**
 * Format remaining time as string
 */
function formatRemaining(remaining: SLARemaining): string {
  const parts: string[] = [];
  
  if (remaining.days > 0) {
    parts.push(`${remaining.days}j`);
  }
  if (remaining.hours > 0 || remaining.days > 0) {
    parts.push(`${remaining.hours}h`);
  }
  parts.push(`${remaining.minutes}m`);
  
  return parts.join(" ");
}

/**
 * Hook for SLA countdown
 * 
 * @param deadline - ISO date string or Date of the SLA deadline
 * @param totalHours - Total SLA hours (to calculate percentage)
 */
export function useSLA(deadline: string | Date | null, totalHours?: number) {
  const [remaining, setRemaining] = useState<SLARemaining | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const calculateRemaining = useCallback(() => {
    if (!deadline) {
      setRemaining(null);
      return;
    }

    const deadlineTime = typeof deadline === "string" 
      ? new Date(deadline).getTime() 
      : deadline.getTime();
    
    const now = Date.now();
    const diffMs = deadlineTime - now;
    
    // If totalHours provided, calculate percentage
    const totalMs = totalHours ? totalHours * 60 * 60 * 1000 : null;
    const percentage = totalMs 
      ? Math.max(0, Math.min(100, (diffMs / totalMs) * 100))
      : 100;

    const diffSeconds = Math.floor(diffMs / 1000);
    const totalRemainingHours = diffSeconds / 3600;

    const days = Math.floor(diffSeconds / 86400);
    const hours = Math.floor((diffSeconds % 86400) / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;

    const status = calculateStatus(totalRemainingHours);
    const formatted = formatRemaining({ days, hours, minutes, seconds, totalHours: totalRemainingHours, status, percentage, formatted: "" });

    setRemaining({
      days,
      hours,
      minutes,
      seconds,
      totalHours: totalRemainingHours,
      status,
      formatted,
      percentage,
    });
  }, [deadline, totalHours]);

  // Calculate on mount and set up interval
  useEffect(() => {
    if (!deadline) return;

    // Initial calculation
    calculateRemaining();

    // Update every second
    intervalRef.current = setInterval(calculateRemaining, 1000);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [deadline, calculateRemaining]);

  // Update formatted string when values change
  useEffect(() => {
    if (!remaining) return;

    const formatted = formatRemaining(remaining);
    setRemaining((prev) => prev ? { ...prev, formatted } : null);
  }, [remaining?.days, remaining?.hours, remaining?.minutes]);

  return remaining;
}

/**
 * Hook for SLA status color class
 */
export function useSLAStatusColor(status: SLAStatus | undefined): {
  colorClass: string;
  animationClass: string;
  bgClass: string;
} {
  if (!status) {
    return {
      colorClass: "text-gray-500",
      animationClass: "",
      bgClass: "bg-gray-100",
    };
  }

  switch (status) {
    case "OVERDUE":
      return {
        colorClass: "text-red-600",
        animationClass: "animate-shake",
        bgClass: "bg-red-100",
      };
    case "AT_RISK":
      return {
        colorClass: "text-orange-600",
        animationClass: "animate-pulse",
        bgClass: "bg-orange-100",
      };
    case "ON_TRACK":
    default:
      return {
        colorClass: "text-green-600",
        animationClass: "",
        bgClass: "bg-green-100",
      };
  }
}

/**
 * Hook to get SLA deadline from a complaint
 */
export function useComplaintSLA(complaint: {
  slaDeadline?: string | Date | null;
  createdAt?: string | Date;
  urgency?: string;
} | null) {
  // Calculate SLA based on urgency if no deadline provided
  const getDeadline = useCallback(() => {
    if (complaint?.slaDeadline) {
      return complaint.slaDeadline;
    }

    if (!complaint?.createdAt || !complaint?.urgency) {
      return null;
    }

    // Calculate deadline based on urgency
    const urgencyHours: Record<string, number> = {
      URGENT: 8,
      HIGH: 48,
      MEDIUM: 168,    // 7 days
      LOW: 336,       // 14 days
    };

    const hours = urgencyHours[complaint.urgency] || 168;
    const createdAt = new Date(complaint.createdAt).getTime();
    const deadline = new Date(createdAt + hours * 60 * 60 * 1000);

    return deadline.toISOString();
  }, [complaint]);

  const deadline = getDeadline();
  const totalHours = complaint?.urgency 
    ? { URGENT: 8, HIGH: 48, MEDIUM: 168, LOW: 336 }[complaint.urgency] || 168
    : undefined;

  return useSLA(deadline, totalHours);
}
