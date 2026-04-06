"use client";

import { useEffect, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogOut, User, FileText, Plus, Sparkles, Shield, ArrowLeft, Loader2, Archive, Bell, X, BarChart3, MapPin, CheckCircle, Heart, ArrowRight, TrendingUp, AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { notificationService } from "@/services/notification.service";
import { connectSocket, subscribeToNotifications } from "@/lib/socket";
import { agentService } from "@/services/agent.service";
import { managerService } from "@/services/manager.service";
import { technicianService } from "@/services/technician.service";
import { adminService } from "@/services/admin.service";
import { categoryLabels } from "@/lib/complaints";
import { Notification } from "@/types";
import { getTrendAlerts } from "@/services/complaint.service";

interface DashboardStats {
  total?: number;
  submitted?: number;
  pending?: number;
  assigned?: number;
  inProgress?: number;
  resolved?: number;
  closed?: number;
  totalOverdue?: number;
  overdue?: number;
  resolutionRate?: number;
  byCategory?: Record<string, number>;
  [key: string]: unknown;
}

interface MunicipalityComplaint {
  _id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  municipalityName?: string;
  location?: { municipality?: string; address?: string };
  media?: { url: string; type?: string }[];
  confirmationCount?: number;
  upvoteCount?: number;
}

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
  
  // Stats state for agent/manager
  const [stats, setStats] = useState<DashboardStats>({});
  const [byCategory, setByCategory] = useState<Record<string, number>>({});
  const [loadingStats, setLoadingStats] = useState(false);

  // Municipality complaints for citizens
  const [municipalityComplaints, setMunicipalityComplaints] = useState<MunicipalityComplaint[]>([]);
  const [loadingMunicipalityComplaints, setLoadingMunicipalityComplaints] = useState(false);

  // BL-37: Trend alerts for manager/admin
  const [trendAlerts, setTrendAlerts] = useState<{type: string; severity: string; message: string; recommendation: string}[]>([]);
  const [loadingTrendAlerts, setLoadingTrendAlerts] = useState(false);

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

  // Fetch stats for all roles
  const fetchStats = async () => {
    const { token } = useAuthStore.getState();
    if (!token || !user) return;
    
    try {
      setLoadingStats(true);
      
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
        const d = statsRes.data as DashboardStats;
        setStats(d);
        setByCategory(d.byCategory || {});
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch municipality complaints for citizens
  const fetchMunicipalityComplaints = async () => {
    const { token } = useAuthStore.getState();
    if (!token || !user || user.role !== "CITIZEN") return;
    
    try {
      setLoadingMunicipalityComplaints(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const response = await fetch(
        `${apiUrl}/public/my-municipality-complaints?limit=20&status=VALIDATED,ASSIGNED,IN_PROGRESS,RESOLVED`,
        { 
          credentials: "include",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        }
      );
      const data = await response.json();
      if (data.success && data.complaints) {
        setMunicipalityComplaints(data.complaints);
      }
    } catch (err) {
      console.error("Error fetching municipality complaints:", err);
    } finally {
      setLoadingMunicipalityComplaints(false);
    }
  };

  // Handle upvote for citizen
  const handleUpvote = async (complaintId: string) => {
    const { token } = useAuthStore.getState();
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${apiUrl}/public/complaints/${complaintId}/upvote`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();
      if (data.success) {
        setMunicipalityComplaints(prev => prev.map(c => 
          c._id === complaintId 
            ? { ...c, upvoteCount: data.voteCount }
            : c
        ));
      }
    } catch (err) {
      console.error("Upvote failed:", err);
    }
  };

  // Handle confirm for citizen
  const handleConfirm = async (complaintId: string) => {
    const { token } = useAuthStore.getState();
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${apiUrl}/public/complaints/${complaintId}/confirm`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();
      if (data.success) {
        setMunicipalityComplaints(prev => prev.map(c => 
          c._id === complaintId 
            ? { ...c, confirmationCount: data.confirmationCount }
            : c
        ));
      }
    } catch (err) {
      console.error("Confirm failed:", err);
    }
  };

  // Fetch notifications on mount, subscribe to real-time updates
  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (hydrated && user && token) {
      fetchNotifications();
      // Connect socket for real-time notifications
      connectSocket(user.id);
      const unsubscribe = subscribeToNotifications((notification: unknown) => {
        const notif = notification as Notification;
        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(prev => prev + 1);
      });
      // Also poll every 60 seconds as fallback
      const interval = setInterval(fetchNotifications, 60000);
      return () => {
        clearInterval(interval);
        unsubscribe();
      };
    }
  }, [hydrated, user]);

  // Fetch stats for all roles on mount
  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (hydrated && user && token) {
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user]);

  // Fetch municipality complaints for citizens
  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (hydrated && user && token && user.role === "CITIZEN") {
      fetchMunicipalityComplaints();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user]);

  // BL-37: Fetch trend alerts for manager/admin
  useEffect(() => {
    const fetchAlerts = async () => {
      if (!user || !['DEPARTMENT_MANAGER', 'ADMIN', 'MUNICIPAL_AGENT'].includes(user.role)) {
        return;
      }
      
      try {
        setLoadingTrendAlerts(true);
        const alerts = await getTrendAlerts();
        setTrendAlerts(alerts);
      } catch (err) {
        console.error("Failed to fetch trend alerts:", err);
      } finally {
        setLoadingTrendAlerts(false);
      }
    };
    
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [user]);

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
          <h2 className="text-3xl font-bold text-slate-900 mb-1">
            Welcome back, {user?.fullName?.split(' ')[0] || 'User'} 
          </h2>
          <p className="text-slate-500">
            {user?.role === "CITIZEN" ? "Track your complaints and city services" 
             : user?.role === "TECHNICIAN" ? "Check your assigned tasks and progress"
             : user?.role === "DEPARTMENT_MANAGER" ? "Oversee department operations"
             : user?.role === "ADMIN" ? "System overview and management"
             : "Handle and manage incoming complaints"}
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
        </div>

        {/* Today's Priorities - Role-specific action summary */}
        {!loadingStats && stats.total !== undefined && (
          <div className="bg-gradient-to-br from-white to-primary/5 rounded-2xl shadow-lg p-6 border border-primary/10 mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Today&apos;s Priorities
              <span className="ml-auto text-xs text-slate-400 font-normal">Updated just now</span>
            </h3>
            <div className="space-y-3">
              {/* Agent priorities */}
              {user?.role === "MUNICIPAL_AGENT" && (
                <>
                  {(stats.totalOverdue || 0) > 0 && (
                    <Link href="/agent/complaints?status=SUBMITTED" className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200 hover:bg-red-100 transition-colors shadow-sm">
                      <span className="text-sm font-medium text-red-700">⚠ {stats.totalOverdue} overdue complaint{(stats.totalOverdue || 0) > 1 ? 's' : ''} need attention</span>
                      <ArrowRight className="w-4 h-4 text-red-500" />
                    </Link>
                  )}
                  {(stats.submitted || stats.pending || 0) > 0 && (
                    <Link href="/agent/complaints?status=SUBMITTED" className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200 hover:bg-amber-100 transition-colors shadow-sm">
                      <span className="text-sm font-medium text-amber-700">📋 {stats.submitted || stats.pending || 0} new complaint{(stats.submitted || stats.pending || 0) > 1 ? 's' : ''} to validate</span>
                      <ArrowRight className="w-4 h-4 text-amber-500" />
                    </Link>
                  )}
                  {(stats.resolved || 0) > 0 && (
                    <Link href="/agent/complaints?status=RESOLVED" className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200 hover:bg-green-100 transition-colors shadow-sm">
                      <span className="text-sm font-medium text-green-700">✅ {stats.resolved} resolution{(stats.resolved || 0) > 1 ? 's' : ''} awaiting review</span>
                      <ArrowRight className="w-4 h-4 text-green-500" />
                    </Link>
                  )}
                  {(stats.totalOverdue || 0) === 0 && (stats.submitted || stats.pending || 0) === 0 && (stats.resolved || 0) === 0 && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700">All clear! No urgent actions required.</span>
                    </div>
                  )}
                </>
              )}
              {/* Manager priorities */}
              {user?.role === "DEPARTMENT_MANAGER" && (
                <>
                  {(stats.totalOverdue || stats.overdue || 0) > 0 && (
                    <Link href="/manager/pending" className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200 hover:bg-red-100 transition-colors shadow-sm">
                      <span className="text-sm font-medium text-red-700">⚠ {stats.totalOverdue || stats.overdue} overdue complaint{(stats.totalOverdue || stats.overdue || 0) > 1 ? 's' : ''} in department</span>
                      <ArrowRight className="w-4 h-4 text-red-500" />
                    </Link>
                  )}
                  {(stats.assigned || 0) > 0 && (
                    <Link href="/manager/pending?status=ASSIGNED" className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-200 hover:bg-purple-100 transition-colors shadow-sm">
                      <span className="text-sm font-medium text-purple-700">👷 {stats.assigned} complaint{(stats.assigned || 0) > 1 ? 's' : ''} need technician assignment</span>
                      <ArrowRight className="w-4 h-4 text-purple-500" />
                    </Link>
                  )}
                  {(stats.inProgress || 0) > 0 && (
                    <Link href="/manager/pending?status=IN_PROGRESS" className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors shadow-sm">
                      <span className="text-sm font-medium text-blue-700">🔧 {stats.inProgress} complaint{(stats.inProgress || 0) > 1 ? 's' : ''} being worked on by technicians</span>
                      <ArrowRight className="w-4 h-4 text-blue-500" />
                    </Link>
                  )}
                  {(stats.totalOverdue || stats.overdue || 0) === 0 && (stats.assigned || 0) === 0 && (stats.inProgress || 0) === 0 && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700">All clear! Department operations on track.</span>
                    </div>
                  )}
                </>
              )}
              {/* Technician priorities */}
              {user?.role === "TECHNICIAN" && (
                <>
                  {(stats.assigned || 0) > 0 && (
                    <Link href="/tasks?status=ASSIGNED" className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors shadow-sm">
                      <span className="text-sm font-medium text-blue-700">🔧 {stats.assigned} new task{(stats.assigned || 0) > 1 ? 's' : ''} to start</span>
                      <ArrowRight className="w-4 h-4 text-blue-500" />
                    </Link>
                  )}
                  {(stats.inProgress || 0) > 0 && (
                    <Link href="/tasks?status=IN_PROGRESS" className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-200 hover:bg-orange-100 transition-colors shadow-sm">
                      <span className="text-sm font-medium text-orange-700">🔨 {stats.inProgress} task{(stats.inProgress || 0) > 1 ? 's' : ''} in progress</span>
                      <ArrowRight className="w-4 h-4 text-orange-500" />
                    </Link>
                  )}
                  {(stats.totalOverdue || stats.overdue || 0) > 0 && (
                    <Link href="/tasks" className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200 hover:bg-red-100 transition-colors shadow-sm">
                      <span className="text-sm font-medium text-red-700">⚠ {stats.totalOverdue || stats.overdue} overdue task{(stats.totalOverdue || stats.overdue || 0) > 1 ? 's' : ''} — resolve ASAP</span>
                      <ArrowRight className="w-4 h-4 text-red-500" />
                    </Link>
                  )}
                  {(stats.assigned || 0) === 0 && (stats.inProgress || 0) === 0 && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700">No pending tasks. Great work!</span>
                    </div>
                  )}
                </>
              )}
              {/* Admin priorities */}
              {user?.role === "ADMIN" && (
                <>
                  {(stats.totalOverdue || stats.overdue || 0) > 0 && (
                    <Link href="/admin/complaints" className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200 hover:bg-red-100 transition-colors shadow-sm">
                      <span className="text-sm font-medium text-red-700">⚠ {stats.totalOverdue || stats.overdue} overdue complaint{(stats.totalOverdue || stats.overdue || 0) > 1 ? 's' : ''} system-wide</span>
                      <ArrowRight className="w-4 h-4 text-red-500" />
                    </Link>
                  )}
                  {(stats.total || 0) > 0 && (
                    <Link href="/admin/complaints" className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/10 hover:bg-primary/10 transition-colors shadow-sm">
                      <span className="text-sm font-medium text-primary">📊 {stats.total} total complaints — Resolution rate: {stats.resolutionRate || 0}%</span>
                      <ArrowRight className="w-4 h-4 text-primary" />
                    </Link>
                  )}
                </>
              )}
              {/* Citizen */}
              {user?.role === "CITIZEN" && (
                <>
                  {(stats.inProgress || 0) > 0 && (
                    <Link href="/my-complaints" className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors shadow-sm">
                      <span className="text-sm font-medium text-blue-700">🔄 {stats.inProgress} of your complaint{(stats.inProgress || 0) > 1 ? 's are' : ' is'} being worked on</span>
                      <ArrowRight className="w-4 h-4 text-blue-500" />
                    </Link>
                  )}
                  {(stats.resolved || 0) > 0 && (
                    <Link href="/my-complaints" className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200 hover:bg-green-100 transition-colors shadow-sm">
                      <span className="text-sm font-medium text-green-700">✅ {stats.resolved} complaint{(stats.resolved || 0) > 1 ? 's' : ''} resolved</span>
                      <ArrowRight className="w-4 h-4 text-green-500" />
                    </Link>
                  )}
                  {(stats.inProgress || 0) === 0 && (stats.resolved || 0) === 0 && (stats.total || 0) === 0 && (
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-sm font-medium text-slate-600">No complaints submitted yet. <Link href="/complaints/new" className="text-primary hover:underline">Submit your first complaint →</Link></span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Statistics Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">
              {dashboardConfig.statsTitle}
            </h3>
            {(user?.role === "MUNICIPAL_AGENT" || user?.role === "DEPARTMENT_MANAGER" || user?.role === "ADMIN" || user?.role === "TECHNICIAN") && (
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchStats}
                  className="text-sm text-primary hover:text-primary-700 font-medium"
                >
                  Refresh
                </button>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Total Complaints */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="text-2xl font-bold text-blue-700 mb-1">
                {stats.total || 0}
              </div>
              <div className="text-sm text-blue-600 font-medium">Total</div>
              <div className="text-xs text-blue-500 mt-1">All</div>
            </div>
            
            {/* In Progress */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
              <div className="text-2xl font-bold text-orange-700 mb-1">
                {stats.inProgress || 0}
              </div>
              <div className="text-sm text-orange-600 font-medium">In Progress</div>
              <div className="text-xs text-orange-500 mt-1">Working</div>
            </div>
            
            {/* Resolved */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <div className="text-2xl font-bold text-green-700 mb-1">
                {stats.resolved || 0}
              </div>
              <div className="text-sm text-green-600 font-medium">Resolved</div>
              <div className="text-xs text-green-500 mt-1">Fixed</div>
            </div>
            
            {/* Closed */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
              <div className="text-2xl font-bold text-slate-700 mb-1">
                {stats.closed || 0}
              </div>
              <div className="text-sm text-slate-600 font-medium">Closed</div>
              <div className="text-xs text-slate-500 mt-1">Completed</div>
            </div>
            
            {/* Overdue */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
              <div className="text-2xl font-bold text-red-700 mb-1">
                {stats.totalOverdue || stats.overdue || 0}
              </div>
              <div className="text-sm text-red-600 font-medium">Overdue</div>
              <div className="text-xs text-red-500 mt-1">Past deadline</div>
            </div>
          </div>

          {/* High Priority - score 15+ */}
          {stats.totalOverdue !== undefined && stats.totalOverdue > 0 && (
            <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-red-100 rounded-xl border border-red-200">
              <div className="flex items-center gap-2">
                <span className="text-red-600 font-bold">High Priority:</span>
                <span className="text-red-700">{stats.totalOverdue} complaints need immediate attention</span>
              </div>
            </div>
          )}

          {/* Category Chart - For roles that have category data */}
          {Object.keys(byCategory).length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Complaints by Category (Type of Issue)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(byCategory).map(([cat, count]) => {
                  const maxCount = Math.max(...Object.values(byCategory));
                  const percentage = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                  
                  // Category colors
                  const categoryColors: Record<string, string> = {
                    ROAD: "from-gray-600 to-gray-700",
                    LIGHTING: "from-yellow-500 to-yellow-600",
                    WASTE: "from-green-500 to-green-600",
                    WATER: "from-blue-500 to-blue-600",
                    SAFETY: "from-red-500 to-red-600",
                    PUBLIC_PROPERTY: "from-purple-500 to-purple-600",
                    GREEN_SPACE: "from-emerald-500 to-emerald-600",
                    BUILDING: "from-amber-500 to-amber-600",
                    NOISE: "from-indigo-500 to-indigo-600",
                    OTHER: "from-slate-500 to-slate-600",
                  };
                  const colorClass = categoryColors[cat] || "from-primary to-primary-700";
                  
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <div className="w-40 text-sm font-medium text-slate-700 truncate">
                        {categoryLabels[cat] || cat}
                      </div>
                      <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${colorClass} rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="w-12 text-sm font-bold text-slate-700 text-right">
                        {count}
                      </div>
                      <div className="w-10 text-xs text-slate-500 text-right">
                        {percentage}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* BL-37: Trend Forecasts Section - For manager/admin */}
          {(user?.role === "DEPARTMENT_MANAGER" || user?.role === "ADMIN" || user?.role === "MUNICIPAL_AGENT") && trendAlerts.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-violet-600" />
                AI Trend Forecasts — Next 7 Days
                <span className="text-xs text-slate-500 ml-auto">Updated automatically</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {trendAlerts.slice(0, 6).map((alert, idx) => (
                  <div 
                    key={idx}
                    className={`p-4 rounded-xl border ${
                      alert.severity === 'HIGH' ? 'bg-red-50 border-red-200' :
                      alert.severity === 'MEDIUM' ? 'bg-amber-50 border-amber-200' :
                      'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {alert.severity === 'HIGH' ? (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-violet-600" />
                      )}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        alert.severity === 'HIGH' ? 'bg-red-200 text-red-700' :
                        alert.severity === 'MEDIUM' ? 'bg-amber-200 text-amber-700' :
                        'bg-blue-200 text-blue-700'
                      }`}>
                        {alert.type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mb-1">{alert.message}</p>
                    <p className="text-xs text-slate-500">{alert.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Municipality Complaints Section - For CITIZEN role */}
        {user?.role === "CITIZEN" && municipalityComplaints && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100 mt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Complaints in Your Area
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Support issues in your municipality by confirming or upvoting
                </p>
              </div>
              <button
                onClick={fetchMunicipalityComplaints}
                disabled={loadingMunicipalityComplaints}
                className="text-sm text-primary hover:text-primary/700 font-medium disabled:opacity-50"
              >
                {loadingMunicipalityComplaints ? "Loading..." : "Refresh"}
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {municipalityComplaints.slice(0, 6).map((complaint) => (
                <div 
                  key={complaint._id}
                  className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="relative h-24 bg-gradient-to-br from-slate-100 to-slate-50">
                    {complaint.media?.[0]?.url ? (
                      <img 
                        src={complaint.media[0].url} 
                        alt={complaint.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="w-8 h-8 text-slate-300" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/90 text-slate-700">
                        {categoryLabels[complaint.category] || complaint.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="font-semibold text-slate-800 text-sm mb-1 line-clamp-2">{complaint.title}</h4>
                    <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {complaint.municipalityName || complaint.location?.municipality || "Unknown"}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleConfirm(complaint._id)}
                        className="flex items-center gap-1 px-2 py-1 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-xs text-green-600 font-medium transition-colors"
                      >
                        <CheckCircle className="w-3 h-3" />
                        {complaint.confirmationCount || 0}
                      </button>
                      <button
                        onClick={() => handleUpvote(complaint._id)}
                        className="flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-xs text-red-500 font-medium transition-colors"
                      >
                        <Heart className="w-3 h-3" />
                        {complaint.upvoteCount || 0}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
