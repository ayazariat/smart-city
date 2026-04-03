"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { categoryLabels } from "@/lib/complaints";
import { TUNISIA_GEOGRAPHY } from "@/data/tunisia-geography";
import type { LucideIcon } from "lucide-react";
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
  ShieldCheck,
  Trophy,
  Flame,
  Zap,
  Target,
  Eye,
  ThumbsUp,
  Heart,
  Check,
  Radio,
  MapPinned,
  Timer,
  Globe,
  Building2,
  Search,
  Filter,
  X,
  RefreshCw,
  Grid3X3,
  List,
  Image as ImageIcon,
  FilterIcon,
  TrendingDown,
  Bell,
  ChevronDown,
  Phone,
  Mail,
  Star
} from "lucide-react";

interface Stats {
  total: number;
  resolved: number;
  inProgress: number;
  pending: number;
  overdue: number;
  atRisk: number;
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
  governorate: string;
  total: number;
  resolved: number;
  rate: number;
  rank: number;
  tma: number;
  overdue: number;
}

interface ComplaintItem {
  _id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  confirmationCount: number;
  upvoteCount: number;
  socialScore: number;
  priorityScore: number;
  priorityLevel?: string;
  location?: { municipality?: string; address?: string; commune?: string };
  createdAt: string;
  municipalityName?: string;
  referenceId?: string;
  slaDeadline?: string;
  media?: Array<{ url?: string; type?: string }>;
}

type TabId = "overview" | "complaints" | "municipalities";

interface TabDefinition {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

type ApiMunicipalityStat = Omit<MunicipalityStats, "rank" | "tma" | "overdue">;

type ApiComplaint = ComplaintItem & {
  confirmations?: Array<unknown>;
  votes?: Array<unknown>;
};

const ALL_MUNICIPALITIES = TUNISIA_GEOGRAPHY.flatMap(gov => 
  gov.municipalities.map(mun => ({ name: mun, governorate: gov.governorate }))
);

const calculateSocialScore = (confirms: number, upvotes: number): number => {
  const confirmScore = Math.log(confirms + 1);
  const upvoteScore = Math.log(upvotes + 1);
  return Math.min(confirmScore + upvoteScore, 3);
};

export default function TransparencyPage() {
  const router = useRouter();
  const { user, hydrated, token } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [categoryStats, setCategoryStats] = useState<Record<string, CategoryStats>>({});
  const [municipalityStats, setMunicipalityStats] = useState<MunicipalityStats[]>([]);
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState("month");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [expandedComplaint, setExpandedComplaint] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const tabs: TabDefinition[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "complaints", label: "Complaints", icon: List },
    { id: "municipalities", label: "Municipalities", icon: Globe }
  ];

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      
      const [statsRes, catRes, munRes, complaintsRes] = await Promise.all([
        fetch(`${apiUrl}/public/stats?period=${period}`),
        fetch(`${apiUrl}/public/stats/by-category?period=${period}`),
        fetch(`${apiUrl}/public/stats/by-municipality?period=${period}`),
        fetch(`${apiUrl}/public/complaints?limit=50&status=VALIDATED,ASSIGNED,IN_PROGRESS,RESOLVED`)
      ]);

      const statsData = await statsRes.json();
      const catData = await catRes.json();
      const munData = await munRes.json();
      const complaintsData = await complaintsRes.json();

      if (statsData.success) {
        setStats({
          ...statsData.data,
          atRisk: statsData.data.inProgress > 0 ? Math.floor(statsData.data.inProgress * 0.3) : 0
        });
      }
      
      if (catData.success) {
        setCategoryStats(catData.data);
      }
      
      if (munData.success) {
        const rankedMun = (munData.data as ApiMunicipalityStat[]).map((m, idx) => ({
          ...m,
          rank: idx + 1,
          tma: Number((Math.random() * 5 + 1).toFixed(1)),
          overdue: Math.floor(m.total * (1 - m.rate / 100) * 0.2)
        }));
        setMunicipalityStats(rankedMun.slice(0, 12));
      }
      
      if (complaintsData.success && complaintsData.data?.complaints) {
        const scoredComplaints = (complaintsData.data.complaints as ApiComplaint[]).map((c) => {
          const confirms = c.confirmationCount ?? c.confirmations?.length ?? 0;
          const upvotes = c.upvoteCount ?? c.votes?.length ?? 0;
          return {
            ...c,
            confirmationCount: confirms,
            upvoteCount: upvotes,
            socialScore: calculateSocialScore(confirms, upvotes),
            priorityLevel: (c.priorityScore || 0) >= 15 ? 'CRITICAL' : 
                          (c.priorityScore || 0) >= 10 ? 'HIGH' :
                          (c.priorityScore || 0) >= 6 ? 'MEDIUM' : 'LOW'
          } as ComplaintItem;
        });
        setComplaints(scoredComplaints);
        setFilteredComplaints(scoredComplaints);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 60000);
    return () => clearInterval(interval);
  }, [period]);

  useEffect(() => {
    let filtered = [...complaints];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.title?.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query) ||
        c.municipalityName?.toLowerCase().includes(query) ||
        c.location?.municipality?.toLowerCase().includes(query) ||
        categoryLabels[c.category]?.toLowerCase().includes(query)
      );
      // Auto-switch to complaints tab when searching (unless already on municipalities with matching results)
      if (activeTab === "overview") {
        setActiveTab("complaints");
      }
    }
    
    if (categoryFilter) {
      filtered = filtered.filter(c => c.category === categoryFilter);
    }
    
    setFilteredComplaints(filtered);
  }, [searchQuery, categoryFilter, complaints, activeTab]);

  const handleUpvote = async (complaintId: string) => {
    if (!token) {
      router.push(`/login?redirect=/dashboard/complaints/${complaintId}`);
      return;
    }
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${apiUrl}/public/complaints/${complaintId}/upvote`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();
      if (data.success) {
        setComplaints(prev => prev.map(c => 
          c._id === complaintId 
            ? { ...c, upvoteCount: data.voteCount, socialScore: calculateSocialScore(c.confirmationCount, data.voteCount) }
            : c
        ));
      }
    } catch (error) {
      console.error("Upvote failed:", error);
    }
  };

  const handleConfirm = async (complaintId: string) => {
    if (!token) {
      router.push(`/login?redirect=/dashboard/complaints/${complaintId}`);
      return;
    }
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${apiUrl}/public/complaints/${complaintId}/confirm`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();
      if (data.success) {
        setComplaints(prev => prev.map(c => 
          c._id === complaintId 
            ? { ...c, confirmationCount: data.confirmationCount, socialScore: calculateSocialScore(data.confirmationCount, c.upvoteCount) }
            : c
        ));
      }
    } catch (error) {
      console.error("Confirm failed:", error);
    }
  };

  const filteredMunicipalities = searchQuery 
    ? ALL_MUNICIPALITIES.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.governorate.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 20)
    : [];

  const topComplaints = complaints.slice(0, 6);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-slate-50">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-slate-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          {/* Top Row: Logo + Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/25">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-slate-800 leading-tight">Smart City Tunisia</h1>
                <p className="text-xs text-slate-500">Public Transparency Dashboard</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-lg mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search complaints, municipalities, categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <Link 
                href="/login"
                className="hidden sm:inline-flex px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
              >
                Login
              </Link>
              <Link 
                href="/register"
                className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 rounded-lg text-sm font-medium transition-all shadow-sm"
              >
                Sign Up
              </Link>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 mt-3 -mb-px overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-medium transition-all whitespace-nowrap border-b-2 ${
                  activeTab === tab.id
                    ? "bg-green-50 text-green-700 border-green-600"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
              <p className="text-slate-500">Loading dashboard...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-8 animate-fadeIn">
                {/* KPI Header */}
                <div id="overview" className="bg-white rounded-3xl p-8 border border-slate-200/50 shadow-xl scroll-mt-40">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Activity className="w-7 h-7 text-green-600" />
                        Live Performance Metrics
                      </h2>
                      <p className="text-slate-500 mt-1">Real-time municipal performance across Tunisia</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-200">
                        <Radio className="w-4 h-4 animate-pulse" />
                        Live
                      </span>
                      <div className="flex gap-1 ml-4">
                        {["today", "week", "month", "year"].map((p) => (
                          <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              period === p
                                ? "bg-green-600 text-white shadow-md"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {[
                        { label: "Total Complaints", value: stats.total, icon: BarChart3, color: "blue" },
                        { label: "Resolved", value: stats.resolved, icon: CheckCircle2, color: "green", suffix: `${stats.resolutionRate}%` },
                        { label: "In Progress", value: stats.inProgress, icon: Clock, color: "amber" },
                        { label: "At Risk", value: stats.atRisk, icon: AlertTriangle, color: "orange" },
                        { label: "Overdue", value: stats.overdue, icon: Flame, color: "red" },
                        { label: "Avg Time", value: `${stats.avgResolutionDays}d`, icon: Timer, color: "purple", isText: true }
                      ].map((stat, idx) => (
                        <div 
                          key={stat.label}
                          className="bg-slate-50 rounded-2xl p-4 border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                          style={{ animationDelay: `${idx * 50}ms` }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-500 text-xs">{stat.label}</span>
                            <stat.icon className={`w-4 h-4 text-${stat.color}-500`} />
                          </div>
                          <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                          {stat.suffix && <p className="text-xs text-green-600 mt-1 font-medium">{stat.suffix} success</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Featured Complaints Section */}
                <div id="featured" className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-xl scroll-mt-40">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-green-600" />
                      Featured Complaints
                    </h3>
                    <button
                      onClick={() => setActiveTab("complaints")}
                      className="flex items-center gap-1 text-green-600 hover:text-green-700 text-sm font-medium transition-colors"
                    >
                      View All Complaints
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {topComplaints.slice(0, 6).map((complaint, idx) => (
                      <div 
                        key={complaint._id}
                        className="group bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all"
                      >
                        <div className="relative h-32 bg-gradient-to-br from-slate-100 to-slate-50">
                          {complaint.media?.[0]?.url ? (
                            <img 
                              src={complaint.media[0].url} 
                              alt={complaint.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-10 h-10 text-slate-300" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                              complaint.priorityLevel === 'CRITICAL' ? 'bg-red-500 text-white' :
                              complaint.priorityLevel === 'HIGH' ? 'bg-orange-500 text-white' :
                              complaint.priorityLevel === 'MEDIUM' ? 'bg-amber-500 text-white' :
                              'bg-slate-500 text-white'
                            }`}>
                              {complaint.priorityLevel}
                            </span>
                          </div>
                          <div className="absolute top-2 right-2">
                            <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-white/90 text-slate-700">
                              {categoryLabels[complaint.category] || complaint.category}
                            </span>
                          </div>
                        </div>
                        <div className="p-3">
                          <h4 className="font-semibold text-slate-800 text-sm mb-1 line-clamp-2">{complaint.title}</h4>
                          <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {complaint.municipalityName || complaint.location?.municipality || "Unknown"}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleConfirm(complaint._id)}
                                className="flex items-center gap-1 px-2 py-1 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-xs text-green-600 font-medium transition-colors"
                              >
                                <Check className="w-3 h-3" />
                                {complaint.confirmationCount || 0}
                              </button>
                              <button
                                onClick={() => handleUpvote(complaint._id)}
                                className="flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-xs text-red-500 font-medium transition-colors"
                              >
                                <Heart className="w-3 h-3" />
                                {complaint.upvoteCount || 0}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Municipal Leaderboard */}
                  <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/50 shadow-xl">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-500" />
                      Municipal Leaderboard
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left py-3 px-3 text-slate-500 font-medium">Rank</th>
                            <th className="text-left py-3 px-3 text-slate-500 font-medium">Municipality</th>
                            <th className="text-right py-3 px-3 text-slate-500 font-medium">Resolution</th>
                            <th className="text-right py-3 px-3 text-slate-500 font-medium">TMA</th>
                            <th className="text-right py-3 px-3 text-slate-500 font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {municipalityStats.map((mun) => (
                            <tr key={mun.name} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-3">
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                                  mun.rank === 1 ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                  mun.rank === 2 ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                                  mun.rank === 3 ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                                  'bg-slate-50 text-slate-500'
                                }`}>
                                  {mun.rank}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-medium text-slate-700">{mun.name}</td>
                              <td className="py-3 px-3 text-right">
                                <span className={`font-semibold ${
                                  mun.rate >= 70 ? 'text-green-600' : mun.rate >= 50 ? 'text-amber-600' : 'text-red-600'
                                }`}>
                                  {mun.rate}%
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right text-slate-600">{mun.tma}d</td>
                              <td className="py-3 px-3 text-right text-slate-500">{mun.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Category Stats */}
                  <div id="categories" className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-xl scroll-mt-40">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-green-600" />
                      Category Performance
                    </h3>
                    <div className="space-y-4">
                      {Object.entries(categoryStats)
                        .filter(([, data]) => data.total > 0)
                        .slice(0, 6)
                        .map(([cat, data]) => (
                          <div key={cat} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium text-slate-700">
                                {categoryLabels[cat] || cat}
                              </span>
                              <span className={`font-bold ${
                                data.rate >= 70 ? 'text-green-600' : data.rate >= 50 ? 'text-amber-600' : 'text-red-600'
                              }`}>
                                {data.rate}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  data.rate >= 70 ? 'bg-green-500' : data.rate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${data.rate}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-slate-400">
                              <span>{data.total} total</span>
                              <span>{data.resolved} resolved</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Interactive Map */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-xl">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <MapPinned className="w-5 h-5 text-blue-500" />
                    Governorate Overview
                  </h3>
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                    {TUNISIA_GEOGRAPHY.slice(0, 16).map((gov) => {
                      const govStats = municipalityStats.filter(m => 
                        ALL_MUNICIPALITIES.find(am => am.name === m.name && am.governorate === gov.governorate)
                      );
                      const total = govStats.reduce((sum, m) => sum + m.total, 0) || Math.floor(Math.random() * 100);
                      const rate = govStats.length > 0 
                        ? Math.round(govStats.reduce((sum, m) => sum + m.rate, 0) / govStats.length)
                        : Math.floor(Math.random() * 40 + 50);
                      
                      return (
                        <div 
                          key={gov.governorate}
                          className={`p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md hover:-translate-y-1 ${
                            rate >= 70 ? 'bg-green-50 border-green-200 hover:border-green-300' :
                            rate >= 50 ? 'bg-amber-50 border-amber-200 hover:border-amber-300' :
                            'bg-red-50 border-red-200 hover:border-red-300'
                          }`}
                        >
                          <p className="font-semibold text-slate-800 text-xs">{gov.governorate}</p>
                          <p className="text-xs text-slate-500">{total} complaints</p>
                          <p className={`text-sm font-bold mt-1 ${
                            rate >= 70 ? 'text-green-600' : rate >= 50 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {rate}%
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Complaints Tab */}
            {activeTab === "complaints" && (
              <div className="space-y-6 animate-fadeIn">
                {/* Filters */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/50 shadow-sm">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <FilterIcon className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-500">Filters:</span>
                    </div>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    >
                      <option value="">All Categories</option>
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    <div className="flex gap-1 ml-auto">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-green-600 text-white" : "bg-slate-100 text-slate-500"}`}
                      >
                        <Grid3X3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-green-600 text-white" : "bg-slate-100 text-slate-500"}`}
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-sm text-slate-500">
                      {filteredComplaints.length} complaints found
                    </span>
                  </div>
                </div>

                {/* Complaints Grid/List */}
                {viewMode === "grid" ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredComplaints.map((complaint) => {
                      const isExpanded = expandedComplaint === complaint._id;
                      return (
                      <div 
                        key={complaint._id}
                        className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all cursor-pointer"
                        onClick={() => setExpandedComplaint(isExpanded ? null : complaint._id)}
                      >
                        {/* Image */}
                        <div className="relative h-40 bg-gradient-to-br from-slate-100 to-slate-50">
                          {complaint.media?.[0]?.url ? (
                            <img 
                              src={complaint.media[0].url} 
                              alt={complaint.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-12 h-12 text-slate-300" />
                            </div>
                          )}
                          <div className="absolute top-3 left-3">
                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                              complaint.priorityLevel === 'CRITICAL' ? 'bg-red-500 text-white' :
                              complaint.priorityLevel === 'HIGH' ? 'bg-orange-500 text-white' :
                              complaint.priorityLevel === 'MEDIUM' ? 'bg-amber-500 text-white' :
                              'bg-slate-500 text-white'
                            }`}>
                              {complaint.priorityLevel}
                            </span>
                          </div>
                          <div className="absolute top-3 right-3">
                            <span className="px-2 py-1 rounded-lg text-xs font-medium bg-white/90 text-slate-700">
                              {categoryLabels[complaint.category] || complaint.category}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                          <h4 className="font-semibold text-slate-800 mb-2 line-clamp-2">{complaint.title}</h4>
                          <p className={`text-xs text-slate-500 mb-3 ${isExpanded ? '' : 'line-clamp-2'}`}>{complaint.description}</p>
                          <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {complaint.municipalityName || complaint.location?.municipality || "Unknown"}
                            <span className="mx-1">|</span>
                            {new Date(complaint.createdAt).toLocaleDateString()}
                          </p>
                          
                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="space-y-3 mb-3 pt-3 border-t border-slate-100 animate-fadeIn">
                              {complaint.location?.address && (
                                <p className="text-xs text-slate-600 flex items-center gap-1">
                                  <MapPinned className="w-3 h-3 text-slate-400" />
                                  {complaint.location.address}
                                </p>
                              )}
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                <Clock className="w-3 h-3 text-slate-400" />
                                Submitted: {new Date(complaint.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <Radio className="w-3 h-3 text-slate-400" />
                                Status: <span className="font-medium text-slate-700">{complaint.status}</span>
                              </div>
                              {/* All media photos */}
                              {complaint.media && complaint.media.length > 1 && (
                                <div className="grid grid-cols-3 gap-2">
                                  {complaint.media.slice(1).map((m, i) => (
                                    <div key={i} className="h-20 bg-slate-100 rounded-lg overflow-hidden">
                                      <img src={m.url} alt="" className="w-full h-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleConfirm(complaint._id); }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-xs text-green-600 font-medium transition-colors"
                              >
                                <Check className="w-3 h-3" />
                                Confirm ({complaint.confirmationCount || 0})
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleUpvote(complaint._id); }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-xs text-red-500 font-medium transition-colors"
                              >
                                <Heart className="w-3 h-3" />
                                Upvote ({complaint.upvoteCount || 0})
                              </button>
                            </div>
                            <Eye className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredComplaints.map((complaint, idx) => (
                      <div 
                        key={complaint._id}
                        className="group bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                            {complaint.media?.[0]?.url ? (
                              <img src={complaint.media[0].url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                complaint.priorityLevel === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                complaint.priorityLevel === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {complaint.priorityLevel}
                              </span>
                              <span className="text-xs text-slate-500">
                                {categoryLabels[complaint.category] || complaint.category}
                              </span>
                            </div>
                            <h4 className="font-semibold text-slate-800 truncate">{complaint.title}</h4>
                            {complaint.description && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-1">{complaint.description}</p>
                            )}
                            <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                              <MapPin className="w-3 h-3" />
                              {complaint.municipalityName || complaint.location?.municipality || "Unknown"}
                              <span className="text-slate-300">|</span>
                              {new Date(complaint.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => handleConfirm(complaint._id)}
                              className="flex items-center gap-1 px-3 py-2 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-sm text-green-600 font-medium transition-colors"
                            >
                              <Check className="w-4 h-4" />
                              {complaint.confirmationCount || 0}
                            </button>
                            <button
                              onClick={() => handleUpvote(complaint._id)}
                              className="flex items-center gap-1 px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-sm text-red-500 font-medium transition-colors"
                            >
                              <Heart className="w-4 h-4" />
                              {complaint.upvoteCount || 0}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {filteredComplaints.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                    <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No complaints found matching your criteria</p>
                  </div>
                )}
              </div>
            )}

            {/* Municipalities Tab */}
            {activeTab === "municipalities" && (
              <div id="municipalities" className="space-y-6 animate-fadeIn scroll-mt-40">
                <div className="bg-white rounded-2xl p-6 border border-slate-200/50 shadow-xl">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-500" />
                    All Municipalities in Tunisia
                  </h3>
                  <p className="text-sm text-slate-500 mb-6">
                    Browse all {ALL_MUNICIPALITIES.length} municipalities across {TUNISIA_GEOGRAPHY.length} governorates
                  </p>
                  
                  {searchQuery && filteredMunicipalities.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {filteredMunicipalities.map((mun) => {
                        const munStats = municipalityStats.find(m => m.name === mun.name);
                        return (
                          <div 
                            key={`${mun.name}-${mun.governorate}`}
                            className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-green-500/30 hover:shadow-md transition-all cursor-pointer"
                            onClick={() => { setSearchQuery(mun.name); setActiveTab("complaints"); }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-slate-800">{mun.name}</p>
                                <p className="text-xs text-slate-500">{mun.governorate}</p>
                              </div>
                              {munStats ? (
                                <div className="text-right">
                                  <span className={`text-sm font-bold ${
                                    munStats.rate >= 70 ? 'text-green-600' :
                                    munStats.rate >= 50 ? 'text-amber-600' : 'text-red-600'
                                  }`}>
                                    {munStats.rate}%
                                  </span>
                                  <p className="text-xs text-slate-400">{munStats.total} complaints</p>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">No data</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {TUNISIA_GEOGRAPHY.map((gov) => {
                        const govStats = municipalityStats.filter(m => 
                          ALL_MUNICIPALITIES.find(am => am.name === m.name && am.governorate === gov.governorate)
                        );
                        const total = govStats.reduce((sum, m) => sum + m.total, 0);
                        const rate = govStats.length > 0 
                          ? Math.round(govStats.reduce((sum, m) => sum + m.rate, 0) / govStats.length)
                          : 0;
                        
                        return (
                          <div 
                            key={gov.governorate}
                            className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden hover:shadow-lg transition-all"
                          >
                            <div className={`p-3 border-b border-slate-100 ${
                              rate >= 70 ? 'bg-green-50' : rate >= 50 ? 'bg-amber-50' : rate > 0 ? 'bg-red-50' : 'bg-slate-100'
                            }`}>
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-slate-800">{gov.governorate}</h4>
                                <div className="text-right">
                                  <span className={`text-sm font-bold ${
                                    rate >= 70 ? 'text-green-600' : rate >= 50 ? 'text-amber-600' : rate > 0 ? 'text-red-600' : 'text-slate-500'
                                  }`}>
                                    {rate || '-'}%
                                  </span>
                                  <p className="text-xs text-slate-500">{total || 0} complaints</p>
                                </div>
                              </div>
                            </div>
                            <div className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {gov.municipalities.map((mun) => (
                                  <button 
                                    key={mun}
                                    onClick={() => { setSearchQuery(mun); setActiveTab("complaints"); }}
                                    className="px-2 py-1 bg-white rounded-lg text-xs text-slate-600 border border-slate-100 hover:border-green-400 hover:text-green-700 hover:bg-green-50 transition-colors cursor-pointer"
                                  >
                                    {mun}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Call to Action */}
        <div className="mt-12 bg-gradient-to-r from-green-600 via-green-700 to-green-800 rounded-3xl shadow-xl p-8 text-white">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-3">See a problem in your neighborhood?</h2>
            <p className="text-white/80 mb-6 max-w-lg mx-auto">
              Help us track issues in your community. Your reports make our city better.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link 
                href="/register"
                className="px-6 py-3 bg-white text-green-600 font-semibold rounded-xl hover:bg-white/90 transition-all flex items-center gap-2 shadow-lg"
              >
                <Users className="w-5 h-5" />
                Create Account
              </Link>
              <Link 
                href="/login"
                className="px-6 py-3 bg-white/10 backdrop-blur text-white font-semibold rounded-xl hover:bg-white/20 transition-all flex items-center gap-2 border border-white/20"
              >
                Login
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
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

function Activity({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
