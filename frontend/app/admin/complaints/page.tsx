"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { complaintService } from "@/services/complaint.service";
import { adminService } from "@/services/admin.service";
import { Complaint } from "@/types";
import { categoryLabels, STATUS_OPTIONS } from "@/lib/complaints";
import { TUNISIA_GEOGRAPHY, getMunicipalitiesByGovernorate } from "@/data/tunisia-geography";
import { 
  FileText, Download, Filter, Search, TrendingUp, CheckCircle, 
  Clock, AlertTriangle, BarChart3 
} from "lucide-react";
import {
  PageHeader,
  LoadingSpinner,
  EmptyState,
  ComplaintCard,
  Button,
} from "@/components/ui";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function AdminComplaintsPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [governorateFilter, setGovernorateFilter] = useState<string>("");
  const [municipalityFilter, setMunicipalityFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [availableMunicipalities, setAvailableMunicipalities] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<any>({});
  const [byCategory, setByCategory] = useState<Record<string, number>>({});

  // Update available municipalities when governorate changes
  useEffect(() => {
    if (governorateFilter) {
      setAvailableMunicipalities(getMunicipalitiesByGovernorate(governorateFilter));
    } else {
      setAvailableMunicipalities([]);
    }
    setMunicipalityFilter(""); // Reset municipality when governorate changes
  }, [governorateFilter]);

  useEffect(() => {
    if (!token) router.push("/");
  }, [token, router]);

  useEffect(() => {
    const fetchComplaints = async () => {
      if (!token || !user || user.role !== "ADMIN") return;
      try {
        setLoading(true);
        const response = await complaintService.getAllComplaints({
          page: 1,
          limit: 100,
          status: statusFilter || undefined,
          governorate: governorateFilter || undefined,
          municipality: municipalityFilter || undefined,
          search: searchTerm || undefined,
        });
        if (response.data?.complaints) {
          setComplaints(response.data.complaints);
        }
      } catch (err) {
        console.error("Error fetching complaints:", err);
        setComplaints([]);
      } finally {
        setLoading(false);
      }
    };
    fetchComplaints();
  }, [token, user, statusFilter, governorateFilter, municipalityFilter, searchTerm]);

  // Fetch stats
  const fetchStats = async () => {
    if (!token) return;
    try {
      const statsRes = await adminService.getStats();
      if (statsRes?.data) {
        setStats(statsRes.data as any);
        setByCategory((statsRes.data as any).byCategory || {});
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  useEffect(() => {
    if (token && user?.role === "ADMIN") {
      fetchStats();
    }
  }, [token, user]);

  const filteredComplaints = complaints.filter((c) => {
    if (categoryFilter && c.category !== categoryFilter) return false;
    if (priorityFilter) {
      if (priorityFilter === "HIGH" && (c.priorityScore || 0) < 15) return false;
      if (priorityFilter === "MEDIUM" && ((c.priorityScore || 0) < 6 || (c.priorityScore || 0) >= 15)) return false;
      if (priorityFilter === "LOW" && (c.priorityScore || 0) >= 6) return false;
    }
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.description?.toLowerCase().includes(q) ||
      categoryLabels[c.category]?.toLowerCase().includes(q)
    );
  });

  const exportCSV = () => {
    const headers = ["Reference", "Title", "Category", "Status", "Priority", "Municipality", "Created"];
    const rows = filteredComplaints.map(c => [
      c.referenceId || c._id?.slice(-6),
      c.title?.replace(/,/g, " "),
      categoryLabels[c.category] || c.category,
      c.status,
      (c.priorityScore || 0).toString(),
      c.municipalityName || "",
      new Date(c.createdAt).toLocaleDateString()
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `complaints_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const overdueCount = complaints.filter(c => {
    const daysSinceCreation = (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return ["ASSIGNED", "IN_PROGRESS"].includes(c.status) && daysSinceCreation > 7;
  }).length;
  const atRiskCount = complaints.filter(c => {
    const daysSinceCreation = (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return ["ASSIGNED", "IN_PROGRESS"].includes(c.status) && daysSinceCreation > 4 && daysSinceCreation <= 7;
  }).length;
  const resolvedCount = complaints.filter(c => c.status === "RESOLVED" || c.status === "CLOSED").length;
  const avgDays = complaints.length > 0 
    ? Math.round(complaints.reduce((acc, c) => {
        const days = (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return acc + days;
      }, 0) / complaints.length * 10) / 10
    : 0;
  const resolutionRate = complaints.length > 0 
    ? Math.round((resolvedCount / complaints.length) * 100) 
    : 0;

  // Get categories count
  const categoryCount: Record<string, number> = {};
  filteredComplaints.forEach(c => {
    const cat = categoryLabels[c.category] || c.category || "Other";
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });

  if (!user || user.role !== "ADMIN") return null;

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-slate-50/50">
      <PageHeader
        title="All Complaints"
        subtitle="System-wide complaint overview"
        backHref="/dashboard"
        rightContent={
          <span className="px-3 py-1 bg-white/20 text-white rounded-full text-sm font-medium">
            {filteredComplaints.length} complaints
          </span>
        }
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards - Clickable Quick Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setStatusFilter("")}
            className={`bg-white rounded-2xl shadow-lg p-5 border transition-all text-left ${!statusFilter ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200 hover:border-slate-300'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Complaints</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{stats.total || complaints.length}</p>
              </div>
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </button>
          
          <button
            onClick={() => setStatusFilter("RESOLVED")}
            className={`bg-white rounded-2xl shadow-lg p-5 border transition-all text-left ${statusFilter === 'RESOLVED' ? 'border-green-500 ring-2 ring-green-200' : 'border-slate-200 hover:border-green-300'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Resolved</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.resolved || resolvedCount}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </button>
          
          <button
            onClick={() => setStatusFilter("IN_PROGRESS")}
            className={`bg-white rounded-2xl shadow-lg p-5 border transition-all text-left ${statusFilter === 'IN_PROGRESS' ? 'border-amber-500 ring-2 ring-amber-200' : 'border-slate-200 hover:border-amber-300'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">At Risk (SLA)</p>
                <p className="text-xs text-amber-500 mt-1">Close to deadline</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{stats.totalAtRisk || atRiskCount}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </button>
          
          <button
            onClick={() => setStatusFilter("ASSIGNED")}
            className={`bg-white rounded-2xl shadow-lg p-5 border transition-all text-left ${statusFilter === 'ASSIGNED' ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 hover:border-red-300'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Overdue</p>
                <p className="text-xs text-red-500 mt-1">Past deadline</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.totalOverdue || overdueCount}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </button>
        </div>

        {/* Team Performance */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Team Performance</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <p className="text-2xl font-bold text-blue-600">{complaints.filter(c => c.status === "IN_PROGRESS").length}</p>
              <p className="text-xs text-slate-500 mt-1">In Progress</p>
              <p className="text-[10px] text-blue-400">Currently being worked on</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-xl">
              <p className="text-2xl font-bold text-purple-600">{avgDays}</p>
              <p className="text-xs text-slate-500 mt-1">Average Days</p>
              <p className="text-[10px] text-purple-400">Time to process</p>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-xl">
              <p className="text-2xl font-bold text-emerald-600">{resolutionRate}%</p>
              <p className="text-xs text-slate-500 mt-1">Resolution Rate</p>
              <p className="text-[10px] text-emerald-400">Percentage resolved</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-xl">
              <p className="text-2xl font-bold text-orange-600">{complaints.filter(c => (c.priorityScore || 0) >= 15).length}</p>
              <p className="text-xs text-slate-500 mt-1">High Priority</p>
              <p className="text-[10px] text-orange-400">Urgent issues (score 15+)</p>
            </div>
          </div>
          
          {/* Categories */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-sm text-slate-600 mb-2">Categories:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(categoryCount).slice(0, 5).map(([cat, count]) => (
                <span key={cat} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                  {categoryLabels[cat] || cat}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 border border-slate-100">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            {/* Search */}
            <div className="flex-1 w-full relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by description or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/50"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm border rounded-xl transition-all ${showFilters ? 'bg-primary/5 border-primary text-primary' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
            >
              <Filter className="w-4 h-4" />
              Filters {(governorateFilter || municipalityFilter || categoryFilter || priorityFilter || statusFilter) && (
                <span className="w-2 h-2 bg-primary rounded-full" />
              )}
            </button>

            {/* Export Button */}
            <Button onClick={exportCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              CSV
            </Button>

            <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary whitespace-nowrap">
              {filteredComplaints.length} results
            </span>
          </div>

          {/* Collapsible Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-100 animate-fadeIn">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                value={governorateFilter}
                onChange={(e) => setGovernorateFilter(e.target.value)}
                className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              >
                <option value="">All Governorates</option>
                {TUNISIA_GEOGRAPHY.map((gov) => (
                  <option key={gov.governorate} value={gov.governorate}>
                    {gov.governorate}
                  </option>
                ))}
              </select>

              <select
                value={municipalityFilter}
                onChange={(e) => setMunicipalityFilter(e.target.value)}
                className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                disabled={!governorateFilter}
              >
                <option value="">All Municipalities</option>
                {availableMunicipalities.map((mun) => (
                  <option key={mun} value={mun}>
                    {mun}
                  </option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              >
                <option value="">All Categories</option>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              >
                <option value="">All Priorities</option>
                <option value="HIGH">High (≥15)</option>
                <option value="MEDIUM">Medium (6-14)</option>
                <option value="LOW">Low (&lt;6)</option>
              </select>
            </div>
          )}
        </div>

        {/* SLA Monitoring Section */}
        {overdueCount > 0 || atRiskCount > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">SLA Monitoring (Service Level Agreement)</h3>
            <div className="flex gap-4">
              {overdueCount > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-xl border border-red-200">
                  <span className="text-red-600 font-bold">{overdueCount}</span>
                  <span className="text-sm text-red-700">Overdue (Past deadline)</span>
                </div>
              )}
              {atRiskCount > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-amber-600 font-bold">{atRiskCount}</span>
                  <span className="text-sm text-amber-700">At Risk (Close to deadline)</span>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {loading && <LoadingSpinner />}

        {!loading && (
          filteredComplaints.length === 0 ? (
            <EmptyState
              message={
                searchTerm || statusFilter || governorateFilter || municipalityFilter
                  ? "Try adjusting your search or filters."
                  : "No complaints have been submitted yet."
              }
            />
          ) : (
            <div className="grid gap-4">
              {filteredComplaints.map((complaint) => (
                <ComplaintCard
                  key={complaint._id || complaint.id}
                  complaint={complaint}
                  href={`/dashboard/complaints/${complaint._id || complaint.id}?from=admin`}
                  showCitizen
                  showDepartment
                  showMunicipality
                />
              ))}
            </div>
          )
        )}
      </main>
    </div>
    </DashboardLayout>
  );
}
