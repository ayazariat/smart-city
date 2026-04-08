"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles, X, LayoutDashboard, FileText, Plus, Archive, User,
  ClipboardList, Wrench, Users, BarChart3, Menu, LogOut
} from "lucide-react";

interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  isAction?: boolean;
}

interface DashboardSidebarProps {
  role: string;
  fullName?: string;
  email?: string;
  onLogout: () => void;
  stats?: {
    totalOverdue?: number;
    overdue?: number;
    submitted?: number;
    pending?: number;
    assigned?: number;
    inProgress?: number;
  };
  unreadNotifications?: number;
  onNotificationsClick?: () => void;
}

function getSidebarItems(role: string, stats?: DashboardSidebarProps["stats"]): SidebarItem[] {
  const overdue = stats?.totalOverdue || stats?.overdue || 0;

  const common: SidebarItem[] = [
    { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  ];

  const roleItems: SidebarItem[] = (() => {
    switch (role) {
      case "CITIZEN":
        return [
          { id: "my-complaints", label: "My Complaints", href: "/my-complaints", icon: FileText },
          { id: "new-complaint", label: "New Complaint", href: "/complaints/new", icon: Plus, isAction: true },
        ];
      case "MUNICIPAL_AGENT":
        return [
          { id: "complaints", label: "My Actions", href: "/agent/complaints", icon: ClipboardList, badge: (stats?.submitted || stats?.pending || 0) > 0 ? (stats?.submitted || stats?.pending || 0) : undefined },
        ];
      case "DEPARTMENT_MANAGER":
        return [
          { id: "pending", label: "To Process", href: "/manager/pending", icon: ClipboardList, badge: overdue > 0 ? overdue : undefined },
        ];
      case "TECHNICIAN":
        return [
          { id: "tasks", label: "My Tasks", href: "/tasks", icon: Wrench, badge: (stats?.assigned || 0) > 0 ? stats?.assigned : undefined },
        ];
      case "ADMIN":
        return [
          { id: "users", label: "User Management", href: "/admin/users", icon: Users },
          { id: "all-complaints", label: "All Complaints", href: "/admin/complaints", icon: FileText, badge: overdue > 0 ? overdue : undefined },
        ];
      default:
        return [];
    }
  })();

  const bottom: SidebarItem[] = [
    { id: "archive", label: "Archive", href: "/archive", icon: Archive },
    { id: "transparency", label: "Transparency", href: "/transparency", icon: BarChart3 },
    { id: "profile", label: "My Profile", href: "/profile", icon: User },
  ];

  return [...common, ...roleItems, ...bottom];
}

function getRoleLabel(role: string) {
  switch (role) {
    case "CITIZEN": return "Citizen";
    case "MUNICIPAL_AGENT": return "Municipal Agent";
    case "DEPARTMENT_MANAGER": return "Dept. Manager";
    case "TECHNICIAN": return "Technician";
    case "ADMIN": return "Administrator";
    default: return role;
  }
}

export default function DashboardSidebar({
  role,
  fullName,
  onLogout,
  stats,
}: DashboardSidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const items = getSidebarItems(role, stats);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-3 left-3 z-50 p-2.5 bg-white border border-slate-200 rounded-xl shadow-lg hover:bg-slate-50 transition-colors md:hidden"
        title="Menu"
      >
        <Menu className="w-5 h-5 text-slate-600" />
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-full w-[260px] z-40
          bg-white text-slate-700 border-r border-slate-200
          transform transition-transform duration-300 ease-in-out shadow-sm
          md:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 leading-tight">Smart City</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Tunisia</p>
                </div>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg md:hidden"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* User info */}
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{fullName || "User"}</p>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">
                  {getRoleLabel(role)}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <p className="px-3 mb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Navigation</p>
            {items.map((item) => {
              const active = isActive(item.href);

              if (item.isAction) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all bg-primary text-white shadow-md hover:shadow-lg hover:bg-primary/90"
                  >
                    <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    active
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? "text-primary" : "text-slate-400"}`} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="min-w-[20px] h-5 flex items-center justify-center px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom */}
          <div className="p-4 border-t border-slate-100 space-y-2">
            <button
              onClick={onLogout}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium transition-all text-sm"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}
