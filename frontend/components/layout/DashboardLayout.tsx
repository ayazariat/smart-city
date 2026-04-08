"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import { notificationService } from "@/services/notification.service";
import { agentService } from "@/services/agent.service";
import { managerService } from "@/services/manager.service";
import { technicianService } from "@/services/technician.service";
import { adminService } from "@/services/admin.service";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { user, logout, hydrated } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (hydrated && !user) {
      router.push("/");
    }
  }, [hydrated, user, router]);

  // Fetch notification count
  useEffect(() => {
    const fetchNotifCount = async () => {
      const { token } = useAuthStore.getState();
      if (!token) return;
      try {
        const result = await notificationService.getNotificationCount();
        if (result.success && typeof result.count === "number") {
          setUnreadCount(result.count);
        }
      } catch { /* silent */ }
    };

    if (hydrated && user) {
      fetchNotifCount();
      const interval = setInterval(fetchNotifCount, 60000);
      return () => clearInterval(interval);
    }
  }, [hydrated, user]);

  // Fetch stats for sidebar badges
  useEffect(() => {
    const fetchStats = async () => {
      const { token } = useAuthStore.getState();
      if (!token || !user) return;
      try {
        let statsRes;
        if (user.role === "MUNICIPAL_AGENT") {
          statsRes = await agentService.getStats();
        } else if (user.role === "DEPARTMENT_MANAGER") {
          statsRes = await managerService.getStats();
        } else if (user.role === "TECHNICIAN") {
          statsRes = await technicianService.getTechnicianStats();
        } else if (user.role === "ADMIN") {
          statsRes = await adminService.getStats();
        }
        if (statsRes?.data) {
          setStats(statsRes.data as Record<string, unknown>);
        }
      } catch { /* silent */ }
    };

    if (hydrated && user) {
      fetchStats();
    }
  }, [hydrated, user]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
      <DashboardSidebar
        role={user.role}
        fullName={user.fullName}
        email={user.email}
        onLogout={logout}
        stats={stats}
        unreadNotifications={unreadCount}
      />
      <div className="ml-0 md:ml-[260px]">
        {children}
      </div>
    </div>
  );
}
