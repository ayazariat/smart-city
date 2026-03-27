"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { complaintService } from "@/services/complaint.service";
import { Complaint } from "@/types";
import { categoryLabels, STATUS_OPTIONS } from "@/lib/complaints";
import { TUNISIA_GEOGRAPHY, getMunicipalitiesByGovernorate } from "@/data/tunisia-geography";
import {
  PageHeader,
  LoadingSpinner,
  EmptyState,
  ComplaintCard,
  Button,
} from "@/components/ui";

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

  if (!user || user.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
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
        {/* Advanced Filters */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 border border-slate-100">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            {/* Search */}
            <div className="flex-1 w-full relative">
              <input
                type="text"
                placeholder="Search by description or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/50"
              />
            </div>

            {/* Status Filter */}
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

            {/* Governorate Filter */}
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

            {/* Municipality Filter */}
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

            {/* Category Filter */}
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

            {/* Priority Filter */}
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

            {/* Export Button */}
            <Button onClick={exportCSV} variant="outline" size="sm">
              Export CSV
            </Button>

            {/* Results Count */}
            <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary whitespace-nowrap">
              {filteredComplaints.length} results
            </span>
          </div>
        </div>

        {/* SLA Monitoring Section */}
        {overdueCount > 0 || atRiskCount > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">SLA Monitoring</h3>
            <div className="flex gap-4">
              {overdueCount > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-xl border border-red-200">
                  <span className="text-red-600 font-bold">{overdueCount}</span>
                  <span className="text-sm text-red-700">Overdue</span>
                </div>
              )}
              {atRiskCount > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-amber-600 font-bold">{atRiskCount}</span>
                  <span className="text-sm text-amber-700">At Risk</span>
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
  );
}
