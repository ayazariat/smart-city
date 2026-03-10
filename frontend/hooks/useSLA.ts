'use client';

import { useState, useEffect, useMemo } from 'react';

export type SLAStatus = 'ON_TRACK' | 'AT_RISK' | 'OVERDUE';

export interface SLATimeInfo {
  remaining: number; // seconds remaining
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
  status: SLAStatus;
  percentage: number; // 0-100, percentage of time used
}

// SLA deadlines in hours by urgency level (as per task requirements)
const SLA_DEADLINES: Record<string, number> = {
  CRITICAL: 8,     // 8 hours
  HIGH: 48,         // 48 hours (2 days)
  MEDIUM: 168,     // 168 hours (7 days)
  LOW: 336,        // 336 hours (14 days)
};

// Default fallback
const DEFAULT_SLA = 168; // 7 days

// Parse deadline from ISO string or calculate from creation date + SLA
function getDeadlineTimestamp(deadline: string | null | undefined, createdAt: string, urgency: string): number {
  if (deadline) {
    return new Date(deadline).getTime();
  }
  
  // Calculate from creation date + SLA
  const slaHours = SLA_DEADLINES[urgency] || DEFAULT_SLA;
  const createdDate = new Date(createdAt).getTime();
  return createdDate + slaHours * 60 * 60 * 1000;
}

// Format seconds to human readable string
function formatTime(seconds: number): string {
  if (seconds <= 0) return 'Overdue';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  
  return `${secs}s`;
}

// Determine SLA status based on remaining time
function getStatus(remaining: number, totalSeconds: number): SLAStatus {
  if (remaining <= 0) return 'OVERDUE';
  
  // AT_RISK if less than 25% of time remaining
  const percentage = (remaining / totalSeconds) * 100;
  if (percentage <= 25) return 'AT_RISK';
  
  return 'ON_TRACK';
}

// Hook for single complaint SLA
export function useSLA(deadline: string | null | undefined, createdAt: string, urgency: string) {
  const [now, setNow] = useState(() => Date.now());
  
  // Update every second
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const slaInfo = useMemo((): SLATimeInfo => {
    const deadlineTimestamp = getDeadlineTimestamp(deadline, createdAt, urgency);
    const totalSeconds = Math.max(1, Math.floor((deadlineTimestamp - new Date(createdAt).getTime()) / 1000));
    const remainingMs = deadlineTimestamp - now;
    const remaining = Math.floor(remainingMs / 1000);
    
    const hours = Math.max(0, Math.floor(remaining / 3600));
    const minutes = Math.max(0, Math.floor((remaining % 3600) / 60));
    const seconds = Math.max(0, remaining % 60);
    
    const status = getStatus(remaining, totalSeconds);
    
    // Calculate percentage used (inverse of remaining)
    const percentage = remaining > 0 
      ? Math.min(100, Math.max(0, ((totalSeconds - remaining) / totalSeconds) * 100))
      : 100;
    
    return {
      remaining,
      hours,
      minutes,
      seconds,
      formatted: formatTime(remaining),
      status,
      percentage,
    };
  }, [deadline, createdAt, urgency, now]);
  
  return slaInfo;
}

// Hook for multiple complaints SLA (for dashboard)
export function useBulkSLA(complaints: Array<{
  deadline?: string | null;
  createdAt: string;
  urgency: string;
  status?: string;
}>) {
  const [now, setNow] = useState(() => Date.now());
  
  // Update every second
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const slaInfos = useMemo(() => {
    return complaints.map((complaint) => {
      // Skip if already resolved/closed
      if (complaint.status === 'RESOLVED' || complaint.status === 'CLOSED') {
        return {
          id: complaint.createdAt,
          remaining: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          formatted: 'Completed',
          status: 'ON_TRACK' as SLAStatus,
          percentage: 100,
        };
      }
      
      const deadlineTimestamp = getDeadlineTimestamp(complaint.deadline, complaint.createdAt, complaint.urgency);
      const totalSeconds = Math.max(1, Math.floor((deadlineTimestamp - new Date(complaint.createdAt).getTime()) / 1000));
      const remainingMs = deadlineTimestamp - now;
      const remaining = Math.floor(remainingMs / 1000);
      
      const hours = Math.max(0, Math.floor(remaining / 3600));
      const minutes = Math.max(0, Math.floor((remaining % 3600) / 60));
      const seconds = Math.max(0, remaining % 60);
      
      const status = getStatus(remaining, totalSeconds);
      
      const percentage = remaining > 0 
        ? Math.min(100, Math.max(0, ((totalSeconds - remaining) / totalSeconds) * 100))
        : 100;
      
      return {
        id: complaint.createdAt,
        remaining,
        hours,
        minutes,
        seconds,
        formatted: formatTime(remaining),
        status,
        percentage,
      };
    });
  }, [complaints, now]);
  
  // Count stats
  const stats = useMemo(() => {
    let onTrack = 0;
    let atRisk = 0;
    let overdue = 0;
    
    slaInfos.forEach((info) => {
      if (info.status === 'ON_TRACK') onTrack++;
      else if (info.status === 'AT_RISK') atRisk++;
      else overdue++;
    });
    
    return { onTrack, atRisk, overdue, total: complaints.length };
  }, [slaInfos, complaints.length]);
  
  return { slaInfos, stats };
}

// Get color class for SLA status
export function getSLAColorClass(status: SLAStatus): string {
  switch (status) {
    case 'ON_TRACK':
      return 'var(--green)';
    case 'AT_RISK':
      return 'var(--orange)';
    case 'OVERDUE':
      return 'var(--red)';
    default:
      return 'var(--txt3)';
  }
}

// Get background color for SLA status
export function getSLABgClass(status: SLAStatus): string {
  switch (status) {
    case 'ON_TRACK':
      return 'var(--accentbg)';
    case 'AT_RISK':
      return 'var(--orgbg)';
    case 'OVERDUE':
      return 'var(--redbg)';
    default:
      return 'var(--bg3)';
  }
}
