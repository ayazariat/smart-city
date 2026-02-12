"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, User, FileText, Plus, Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

/**
 * Dashboard Page - Smart City Tunis
 * Interface with Civic Green palette
 */
export default function DashboardPage() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();

  // Redirect if not logged in (client-side check)
  useEffect(() => {
    if (!token) {
      router.push("/");
    }
  }, [token, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

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

  return (
    <div className="min-h-screen bg-secondary-100">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-primary to-primary-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Smart City Tunis</h1>
                <p className="text-sm text-primary-100">Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
                <User className="w-4 h-4" />
                <span className="text-sm">Welcome, {user.fullName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-lg"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
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
                  {user.role === "CITIZEN" ? "Citizen" : 
                   user.role === "MUNICIPAL_AGENT" ? "Municipal Agent" :
                   user.role === "DEPARTMENT_MANAGER" ? "Department Manager" : "Admin"}
                </span>
              </div>
            </div>
          </Link>

          {/* Complaints Card */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-attention/10 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-attention" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">My Complaints</h3>
            </div>
            <p className="text-slate-600 mb-4 text-sm">
              View and manage all your pending complaints
            </p>
            <Link
              href="/complaints"
              className="inline-flex items-center gap-2 text-primary hover:text-primary-700 font-medium text-sm transition-colors group"
            >
              View complaints
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-gradient-to-br from-primary to-primary-700 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold">Quick Actions</h3>
            </div>
            <p className="text-primary-100 mb-4 text-sm">
              Report a new issue in your city
            </p>
            <button className="w-full bg-white text-primary hover:bg-primary-50 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-lg flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              New Complaint
            </button>
          </div>
        </div>

        {/* Statistics Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">
            My Complaints Statistics
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
