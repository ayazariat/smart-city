"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { complaintService } from "@/services/complaint.service";
import { Complaint } from "@/types";
import { categoryLabels } from "@/lib/complaints";
import {
  FilterBar,
  LoadingSpinner,
  EmptyState,
  ComplaintCard,
} from "@/components/ui";
import { Sparkles, LogOut, FileText } from "lucide-react";

const ALLOWED_ROLES = ["MUNICIPAL_AGENT", "DEPARTMENT_MANAGER", "ADMIN", "TECHNICIAN"] as const;

// Simple role label helper
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

// Reuse the SmartCity sidebar for dashboard area
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
          <div className="sb-sub">Urban Services</div>
        </div>
      </div>

      <div className="sb-user">
        <Link href="/profile" className="sb-user-link">
          <div className="sb-avt">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
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

export default function DashboardComplaintsPage() {
  const router = useRouter();
  const { user, token, hydrated, logout } = useAuthStore();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [view, setView] = useState<"list" | "map" | "split">("list");

  // Guard: redirect if not authorised
  useEffect(() => {
    if (!hydrated) return;
    if (!token) { router.push("/"); return; }
    if (user && !ALLOWED_ROLES.includes(user.role as typeof ALLOWED_ROLES[number])) {
      router.push("/dashboard");
    }
  }, [token, user, router, hydrated]);

  useEffect(() => {
    const fetchComplaints = async () => {
      if (!hydrated || !token || !user) return;
      if (!ALLOWED_ROLES.includes(user.role as typeof ALLOWED_ROLES[number])) return;

      try {
        setLoading(true);
        const response = await complaintService.getAllComplaints({ page: 1, limit: 50 });
        setComplaints(response.data?.complaints ?? []);
      } catch (err) {
        console.error("Error fetching complaints:", err);
        setComplaints([]);
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, [token, user, hydrated]);

  const filteredComplaints = complaints.filter((c) => {
    // Apply status filter
    if (statusFilter && c.status !== statusFilter) return false;
    
    // Apply search filter
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.description?.toLowerCase().includes(q) ||
      categoryLabels[c.category]?.toLowerCase().includes(q) ||
      c._id?.includes(searchTerm)
    );
  });

  if (!hydrated) return <LoadingSpinner fullScreen />;
  if (!user) return null;

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
            <div className="topbar-title">Complaints</div>
            <div className="topbar-sub">
              {getRoleDisplayName(user.role)} · Management view
            </div>
          </div>
          <div className="topbar-right">
            <div className="vtoggle">
              <button
                className={`vt ${view === "list" ? "on" : ""}`}
                onClick={() => setView("list")}
              >
                List
              </button>
              <button
                className={`vt ${view === "map" ? "on" : ""}`}
                onClick={() => setView("map")}
              >
                Map
              </button>
              <button
                className={`vt ${view === "split" ? "on" : ""}`}
                onClick={() => setView("split")}
              >
                Split
              </button>
            </div>
            <span className="badge" style={{ background: "var(--bg3)", color: "var(--txt2)" }}>
              {filteredComplaints.length} complaints
            </span>
          </div>
        </div>

        <main className="page">
          <div className="card" style={{ marginBottom: 12 }}>
            <FilterBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              searchPlaceholder="Search by description, category or ID…"
              count={filteredComplaints.length}
            />
          </div>

          {loading && <LoadingSpinner />}

          {!loading && (
            filteredComplaints.length === 0 ? (
              <EmptyState
                message={
                  searchTerm || statusFilter
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
