"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Sparkles, LogOut, FileText } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { complaintService } from "@/services/complaint.service";
import { Complaint } from "@/types";
import { categoryLabels } from "@/lib/complaints";
import { useLastVisitedPage } from "@/hooks/useLastVisitedPage";
import {
  FilterBar,
  LoadingSpinner,
  EmptyState,
  ComplaintCard,
} from "@/components/ui";

function getRoleDisplayName(role: string): string {
  switch (role) {
    case "CITIZEN": return "Citizen";
    default: return role;
  }
}

function SidebarCitizen({
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
          <div className="sb-sub">Citizen Portal</div>
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
          My Complaints
        </button>
        <Link href="/complaints/new" className="sb-item">
          <span className="sb-ic">
            <Plus className="w-4 h-4" />
          </span>
          Report Issue
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

export default function MyComplaintsPage() {
  const router = useRouter();
  const { user, token, logout, hydrated } = useAuthStore();
  const { isHydrated, saveLastPage, getLastPage, clearLastPage } = useLastVisitedPage();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Persist last-visited page
  useEffect(() => {
    if (isHydrated) saveLastPage("/my-complaints");
  }, [isHydrated, saveLastPage]);

  // Auth guard + redirect to last complaint detail page if applicable
  useEffect(() => {
    if (!hydrated || !isHydrated) return;
    if (!token) { router.push("/"); return; }
    if (user && user.role !== "CITIZEN") { router.push("/dashboard"); return; }

    const lastPage = getLastPage();
    if (lastPage && lastPage !== "/my-complaints" && lastPage.startsWith("/my-complaints/")) {
      clearLastPage();
      router.push(lastPage);
    }
  }, [token, user, router, hydrated, isHydrated, getLastPage, clearLastPage]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  // Fetch complaints
  useEffect(() => {
    const fetchMyComplaints = async () => {
      if (!hydrated || !token || !user || user.role !== "CITIZEN") return;
      try {
        setLoading(true);
        const response = await complaintService.getMyComplaints({
          page: 1,
          limit: 50,
          status: statusFilter || undefined,
        });
        setComplaints(response.complaints ?? []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.toLowerCase().includes("token") || msg.toLowerCase().includes("auth")) {
          await handleLogout();
        }
        setComplaints([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMyComplaints();
  }, [token, user, statusFilter, hydrated]);

  const filteredComplaints = complaints.filter((c) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.description?.toLowerCase().includes(q) ||
      categoryLabels[c.category]?.toLowerCase().includes(q)
    );
  });

  if (!hydrated) return <LoadingSpinner fullScreen />;
  if (!user || user.role !== "CITIZEN") return null;

  return (
    <div className="app">
      <SidebarCitizen user={user} onLogout={handleLogout} />
      <div className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">My Complaints</div>
            <div className="topbar-sub">Your submitted issues and status</div>
          </div>
          <div className="topbar-right">
            <Link
              href="/complaints/new"
              className="tb-btn primary"
            >
              <Plus className="w-4 h-4" />
              New Complaint
            </Link>
          </div>
        </div>

        <main className="page">
          <div className="card" style={{ marginBottom: 16 }}>
            <FilterBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
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
                    : "You haven't submitted any complaints yet."
                }
                action={
                  <Link
                    href="/complaints/new"
                    className="btn primary"
                    style={{ fontSize: 13, marginTop: 8 }}
                  >
                    <Plus className="w-4 h-4" />
                    Submit New Complaint
                  </Link>
                }
              />
            ) : (
              <div className="card" style={{ padding: 16 }}>
                <div className="grid gap-4">
                  {filteredComplaints.map((complaint) => (
                    <ComplaintCard
                      key={complaint._id || complaint.id}
                      complaint={complaint}
                      href={`/my-complaints/${complaint._id || complaint.id}`}
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
