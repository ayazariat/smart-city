"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Clock,
  FileText,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  XCircle,
  UserCheck,
  Wrench,
  RefreshCw,
  Bell,
  Loader2,
} from "lucide-react";
import { apiClient } from "@/services/api.client";
import { formatTimeAgo } from "@/lib/date-utils";
import { useTranslation } from "react-i18next";

interface ActivityItem {
  action: string;
  complaintId: string;
  referenceId: string;
  title: string;
  municipality: string;
  department: string;
  actorName: string;
  actorRole: string;
  notes: string;
  timestamp: string;
  description: string;
}

interface RecentActivitiesProps {
  notifications?: unknown[];
  loading?: boolean;
  role: string;
  maxItems?: number;
}

const EVENT_CONFIG: Record<string, { icon: typeof Clock; color: string; bg: string; label: string }> = {
  SUBMITTED: { icon: FileText, color: "text-blue-600", bg: "bg-blue-100", label: "Submitted" },
  VALIDATED: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-100", label: "Validated" },
  REJECTED: { icon: XCircle, color: "text-red-600", bg: "bg-red-100", label: "Rejected" },
  ASSIGNED: { icon: UserCheck, color: "text-purple-600", bg: "bg-purple-100", label: "Assigned" },
  IN_PROGRESS: { icon: Wrench, color: "text-orange-600", bg: "bg-orange-100", label: "In Progress" },
  RESOLVED: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100", label: "Resolved" },
  CLOSED: { icon: CheckCircle, color: "text-slate-600", bg: "bg-slate-100", label: "Closed" },
  RESOLUTION_REJECTED: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100", label: "Resolution Rejected" },
  ARCHIVED: { icon: RefreshCw, color: "text-slate-400", bg: "bg-slate-50", label: "Archived" },
  info: { icon: Bell, color: "text-primary", bg: "bg-primary/10", label: "Update" },
};

function getEventConfig(action?: string) {
  if (!action) return EVENT_CONFIG.info;
  return EVENT_CONFIG[action] || EVENT_CONFIG[action.toUpperCase()] || EVENT_CONFIG.info;
}

export default function RecentActivities({ role, maxItems = 8 }: RecentActivitiesProps) {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: ActivityItem[] }>(
        `/activity/recent?limit=${maxItems}`
      );
      if (res.success && Array.isArray(res.data)) {
        setActivities(res.data);
      }
    } catch {
      // Silent fail — show empty state
    } finally {
      setLoading(false);
    }
  }, [maxItems]);

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 60000);
    return () => clearInterval(interval);
  }, [fetchActivities]);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-0">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          {t('activity.title')}
        </h3>
        <span className="text-xs text-slate-400">
          {role === "ADMIN" ? t('activity.systemWide') : t('activity.latestUpdates')}
        </span>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">{t('activity.noActivity')}</p>
            <p className="text-xs text-slate-400 mt-1">
              {role === "CITIZEN" 
                ? t('activity.citizenHint')
                : t('activity.defaultHint')
              }
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {activities.map((item, index) => {
              const config = getEventConfig(item.action);
              const Icon = config.icon;
              return (
                <div key={`${item.complaintId}-${item.timestamp}-${index}`}>
                  <Link
                    href={`/dashboard/complaints/${item.complaintId}`}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className={`w-8 h-8 ${config.bg} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 line-clamp-1 group-hover:text-primary transition-colors">
                        {item.description}
                      </p>
                      {item.referenceId && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.referenceId}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${config.bg} ${config.color}`}>
                          {t(`activity.events.${item.action}`) || config.label}
                        </span>
                        <span className="text-[10px] text-slate-400">{formatTimeAgo(item.timestamp)}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary flex-shrink-0 mt-2 transition-colors" />
                  </Link>
                  {index < activities.length - 1 && <div className="ml-7 border-l-2 border-slate-100 h-1" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
