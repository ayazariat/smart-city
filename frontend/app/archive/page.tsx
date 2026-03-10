"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  Search,
  Filter,
  Loader2,
  Eye,
  ArrowLeft,
  Sparkles,
  LogOut,
} from "lucide-react";
import { ComplaintCard } from "@/components/ui/ComplaintCard";
import { Button } from "@/components/ui/Button";
import { complaintService } from "@/services/complaint.service";
import { useAuthStore } from "@/store/useAuthStore";
import { Complaint } from "@/types";

// Get role display name
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

// Sidebar component
function Sidebar({
  user,
  onLogout,
}: {
  user: { fullName: string; role: string };
  onLogout: () => Promise<void>;
}) {
  const navItems: { href: string; label: string }[] = (() => {
    switch (user.role) {
      case "CITIZEN":
        return [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/my-complaints", label: "My Complaints" },
          { href: "/complaints/new", label: "Report Issue" },
          { href: "/archive", label: "Archives" },
        ];
      case "MUNICIPAL_AGENT":
        return [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/agent/complaints", label: "Complaints" },
          { href: "/archive", label: "Archives" },
        ];
      case "TECHNICIAN":
        return [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/technician", label: "My Tasks" },
          { href: "/archive", label: "Archives" },
        ];
      case "DEPARTMENT_MANAGER":
        return [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/manager/pending", label: "Pending Approvals" },
          { href: "/archive", label: "Archives" },
        ];
      case "ADMIN":
        return [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/admin/complaints", label: "Complaints" },
          { href: "/admin/users", label: "Users" },
          { href: "/archive", label: "Archives" },
        ];
      default:
        return [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/archive", label: "Archives" },
        ];
    }
  })();

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
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sb-item ${item.href === "/archive" ? "active" : ""}`}
          >
            <span className="sb-ic">
              <Archive className="w-4 h-4" />
            </span>
            {item.label}
          </Link>
        ))}
      </div>

      <div className="sb-footer">
        <button className="sb-logout" onClick={onLogout}>
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

export default function ArchivePage() {
  const router = useRouter();
  const { user, token, hydrated, logout } = useAuthStore();
  
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  // Fetch archived complaints
  useEffect(() => {
    const fetchArchived = async () => {
      if (!token) return;
      
      try {
        setLoading(true);
        const response = await complaintService.getMyComplaints({
          status: "ARCHIVED"
        });
        setComplaints(response.complaints || []);
      } catch (err) {
        console.error("Error fetching archived complaints:", err);
        setError("Failed to load archived complaints");
      } finally {
        setLoading(false);
      }
    };

    if (hydrated && token) {
      fetchArchived();
    }
  }, [token, hydrated]);

  // Filter complaints
  const filteredComplaints = complaints.filter((complaint) => {
    const matchesSearch = !searchTerm || 
      complaint.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !categoryFilter || complaint.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  if (!hydrated) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user || !token) {
    router.push("/");
    return null;
  }

  return (
    <div className="app">
      <Sidebar user={user} onLogout={handleLogout} />
      <div className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Archived Complaints</div>
            <div className="topbar-sub">Closed complaints history</div>
          </div>
          <div className="topbar-right">
            <span className="badge" style={{ background: "var(--bg3)", color: "var(--txt2)" }}>
              {filteredComplaints.length} archived
            </span>
          </div>
        </div>

        <main className="page">
          {/* Search and Filters */}
          <div className="card mb-4">
            <div className="filter-row">
              {/* Search */}
              <div className="filter-search">
                <Search className="filter-icon" />
                <input
                  type="text"
                  placeholder="Search archived complaints..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="filter-input"
                />
              </div>
              
              {/* Category Filter */}
              <div className="filter-select-wrapper">
                <Filter className="filter-icon" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Categories</option>
                  <option value="ROAD">Roads</option>
                  <option value="LIGHTING">Lighting</option>
                  <option value="WASTE">Waste</option>
                  <option value="WATER">Water</option>
                  <option value="SAFETY">Safety</option>
                  <option value="PUBLIC_PROPERTY">Public Property</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          </div>

        {/* Loading State */}
        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <span className="loading-text">Loading archived complaints...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredComplaints.length === 0 && (
          <div className="empty-state">
            <Archive className="empty-state-icon" />
            <h3 className="empty-state-title">
              {searchTerm || categoryFilter ? "No results found" : "No archived complaints"}
            </h3>
            <p className="empty-state-text mb-6">
              {searchTerm || categoryFilter 
                ? "Try adjusting your search or filters"
                : "Complaints that have been closed for more than 30 days will appear here"}
            </p>
            <Button variant="primary" onClick={() => router.push("/my-complaints")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Complaints
            </Button>
          </div>
        )}

        {/* Complaints List */}
        {!loading && !error && filteredComplaints.length > 0 && (
          <div className="grid gap-4">
            {filteredComplaints.map((complaint, index) => (
              <div
                key={complaint._id || complaint.id}
                className="animate-fadeIn"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ComplaintCard
                  complaint={complaint}
                  href={`/my-complaints/${complaint._id || complaint.id}`}
                  showMunicipality
                  showPriority
                  actions={
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => router.push(`/my-complaints/${complaint._id || complaint.id}`)}
                        className="btn-link"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                    </div>
                  }
                />
              </div>
            ))}
          </div>
        )}
        </main>
      </div>
    </div>
  );
}
