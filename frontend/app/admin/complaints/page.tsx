"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { complaintService } from "@/services/complaint.service";
import { Complaint } from "@/types";
import { categoryLabels, STATUS_OPTIONS } from "@/lib/complaints";
import { TUNISIA_GEOGRAPHY, getMunicipalitiesByGovernorate } from "@/data/tunisia-geography";
import {
  LoadingSpinner,
  EmptyState,
  ComplaintCard,
} from "@/components/ui";
import { Sparkles, LogOut, FileText } from "lucide-react";

function getRoleDisplayName(role: string): string {
  switch (role) {
    case "CITIZEN": return "Citizen";
    case "MUNICIPAL_AGENT": return "Municipal Agent";
    case "DEPARTMENT_MANAGER": return "Department Manager";
    case "TECHNICIAN": return "Technician";
    case "ADMIN": return "Administrator";
    default: return role;
  }
}

function Sidebar({
  user,
  onLogout,
}: {
  user: { fullName: string; role: string };
  onLogout: () => Promise<void>;
}) {
  return (
    <aside className="sidebar">
      <div className="sb-logo">
        <div className="sb-icon">
          <Sparkles className="w-5 h-5 text-[var(--green)]" />
        </div>
        <div>
          <div className="sb-name">Smart City{`\n`}Tunisia</div>
          <div className="sb-sub">Admin Panel</div>
        </div>
      </div>
      <div className="sb-user">
        <Link href="/profile" className="sb-user-link">
          <div className="sb-avt">{user.fullName.charAt(0).toUpperCase()}</div>
          <div className="sb-uname">{user.fullName}</div>
          <span className="sb-urole">{getRoleDisplayName(user.role)}</span>
        </Link>
      </div>
      <div className="sb-nav">
        <div className="sb-section">Navigation</div>
        <Link href="/dashboard" className="sb-item">
          <span className="sb-ic">
            <FileText className="w-4 h-4" />
          </span>
          Dashboard
        </Link>
        <button className="sb-item active" type="button">
          <span className="sb-ic">
            <FileText className="w-4 h-4" />
          </span>
          Complaints
        </button>
        <Link href="/admin/users" className="sb-item">
          <span className="sb-ic">
            <FileText className="w-4 h-4" />
          </span>
          Users
        </Link>
        <Link href="/archive" className="sb-item">
          <span className="sb-ic">
            <FileText className="w-4 h-4" />
          </span>
          Archives
        </Link>
      </div>
      <div className="sb-footer">
        <button className="sb-logout" type="button" onClick={onLogout}>
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

export default function AdminComplaintsPage() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [governorateFilter, setGovernorateFilter] = useState<string>("");
  const [municipalityFilter, setMunicipalityFilter] = useState<string>("");
  const [showArchived, setShowArchived] = useState<boolean>(false);
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
          includeArchived: showArchived || undefined,
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
  }, [token, user, statusFilter, governorateFilter, municipalityFilter, showArchived, searchTerm]);

  const filteredComplaints = complaints.filter((c) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.description?.toLowerCase().includes(q) ||
      categoryLabels[c.category]?.toLowerCase().includes(q)
    );
  });

  if (!user || user.role !== "ADMIN") return null;

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="app">
      <Sidebar user={user} onLogout={handleLogout} />
      <div className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">All Complaints</div>
            <div className="topbar-sub">System-wide complaint overview</div>
          </div>
          <div className="topbar-right">
            <span className="badge" style={{ background: "var(--bg3)", color: "var(--txt2)" }}>
              {filteredComplaints.length} complaints
            </span>
          </div>
        </div>

        <main className="page">
          {/* Advanced Filters in SmartCity card */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="flex flex-col md:flex-row gap-3 items-center">
              <div className="flex-1 w-full relative">
                <input
                  type="text"
                  placeholder="Search by description or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/50"
                />
              </div>

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

              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                />
                Show Archived
              </label>
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
              <div className="card" style={{ padding: 16 }}>
                <div className="grid gap-4">
                  {filteredComplaints.map((complaint) => (
                    <ComplaintCard
                      key={complaint._id || complaint.id}
                      complaint={complaint}
                      href={`/dashboard/complaints/${complaint._id || complaint.id}`}
                      showCitizen
                      showDepartment
                      showMunicipality
                    />
                  ))}
                </div>
              </div>
            )
          )}
        </main>
      </div>
    </div>
  );
}
