"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Download, BarChart3, Loader2, TrendingUp, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { agentService } from "@/services/agent.service";
import { managerService } from "@/services/manager.service";
import { categoryLabels } from "@/lib/complaints";
import { PageHeader } from "@/components/ui";

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, hydrated, token } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [byCategory, setByCategory] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!hydrated || !user || !["ADMIN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER"].includes(user.role)) {
      router.push("/dashboard");
    }
  }, [hydrated, user, router]);

  const fetchStats = async () => {
    if (!token) return;
    try {
      setLoading(true);
      
      let statsRes;
      if (user?.role === "MUNICIPAL_AGENT") {
        statsRes = await agentService.getStats();
      } else if (user?.role === "DEPARTMENT_MANAGER") {
        statsRes = await managerService.getStats();
      }
      
      if (statsRes?.data) {
        setStats(statsRes.data as any);
        setByCategory((statsRes.data as any).byCategory || {});
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hydrated && user?.id && token) {
      fetchStats();
    }
  }, [hydrated, user, token]);

  const exportCSV = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/complaints?status=RESOLVED&limit=1000`,
        { credentials: "include" }
      );
      const data = await response.json();
      
      if (!data.complaints || data.complaints.length === 0) {
        alert("No data to export");
        return;
      }
      
      const headers = ["Reference", "Title", "Category", "Status", "Municipality", "Created Date"];
      const rows = data.complaints.map((c: any) => [
        c.referenceId || c._id?.slice(-6),
        c.title?.replace(/,/g, " "),
        categoryLabels[c.category] || c.category,
        c.status,
        c.municipalityName || "",
        new Date(c.createdAt).toLocaleDateString()
      ]);
      
      const csv = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export");
    }
  };

  if (!user) return null;

  const statCards = [
    { label: "Total", value: stats.total || 0, icon: FileText, color: "text-primary" },
    { label: "In Progress", value: stats.inProgress || 0, icon: Clock, color: "text-orange-600" },
    { label: "Resolved", value: stats.resolved || 0, icon: CheckCircle, color: "text-green-600" },
    { label: "Overdue", value: stats.totalOverdue || 0, icon: AlertTriangle, color: "text-red-600" }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50">
      <PageHeader
        title="Analytics"
        subtitle="View performance statistics"
        backHref="/dashboard"
      />
      
      <div className="max-w-7xl mx-auto px-4 mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {statCards.map((card, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{card.label}</p>
                      <p className={`text-3xl font-bold ${card.color} mt-1`}>{card.value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.color.replace('text-', 'bg-')}/10`}>
                      <card.icon className={`w-6 h-6 ${card.color}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Complaints by Category
                </h3>
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
              
              {Object.keys(byCategory).length === 0 ? (
                <p className="text-slate-500 py-8 text-center">No data available</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(byCategory).map(([cat, count]: [string, any]) => {
                    const maxCount = Math.max(...Object.values(byCategory));
                    const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    
                    return (
                      <div key={cat} className="flex items-center gap-3">
                        <div className="w-40 text-sm font-medium text-slate-700 truncate">
                          {categoryLabels[cat] || cat}
                        </div>
                        <div className="flex-1 h-8 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="w-12 text-sm font-bold text-slate-700 text-right">
                          {count}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
