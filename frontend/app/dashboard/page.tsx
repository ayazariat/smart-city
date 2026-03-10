"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogOut, FileText, Plus, Sparkles, Shield, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

// Lightweight mock data + status config to reproduce SmartCity dashboard widgets
type MapComplaint = {
  id: string;
  cat: "EAU" | "ROUTES" | "ECLAIRAGE" | "DECHETS" | "SECURITE" | "BIENS_PUBLICS";
  status: "SUBMITTED" | "VALIDATED" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "REJECTED";
  title: string;
  loc: string;
  score: number;
  date: string;
  urg: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  lat: number;
  lng: number;
  dept?: string | null;
};

const ST: Record<
  MapComplaint["status"],
  { l: string; bg: string; c: string; bc: string }
> = {
  SUBMITTED: { l: "Submitted", bg: "var(--bluebg)", c: "var(--blue)", bc: "var(--bluebdr)" },
  VALIDATED: { l: "Validated", bg: "var(--accentbg)", c: "var(--green3)", bc: "var(--accentbdr)" },
  ASSIGNED: { l: "Assigned", bg: "var(--purbg)", c: "var(--purple)", bc: "var(--purbdr)" },
  IN_PROGRESS: { l: "In Progress", bg: "var(--orgbg)", c: "var(--orange)", bc: "var(--orgbdr)" },
  RESOLVED: { l: "Resolved", bg: "var(--telbg)", c: "var(--teal)", bc: "var(--telbdr)" },
  CLOSED: { l: "Closed", bg: "var(--accentbg2)", c: "var(--green)", bc: "var(--accentbdr)" },
  REJECTED: { l: "Rejected", bg: "var(--redbg)", c: "var(--red)", bc: "var(--redbdr)" },
};

const DASH_MOCK_COMPLAINTS: MapComplaint[] = [
  {
    id: "RC-A3F2E1",
    cat: "EAU",
    status: "IN_PROGRESS",
    title: "Water main leak causing road flooding near central pharmacy",
    loc: "Beni Khiar, Nabeul",
    score: 85,
    date: "Mar 5",
    urg: "HIGH",
    lat: 55,
    lng: 48,
    dept: "Infrastructure",
  },
  {
    id: "RC-B9D4C7",
    cat: "ROUTES",
    status: "SUBMITTED",
    title: "Large pothole on Avenue Habib Bourguiba damaging vehicles",
    loc: "Tunis Centre",
    score: 92,
    date: "Mar 4",
    urg: "CRITICAL",
    lat: 35,
    lng: 68,
    dept: null,
  },
  {
    id: "RC-C1E8F5",
    cat: "ECLAIRAGE",
    status: "VALIDATED",
    title: "Street lamps non-functional for 5 days — safety hazard at night",
    loc: "La Marsa",
    score: 68,
    date: "Mar 3",
    urg: "MEDIUM",
    lat: 72,
    lng: 30,
    dept: null,
  },
  {
    id: "RC-D5A2B0",
    cat: "DECHETS",
    status: "ASSIGNED",
    title: "Overflowing garbage bins near central market spreading odors",
    loc: "Sfax Medina",
    score: 74,
    date: "Mar 3",
    urg: "HIGH",
    lat: 28,
    lng: 55,
    dept: "Sanitation",
  },
];

function CityMap({
  complaints,
  selected,
  onSelect,
  height = 280,
}: {
  complaints: MapComplaint[];
  selected: MapComplaint | null;
  onSelect: (c: MapComplaint) => void;
  height?: number;
}) {
  const [mode, setMode] = useState<"all" | "submitted" | "in_progress" | "resolved">("all");

  const filtered =
    mode === "all"
      ? complaints
      : complaints.filter((c) =>
        c.status.toLowerCase().includes(mode.replace("_", ""))
      );

  const catColors: Record<MapComplaint["cat"], string> = {
    ROUTES: "#1565C0",
    DECHETS: "#795548",
    EAU: "#0288D1",
    ECLAIRAGE: "#F9A825",
    SECURITE: "#B71C1C",
    BIENS_PUBLICS: "#2E7D32",
  };

  return (
    <div className="map-container" style={{ height }}>
      <div className="map-inner" style={{ height: "100%" }}>
        <div className="map-grid-lines" />

        {/* roads background */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0.25,
          }}
        >
          <line x1="0" y1="40%" x2="100%" y2="38%" stroke="#1B5E20" strokeWidth="3" />
          <line x1="0" y1="65%" x2="100%" y2="62%" stroke="#1B5E20" strokeWidth="2" />
          <line x1="30%" y1="0" x2="32%" y2="100%" stroke="#1B5E20" strokeWidth="3" />
          <line x1="70%" y1="0" x2="68%" y2="100%" stroke="#1B5E20" strokeWidth="2" />
          <line
            x1="0"
            y1="20%"
            x2="100%"
            y2="22%"
            stroke="#1B5E20"
            strokeWidth="1"
            strokeDasharray="6,4"
          />
          <line
            x1="50%"
            y1="0"
            x2="50%"
            y2="100%"
            stroke="#1B5E20"
            strokeWidth="1"
            strokeDasharray="6,4"
          />
        </svg>

        {/* mode filter */}
        <div className="map-topbar">
          {[
            ["all", "All"],
            ["submitted", "Pending"],
            ["in_progress", "Active"],
            ["resolved", "Resolved"],
          ].map(([k, label]) => (
            <button
              key={k}
              className={`map-btn ${mode === k ? "on" : ""}`}
              type="button"
              onClick={() => setMode(k as "all" | "submitted" | "in_progress" | "resolved")}
            >
              {label}
            </button>
          ))}
        </div>

        {/* small stats */}
        <div className="map-stats">
          {[
            {
              n: complaints.filter((c) => c.status === "SUBMITTED").length,
              l: "Pending",
              c: "var(--blue)",
            },
            {
              n: complaints.filter((c) => c.status === "IN_PROGRESS").length,
              l: "Active",
              c: "var(--orange)",
            },
            {
              n: complaints.filter((c) =>
                ["RESOLVED", "CLOSED"].includes(c.status)
              ).length,
              l: "Resolved",
              c: "var(--green3)",
            },
          ].map((s, i) => (
            <div key={i} className="ms">
              <div className="ms-n" style={{ color: s.c }}>
                {s.n}
              </div>
              <div className="ms-l">{s.l}</div>
            </div>
          ))}
        </div>

        {/* markers */}
        {filtered.map((c) => {
          const cfg = ST[c.status];
          const col = catColors[c.cat];
          const isSelected = selected?.id === c.id;
          return (
            <div
              key={c.id}
              className="mk"
              style={{
                left: `${c.lng}%`,
                top: `${c.lat}%`,
                zIndex: isSelected ? 20 : 5,
              }}
              onClick={() => onSelect(c)}
            >
              <div
                className="mk-pin"
                style={{
                  background: cfg.c,
                  transform: `rotate(-45deg) scale(${isSelected ? 1.3 : 1})`,
                  boxShadow: isSelected
                    ? `0 4px 16px ${cfg.c}60`
                    : undefined,
                  transition: "all .2s cubic-bezier(.34,1.56,.64,1)",
                }}
              >
                <div
                  className="mk-ic"
                  style={{
                    fontSize: 10,
                    color: "#fff",
                    fontWeight: 800,
                  }}
                >
                  {c.urg === "CRITICAL" ? "!" : c.cat[0]}
                </div>
              </div>
              <div className="mk-label">
                {c.id} — {c.urg}
              </div>
            </div>
          );
        })}

        {/* legend */}
        <div className="map-legend">
          <div className="legend-title">Status</div>
          {[
            ["SUBMITTED", "var(--blue)"],
            ["IN_PROGRESS", "var(--orange)"],
            ["RESOLVED", "var(--teal)"],
            ["REJECTED", "var(--red)"],
          ].map(([s, c]) => (
            <div key={s} className="legend-item">
              <div
                className="legend-dot"
                style={{ background: c, borderColor: c }}
              />
              {ST[s as MapComplaint["status"]]?.l || s}
            </div>
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            fontSize: 9,
            color: "var(--txt3)",
          }}
        >
          © OpenStreetMap contributors
        </div>
      </div>
    </div>
  );
}

// Helper function to get role display name
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

// Sidebar component - defined outside to avoid recreating on each render
function Sidebar({
  user,
  onLogout,
}: {
  user: {
    fullName: string;
    role: string;
    email?: string;
    municipalityName?: string;
    municipality?: { name?: string } | null;
    governorate?: string;
  };
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
          { href: "/agent/complaints", label: "Complaints" },
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
            className={`sb-item ${item.href === "/dashboard" ? "active" : ""
              }`}
          >
            <span className="sb-ic">
              <FileText className="w-4 h-4" />
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

// Separate component that uses useSearchParams
function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, logout, fetchProfile, setUserAndTokens } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(false);

  // Handle magic link verification callback
  useEffect(() => {
    const handleVerification = async () => {
      const verified = searchParams.get("verified");
      const urlToken = searchParams.get("token");
      const urlRefreshToken = searchParams.get("refreshToken");

      if (verified === "true" && urlToken && urlRefreshToken) {
        setIsVerifying(true);
        // Store tokens from magic link verification
        setUserAndTokens({
          user: null,
          token: urlToken,
          refreshToken: urlRefreshToken,
        });

        // Fetch user profile
        try {
          await fetchProfile();
        } catch (error) {
          console.error("Failed to fetch profile after verification:", error);
        }

        setIsVerifying(false);

        // Clean up URL
        router.replace("/dashboard");
      }
    };

    handleVerification();
  }, [searchParams, router, fetchProfile]);

  // Redirect if not logged in (client-side check)
  useEffect(() => {
    if (!token && !isVerifying) {
      router.push("/");
    }
  }, [token, isVerifying, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  // State for map selection - must be declared before any early returns
  const [selectedOnMap, setSelectedOnMap] = useState<MapComplaint | null>(null);

  if (isVerifying || (!user && token)) {
    return (
      <div className="app" style={{ height: "100vh" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          background: "var(--bg)"
        }}>
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px"
          }}>
            <div style={{
              width: "48px",
              height: "48px",
              border: "4px solid var(--green)",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }} />
            <p style={{ color: "var(--txt2)", fontSize: "14px", fontFamily: "'Sora', sans-serif" }}>Verifying your account...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app" style={{ height: "100vh" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          background: "var(--bg)"
        }}>
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px"
          }}>
            <div style={{
              width: "48px",
              height: "48px",
              border: "4px solid var(--green)",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }} />
            <p style={{ color: "var(--txt2)", fontSize: "14px", fontFamily: "'Sora', sans-serif" }}>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

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
          link: "/agent/complaints",
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

  const municipalityLabel =
    user?.municipalityName ||
    user?.municipality?.name ||
    user?.governorate ||
    "All Municipalities";

  // Simple stats configuration mirroring SmartCity_Web_v3 visual design
  const stats = (() => {
    switch (user.role) {
      case "CITIZEN":
        return [
          { n: 3, label: "My Reports", color: "var(--blue)" },
          { n: 1, label: "In Progress", color: "var(--orange)" },
          { n: 1, label: "Resolved", color: "var(--green3)" },
          { n: 0, label: "Rejected", color: "var(--red)" },
        ];
      case "MUNICIPAL_AGENT":
        return [
          { n: 8, label: "Awaiting Review", color: "var(--orange)" },
          { n: 34, label: "This Week", color: "var(--blue)" },
          { n: 127, label: "Total Done", color: "var(--green3)" },
          { n: 2, label: "SLA Overdue", color: "var(--red)" },
        ];
      case "TECHNICIAN":
        return [
          { n: 5, label: "Active Tasks", color: "var(--orange)" },
          { n: 2, label: "In Progress", color: "var(--blue)" },
          { n: 3, label: "Done Today", color: "var(--green3)" },
          { n: 1, label: "SLA At Risk", color: "var(--red)" },
        ];
      case "DEPARTMENT_MANAGER":
        return [
          { n: 89, label: "Total Active", color: "var(--blue)" },
          { n: 74, label: "Resolution %", color: "var(--green3)" },
          { n: 36, label: "Avg TMA (h)", color: "var(--orange)" },
          { n: 4, label: "SLA Overdue", color: "var(--red)" },
        ];
      case "ADMIN":
        return [
          { n: 264, label: "Municipalities", color: "var(--purple)" },
          { n: 1842, label: "Total Complaints", color: "var(--blue)" },
          { n: 73, label: "Resolution %", color: "var(--green3)" },
          { n: 12, label: "Active Agents", color: "var(--orange)" },
        ];
      default:
        return [
          { n: 0, label: "My Complaints", color: "var(--blue)" },
          { n: 0, label: "In Progress", color: "var(--orange)" },
          { n: 0, label: "Resolved", color: "var(--green3)" },
          { n: 0, label: "Urgent", color: "var(--red)" },
        ];
    }
  })();

  return (
    <div className="app">
      <Sidebar user={user} onLogout={handleLogout} />
      <div className="main">
        {/* Topbar identical to SmartCity_Web_v3 style */}
        <div className="topbar">
          <div>
            <div className="topbar-title">Dashboard</div>
            <div className="topbar-sub">
              {municipalityLabel === "All Municipalities"
                ? "All Municipalities"
                : `${municipalityLabel} Municipality`}
            </div>
          </div>
          <div className="search-wrap" style={{ marginLeft: 20 }}>
            <span className="search-ic">
              {/* simple search icon using DM font style */}
              <span style={{ fontSize: 12 }}>🔍</span>
            </span>
            <input
              className="search-inp"
              placeholder="Search complaints, IDs, locations..."
              disabled
            />
          </div>
          <div className="topbar-right">
            <div style={{ position: "relative" }}>
              <div className="tb-icon">
                <span>{/* bell icon */}🔔</span>
                <span className="tb-dot" />
              </div>
            </div>
            {user.role === "CITIZEN" && (
              <Link href="/complaints/new">
                <button className="tb-btn primary" type="button">
                  <Plus className="w-4 h-4" />
                  New Complaint
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Main dashboard content copied from SmartCity_Web_v3 layout */}
        <main className="page">
          {/* Welcome banner */}
          <div
            className="au"
            style={{
              background:
                "linear-gradient(135deg, var(--green) 0%, var(--green2) 100%)",
              borderRadius: "var(--r2)",
              padding: "22px 26px",
              marginBottom: 20,
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 4px 24px rgba(27,94,32,.2)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -30,
                right: -30,
                width: 160,
                height: 160,
                borderRadius: "50%",
                background: "rgba(255,255,255,.04)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -40,
                right: 60,
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: "rgba(0,200,83,.08)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,.6)",
                marginBottom: 4,
                fontWeight: 500,
              }}
            >
              Welcome back
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "-0.5px",
                marginBottom: 6,
              }}
            >
              {user.fullName}
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 12px",
                background: "rgba(255,255,255,.12)",
                borderRadius: 20,
                color: "rgba(255,255,255,.9)",
                fontSize: 11,
                fontWeight: 700,
                border: "1px solid rgba(255,255,255,.15)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--accent)",
                }}
              />
              {getRoleDisplayName(user.role)} · {municipalityLabel}
            </span>
          </div>

          {/* Stats cards in SmartCity grid4 layout */}
          <div className="grid4" style={{ marginBottom: 20 }}>
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="stat-card au"
                style={{
                  animationDelay: `${i * 55}ms`,
                  borderTopColor: s.color,
                }}
              >
                <div className="stat-n" style={{ color: s.color }}>
                  {s.n}
                </div>
                <div className="stat-l">{s.label}</div>
              </div>
            ))}
          </div>

          {/* City overview map */}
          <div style={{ marginBottom: 20 }}>
            <div className="sec-hdr">
              <div>
                <div className="sec-title">City Overview Map</div>
                <div className="sec-sub">
                  Live complaint locations — click a marker for details
                </div>
              </div>
              <Link href="/dashboard/complaints" className="sec-link">
                Full map →
              </Link>
            </div>
            <CityMap
              complaints={DASH_MOCK_COMPLAINTS}
              selected={selectedOnMap}
              onSelect={setSelectedOnMap}
              height={280}
            />
          </div>

          {/* Recent complaints mock list */}
          <div className="sec-hdr" style={{ marginBottom: 8 }}>
            <div className="sec-title">Recent Complaints</div>
          </div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {DASH_MOCK_COMPLAINTS.slice(0, 4).map((c, i) => {
              const statusCfg = ST[c.status];
              return (
                <div
                  key={c.id}
                  className="cr au"
                  style={{ animationDelay: `${200 + i * 55}ms` }}
                >
                  <div className="cr-left">
                    <div className="cr-top">
                      <span className="cr-id">{c.id}</span>
                      <span
                        className="badge"
                        style={{
                          background: statusCfg.bg,
                          color: statusCfg.c,
                          borderColor: statusCfg.bc,
                        }}
                      >
                        {statusCfg.l}
                      </span>
                    </div>
                    <div className="cr-title">{c.title}</div>
                    <div className="cr-meta">
                      <span className="cr-meta-ic">{c.loc}</span>
                      <span className="cr-meta-ic">{c.date}</span>
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: "right" }}>
                    <div
                      style={{
                        fontFamily: "DM Mono,monospace",
                        fontSize: 13,
                        fontWeight: 700,
                        color:
                          c.score > 80
                            ? "var(--red)"
                            : c.score > 60
                              ? "var(--orange)"
                              : "var(--green3)",
                      }}
                    >
                      {c.score}
                    </div>
                    <div
                      style={{ fontSize: 9, color: "var(--txt4)", marginTop: 2 }}
                    >
                      priority
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick navigation cards similar to design */}
          <div className="grid3" style={{ marginBottom: 20 }}>
            {/* Profile */}
            <Link href="/profile" className="card" style={{ textDecoration: "none", cursor: "pointer" }}>
              <div className="sec-hdr" style={{ marginBottom: 8 }}>
                <div>
                  <div className="sec-title">My Profile</div>
                  <div className="sec-sub">Manage your account information</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--green)",
                    fontWeight: 800,
                    fontSize: 16,
                  }}
                >
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    {user.fullName}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--txt3)" }}>
                    {user.email}
                  </div>
                </div>
              </div>
            </Link>

            {/* Complaints / actions */}
            <Link href={dashboardConfig.link} className="card" style={{ textDecoration: "none" }}>
              <div className="sec-hdr" style={{ marginBottom: 8 }}>
                <div>
                  <div className="sec-title">{dashboardConfig.label}</div>
                  <div className="sec-sub">{dashboardConfig.description}</div>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--green)",
                    fontWeight: 700,
                  }}
                >
                  View →
                </div>
              </div>
              <div style={{ fontSize: 11, color: "var(--txt3)" }}>
                Role: {getRoleDisplayName(user.role)}
              </div>
            </Link>

            {/* Admin users shortcut or empty card */}
            {user.role === "ADMIN" ? (
              <Link
                href="/admin/users"
                className="card"
                style={{
                  textDecoration: "none",
                  background: "var(--redbg)",
                  borderColor: "var(--redbdr)",
                }}
              >
                <div className="sec-hdr" style={{ marginBottom: 8 }}>
                  <div>
                    <div className="sec-title">User Management</div>
                    <div className="sec-sub">
                      Manage municipal admins and agents
                    </div>
                  </div>
                  <Shield className="w-4 h-4 text-[var(--red)]" />
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--red)",
                    fontWeight: 700,
                  }}
                >
                  Open admin panel →
                </div>
              </Link>
            ) : (
              <div className="card" />
            )}
          </div>
        </main>
      </div>
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
