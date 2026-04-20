// SLA Configuration for Smart City Tunisia Frontend

export const SLA_CONFIG: Record<string, Record<string, number>> = {
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

export const CATEGORY_LABELS: Record<string, string> = {
  ROAD: "Routes",
  LIGHTING: "Éclairage",
  WASTE: "Déchets",
  WATER: "Eau",
  SAFETY: "Sécurité",
  PUBLIC_PROPERTY: "Biens Publics",
  GREEN_SPACE: "Espaces Verts",
  BUILDING: "Bâtiment",
  OTHER: "Autre",
};

export const URGENCY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium", 
  HIGH: "High",
  URGENT: "Urgent",
};

export function getSlaDeadline(category: string, urgency: string, assignedAt: Date): Date {
  const categorySLA = SLA_CONFIG[category] || SLA_CONFIG['OTHER'];
  const urgencyKey = (urgency?.toUpperCase() || 'MEDIUM') as keyof typeof categorySLA;
  const hours = categorySLA[urgencyKey] || categorySLA['MEDIUM'];
  return new Date(assignedAt.getTime() + hours * 60 * 60 * 1000);
}

export function getSlaStatus(deadline: string | Date | null, createdAt: string | Date, status: string) {
  if (!deadline || status === 'RESOLVED' || status === 'CLOSED') {
    return { status: 'COMPLETED', progress: 100, remainingHours: 0, isOverdue: false, isAtRisk: false };
  }
  
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const created = new Date(createdAt);
  
  const totalMs = deadlineDate.getTime() - created.getTime();
  const elapsedMs = now.getTime() - created.getTime();
  
  if (totalMs <= 0) {
    return { status: 'OVERDUE', progress: 100, remainingHours: 0, isOverdue: true, isAtRisk: false };
  }
  
  const progress = Math.min(100, (elapsedMs / totalMs) * 100);
  const remainingHours = Math.max(0, (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60));
  const isOverdue = now.getTime() > deadlineDate.getTime();
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
  };
}

export function formatRemainingTime(remainingHours: number): { text: string; color: string } {
  if (remainingHours <= 0) {
    return { text: "+Overdue", color: "text-red-600" };
  }
  if (remainingHours < 1) {
    const mins = Math.round(remainingHours * 60);
    return { text: `${mins}m left`, color: "text-red-600" };
  }
  if (remainingHours < 24) {
    const hours = Math.round(remainingHours);
    return { text: `${hours}h left`, color: hours < 12 ? "text-red-600" : "text-orange-600" };
  }
  const days = Math.round(remainingHours / 24);
  return { text: `${days}d left`, color: "text-green-600" };
}

export function getSlaBadge(status: string, remainingHours?: number) {
  switch (status) {
    case 'OVERDUE':
      return { 
        bgClass: "bg-red-100", 
        textClass: "text-red-700",
        label: remainingHours !== undefined ? `${Math.abs(Math.round(remainingHours / 24))}d overdue` : "Overdue",
        icon: "🚨",
        animate: "animate-pulse",
      };
    case 'AT_RISK':
      return { 
        bgClass: "bg-orange-100", 
        textClass: "text-orange-700",
        label: remainingHours !== undefined ? `${Math.round(remainingHours)}h left` : "At Risk",
        icon: "⚠️",
        animate: "animate-pulse",
      };
    case 'ON_TRACK':
      return { 
        bgClass: "bg-green-100", 
        textClass: "text-green-700",
        label: remainingHours !== undefined ? `${Math.round(remainingHours / 24)}d left` : "On Track",
        icon: "✅",
        animate: "",
      };
    case 'COMPLETED':
      return { 
        bgClass: "bg-gray-100", 
        textClass: "text-gray-600",
        label: "Completed",
        icon: "✓",
        animate: "",
      };
    default:
      return { 
        bgClass: "bg-slate-100", 
        textClass: "text-slate-600",
        label: status,
        icon: "",
        animate: "",
      };
  }
}
