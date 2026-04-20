"use client";

import { useEffect, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FileText, Plus, Sparkles, Shield, Loader2, BarChart3, MapPin, CheckCircle, ArrowRight, TrendingUp, AlertTriangle, MessageSquare } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RecentActivities from "@/components/dashboard/RecentActivities";
import MunicipalityOverview from "@/components/dashboard/MunicipalityOverview";
import { useAuthStore } from "@/store/useAuthStore";
import { agentService } from "@/services/agent.service";
import { managerService } from "@/services/manager.service";
import { technicianService } from "@/services/technician.service";
import { adminService } from "@/services/admin.service";
import { categoryLabels } from "@/lib/complaints";
import { getTrendAlerts, confirmComplaint } from "@/services/complaint.service";
import TrendForecastChart from "@/components/dashboard/TrendForecastChart";
import DuplicateStatsCard from "@/components/dashboard/DuplicateStatsCard";
import { useTranslation } from "react-i18next";

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
  createdBy?: string | { _id?: string; id?: string };
  municipalityName?: string;
  location?: { municipality?: string; address?: string };
  media?: { url: string; type?: string }[];
  confirmationCount?: number;
  upvoteCount?: number;
}

// Separate component that uses useSearchParams
function DashboardContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hydrated } = useAuthStore();

  // Stats state for agent/manager
  const [stats, setStats] = useState<DashboardStats>({});
  const [byCategory, setByCategory] = useState<Record<string, number>>({});
  const [loadingStats, setLoadingStats] = useState(false);

  // Municipality complaints for citizens
  const [municipalityComplaints, setMunicipalityComplaints] = useState<MunicipalityComplaint[]>([]);
  const [loadingMunicipalityComplaints, setLoadingMunicipalityComplaints] = useState(false);

  // BL-37: Trend alerts for manager/admin
  const [trendAlerts, setTrendAlerts] = useState<{type: string; severity: string; message: string; recommendation: string}[]>([]);
  const [, setLoadingTrendAlerts] = useState(false);

  // Recent resolutions
  const [recentResolutions, setRecentResolutions] = useState<MunicipalityComplaint[]>([]);

  const getOwnerId = (complaint: MunicipalityComplaint): string | undefined => {
    if (!complaint.createdBy) return undefined;
    if (typeof complaint.createdBy === "string") return complaint.createdBy;
    return complaint.createdBy._id || complaint.createdBy.id;
  };

  const currentUserId = (() => {
    if (!user) return undefined;
    const u = user as { id?: string; _id?: string };
    return u.id || u._id;
  })();

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
      } else if (user.role === "CITIZEN") {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
        const res = await fetch(`${apiUrl}/citizen/stats`, {
          credentials: "include",
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) {
          statsRes = { data: json.data };
        }
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
        const filtered = (data.complaints as MunicipalityComplaint[]).filter((c) => {
          const ownerId = getOwnerId(c);
          return !ownerId || !currentUserId || ownerId !== currentUserId;
        });
        setMunicipalityComplaints(filtered);
      }
    } catch (err) {
      console.error("Error fetching municipality complaints:", err);
    } finally {
      setLoadingMunicipalityComplaints(false);
    }
  };

  // Handle confirm for citizen
  const handleConfirm = async (complaintId: string) => {
    const { token } = useAuthStore.getState();
    if (!token) {
      router.push("/login");
      return;
    }

    const target = municipalityComplaints.find((c) => c._id === complaintId);
    if (target && currentUserId && getOwnerId(target) === currentUserId) {
      return;
    }

    try {
      const data = await confirmComplaint(complaintId);
      if (data.success) {
        setMunicipalityComplaints(prev => prev.map(c => 
          c._id === complaintId 
            ? { ...c, confirmationCount: data.confirmationCount ?? (c.confirmationCount || 0) + 1 }
            : c
        ));
      }
    } catch (err) {
      console.error("Confirm failed:", err);
    }
  };

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
      // Fetch latest 6 recent resolutions and keep them fresh
      const fetchRecentResolutions = async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
          const res = await fetch(
            `${apiUrl}/public/my-municipality-complaints?limit=6&status=RESOLVED,CLOSED&sort=-updatedAt`,
            { credentials: "include", headers: { Authorization: `Bearer ${token}` } }
          );
          const data = await res.json();
          if (data.success && data.complaints) {
            const latest = [...data.complaints]
              .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
              .slice(0, 6);
            setRecentResolutions(latest);
          }
        } catch (err) {
          console.error("Error fetching recent resolutions:", err);
        }
      };

      fetchRecentResolutions();
      const interval = setInterval(fetchRecentResolutions, 60000);
      return () => clearInterval(interval);
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
      router.replace("/login");
    }
  }, [hydrated, user, router]);

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

  // Get role-based dashboard configuration
  const getDashboardConfig = () => {
    if (!user) return null;
    const role = user.role;
    return {
      link: role === "CITIZEN" ? "/my-complaints" : role === "MUNICIPAL_AGENT" ? "/agent/complaints" : role === "DEPARTMENT_MANAGER" ? "/manager/pending" : role === "TECHNICIAN" ? "/tasks" : "/admin/complaints",
      statsTitle: t(`stats.title.${role}`) || t('stats.title.MUNICIPAL_AGENT'),
    };
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
    <DashboardLayout>
      <main className="px-4 md:px-6 py-6 md:py-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-1">
              {t('dashboard.welcomeBack', { name: user?.fullName?.split(' ')[0] || 'User' })}
            </h2>
            <p className="text-slate-500">
              {t(`dashboard.subtitle.${user?.role}`) || t('dashboard.subtitle.MUNICIPAL_AGENT')}
            </p>
          </div>
          {/* Role-specific action buttons */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {user?.role === "CITIZEN" && (
              <Link href="/complaints/new" className="inline-flex items-center gap-2 bg-primary hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-md hover:shadow-lg text-sm">
                <Plus className="w-4 h-4" />
                {t('dashboard.buttons.newComplaint')}
              </Link>
            )}
            {user?.role === "MUNICIPAL_AGENT" && (
              <Link href="/agent/complaints" className="inline-flex items-center gap-2 bg-primary hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-md hover:shadow-lg text-sm">
                <FileText className="w-4 h-4" />
                {t('dashboard.buttons.viewQueue')}
              </Link>
            )}
            {user?.role === "DEPARTMENT_MANAGER" && (
              <Link href="/manager/pending" className="inline-flex items-center gap-2 bg-primary hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-md hover:shadow-lg text-sm">
                <FileText className="w-4 h-4" />
                {t('dashboard.buttons.pendingTasks')}
              </Link>
            )}
            {user?.role === "TECHNICIAN" && (
              <Link href="/tasks" className="inline-flex items-center gap-2 bg-primary hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-md hover:shadow-lg text-sm">
                <FileText className="w-4 h-4" />
                {t('dashboard.buttons.myTasks')}
              </Link>
            )}
            {user?.role === "ADMIN" && (
              <div className="flex items-center gap-2">
                <Link href="/admin/users" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-md hover:shadow-lg text-sm">
                  <Shield className="w-4 h-4" />
                  {t('dashboard.buttons.adminPanel')}
                </Link>
                <Link href="/admin/complaints" className="inline-flex items-center gap-2 bg-primary hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-md hover:shadow-lg text-sm">
                  <FileText className="w-4 h-4" />
                  {t('dashboard.buttons.allComplaints')}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Today's Priorities - Role-specific action summary */}
        {!loadingStats && stats.total !== undefined && (
          <div className="bg-gradient-to-br from-white to-primary/5 rounded-2xl shadow-lg p-6 border border-primary/10 mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {t('priorities.title')}
              <span className="ml-auto text-xs text-slate-400 font-normal">{t('priorities.updatedNow')}</span>
            </h3>
            <div className="space-y-3">
              {/* Agent priorities */}
              {user?.role === "MUNICIPAL_AGENT" && (
                <>
                  {(stats.totalOverdue || 0) > 0 && (
                    <Link href="/agent/complaints?status=SUBMITTED" className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200 hover:bg-red-100 transition-colors shadow-sm">
                      <span className="text-sm font-medium text-red-700">{stats.totalOverdue} {t('priorities.overdueNeedAttention')}</span>
                      <ArrowRight className="w-4 h-4 text-red-500" />
                    </Link>
                  )}
                  {(stats.submitted || stats.pending || 0) > 0 && (
                    <Link href="/agent/complaints?status=SUBMITTED" className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200 hover:bg-amber-100 transition-colors shadow-sm">
                      <span className="text-sm font-medium text-amber-700">{stats.submitted || stats.pending || 0} {t('priorities.newToValidate')}</span>
                      <ArrowRight className="w-4 h-4 text-amber-500" />
                    </Link>
                  )}
                  {(stats.resolved || 0) > 0 && (
                    <Link href="/agent/complaints?status=RESOLVED" className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200 hover:bg-green-100 transition-colors shadow-sm">
                      <span className="text-sm font-medium text-green-700">{stats.resolved} {t('priorities.resolutionsAwaiting')}</span>
                      <ArrowRight className="w-4 h-4 text-green-500" />
                    </Link>
                  )}
                  {(stats.totalOverdue || 0) === 0 && (stats.submitted || stats.pending || 0) === 0 && (stats.resolved || 0) === 0 && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700">{t('priorities.allClearAgent')}</span>
                    </div>
                  )}
                </>
              )}
              {/* Manager priorities */}
              {user?.role === "DEPARTMENT_MANAGER" && (
                <>
                  {(stats.totalOverdue || stats.overdue || 0) > 0 && (
                    <Link href="/manager/pending" className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200 hover:bg-red-100 transition-colors shadow-sm">
                      <span className="text-sm font-medium text-red-700">{stats.totalOverdue || stats.overdue} {t('priorities.overdueInDepartment')}</span>
                      <ArrowRight className="w-4 h-4 text-red-500" />
                    </Link>
                  )}
                  {(stats.assigned || 0) > 0 && (
                    <Link href="/manager/pending?status=ASSIGNED" className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-200 hover:bg-purple-100 transition-colors shadow-sm">
                      <span className="text-sm font-medium text-purple-700">{stats.assigned} {t('priorities.needAssignment')}</span>
                      <ArrowRight className="w-4 h-4 text-purple-500" />
                    </Link>
                  )}
                  {(stats.inProgress || 0) > 0 && (
                    <Link href="/manager/pending?status=IN_PROGRESS" className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors shadow-sm">
                      <span className="text-sm font-medium text-blue-700">{stats.inProgress} {t('priorities.beingWorked')}</span>
                      <ArrowRight className="w-4 h-4 text-blue-500" />
                    </Link>
                  )}
                  {(stats.totalOverdue || stats.overdue || 0) === 0 && (stats.assigned || 0) === 0 && (stats.inProgress || 0) === 0 && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700">{t('priorities.allClearManager')}</span>
                    </div>
                  )}
                </>
              )}
              {/* Technician priorities */}
              {user?.role === "TECHNICIAN" && (
                <>
                  {(stats.assigned || 0) > 0 && (
                    <Link href="/tasks?status=ASSIGNED" className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors shadow-sm">
                      <span className="text-sm font-medium text-blue-700">{stats.assigned} {t('priorities.newTasks')}</span>
                      <ArrowRight className="w-4 h-4 text-blue-500" />
                    </Link>
                  )}
                  {(stats.inProgress || 0) > 0 && (
                    <Link href="/tasks?status=IN_PROGRESS" className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-200 hover:bg-orange-100 transition-colors shadow-sm">
                      <span className="text-sm font-medium text-orange-700">{stats.inProgress} {t('priorities.tasksInProgress')}</span>
                      <ArrowRight className="w-4 h-4 text-orange-500" />
                    </Link>
                  )}
                  {(stats.totalOverdue || stats.overdue || 0) > 0 && (
                    <Link href="/tasks" className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200 hover:bg-red-100 transition-colors shadow-sm">
                      <span className="text-sm font-medium text-red-700">{stats.totalOverdue || stats.overdue} {t('priorities.overdueTasks')}</span>
                      <ArrowRight className="w-4 h-4 text-red-500" />
                    </Link>
                  )}
                  {(stats.assigned || 0) === 0 && (stats.inProgress || 0) === 0 && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700">{t('priorities.noPendingTasks')}</span>
                    </div>
                  )}
                </>
              )}
              {/* Admin priorities */}
              {user?.role === "ADMIN" && (
                <>
                  {(stats.totalOverdue || stats.overdue || 0) > 0 && (
                    <Link href="/admin/complaints" className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200 hover:bg-red-100 transition-colors shadow-sm">
                      <span className="text-sm font-medium text-red-700">{stats.totalOverdue || stats.overdue} {t('priorities.overdueSystemWide')}</span>
                      <ArrowRight className="w-4 h-4 text-red-500" />
                    </Link>
                  )}
                  {(stats.total || 0) > 0 && (
                    <Link href="/admin/complaints" className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/10 hover:bg-primary/10 transition-colors shadow-sm">
                      <span className="text-sm font-medium text-primary">{stats.total} {t('priorities.totalComplaints', { rate: stats.resolutionRate || 0 })}</span>
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
                      <span className="text-sm font-medium text-blue-700">{stats.inProgress} {t('priorities.beingWorkedCitizen')}</span>
                      <ArrowRight className="w-4 h-4 text-blue-500" />
                    </Link>
                  )}
                  {(stats.resolved || 0) > 0 && (
                    <Link href="/my-complaints" className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200 hover:bg-green-100 transition-colors shadow-sm">
                      <span className="text-sm font-medium text-green-700">{stats.resolved} {t('priorities.complaintsResolved')}</span>
                      <ArrowRight className="w-4 h-4 text-green-500" />
                    </Link>
                  )}
                  {(stats.inProgress || 0) === 0 && (stats.resolved || 0) === 0 && (stats.total || 0) === 0 && (
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-sm font-medium text-slate-600">{t('priorities.noComplaints')} <Link href="/complaints/new" className="text-primary hover:underline">{t('priorities.submitFirst')}</Link></span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Recent Activities — Before statistics */}
        <div className="mb-8">
          <RecentActivities
            role={user?.role || "CITIZEN"}
            maxItems={8}
          />
        </div>

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
          
          {/* Citizen Stats */}
          {user?.role === 'CITIZEN' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="text-2xl font-bold text-blue-700 mb-1">{stats.total || 0}</div>
                <div className="text-sm text-blue-600 font-medium">{t('stats.myComplaints')}</div>
                <div className="text-xs text-blue-500 mt-1">{t('stats.totalSubmitted')}</div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                <div className="text-2xl font-bold text-amber-700 mb-1">{(stats.submitted || 0) + (stats.pending || 0)}</div>
                <div className="text-sm text-amber-600 font-medium">{t('stats.pending')}</div>
                <div className="text-xs text-amber-500 mt-1">{t('stats.awaitingReview')}</div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                <div className="text-2xl font-bold text-orange-700 mb-1">{stats.inProgress || 0}</div>
                <div className="text-sm text-orange-600 font-medium">{t('stats.inProgress')}</div>
                <div className="text-xs text-orange-500 mt-1">{t('stats.beingWorked')}</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                <div className="text-2xl font-bold text-green-700 mb-1">{(stats.resolved || 0) + (stats.closed || 0)}</div>
                <div className="text-sm text-green-600 font-medium">{t('common.resolved')}</div>
                <div className="text-xs text-green-500 mt-1">{t('stats.completed')}</div>
              </div>
            </div>
          )}

          {/* Agent Stats */}
          {user?.role === 'MUNICIPAL_AGENT' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <div className="text-2xl font-bold text-blue-700 mb-1">{stats.total || 0}</div>
                  <div className="text-sm text-blue-600 font-medium">{t('stats.total')}</div>
                  <div className="text-xs text-blue-500 mt-1">{t('stats.allComplaints')}</div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                  <div className="text-2xl font-bold text-amber-700 mb-1">{stats.submitted || stats.pending || 0}</div>
                  <div className="text-sm text-amber-600 font-medium">{t('stats.toValidate')}</div>
                  <div className="text-xs text-amber-500 mt-1">{t('stats.needsReview')}</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                  <div className="text-2xl font-bold text-orange-700 mb-1">{stats.inProgress || 0}</div>
                  <div className="text-sm text-orange-600 font-medium">{t('stats.inProgress')}</div>
                  <div className="text-xs text-orange-500 mt-1">{t('stats.beingFixed')}</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                  <div className="text-2xl font-bold text-green-700 mb-1">{stats.resolved || 0}</div>
                  <div className="text-sm text-green-600 font-medium">{t('common.resolved')}</div>
                  <div className="text-xs text-green-500 mt-1">{t('stats.awaitingClosure')}</div>
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                  <div className="text-2xl font-bold text-slate-700 mb-1">{stats.closed || 0}</div>
                  <div className="text-sm text-slate-600 font-medium">{t('stats.closed') || 'Closed'}</div>
                  <div className="text-xs text-slate-500 mt-1">{t('stats.closedCases') || 'Completed'}</div>
                </div>
                <div className={`bg-gradient-to-br ${(stats.totalOverdue || 0) > 0 ? 'from-red-50 to-red-100 border-red-200' : 'from-slate-50 to-slate-100 border-slate-200'} rounded-xl p-4 border`}>
                  <div className={`text-2xl font-bold ${(stats.totalOverdue || 0) > 0 ? 'text-red-700' : 'text-slate-700'} mb-1`}>{stats.totalOverdue || stats.overdue || 0}</div>
                  <div className={`text-sm ${(stats.totalOverdue || 0) > 0 ? 'text-red-600' : 'text-slate-600'} font-medium`}>{t('stats.overdue')}</div>
                  <div className={`text-xs ${(stats.totalOverdue || 0) > 0 ? 'text-red-500' : 'text-slate-500'} mt-1`}>{t('stats.pastDeadline')}</div>
                </div>
              </div>
              {stats.resolutionRate !== undefined && (
                <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-emerald-800">{t('stats.resolutionRate')}</span>
                    <span className="text-lg font-bold text-emerald-700">{stats.resolutionRate}%</span>
                  </div>
                  <div className="h-2 bg-emerald-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(stats.resolutionRate, 100)}%` }} />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Manager Stats */}
          {user?.role === 'DEPARTMENT_MANAGER' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <div className="text-2xl font-bold text-blue-700 mb-1">{stats.total || 0}</div>
                  <div className="text-sm text-blue-600 font-medium">{t('stats.department')}</div>
                  <div className="text-xs text-blue-500 mt-1">{t('stats.totalComplaints')}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                  <div className="text-2xl font-bold text-purple-700 mb-1">{stats.assigned || 0}</div>
                  <div className="text-sm text-purple-600 font-medium">{t('stats.toAssign')}</div>
                  <div className="text-xs text-purple-500 mt-1">{t('stats.needsTechnician')}</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                  <div className="text-2xl font-bold text-orange-700 mb-1">{stats.inProgress || 0}</div>
                  <div className="text-sm text-orange-600 font-medium">{t('stats.inProgress')}</div>
                  <div className="text-xs text-orange-500 mt-1">{t('stats.beingWorked')}</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                  <div className="text-2xl font-bold text-green-700 mb-1">{stats.resolved || 0}</div>
                  <div className="text-sm text-green-600 font-medium">{t('common.resolved')}</div>
                  <div className="text-xs text-green-500 mt-1">{t('stats.awaitingClosure')}</div>
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                  <div className="text-2xl font-bold text-slate-700 mb-1">{stats.closed || 0}</div>
                  <div className="text-sm text-slate-600 font-medium">{t('stats.closed') || 'Closed'}</div>
                  <div className="text-xs text-slate-500 mt-1">{t('stats.closedCases') || 'Completed'}</div>
                </div>
                <div className={`bg-gradient-to-br ${(stats.totalOverdue || stats.overdue || 0) > 0 ? 'from-red-50 to-red-100 border-red-200' : 'from-slate-50 to-slate-100 border-slate-200'} rounded-xl p-4 border`}>
                  <div className={`text-2xl font-bold ${(stats.totalOverdue || stats.overdue || 0) > 0 ? 'text-red-700' : 'text-slate-700'} mb-1`}>{stats.totalOverdue || stats.overdue || 0}</div>
                  <div className={`text-sm ${(stats.totalOverdue || stats.overdue || 0) > 0 ? 'text-red-600' : 'text-slate-600'} font-medium`}>{t('stats.overdue')}</div>
                  <div className={`text-xs ${(stats.totalOverdue || stats.overdue || 0) > 0 ? 'text-red-500' : 'text-slate-500'} mt-1`}>{t('stats.pastSLA')}</div>
                </div>
              </div>
              {stats.resolutionRate !== undefined && (
                <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-emerald-800">{t('stats.slaCompliance')}</span>
                    <span className="text-lg font-bold text-emerald-700">{stats.resolutionRate}%</span>
                  </div>
                  <div className="h-2 bg-emerald-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(stats.resolutionRate, 100)}%` }} />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Technician Stats */}
          {user?.role === 'TECHNICIAN' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                  <div className="text-2xl font-bold text-slate-700 mb-1">{stats.total || (stats.assigned || 0) + (stats.inProgress || 0) + (stats.resolved || 0)}</div>
                  <div className="text-sm text-slate-600 font-medium">{t('stats.total')}</div>
                  <div className="text-xs text-slate-500 mt-1">{t('stats.allTasks')}</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <div className="text-2xl font-bold text-blue-700 mb-1">{stats.assigned || 0}</div>
                  <div className="text-sm text-blue-600 font-medium">{t('stats.newTasks')}</div>
                  <div className="text-xs text-blue-500 mt-1">{t('stats.readyToStart')}</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                  <div className="text-2xl font-bold text-orange-700 mb-1">{stats.inProgress || 0}</div>
                  <div className="text-sm text-orange-600 font-medium">{t('stats.inProgress')}</div>
                  <div className="text-xs text-orange-500 mt-1">{t('stats.workingOn')}</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                  <div className="text-2xl font-bold text-green-700 mb-1">{stats.resolved || 0}</div>
                  <div className="text-sm text-green-600 font-medium">{t('stats.completed')}</div>
                  <div className="text-xs text-green-500 mt-1">{t('stats.resolvedTasks')}</div>
                </div>
                <div className={`bg-gradient-to-br ${(stats.totalOverdue || stats.overdue || 0) > 0 ? 'from-red-50 to-red-100 border-red-200' : 'from-slate-50 to-slate-100 border-slate-200'} rounded-xl p-4 border`}>
                  <div className={`text-2xl font-bold ${(stats.totalOverdue || stats.overdue || 0) > 0 ? 'text-red-700' : 'text-slate-700'} mb-1`}>{stats.totalOverdue || stats.overdue || 0}</div>
                  <div className={`text-sm ${(stats.totalOverdue || stats.overdue || 0) > 0 ? 'text-red-600' : 'text-slate-600'} font-medium`}>{t('stats.overdue')}</div>
                  <div className={`text-xs ${(stats.totalOverdue || stats.overdue || 0) > 0 ? 'text-red-500' : 'text-slate-500'} mt-1`}>{t('stats.urgent')}</div>
                </div>
              </div>
            </>
          )}

          {/* Admin Stats */}
          {user?.role === 'ADMIN' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <div className="text-2xl font-bold text-blue-700 mb-1">{stats.total || 0}</div>
                  <div className="text-sm text-blue-600 font-medium">{t('stats.total')}</div>
                  <div className="text-xs text-blue-500 mt-1">{t('stats.allComplaints')}</div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                  <div className="text-2xl font-bold text-amber-700 mb-1">{stats.submitted || 0}</div>
                  <div className="text-sm text-amber-600 font-medium">{t('stats.submitted')}</div>
                  <div className="text-xs text-amber-500 mt-1">{t('stats.newPending')}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                  <div className="text-2xl font-bold text-purple-700 mb-1">{stats.assigned || 0}</div>
                  <div className="text-sm text-purple-600 font-medium">{t('stats.assigned')}</div>
                  <div className="text-xs text-purple-500 mt-1">{t('stats.toDepartments')}</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                  <div className="text-2xl font-bold text-orange-700 mb-1">{stats.inProgress || 0}</div>
                  <div className="text-sm text-orange-600 font-medium">{t('stats.inProgress')}</div>
                  <div className="text-xs text-orange-500 mt-1">{t('stats.beingFixed')}</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                  <div className="text-2xl font-bold text-green-700 mb-1">{(stats.resolved || 0) + (stats.closed || 0)}</div>
                  <div className="text-sm text-green-600 font-medium">{t('common.resolved')}</div>
                  <div className="text-xs text-green-500 mt-1">{t('stats.closedCases')}</div>
                </div>
                <div className={`bg-gradient-to-br ${(stats.totalOverdue || 0) > 0 ? 'from-red-50 to-red-100 border-red-200' : 'from-slate-50 to-slate-100 border-slate-200'} rounded-xl p-4 border`}>
                  <div className={`text-2xl font-bold ${(stats.totalOverdue || 0) > 0 ? 'text-red-700' : 'text-slate-700'} mb-1`}>{stats.totalOverdue || 0}</div>
                  <div className={`text-sm ${(stats.totalOverdue || 0) > 0 ? 'text-red-600' : 'text-slate-600'} font-medium`}>{t('stats.overdue')}</div>
                  <div className={`text-xs ${(stats.totalOverdue || 0) > 0 ? 'text-red-500' : 'text-slate-500'} mt-1`}>{t('stats.pastSLA')}</div>
                </div>
              </div>
              {stats.resolutionRate !== undefined && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-emerald-800">{t('stats.resolutionRate')}</span>
                      <span className="text-lg font-bold text-emerald-700">{stats.resolutionRate}%</span>
                    </div>
                    <div className="h-2 bg-emerald-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(stats.resolutionRate, 100)}%` }} />
                    </div>
                  </div>
                  {(stats.totalOverdue || 0) > 0 && (
                    <div className="p-4 bg-gradient-to-r from-red-50 to-red-100 rounded-xl border border-red-200">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-semibold text-red-700">
                          {stats.totalOverdue} {t('stats.pastSLADeadline')}
                        </span>
                      </div>
                      <p className="text-xs text-red-500 mt-1">{t('priorities.requiresAttention')}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Category Chart - For roles that have category data */}
          {Object.keys(byCategory).length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                {t('stats.byCategory')}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(byCategory).map(([cat, count]) => {
                  const maxCount = Math.max(...Object.values(byCategory));
                  const totalCount = Object.values(byCategory).reduce((sum, c) => sum + c, 0);
                  const barWidth = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                  const sharePercent = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                  
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
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <div className="w-12 text-sm font-bold text-slate-700 text-right">
                        {count}
                      </div>
                      <div className="w-10 text-xs text-slate-500 text-right">
                        {sharePercent}%
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
                {t('trends.title')}
                <span className="text-xs text-slate-500 ml-auto">{t('trends.subtitle')}</span>
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

        {/* AI Insight Widgets — 7-Day Forecast + Duplicate Stats, right after stats/trend alerts */}
        {(user?.role === "DEPARTMENT_MANAGER" || user?.role === "ADMIN" || user?.role === "MUNICIPAL_AGENT") && (
          <div className={`grid grid-cols-1 ${(user?.role === "MUNICIPAL_AGENT" || user?.role === "ADMIN") ? "lg:grid-cols-2" : ""} gap-6 mt-6`}>
            <TrendForecastChart
              municipality={user?.municipalityName || (typeof user?.municipality === "object" ? user?.municipality?.name : "") || ""}
              category=""
            />
            {(user?.role === "MUNICIPAL_AGENT" || user?.role === "ADMIN") && (
              <DuplicateStatsCard />
            )}
          </div>
        )}

        {/* Municipality Overview — Full width */}
        <div className="mt-6">
          <MunicipalityOverview
            role={user?.role || "CITIZEN"}
            userMunicipality={user?.municipalityName || (typeof user?.municipality === 'object' && user?.municipality?.name) || undefined}
            userGovernorate={user?.governorate}
          />
        </div>

        {/* Municipality Complaints Section - For CITIZEN role */}
        {user?.role === "CITIZEN" && municipalityComplaints && (
          <div id="complaints-area" className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100 mt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  {t('municipality.title')}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {t('municipality.subtitle')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchMunicipalityComplaints}
                  disabled={loadingMunicipalityComplaints}
                  className="text-sm text-primary hover:text-primary/80 font-medium disabled:opacity-50"
                >
                  {loadingMunicipalityComplaints ? t('common.loading') : t('common.refresh')}
                </button>
              </div>
            </div>
            
            {municipalityComplaints.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">{t('municipality.noComplaints')}</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {municipalityComplaints.slice(0, 6).map((complaint) => (
                  <div
                    key={complaint._id}
                    className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden hover:shadow-md transition-shadow group cursor-pointer"
                    onClick={() => router.push(`/dashboard/complaints/${complaint._id}`)}
                  >
                    {/* Image */}
                    <div className="relative h-28 bg-gradient-to-br from-slate-100 to-slate-50">
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
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/90 text-slate-700 shadow-sm">
                          {categoryLabels[complaint.category] || complaint.category}
                        </span>
                      </div>
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold shadow-sm ${
                          complaint.status === "RESOLVED" ? "bg-green-100 text-green-700" :
                          complaint.status === "IN_PROGRESS" ? "bg-orange-100 text-orange-700" :
                          complaint.status === "ASSIGNED" ? "bg-purple-100 text-purple-700" :
                          "bg-blue-100 text-blue-700"
                        }`}>
                          {complaint.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-3">
                      <h4 className="font-semibold text-slate-800 text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                        {complaint.title}
                      </h4>
                      <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">
                          {complaint.location?.address || complaint.municipalityName || complaint.location?.municipality || "Unknown location"}
                        </span>
                      </p>

                      {(complaint.status === "VALIDATED" || complaint.status === "ASSIGNED" || complaint.status === "IN_PROGRESS") && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleConfirm(complaint._id); }}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-medium transition-colors"
                            title={t('municipality.confirmTitle')}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>{t('municipality.confirmBtn')}</span>
                            <span className="bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full text-[10px] font-bold ml-auto">
                              {complaint.confirmationCount || 0}
                            </span>
                          </button>
                          <Link
                            href={`/transparency/complaints/${complaint._id}#comments`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs text-blue-700 font-medium transition-colors"
                            title="View or add comments"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Comments</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {municipalityComplaints.length > 6 && (
              <div className="mt-4 text-center">
                <Link
                  href="/complaints"
                  className="text-sm text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1"
                >
                  {t('municipality.viewAll')} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Recent Resolutions — For CITIZEN role */}
        {user?.role === "CITIZEN" && recentResolutions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100 mt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  {t('dashboard.recentResolutions')}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {t('dashboard.recentResolutionsSubtitle')}
                </p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentResolutions.map((complaint) => (
                <Link
                  key={complaint._id}
                  href={`/dashboard/complaints/${complaint._id}`}
                  className="bg-green-50/50 rounded-xl border border-green-100 overflow-hidden hover:shadow-md transition-shadow group"
                >
                  <div className="relative h-28 bg-gradient-to-br from-green-50 to-slate-50">
                    {complaint.media?.[0]?.url ? (
                      <img
                        src={complaint.media[0].url}
                        alt={complaint.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-green-200" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700 shadow-sm">
                        {complaint.status === "CLOSED" ? "CLOSED" : "RESOLVED"}
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="font-semibold text-slate-800 text-sm mb-1 line-clamp-2 group-hover:text-green-700 transition-colors">
                      {complaint.title}
                    </h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">
                        {complaint.location?.address || complaint.municipalityName || "Unknown location"}
                      </span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </DashboardLayout>
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
