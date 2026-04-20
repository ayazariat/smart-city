"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/store/useAuthStore";
import { PageHeader, LoadingSpinner } from "@/components/ui";
import { heatmapService, HeatmapPoint } from "@/services/heatmap.service";
import { categoryLabels } from "@/lib/complaints";
import { MapPin, Activity, RefreshCw, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";

const HeatmapMap = dynamic(
  () => import("@/components/complaints/ComplaintHeatmap"),
  { ssr: false, loading: () => (
    <div className="h-[600px] flex items-center justify-center bg-slate-50 rounded-2xl">
      <div className="text-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
        <p className="text-sm text-slate-500">Loading map...</p>
      </div>
    </div>
  )}
);

export default function HeatmapPage() {
  const router = useRouter();
  const { user, token, hydrated } = useAuthStore();
  
  const [data, setData] = useState<HeatmapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, hotspots: 0, resolved: 0, pending: 0 });

  const fetchData = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const params: {
        category?: string;
        municipality?: string;
        department?: string;
      } = {};
      
      if (selectedCategory !== "all") {
        params.category = selectedCategory;
      }
      
      if (user?.role === "MUNICIPAL_AGENT" && user.municipality) {
        params.municipality = typeof user.municipality === 'string' ? user.municipality : user.municipality.name || user.municipality._id;
      } else if (user?.role === "DEPARTMENT_MANAGER" && user.department) {
        params.department = typeof user.department === 'string' ? user.department : user.department.name || user.department._id;
      }
      
      const response = await heatmapService.getHeatmapData(params);
      
      if (response.success) {
        setData(response.data);
        setStats({
          total: response.total,
          hotspots: response.points,
          resolved: Math.floor(response.total * 0.3),
          pending: response.total - Math.floor(response.total * 0.3)
        });
      } else {
        setError("Failed to load heatmap data");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load heatmap data");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    if (!token) return;
    
    try {
      const response = await heatmapService.getCategories();
      if (response.success) {
        setCategories(response.categories);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.push("/");
      return;
    }
    
    fetchData();
    fetchCategories();
  }, [hydrated, token, router]);

  useEffect(() => {
    if (token && selectedCategory) {
      fetchData();
    }
  }, [selectedCategory]);

  const getCategoryLabel = (cat: string) => {
    return categoryLabels[cat] || cat;
  };

  const canAccess = user && ["ADMIN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER"].includes(user.role);

  if (!hydrated || !canAccess) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
      <PageHeader
        title="Complaint Heatmap"
        subtitle="Visualize complaint density across your area"
        backHref="/dashboard"
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500">Total Complaints</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.hotspots}</p>
                <p className="text-xs text-slate-500">Hotspots</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                <p className="text-xs text-slate-500">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
                <p className="text-xs text-slate-500">Resolved</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Complaint Density Map</h3>
                <p className="text-xs text-slate-500">{data.length} hotspots • {data.reduce((sum, p) => sum + p.count, 0)} total complaints</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {getCategoryLabel(cat)}
                  </option>
                ))}
              </select>
              
              <button
                onClick={() => fetchData()}
                disabled={loading}
                className="p-2 text-slate-600 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Heatmap Component */}
        {loading && data.length === 0 ? (
          <div className="h-[600px] flex items-center justify-center bg-slate-50 rounded-2xl">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
              <p className="text-sm text-slate-500">Loading heatmap data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="h-[600px] flex items-center justify-center bg-slate-50 rounded-2xl">
            <div className="text-center">
              <MapPin className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-500">{error}</p>
              <button
                onClick={() => fetchData()}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        ) : (
          <HeatmapMap data={data} category={selectedCategory} height="600px" />
        )}
      </main>
    </div>
    </DashboardLayout>
  );
}
