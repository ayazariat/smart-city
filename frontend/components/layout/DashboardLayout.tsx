"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X, Bell, Check, Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LanguagePicker from "@/components/ui/LanguagePicker";
import { showToast } from "@/components/ui/Toast";
import { notificationService } from "@/services/notification.service";
import { agentService } from "@/services/agent.service";
import { managerService } from "@/services/manager.service";
import { technicianService } from "@/services/technician.service";
import { adminService } from "@/services/admin.service";
import { connectSocket, disconnectSocket, subscribeToNotifications } from "@/lib/socket";
import { Notification } from "@/types";
import { useTranslation } from "react-i18next";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { user, logout, hydrated } = useAuthStore();
  const { t } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [isRTL, setIsRTL] = useState(false);

  const translateOrFallback = useCallback(
    (key: string, fallback: string) => {
      const translated = t(key);
      return translated === key ? fallback : translated;
    },
    [t]
  );

  const humanizeNotificationKey = useCallback((value: string) => {
    const notificationFallbacks: Record<string, string> = {
      "notification.status.validated": "Complaint validated",
      "notification.status.validated.desc": "Your complaint has been validated and will be processed.",
      "notification.status.rejected": "Complaint rejected",
      "notification.status.rejected.desc": "Your complaint has been rejected.",
      "notification.status.assigned": "Complaint assigned",
      "notification.status.assigned.desc": "Your complaint has been assigned to a team.",
      "notification.status.inProgress": "In progress",
      "notification.status.inProgress.desc": "Your complaint is being processed.",
      "notification.status.resolved": "Complaint resolved",
      "notification.status.resolved.desc": "Your complaint has been resolved.",
      "notification.status.closed": "Complaint closed",
      "notification.status.closed.desc": "Your complaint has been closed.",
      "notification.newComplaint": "New complaint",
      "notification.newComplaint.desc": "A new complaint has been submitted.",
      "notification.assignedToYou": "Assigned to you",
      "notification.assignedToYou.desc": "A complaint has been assigned to you.",
    };

    return notificationFallbacks[value] || "Notification";
  }, []);

  const resolveNotificationText = useCallback(
    (value?: string) => {
      if (!value) {
        return "";
      }
      if (!value.startsWith("notification.")) {
        return value;
      }

      const translated = t(value);
      return translated === value ? humanizeNotificationKey(value) : translated;
    },
    [humanizeNotificationKey, t]
  );

  // Track RTL changes reactively (when user switches language)
  useEffect(() => {
    const checkDir = () => setIsRTL(document.documentElement.dir === "rtl");
    checkDir();
    const observer = new MutationObserver(checkDir);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["dir"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (hydrated && !user) {
      router.replace("/login");
    }
  }, [hydrated, user, router]);

  // Fetch notification count
  useEffect(() => {
    const fetchNotifCount = async () => {
      const { token } = useAuthStore.getState();
      if (!token) return;
      try {
        const result = await notificationService.getNotificationCount();
        if (result.success && typeof result.count === "number") {
          setUnreadCount(result.count);
        }
      } catch { /* silent */ }
    };

    if (hydrated && user) {
      fetchNotifCount();
      const interval = setInterval(fetchNotifCount, 60000);
      return () => clearInterval(interval);
    }
  }, [hydrated, resolveNotificationText, user]);

  // Connect socket for real-time notifications
  useEffect(() => {
    if (!hydrated || !user) return;

    const { token: authToken } = useAuthStore.getState();
    connectSocket(user.id || "", authToken || undefined);

    const unsub = subscribeToNotifications((notif: unknown) => {
      const n = notif as Notification;
      const title = resolveNotificationText(n.title);
      const message = resolveNotificationText(n.message);

      setNotifications((prev) => {
        const alreadyExists = prev.some((item) => item._id === n._id);
        if (alreadyExists) {
          return prev.map((item) => (item._id === n._id ? n : item));
        }
        return [n, ...prev];
      });
      setUnreadCount((prev) => prev + (n.isRead ? 0 : 1));
      showToast(title || message || "New notification", "info");
    });

    return () => {
      unsub();
      disconnectSocket();
    };
  }, [hydrated, resolveNotificationText, user]);

  // Fetch stats for sidebar badges
  useEffect(() => {
    const fetchStats = async () => {
      const { token } = useAuthStore.getState();
      if (!token || !user) return;
      try {
        let statsRes;
        if (user.role === "MUNICIPAL_AGENT") {
          statsRes = await agentService.getStats();
        } else if (user.role === "DEPARTMENT_MANAGER") {
          statsRes = await managerService.getStats();
        } else if (user.role === "TECHNICIAN") {
          statsRes = await technicianService.getTechnicianStats();
        } else if (user.role === "ADMIN") {
          statsRes = await adminService.getStats();
        }
        if (statsRes?.data) {
          setStats(statsRes.data as Record<string, unknown>);
        }
      } catch { /* silent */ }
    };

    if (hydrated && user) {
      fetchStats();
    }
  }, [hydrated, user]);

  const handleNotificationsClick = useCallback(async () => {
    const willShow = !showNotifications;
    setShowNotifications(willShow);
    if (willShow && notifications.length === 0) {
      setLoadingNotifs(true);
      try {
        const result = await notificationService.getNotifications();
        if (result.success && Array.isArray(result.data)) {
          setNotifications(result.data);
        }
      } catch { /* silent */ }
      setLoadingNotifs(false);
    }
  }, [showNotifications, notifications.length]);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllNotificationsAsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch { /* silent */ }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationService.markNotificationAsRead(id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch { /* silent */ }
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
      <DashboardSidebar
        role={user.role}
        fullName={user.fullName}
        email={user.email}
        onLogout={logout}
        stats={stats}
        unreadNotifications={unreadCount}
        onNotificationsClick={handleNotificationsClick}
      />

      {/* Top bar */}
      <header className={`bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30 hidden md:block ${isRTL ? "mr-0 md:mr-[260px]" : "ml-0 md:ml-[260px]"}`}>
        <div className="px-4 md:px-6 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-slate-800">Smart City Tunisia</h1>
                <p className="text-xs text-slate-500">Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Theme & Language */}
              <ThemeToggle />
              <LanguagePicker />
              {/* Notification Bell */}
              <div className="relative">
                  <button
                    onClick={handleNotificationsClick}
                    className="relative p-2 hover:bg-slate-100 rounded-xl transition-all duration-200"
                    title={translateOrFallback("sidebar.notifications", "Notifications")}
                  >
                  <Bell className="w-5 h-5 text-slate-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-[75]" onClick={() => setShowNotifications(false)} />
                    <div className={`absolute top-full mt-2 w-[360px] max-h-[480px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-[80] flex flex-col overflow-hidden ${isRTL ? "left-0" : "right-0"}`}>
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-primary" />
                          <span className="text-sm font-semibold text-slate-800">
                            {translateOrFallback("sidebar.notifications", "Notifications")}
                          </span>
                          {unreadCount > 0 && (
                            <span className="min-w-[18px] h-4 flex items-center justify-center px-1 bg-red-500 text-white text-[10px] font-bold rounded-full">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <button onClick={handleMarkAllRead} className="text-xs text-primary hover:text-primary/80 font-medium">
                              {t('dashboard.markAllRead')}
                            </button>
                          )}
                          <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                            <X className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </div>
                      </div>
                      {/* List */}
                      <div className="flex-1 overflow-y-auto">
                        {loadingNotifs ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                            <Bell className="w-7 h-7 mb-2 opacity-40" />
                            <p className="text-xs">{t('dashboard.noNotifications')}</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {notifications.map((notif) => {
                              const title = resolveNotificationText(notif.title);
                              const message = resolveNotificationText(notif.message);
                              return (
                              <div
                                key={notif._id}
                                className={`px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer ${!notif.isRead ? "bg-primary/5" : ""}`}
                                onClick={() => {
                                  if (!notif.isRead) handleMarkRead(notif._id);
                                  const targetComplaintId = notif.complaint?._id || notif.relatedId;
                                  if (targetComplaintId) {
                                    setShowNotifications(false);
                                    const dest = user.role === "CITIZEN"
                                      ? `/my-complaints/${targetComplaintId}`
                                      : `/dashboard/complaints/${targetComplaintId}`;
                                    router.push(dest);
                                  }
                                }}
                              >
                                <div className="flex items-start gap-2.5">
                                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${!notif.isRead ? "bg-primary" : "bg-transparent"}`} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-slate-800 line-clamp-1">{title}</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{message}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                      {new Date(notif.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                  </div>
                                  {!notif.isRead && (
                                    <button onClick={(e) => { e.stopPropagation(); handleMarkRead(notif._id); }} className="p-1 hover:bg-slate-200 rounded flex-shrink-0" title="Mark as read">
                                      <Check className="w-3 h-3 text-slate-400" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className={`${isRTL ? "mr-0 md:mr-[260px]" : "ml-0 md:ml-[260px]"} pt-14 md:pt-0`}>
        {children}
      </div>
    </div>
  );
}
