"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { categoryLabels } from "@/lib/complaints";
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  MapPin, 
  BarChart3,
  Users,
  ArrowRight,
  Loader2,
  Sparkles,
  ShieldCheck
} from "lucide-react";

interface Stats {
  total: number;
  resolved: number;
  inProgress: number;
  pending: number;
  overdue: number;
  resolutionRate: number;
  avgResolutionDays: number;
}

interface CategoryStats {
  total: number;
  resolved: number;
  rate: number;
}

interface MunicipalityStats {
  name: string;
  total: number;
  resolved: number;
  rate: number;
}

// Unified category labels - Single Source of Truth
const transparencyCategoryLabels = categoryLabels;

export default function TransparencyPage() {
  const router = useRouter();
  const { user, hydrated } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [categoryStats, setCategoryStats] = useState<Record<string, CategoryStats>>({});
  const [municipalityStats, setMunicipalityStats] = useState<MunicipalityStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  // Allow both public users and logged-in users to view transparency dashboard
  // Removed redirect to dashboard - transparency is for everyone

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
        
        const [statsRes, catRes, munRes] = await Promise.all([
          fetch(`${apiUrl}/public/stats?period=${period}`),
          fetch(`${apiUrl}/public/stats/by-category?period=${period}`),
          fetch(`${apiUrl}/public/stats/by-municipality?period=${period}`)
        ]);

        const statsData = await statsRes.json();
        const catData = await catRes.json();
        const munData = await munRes.json();

        if (statsData.success) setStats(statsData.data);
        if (catData.success) setCategoryStats(catData.data);
        if (munData.success) setMunicipalityStats(munData.data.slice(0, 5));
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  // Show for everyone (logged in or not)
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-primary-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Smart City Tunisia</h1>
                <p className="text-sm text-primary-100">Transparency Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link 
                href="/login"
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors"
              >
                Login
              </Link>
              <Link 
                href="/register"
                className="px-4 py-2 bg-white text-primary hover:bg-primary-50 rounded-xl text-sm font-medium transition-colors"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-slate-100">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Municipal Performance Overview
          </h2>
          <p className="text-slate-600 mb-6">
            Real-time performance metrics and transparency data for our community
          </p>
          
          {/* Period Selector */}
          <div className="flex gap-2">
            {["today", "week", "month", "year"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  period === p
                    ? "bg-primary text-white shadow-md"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-slate-600">Loading statistics...</span>
          </div>
        )}

        {/* Main Stats Cards */}
        {!loading && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm text-slate-500">Total</span>
              </div>
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-xs text-slate-400 mt-1">complaints received</p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm text-slate-500">Resolved</span>
              </div>
              <p className="text-3xl font-bold text-green-600">{stats.resolved}</p>
              <p className="text-xs text-slate-400 mt-1">{stats.resolutionRate}% success rate</p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-sm text-slate-500">Avg Time</span>
              </div>
              <p className="text-3xl font-bold text-amber-600">{stats.avgResolutionDays}j</p>
              <p className="text-xs text-slate-400 mt-1">to resolve</p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <span className="text-sm text-slate-500">Overdue</span>
              </div>
              <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
              <p className="text-xs text-slate-400 mt-1">need attention</p>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {!loading && stats && (
          <div className="bg-white rounded-2xl shadow-md p-6 mb-8 border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Resolution Progress</h3>
            <div className="w-full bg-slate-200 rounded-full h-4 mb-2">
              <div 
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${stats.resolutionRate}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>{stats.resolved} resolved</span>
              <span className="font-semibold text-green-600">{stats.resolutionRate}% success rate</span>
              <span>{stats.total - stats.resolved} pending</span>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* By Category */}
          <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              By Category
            </h3>
            <div className="space-y-3">
              {Object.entries(categoryStats)
                .filter(([, data]) => data.total > 0)
                .sort((a, b) => b[1].total - a[1].total)
                .slice(0, 6)
                .map(([cat, data]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700 font-medium">
                        {transparencyCategoryLabels[cat] || cat}
                      </span>
                      <span className="text-slate-500">
                        {data.total} ({data.rate}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          data.rate >= 70 ? "bg-green-500" : 
                          data.rate >= 50 ? "bg-amber-500" : "bg-red-500"
                        }`}
                        style={{ width: `${data.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              {Object.keys(categoryStats).filter(([, data]) => (categoryStats as any)[data]?.total > 0).length === 0 && (
                <p className="text-slate-400 text-center py-4">No data available</p>
              )}
            </div>
          </div>

          {/* By Zone */}
          <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              By Zone
            </h3>
            <div className="space-y-3">
              {municipalityStats.map((mun, idx) => (
                <div key={mun.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700 font-medium flex items-center gap-2">
                      {idx === 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Hot</span>}
                      {mun.name}
                    </span>
                    <span className="text-slate-500">
                      {mun.total} complaints
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        mun.rate >= 70 ? "bg-green-500" : 
                        mun.rate >= 50 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${mun.rate}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{mun.rate}% resolved</p>
                </div>
              ))}
              {municipalityStats.length === 0 && (
                <p className="text-slate-400 text-center py-4">No zone data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-primary to-primary-700 rounded-2xl shadow-lg p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-2">See a problem in your neighborhood?</h2>
          <p className="text-primary-100 mb-6 max-w-md mx-auto">
            Help us track issues in your community. Your reports make our city better.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              href="/register"
              className="px-6 py-3 bg-white text-primary font-semibold rounded-xl hover:bg-primary-50 transition-colors flex items-center gap-2"
            >
              <Users className="w-5 h-5" />
              Create Account
            </Link>
            <Link 
              href="/login"
              className="px-6 py-3 bg-primary-700 text-white font-semibold rounded-xl hover:bg-primary-800 transition-colors flex items-center gap-2"
            >
              Login
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-slate-400">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Smart City Tunisia</span>
          </div>
          <p>
            Data updated in real-time. Last updated: {new Date().toLocaleDateString("fr-FR", { 
              day: "numeric", 
              month: "long", 
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            })}
          </p>
        </footer>
      </main>
    </div>
  );
}
