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
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.description?.toLowerCase().includes(q) ||
      categoryLabels[c.category]?.toLowerCase().includes(q)
    );
  });

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

            {/* Results Count */}
            <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary whitespace-nowrap">
              {filteredComplaints.length} results
            </span>
          </div>
        </div>

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
