"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle, Loader2, X } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "react-i18next";
import type { Notification } from "@/types";

function formatDate(dateString: string, short = false): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (short) return `${Math.floor(diff / 86400000)}d ago`;

  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getNotifStyle(type: string): { color: string } {
  const t = type.toLowerCase();
  if (t.includes("validated") || t.includes("approved") || t.includes("closed") || t.includes("resolved")) {
    return { color: "text-emerald-600" };
  }
  if (t.includes("rejected") || t.includes("reject")) return { color: "text-red-600" };
  if (t.includes("assigned") || t.includes("assign")) return { color: "text-purple-600" };
  return { color: "text-primary" };
}

function getNotifIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes("validated") || t.includes("approved") || t.includes("resolved") || t.includes("closed")) {
    return CheckCircle;
  }
  if (t.includes("rejected")) return X;
  return Bell;
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllAsRead } =
    useNotifications();

  const [groupToday, setGroupToday] = useState<Notification[]>([]);
  const [groupEarlier, setGroupEarlier] = useState<Notification[]>([]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setGroupToday(notifications.filter((n) => new Date(n.createdAt) >= today));
    setGroupEarlier(notifications.filter((n) => new Date(n.createdAt) < today));
  }, [notifications]);

  const handleNotifClick = (notif: Notification) => {
    if (!notif.isRead) markAsRead(notif._id);
    const id = notif.complaint?._id || notif.relatedId;
    if (id) {
      const dest =
        user?.role === "CITIZEN"
          ? `/my-complaints/${id}`
          : `/dashboard/complaints/${id}`;
      window.location.href = dest;
    }
  };

  const renderNotif = (notif: Notification) => {
    const Icon = getNotifIcon(notif.type || "");
    const style = getNotifStyle(notif.type || "");
    return (
      <div
        key={notif._id}
        className={`p-4 border-l-4 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors mb-2 ${
          !notif.isRead
            ? "border-blue-500 bg-blue-50/60"
            : "border-slate-200 bg-white"
        }`}
        onClick={() => handleNotifClick(notif)}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center ${style.color}`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 text-sm line-clamp-2">
              {notif.message || notif.title}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {formatDate(notif.createdAt)}
            </p>
          </div>
          {!notif.isRead && (
            <span className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="px-4 md:px-6 py-6 md:py-8 max-w-4xl mx-auto">
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
            <p className="text-slate-500 mt-1 text-sm">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-primary hover:underline font-medium"
            >
              Mark all as read
            </button>
          )}
        </div>

         {notifications.length === 0 ? (
           <div className="text-center py-16">
             <Bell className="w-14 h-14 text-slate-300 mx-auto mb-4" />
             <h3 className="text-lg font-semibold text-slate-900 mb-1">{t('notifications.empty')}</h3>
             <p className="text-slate-500 text-sm">{t('notifications.emptyHint')}</p>
           </div>
        ) : (
          <div className="space-y-6">
            {groupToday.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Today
                </h2>
                {groupToday.map(renderNotif)}
              </section>
            )}
            {groupEarlier.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Earlier
                </h2>
                {groupEarlier.map(renderNotif)}
              </section>
            )}
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}
