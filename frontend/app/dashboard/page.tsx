"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogOut, User, FileText, Plus, Sparkles, Shield, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function DashboardPage() {
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

  if (isVerifying || (!user && token)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600">Verifying your account...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600">Loading...</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-primary to-primary-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 backdrop-blur-sm flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Smart City Tunisia</h1>
                <p className="text-sm text-primary-100">Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 bg-white/10 px-4 py-2.5 rounded-xl backdrop-blur-sm">
                <User className="w-5 h-5" />
                <span className="text-sm font-medium">Welcome, {user.fullName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2.5 rounded-xl transition-all duration-200 hover:shadow-lg backdrop-blur-sm"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Dashboard
          </h2>
          <p className="text-slate-600">
            Manage your complaints and track urban services
          </p>
        </div>

        {/* Main Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Profile Card */}
          <Link 
            href="/profile"
            className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-slate-100 hover:border-primary/20 group cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <User className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 group-hover:text-primary transition-colors">My Profile</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Email:</span>
                <span className="text-sm font-medium text-slate-700">{user.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Role:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {getRoleDisplayName(user.role)}
                </span>
              </div>
            </div>
          </Link>

          {/* Admin Panel Card */}
          {user.role === "ADMIN" && (
            <Link 
              href="/admin/users"
              className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-white cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold">Admin Panel</h3>
              </div>
              <p className="text-red-100 mb-4 text-sm">
                Manage system users and permissions
              </p>
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                User Management →
              </div>
            </Link>
          )}

          {/* Complaints Card - Role-based */}
          <Link href={dashboardConfig.link} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-attention/10 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-attention" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{dashboardConfig.label}</h3>
            </div>
            <p className="text-slate-600 mb-4 text-sm">
              {dashboardConfig.description}
            </p>
            <span className="inline-flex items-center gap-2 text-primary hover:text-primary-700 font-medium text-sm transition-colors group">
              View
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </span>
          </Link>

          {/* Quick Actions Card - Only for CITIZEN role */}
          {user.role === "CITIZEN" && dashboardConfig.newComplaintLink && (
            <Link href={dashboardConfig.newComplaintLink} className="group bg-gradient-to-br from-primary to-primary-700 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 text-white cursor-pointer block">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold">Quick Actions</h3>
              </div>
              <p className="text-primary-100 mb-4 text-sm">
                Report a new issue in your city
              </p>
              <span className="w-full bg-white text-primary px-4 py-2.5 rounded-lg font-medium transition-all duration-200 group-hover:shadow-lg flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                {dashboardConfig.newComplaintLabel}
              </span>
            </Link>
          )}
        </div>

        {/* Statistics Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">
            {dashboardConfig.statsTitle}
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
              <div className="text-2xl font-bold text-primary mb-1">0</div>
              <div className="text-sm text-slate-600">Total</div>
            </div>
            
            <div className="bg-attention/5 rounded-xl p-4 border border-attention/10">
              <div className="text-2xl font-bold text-attention mb-1">0</div>
              <div className="text-sm text-slate-600">In Progress</div>
            </div>
            
            <div className="bg-success/5 rounded-xl p-4 border border-success/10">
              <div className="text-2xl font-bold text-success mb-1">0</div>
              <div className="text-sm text-slate-600">Resolved</div>
            </div>
            
            <div className="bg-urgent/5 rounded-xl p-4 border border-urgent/10">
              <div className="text-2xl font-bold text-urgent mb-1">0</div>
              <div className="text-sm text-slate-600">Urgent</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Wrap with ProtectedRoute for route-level protection
export function DashboardWithProtection() {
  return (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  );
}
