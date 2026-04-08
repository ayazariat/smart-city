"use client";

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
  Upload,
  RefreshCw,
  Bell,
  Loader2,
} from "lucide-react";
import { Notification } from "@/types";

interface RecentActivitiesProps {
  notifications: Notification[];
  loading: boolean;
  role: string;
  maxItems?: number;
}

const EVENT_CONFIG: Record<string, { icon: typeof Clock; color: string; bg: string; label: string }> = {
  submitted: { icon: FileText, color: "text-blue-600", bg: "bg-blue-100", label: "Submitted" },
  validated: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-100", label: "Validated" },
  rejected: { icon: XCircle, color: "text-red-600", bg: "bg-red-100", label: "Rejected" },
  assigned: { icon: UserCheck, color: "text-purple-600", bg: "bg-purple-100", label: "Assigned" },
  in_progress: { icon: Wrench, color: "text-orange-600", bg: "bg-orange-100", label: "In Progress" },
  resolved: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100", label: "Resolved" },
  closed: { icon: CheckCircle, color: "text-slate-600", bg: "bg-slate-100", label: "Closed" },
  escalated: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100", label: "Escalated" },
  comment: { icon: FileText, color: "text-blue-600", bg: "bg-blue-100", label: "Comment" },
  proof_uploaded: { icon: Upload, color: "text-indigo-600", bg: "bg-indigo-100", label: "Proof Uploaded" },
  reopened: { icon: RefreshCw, color: "text-amber-600", bg: "bg-amber-100", label: "Reopened" },
  priority_updated: { icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-100", label: "Priority Updated" },
  info: { icon: Bell, color: "text-primary", bg: "bg-primary/10", label: "Update" },
};

function getEventConfig(type?: string) {
  if (!type) return EVENT_CONFIG.info;
  const normalized = type.toLowerCase().replace(/[-\s]/g, "_");
  return EVENT_CONFIG[normalized] || EVENT_CONFIG.info;
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function RecentActivities({ notifications, loading, role, maxItems = 8 }: RecentActivitiesProps) {
  const items = notifications.slice(0, maxItems);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-0">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Recent Activity
        </h3>
        <span className="text-xs text-slate-400">
          {role === "ADMIN" ? "System-wide" : "Latest updates"}
        </span>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No recent activity</p>
            <p className="text-xs text-slate-400 mt-1">
              {role === "CITIZEN" 
                ? "Submit a complaint to see updates here"
                : "Activities like status changes, assignments, and resolutions will appear here"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((item, index) => {
              const config = getEventConfig(item.type);
              const Icon = config.icon;
              return (
                <div key={item._id || index}>
                  {item.relatedId ? (
                    <Link
                      href={`/dashboard/complaints/${item.relatedId}`}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                    >
                      <div className={`w-8 h-8 ${config.bg} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 line-clamp-1 group-hover:text-primary transition-colors">
                          {item.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.message}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${config.bg} ${config.color}`}>
                            {config.label}
                          </span>
                          <span className="text-[10px] text-slate-400">{formatTimeAgo(item.createdAt)}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary flex-shrink-0 mt-2 transition-colors" />
                    </Link>
                  ) : (
                    <div className="flex items-start gap-3 p-3 rounded-xl">
                      <div className={`w-8 h-8 ${config.bg} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 line-clamp-1">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">{formatTimeAgo(item.createdAt)}</span>
                      </div>
                    </div>
                  )}
                  {index < items.length - 1 && <div className="ml-7 border-l-2 border-slate-100 h-1" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
