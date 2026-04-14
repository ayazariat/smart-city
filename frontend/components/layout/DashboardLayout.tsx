"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X, Bell, Check, Sparkles, User } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import { notificationService } from "@/services/notification.service";
import { agentService } from "@/services/agent.service";
import { managerService } from "@/services/manager.service";
import { technicianService } from "@/services/technician.service";
import { adminService } from "@/services/admin.service";
import { connectSocket, disconnectSocket, subscribeToNotifications } from "@/lib/socket";
import { Notification } from "@/types";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { user, logout, hydrated } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const isRTL = typeof document !== "undefined" && document.documentElement.dir === "rtl";

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
  }, [hydrated, user]);

  // Connect socket for real-time notifications
  useEffect(() => {
    if (!hydrated || !user) return;

    connectSocket(user.id || "");

    const unsub = subscribeToNotifications((notif: unknown) => {
      const n = notif as Notification;
      setUnreadCount(prev => prev + 1);
      setNotifications(prev => [n, ...prev]);
    });

    return () => {
      unsub();
      disconnectSocket();
    };
  }, [hydrated, user]);

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
    setShowNotifications(prev => !prev);
    if (!showNotifications) {
      setLoadingNotifs(true);
      try {
        const result = await notificationService.getNotifications();
        if (result.success && Array.isArray(result.data)) {
          setNotifications(result.data);
        }
      } catch { /* silent */ }
      setLoadingNotifs(false);
    }
  }, [showNotifications]);

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
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={handleNotificationsClick}
                  className="relative p-2 hover:bg-slate-100 rounded-xl transition-all duration-200"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5 text-slate-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>
              <div className="hidden md:flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl">
                <User className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">{user.fullName}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className={`${isRTL ? "mr-0 md:mr-[260px]" : "ml-0 md:ml-[260px]"} pt-14 md:pt-0`}>
        {children}
      </div>

      {/* Notification Panel */}
      {showNotifications && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setShowNotifications(false)} />
          <div className={`fixed top-0 h-full w-full md:w-[360px] bg-white shadow-xl z-[60] flex flex-col ${isRTL ? "right-0 md:right-[260px] border-l border-slate-200" : "left-0 md:left-[260px] border-r border-slate-200"}`}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-slate-800">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="min-w-[20px] h-5 flex items-center justify-center px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-primary hover:text-primary/80 font-medium"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingNotifs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Bell className="w-8 h-8 mb-2" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map((notif) => (
                    <div
                      key={notif._id}
                      className={`px-5 py-3 hover:bg-slate-50 transition-colors cursor-pointer ${!notif.isRead ? "bg-primary/5" : ""}`}
                      onClick={() => {
                        if (!notif.isRead) handleMarkRead(notif._id);
                        if (notif.complaint?._id) {
                          setShowNotifications(false);
                          router.push(`/my-complaints/${notif.complaint._id}`);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!notif.isRead ? "bg-primary" : "bg-transparent"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">{notif.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {new Date(notif.createdAt).toLocaleDateString("en-US", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        {!notif.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkRead(notif._id);
                            }}
                            className="p-1 hover:bg-slate-200 rounded"
                            title="Mark as read"
                          >
                            <Check className="w-3 h-3 text-slate-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
