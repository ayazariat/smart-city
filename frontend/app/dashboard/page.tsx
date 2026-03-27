"use client";

import { useEffect, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogOut, User, FileText, Plus, Sparkles, Shield, ArrowLeft, Loader2, Archive, Bell, X, BarChart3 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { notificationService } from "@/services/notification.service";
import { Notification } from "@/types";

// Separate component that uses useSearchParams
function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, hydrated } = useAuthStore();

  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    
    try {
      setLoadingNotifications(true);
      const [countResult, notificationsResult] = await Promise.all([
        notificationService.getNotificationCount(),
        notificationService.getNotifications()
      ]);
      
      if (countResult.success && typeof countResult.count === 'number') {
        setUnreadCount(countResult.count);
      }
      if (notificationsResult.success && notificationsResult.data) {
        setNotifications(notificationsResult.data);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id);
    }
    if (notification.relatedId) {
      router.push(`/dashboard/complaints/${notification.relatedId}`);
    }
    setShowNotifications(false);
  };

  // Fetch notifications on mount and periodically
  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (hydrated && user && token) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [hydrated, user]);

  // Handle magic link verification callback
  useEffect(() => {
    const handleVerification = () => {
      const verified = searchParams.get("verified");
      const urlToken = searchParams.get("token");

      if (verified === "true" && urlToken) {
        window.location.href = "/dashboard";
      }
    };

    handleVerification();
  }, [searchParams]);

  // Redirect if not logged in (after hydration only)
  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      window.location.href = "/";
    }
  }, [hydrated, user]);

  // Show loading while hydrating
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
  };

  // Get role display name
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "CITIZEN": return "Citizen";
      case "MUNICIPAL_AGENT": return "Municipal Agent";
      case "DEPARTMENT_MANAGER": return "Department Manager";
      case "TECHNICIAN": return "Technician";
      case "ADMIN": return "Administrator";
      default: return role;
    }
  };

  // Get role-based dashboard configuration
  const getDashboardConfig = () => {
    if (!user) return null;
    switch (user.role) {
      case "CITIZEN":
        return {
          link: "/my-complaints",
          label: "My Complaints",
          description: "View and manage your own complaints",
          newComplaintLink: "/complaints/new",
          newComplaintLabel: "New Complaint",
          statsTitle: "My Complaints Statistics",
        };
      case "MUNICIPAL_AGENT":
        return {
          link: "/agent/complaints",
          label: "My Actions",
          description: "Handle assigned complaints",
          newComplaintLink: "",
          newComplaintLabel: "",
          statsTitle: "Complaints Statistics",
        };
      case "DEPARTMENT_MANAGER":
        return {
          link: "/manager/pending",
          label: "To Process",
          description: "Review department complaints",
          newComplaintLink: "",
          newComplaintLabel: "",
          statsTitle: "Department Complaints Statistics",
        };
      case "TECHNICIAN":
        return {
          link: "/tasks",
          label: "My Tasks",
          description: "View your assigned repairs",
          newComplaintLink: "",
          newComplaintLabel: "",
          statsTitle: "Repair Tasks Statistics",
        };
      case "ADMIN":
        return {
          link: "/admin/complaints",
          label: "All Complaints",
          description: "Full system access",
          newComplaintLink: "",
          newComplaintLabel: "",
          statsTitle: "System Complaints Statistics",
        };
      default:
        return {
          link: "/my-complaints",
          label: "My Complaints",
          description: "View and manage your complaints",
          newComplaintLink: "/complaints/new",
          newComplaintLabel: "New Complaint",
          statsTitle: "Complaints Statistics",
        };
    }
  };

  const dashboardConfig = getDashboardConfig();

  // Don't render dashboard content if not logged in
  if (!dashboardConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-primary to-primary-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 backdrop-blur-sm flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Smart City Tunisia</h1>
                <p className="text-sm text-primary-100">Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm flex items-center justify-center text-white"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-gradient-to-r from-primary/5 to-secondary-50">
                      <h3 className="font-semibold text-slate-900">Notifications</h3>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-xs text-primary hover:text-primary-700 font-medium"
                          >
                            Mark all read
                          </button>
                        )}
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4 text-slate-500" />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {loadingNotifications ? (
                        <div className="p-8 text-center">
                          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((notification) => (
                          <button
                            key={notification._id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`w-full text-left p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                              !notification.isRead ? 'bg-primary/5' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {!notification.isRead && (
                                <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {notification.title}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  {new Date(notification.createdAt).toLocaleDateString()} {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="hidden md:flex items-center gap-2 bg-white/10 px-4 py-2.5 rounded-xl backdrop-blur-sm">
                <User className="w-5 h-5" />
                <span className="text-sm font-medium">Welcome, {user?.fullName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2.5 rounded-xl transition-all duration-200 hover:shadow-lg backdrop-blur-sm"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Dashboard
          </h2>
          <p className="text-slate-600">
            Manage your complaints and track urban services
          </p>
        </div>

        {/* Main Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Profile Card */}
          <Link 
            href="/profile"
            className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-slate-100 hover:border-primary/20 group cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <User className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 group-hover:text-primary transition-colors">My Profile</h3>
            </div>
              <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Email:</span>
                <span className="text-sm font-medium text-slate-700">{user?.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Role:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {getRoleDisplayName(user?.role || '')}
                </span>
              </div>
            </div>
          </Link>

          {/* Admin Panel Card */}
          {user?.role === "ADMIN" && (
            <Link 
              href="/admin/users"
              className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-white cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold">Admin Panel</h3>
              </div>
              <p className="text-red-100 mb-4 text-sm">
                Manage system users and permissions
              </p>
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                User Management →
              </div>
            </Link>
          )}

          {/* Complaints Card - Role-based */}
          <Link href={dashboardConfig.link} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-attention/10 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-attention" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{dashboardConfig.label}</h3>
            </div>
            <p className="text-slate-600 mb-4 text-sm">
              {dashboardConfig.description}
            </p>
            <span className="inline-flex items-center gap-2 text-primary hover:text-primary-700 font-medium text-sm transition-colors group">
              View
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </span>
          </Link>

          {/* Quick Actions Card - Only for CITIZEN role */}
          {user?.role === "CITIZEN" && dashboardConfig.newComplaintLink && (
            <Link href={dashboardConfig.newComplaintLink} className="group bg-gradient-to-br from-primary to-primary-700 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 text-white cursor-pointer block">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold">Quick Actions</h3>
              </div>
              <p className="text-primary-100 mb-4 text-sm">
                Report a new issue in your city
              </p>
              <span className="w-full bg-white text-primary px-4 py-2.5 rounded-lg font-medium transition-all duration-200 group-hover:shadow-lg flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                {dashboardConfig.newComplaintLabel}
              </span>
            </Link>
          )}
          {/* Archive Card - All roles */}
          <Link href="/archive" className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <Archive className="w-6 h-6 text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Archive</h3>
            </div>
            <p className="text-slate-600 mb-4 text-sm">
              View closed and rejected complaints
            </p>
            <span className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors group">
              View Archive
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </span>
          </Link>
          {/* Analytics - Agent/Manager only (not Admin) */}
          {(user?.role === "MUNICIPAL_AGENT" || user?.role === "DEPARTMENT_MANAGER") && (
            <Link href="/dashboard/analytics" className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 border border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Analytics</h3>
              </div>
              <p className="text-slate-600 mb-4 text-sm">
                View performance statistics
              </p>
              <span className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors group">
                View Analytics
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </Link>
          )}
        </div>

        {/* Statistics Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">
            {dashboardConfig.statsTitle}
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
              <div className="text-2xl font-bold text-primary mb-1">0</div>
              <div className="text-sm text-slate-600">Total</div>
            </div>
            
            <div className="bg-attention/5 rounded-xl p-4 border border-attention/10">
              <div className="text-2xl font-bold text-attention mb-1">0</div>
              <div className="text-sm text-slate-600">In Progress</div>
            </div>
            
            <div className="bg-success/5 rounded-xl p-4 border border-success/10">
              <div className="text-2xl font-bold text-success mb-1">0</div>
              <div className="text-sm text-slate-600">Resolved</div>
            </div>
            
            <div className="bg-urgent/5 rounded-xl p-4 border border-urgent/10">
              <div className="text-2xl font-bold text-urgent mb-1">0</div>
              <div className="text-sm text-slate-600">Urgent</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
