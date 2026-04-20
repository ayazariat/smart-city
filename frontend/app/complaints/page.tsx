"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  FileText,
  CheckCircle,
  Heart,
  ArrowLeft,
  Filter,
  Loader2,
  Search,
  RefreshCw,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuthStore } from "@/store/useAuthStore";
import { categoryLabels } from "@/lib/complaints";
import { upvoteComplaint, confirmComplaint } from "@/services/complaint.service";
import { formatTimeAgo } from "@/lib/date-utils";
import { useTranslation } from "react-i18next";

interface MunicipalityComplaint {
  _id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  referenceId?: string;
  municipalityName?: string;
  location?: { municipality?: string; address?: string };
  media?: { url: string; type?: string }[];
  confirmationCount?: number;
  upvoteCount?: number;
  createdAt?: string;
}

const STATUS_FILTERS = ["ALL", "VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED"];
const statusColors: Record<string, string> = {
  VALIDATED: "bg-blue-100 text-blue-700",
  ASSIGNED: "bg-purple-100 text-purple-700",
  IN_PROGRESS: "bg-orange-100 text-orange-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-slate-100 text-slate-700",
};

export default function MunicipalityComplaintsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [complaints, setComplaints] = useState<MunicipalityComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const fetchComplaints = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const status = statusFilter === "ALL" ? "VALIDATED,ASSIGNED,IN_PROGRESS,RESOLVED" : statusFilter;
      const response = await fetch(
        `${apiUrl}/public/my-municipality-complaints?limit=100&status=${status}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (data.success && data.complaints) {
        setComplaints(data.complaints);
      }
    } catch (err) {
      console.error("Error fetching complaints:", err);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleUpvote = async (id: string) => {
    try {
      const data = await upvoteComplaint(id);
      if (data.success) {
        setComplaints((prev) =>
          prev.map((c) =>
            c._id === id ? { ...c, upvoteCount: data.upvoteCount ?? (c.upvoteCount || 0) + 1 } : c
          )
        );
      }
    } catch {
      // silent
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      const data = await confirmComplaint(id);
      if (data.success) {
        setComplaints((prev) =>
          prev.map((c) =>
            c._id === id
              ? { ...c, confirmationCount: data.confirmationCount ?? (c.confirmationCount || 0) + 1 }
              : c
          )
        );
      }
    } catch {
      // silent
    }
  };

  const filtered = complaints.filter((c) => {
    if (!search) return true;
    return (
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.referenceId?.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push("/dashboard")} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {t('municipality.title')}
            </h1>
            <p className="text-sm text-slate-500">
              {t('complaintsList.subtitle', { area: user?.municipalityName || t('complaintsList.unknown'), n: filtered.length })}
            </p>
          </div>
          <button
            onClick={fetchComplaints}
            disabled={loading}
            className="ml-auto p-2 hover:bg-slate-100 rounded-lg disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('complaintsList.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  statusFilter === s
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {s === "ALL" ? t('complaintsList.all') : s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Complaints Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Filter className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">{t('complaintsList.noComplaints')}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((complaint) => (
              <div
                key={complaint._id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer"
                onClick={() => router.push(`/dashboard/complaints/${complaint._id}`)}
              >
                {/* Image */}
                <div className="relative h-32 bg-gradient-to-br from-slate-100 to-slate-50">
                  {complaint.media?.[0]?.url ? (
                    <img
                      src={complaint.media[0].url}
                      alt={complaint.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="w-8 h-8 text-slate-300" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/90 text-slate-700 shadow-sm">
                      {categoryLabels[complaint.category] || complaint.category}
                    </span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold shadow-sm ${
                        statusColors[complaint.status] || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {complaint.status.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-3">
                  <h4 className="font-semibold text-slate-800 text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                    {complaint.title}
                  </h4>
                  <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">
                      {complaint.location?.address || complaint.municipalityName || t('complaintsList.unknown')}
                    </span>
                  </p>
                  {complaint.createdAt && (
                    <p className="text-[10px] text-slate-400 mb-2">{formatTimeAgo(complaint.createdAt)}</p>
                  )}

                  {/* Confirm + Upvote */}
                  {(["VALIDATED", "ASSIGNED", "IN_PROGRESS"].includes(complaint.status)) ? (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleConfirm(complaint._id); }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-medium transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{t('complaintsList.confirm')}</span>
                        <span className="bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full text-[10px] font-bold ml-auto">
                          {complaint.confirmationCount || 0}
                        </span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUpvote(complaint._id); }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs text-blue-700 font-medium transition-colors"
                      >
                        <Heart className="w-3.5 h-3.5" />
                        <span>{t('complaintsList.prioritize')}</span>
                        <span className="bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full text-[10px] font-bold ml-auto">
                          {complaint.upvoteCount || 0}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-100 text-center text-[11px] text-slate-500">
                      {t('complaintsList.actionsClosed', { defaultValue: 'Community actions are closed for this complaint status.' })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
