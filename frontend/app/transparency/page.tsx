"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  MapPin, 
  Calendar, 
  BarChart3, 
  Trophy, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  ArrowRight, 
  Filter, 
  X, 
  Loader2, 
  Building2, 
  Users, 
  Clock, 
  CheckCircle, 
  ArrowLeft, 
  Sparkles, 
  ShieldCheck, 
  Target, 
  Eye, 
  Radio, 
  MapPinned, 
  Timer, 
  Globe, 
  Grid3X3, 
  List, 
  Image as ImageIcon, 
  FileText, 
  Shield, 
  HelpCircle, 
  Home, 
  Map as MapIcon, 
  BarChart, 
  Building, 
  Menu, 
  LayoutDashboard, 
  Activity 
} from "lucide-react";
import { getCategoryLabel, categoryLabels } from "@/lib/categories";
import { TUNISIA_GEOGRAPHY, getAllMunicipalities } from "@/data/tunisia-geography";

import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  ComposedChart, 
  Line, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Bar, 
  Legend 
} from "recharts";
import ThemeToggle from "@/components/ui/ThemeToggle";

const getPhotoUrl = (complaint: ComplaintItem, explicitUrl?: string): string | null => {
  const resolvedMediaItem =
    complaint.afterPhotos?.[0] || complaint.proofPhotos?.[0] || complaint.media?.[0];
  const defaultMediaItem = complaint.media?.[0];
  const sourceMediaItem =
    complaint.status === "RESOLVED" || complaint.status === "CLOSED"
      ? resolvedMediaItem
      : defaultMediaItem;
  const url = explicitUrl || (typeof sourceMediaItem === 'string' ? sourceMediaItem : sourceMediaItem?.url);
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const origin = apiUrl.replace(/\/api\/?$/, '');
    return url.startsWith('/') ? `${origin}${url}` : `${origin}/${url}`;
  }
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD;
  if (cloud && !url.includes('/')) {
    return `https://res.cloudinary.com/${cloud}/image/upload/${url}`;
  }
  return url;
};

const governoratePhotos: Record<string, string> = {
  "Tunis": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Tunisia_Medina_of_Tunis.jpg/800px-Tunisia_Medina_of_Tunis.jpg",
  "Sfax": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Sfax_medina.jpg/800px-Sfax_medina.jpg",
  "Sousse": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Ribat_of_Sousse.jpg/800px-Ribat_of_Sousse.jpg",
  "Nabeul": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Nabeul_pottery.jpg/800px-Nabeul_pottery.jpg",
  "Monastir": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Monastir_Ribat.jpg/800px-Monastir_Ribat.jpg",
  "Bizerte": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Bizerte_harbor.jpg/800px-Bizerte_harbor.jpg",
  "Kairouan": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Great_Mosque_of_Kairouan.jpg/800px-Great_Mosque_of_Kairouan.jpg",
  "Gabès": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Gabes_ochre_city.jpg/800px-Gabes_ochre_city.jpg",
  "Médenine": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Djerba_Houmt_Souk.jpg/800px-Djerba_Houmt_Souk.jpg",
  "Ariana": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Ariana_Saida.jpg/800px-Ariana_Saida.jpg",
  "Ben Arous": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Ben_Arous_Mornag.jpg/800px-Ben_Arous_Mornag.jpg",
  "Manouba": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Manouba_university.jpg/800px-Manouba_university.jpg",
  "Béja": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Beja_Casbah.jpg/800px-Beja_Casbah.jpg",
  "Gafsa": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Gafsa_oasis.jpg/800px-Gafsa_oasis.jpg",
  "Jendouba": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Tabarka_Aerial.jpg/800px-Tabarka_Aerial.jpg",
  "Kasserine": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Kasserine_Mountains.jpg/800px-Kasserine_Mountains.jpg",
  "Kébili": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Douz_oasis.jpg/800px-Douz_oasis.jpg",
  "Le Kef": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Le_Kef_Casbah.jpg/800px-Le_Kef_Casbah.jpg",
  "Mahdia": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Mahdia_Coast.jpg/800px-Mahdia_Coast.jpg",
  "Sidi Bouzid": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Sidi_Bouzid_City.jpg/800px-Sidi_Bouzid_City.jpg",
  "Siliana": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Siliana_Forest.jpg/800px-Siliana_Forest.jpg",
  "Tataouine": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Tataouine_Ksar.jpg/800px-Tataouine_Ksar.jpg",
  "Tozeur": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Tozeur_Palm_Groves.jpg/800px-Tozeur_Palm_Groves.jpg",
  "Zaghouan": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Zaghouan_Mountain.jpg/800px-Zaghouan_Mountain.jpg",
  "default": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Tunisia_Medina_of_Tunis.jpg/800px-Tunisia_Medina_of_Tunis.jpg"
};

const governorateGradients: Record<string, string> = {
  "Tunis": "from-blue-900 to-blue-800",
  "Sfax": "from-amber-900 to-amber-800",
  "Sousse": "from-cyan-900 to-cyan-800",
  "Nabeul": "from-orange-900 to-orange-800",
  "Monastir": "from-indigo-900 to-indigo-800",
  "Bizerte": "from-slate-900 to-slate-800",
  "Kairouan": "from-purple-900 to-purple-800",
  "Gabès": "from-yellow-900 to-yellow-800",
  "Médenine": "from-teal-900 to-teal-800",
  "Ariana": "from-green-900 to-green-800",
  "Ben Arous": "from-lime-900 to-lime-800",
  "Manouba": "from-emerald-900 to-emerald-800",
  "Béja": "from-rose-900 to-rose-800",
  "Gafsa": "from-amber-800 to-orange-900",
  "Jendouba": "from-green-800 to-emerald-900",
  "Kasserine": "from-stone-900 to-stone-800",
  "Kébili": "from-yellow-800 to-amber-900",
  "Le Kef": "from-zinc-900 to-zinc-800",
  "Mahdia": "from-sky-900 to-sky-800",
  "Sidi Bouzid": "from-neutral-900 to-neutral-800",
  "Siliana": "from-red-900 to-red-800",
  "Tataouine": "from-orange-800 to-red-900",
  "Tozeur": "from-yellow-700 to-orange-800",
  "Zaghouan": "from-cyan-800 to-blue-900",
  "default": "from-green-900 to-green-800"
};

interface Stats {
  total: number;
  resolved: number;
  avgFixTime?: { value: number; unit: string; vsLast?: number | null };
  resolvedOnTime?: { value: number; unit: string; vsLast?: number | null };
  citizenSatisfaction?: {
    value: number;
    vsLast: number | null;
    totalRated: number;
    notConfirmed: number;
  };
  inProgress?: number;
  pending?: number;
  overdue?: number;
  resolutionRate?: number;
  resolvedTrend: number;
  resolutionRateTrend: number;
  avgFixTimeTrend: number | null;
  resolvedOnTimeTrend: number | null;
  satisfactionTrend: number | null;
}

interface CategoryStats {
  category: string;
  label: string;
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
  slaCompliance?: number;
  trend?: number;
}

interface MonthlyTrend {
  month: string;
  submitted: number;
  resolved: number;
}

interface MostReportedIssue {
  category: string;
  municipality: string;
  count: number;
  resolvedCount: number;
  status: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  waste: "Waste & Cleanliness",
  roads: "Roads & Traffic",
  lighting: "Street Lighting",
  water: "Water & Drainage",
  safety: "Public Safety & Noise",
  property: "Public Property",
  parks: "Parks & Green Spaces",
  other: "Other"
};

function getLocalCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || category;
}

interface ActivityItem {
  action: string;
  complaintId: string;
  referenceId: string;
  title: string;
  municipality: string;
  department: string;
  actorName: string;
  actorRole: string;
  notes: string;
  timestamp: string;
  description: string;
}

interface ComplaintItem {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  resolutionNotes?: string;
  category: string;
  status: string;
  confirmationCount: number;
  upvoteCount: number;
  socialScore: number;
  priorityScore: number;
  priorityLevel?: string;
  location?: { municipality?: string; address?: string; commune?: string; governorate?: string };
  createdAt: string;
  municipalityName?: string;
  governorate?: string;
  referenceId?: string;
  slaDeadline?: string;
  media?: Array<{ url?: string; type?: string }>;
  proofPhotos?: Array<{ url?: string; type?: string }>;
  afterPhotos?: Array<{ url?: string; type?: string }>;
  beforePhotos?: Array<{ url?: string; type?: string }>;
  resolvedAt?: string;
  updatedAt?: string;
}

const getComplaintId = (complaint: ComplaintItem): string =>
  complaint._id || complaint.id || "";

const getComplaintKey = (complaint: ComplaintItem): string =>
  getComplaintId(complaint) || complaint.referenceId || `${complaint.title}-${complaint.createdAt}`;

type ApiMunicipalityStat = {
  municipality?: string;
  name?: string;
  governorate?: string;
  total?: number;
  resolved?: number;
  rate?: number;
};

type ApiAllMunicipalityStat = {
  municipality?: string;
  name?: string;
  governorate?: string;
  count?: number;
  total?: number;
  resolved?: number;
  rate?: number;
};

type ApiComplaint = ComplaintItem & {
  confirmations?: Array<unknown>;
  votes?: Array<unknown>;
};

// Create ALL_MUNICIPALITIES from the imported function
const ALL_MUNICIPALITIES = getAllMunicipalities().map(mun => ({ name: mun, governorate: TUNISIA_GEOGRAPHY.find(g => g.municipalities.includes(mun))?.governorate || '' }));

const calculateSocialScore = (confirms: number, upvotes: number): number => {
  const confirmScore = Math.log(confirms + 1);
  const upvoteScore = Math.log(upvotes + 1);
  return Math.min(confirmScore + upvoteScore, 3);
};

// Normalize accented chars for matching municipality names (e.g. "Béni Khiar" vs "Beni Khiar")
const normalizeStr = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function TransparencyPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { token } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [allTimeStats, setAllTimeStats] = useState<Stats | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [municipalityStats, setMunicipalityStats] = useState<MunicipalityStats[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("month");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeView, setActiveView] = useState<"overview" | "complaints" | "municipalities">("overview");
  const [zoneStats, setZoneStats] = useState<Record<string, Record<string, number>>>({});
  const [mostReportedIssues, setMostReportedIssues] = useState<MostReportedIssue[]>([]);
  const [allMunicipalityStats, setAllMunicipalityStats] = useState<Array<{name: string; governorate: string; total: number; resolved: number; rate: number}>>([]);
  const [governorateStatsData, setGovernorateStatsData] = useState<Array<{governorate: string; total: number; resolved: number; resolutionRate: number | null}>>([]);
  const [selectedGovernorate, setSelectedGovernorate] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const overviewSectionIds = ["report", "metrics", "categories", "leaderboard", "resolutions", "trends", "governorates"];

  const sidebarItems = [
    { id: "metrics", label: t('transparency.overview'), icon: Home, view: "overview" as const },
    { id: "categories", label: t('transparency.categoryPerformance'), icon: BarChart, view: "overview" as const },
    { id: "leaderboard", label: t('transparency.leaderboard'), icon: Trophy, view: "overview" as const },
    { id: "resolutions", label: t('transparency.recentResolutions'), icon: CheckCircle2, view: "overview" as const },
    { id: "trends", label: t('transparency.monthlyTrends'), icon: Calendar, view: "overview" as const },
    { id: "governorates", label: t('transparency.governorateOverview'), icon: Globe, view: "overview" as const },
    { id: "complaints", label: t('transparency.allComplaints'), icon: List, view: "complaints" as const },
    { id: "municipalities", label: t('transparency.municipalities'), icon: Building, view: "municipalities" as const },
  ];

  const [activeSection, setActiveSection] = useState("metrics");
  const isRTL = typeof document !== "undefined" && document.documentElement.dir === "rtl";

  // Set hydrated state on mount
  useEffect(() => {
    setHydrated(true);
  }, []);

  // IntersectionObserver: highlight active sidebar item based on scroll (overview sections only)
  useEffect(() => {
    if (loading || activeView !== "overview") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );
    overviewSectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, activeView]);

   const fetchData = async (isRefresh = false) => {
      setError(null);
      if (!isRefresh) {
        setLoading(true);
      }
     
     try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      
      // Use consolidated endpoint for period data
      const [statsRes, totalStatsRes, complaintsRes] = await Promise.all([
        fetch(`${apiUrl}/public/stats?period=${period}`),
        fetch(`${apiUrl}/public/stats?period=all`),
        fetch(`${apiUrl}/public/complaints?limit=100&status=VALIDATED,ASSIGNED,IN_PROGRESS,RESOLVED,CLOSED`),
      ]);

      const statsData = await statsRes.json();
      const totalStatsData = await totalStatsRes.json();
      const complaintsData = await complaintsRes.json();

       if (statsData.success) {
         const d = statsData.data;
         setStats({
           total: d.total,
           resolved: d.resolved,
           inProgress: d.inProgress,
           pending: d.pending,
           overdue: d.overdue || 0,
           resolutionRate: d.resolutionRate,
           avgFixTime: d.avgFixTime || null,
           resolvedOnTime: d.resolvedOnTime || null,
           citizenSatisfaction: d.citizenSatisfaction || { value: null, totalRated: 0, notConfirmed: 0, vsLast: null },
           // Legacy fields for backward compatibility
           avgResolutionDays: d.avgFixTime?.value || null,
           slaComplianceRate: d.resolvedOnTime?.value || null,
           totalTrend: d.totalTrend || 0,
           resolvedTrend: d.resolvedTrend || 0,
           resolutionRateTrend: d.resolutionRateTrend || 0,
           avgFixTimeTrend: d.avgFixTimeTrend ?? null,
           resolvedOnTimeTrend: d.resolvedOnTimeTrend ?? null,
           satisfactionTrend: d.satisfactionTrend ?? null,
         });
         
         // Set consolidated data from single endpoint
         if (d.byCategory) {
           const formattedCategoryStats = d.byCategory.map((cat: any) => ({
             category: cat.category,
             label: cat.label,
             total: cat.total,
             resolved: cat.resolved,
             rate: cat.rate
           }));
           setCategoryStats(formattedCategoryStats);
         }
         if (d.byMunicipality) {
          const formattedMunicipalityStats = d.byMunicipality.map((mun: any) => ({
            ...mun,
            slaCompliance: mun.slaCompliance !== undefined ? mun.slaCompliance : null,
          }));
          setMunicipalityStats(formattedMunicipalityStats);
        }
         if (d.monthlyTrends) setMonthlyTrends(d.monthlyTrends);
         if (d.zoneStats) setZoneStats(d.zoneStats);
         if (d.topRecurring) {
           const formattedIssues = d.topRecurring.map((issue: any) => ({
             category: issue.category,
             municipality: issue.municipality,
             count: issue.count,
             resolvedCount: issue.resolvedCount,
             status: issue.status
           }));
           setMostReportedIssues(formattedIssues);
         }
         if (d.allMunicipalities) setAllMunicipalityStats(d.allMunicipalities);
         if (d.byGovernorate) {
           // Convert object to array format for frontend
           const governorateArray = Object.entries(d.byGovernorate).map(([governorate, data]: [string, any]) => ({
             governorate,
             total: data.total,
             resolved: data.resolved,
             resolutionRate: data.resolutionRate
           }));
           setGovernorateStatsData(governorateArray);
         }
         if (d.recentComplaints) {
           setComplaints(d.recentComplaints);
           setFilteredComplaints(d.recentComplaints);
         }
       }
       if (totalStatsData.success) {
         const d = totalStatsData.data;
         setAllTimeStats({
          total: d.total,
          resolved: d.resolved,
          resolutionRate: d.resolutionRate,
          avgFixTime: d.avgFixTime || null,
          resolvedOnTime: d.resolvedOnTime || null,
          citizenSatisfaction: d.citizenSatisfaction || { value: null, totalRated: 0, notConfirmed: 0, vsLast: null },
          inProgress: d.inProgress || 0,
          pending: d.pending || 0,
          overdue: d.overdue || 0,
          resolvedTrend: d.resolvedTrend || 0,
          resolutionRateTrend: d.resolutionRateTrend || 0,
          avgFixTimeTrend: d.avgFixTimeTrend || null,
          resolvedOnTimeTrend: d.resolvedOnTimeTrend || null,
          satisfactionTrend: d.satisfactionTrend || null,
        });
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
       console.error("Failed to fetch data:", error);
       setError(error instanceof Error ? error.message : String(error));
     } finally {
       setLoading(false);
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
        c.governorate?.toLowerCase().includes(query) ||
        c.location?.governorate?.toLowerCase().includes(query) ||
        getCategoryLabel(c.category).toLowerCase().includes(query)
      );
      // Auto-switch to complaints view when searching
      if (activeView !== "complaints") {
        setActiveView("complaints");
      }
    }
    
    if (categoryFilter) {
      filtered = filtered.filter(c => c.category === categoryFilter);
    }
    
    setFilteredComplaints(filtered);
  }, [searchQuery, categoryFilter, complaints]);

  const filteredMunicipalities = searchQuery 
    ? ALL_MUNICIPALITIES.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.governorate.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 20)
    : [];

  const recentResolutionComplaints = complaints
    .filter(c => c.status === "RESOLVED" || c.status === "CLOSED")
    .sort((a, b) => {
      const bDate = new Date(b.resolvedAt || b.updatedAt || b.createdAt || 0).getTime();
      const aDate = new Date(a.resolvedAt || a.updatedAt || a.createdAt || 0).getTime();
      return bDate - aDate;
    })
    .slice(0, 6);

  const formatResolutionDate = (value?: string) => {
    if (!value) return t('transparency.resolutions.dateUnavailable', 'Resolution date unavailable');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t('transparency.resolutions.dateUnavailable', 'Resolution date unavailable');
    return `Resolved on ${date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })}`;
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-slate-50">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">{"\u00A0"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-slate-50">
{/* Header - Responsive: Collapses on mobile with hamburger menu */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
          {/* Top Row: Logo + Actions - Stacked on mobile, inline on tablet+ */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                  title={t('transparency.header.menu')}
                >
                  <Menu className="w-5 h-5 text-slate-600" />
                </button>
                <div className="relative">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/25">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                </div>
                <div className="hidden xs:block">
                  <h1 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">{t('transparency.header.smartCity')}</h1>
                  <p className="text-[10px] sm:text-xs text-slate-500">{t('transparency.title')}</p>
                </div>
              </div>
              {/* Mobile: show theme & help on right */}
              <div className="flex items-center gap-1 sm:hidden">
                <ThemeToggle />
              </div>
            </div>

            {/* Search Bar - Full width on mobile, constrained on tablet+ */}
            <div className="flex-1 max-w-full sm:max-w-lg order-3 sm:order-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={t('transparency.header.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                />
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 flex-shrink-0 order-2 sm:order-3">
              <div className="hidden sm:flex items-center gap-1">
                <ThemeToggle />
              </div>
              <button
                onClick={() => setShowHelp(true)}
                className="p-2 text-slate-500 hover:text-green-600 hover:bg-slate-100 rounded-lg transition-colors touch-manipulation"
                style={{ minWidth: 36, minHeight: 36 }}
                title={t('transparency.header.about')}
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 h-full w-[260px] bg-white/95 backdrop-blur-xl z-[60]
        transform transition-transform duration-300 ease-in-out shadow-xl md:shadow-sm
        md:translate-x-0 md:block
        ${isRTL ? 'right-0 border-l border-slate-200' : 'left-0 border-r border-slate-200'}
        ${sidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header / Branding */}
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 leading-tight">Smart City</h2>
                  <p className="text-[10px] text-slate-400 font-medium">{t('transparency.publicDashboard')}</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg md:hidden">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Sidebar navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <p className="px-3 mb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t('transparency.nav')}</p>
            {sidebarItems.map((item) => {
              const isActive = item.view === "overview"
                ? activeView === "overview" && activeSection === item.id
                : activeView === item.view;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.view === "dashboard") {
                      router.push('/dashboard');
                      setSidebarOpen(false);
                      return;
                    }
                    setActiveView(item.view);
                    setSearchQuery("");
                    setCategoryFilter("");
                    if (item.view === "overview") {
                      setActiveSection(item.id);
                      setTimeout(() => {
                        const el = document.getElementById(item.id);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 50);
                    } else {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                    isActive
                      ? 'bg-green-50 text-green-700 font-semibold border-l-[3px] border-green-600 pl-[10px]'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800 border-l-[3px] border-transparent pl-[10px]'
                  }`}
                >
                  <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-green-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div className="p-4 border-t border-slate-100 space-y-2">
            {token ? (
              <Link 
                href="/dashboard"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all shadow-md shadow-green-500/20"
              >
                {t('transparency.myDashboard')}
              </Link>
            ) : (
              <>
                <Link 
                  href="/login"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all shadow-md shadow-green-500/20"
                >
                  {t('transparency.login')}
                </Link>
                <Link 
                  href="/register"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm text-slate-500 hover:text-green-600 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  {t('transparency.createAccount')}
                </Link>
              </>
            )}
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

      <main className={`relative max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 ${isRTL ? 'mr-0 md:mr-[260px]' : 'ml-0 md:ml-[260px]'}`}>
        {error ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 font-medium mb-2">Erreur</p>
              <p className="text-slate-500 mb-4">{error}</p>
              <button
                onClick={() => fetchData(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Réessayer
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
              <p className="text-slate-500">{t('transparency.loadingDashboard')}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Overview View */}
            {activeView === "overview" && (
            <div className="space-y-8">
                {/* Hero / Report a Problem Section */}
                <div id="report" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 p-8 md:p-12 shadow-2xl">
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                  </div>
                  <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 md:gap-8 items-center">
                    {/* Left column (60%) */}
                    <div className="md:col-span-3">
                      <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
                        {t('transparency.hero.title')}
                      </h2>
                      <p className="text-green-100 text-lg max-w-xl">
                        {t('transparency.hero.subtitle')}
                      </p>
                      <div className="flex gap-3 mt-6">
                        <button 
                          onClick={() => router.push('/login?redirect=/complaints/new')}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-green-700 font-semibold rounded-xl hover:bg-green-50 transition-all shadow-lg hover:shadow-xl"
                        >
                          <FileText className="w-5 h-5" />
                          {t('transparency.hero.reportBtn')}
                        </button>
                        <button
                          onClick={() => setActiveView("complaints")}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur text-white font-semibold rounded-xl hover:bg-white/20 transition-all border border-white/30"
                        >
                          <Eye className="w-5 h-5" />
                          {t('transparency.hero.browseBtn')}
                        </button>
                      </div>
                    </div>
                    {/* Right column (40%) — All-time stats card */}
                    <div className="md:col-span-2 mt-4 md:mt-0">
                      <div className="bg-white/95 backdrop-blur rounded-2xl p-4 sm:p-5 shadow-xl space-y-2 sm:space-y-3">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{t('transparency.hero.allTimeStats')}</p>
                        <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-xl">
                          <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-2xl font-extrabold text-slate-800">{allTimeStats?.total ?? '---'}</p>
                            <p className="text-xs text-slate-500">{t('transparency.hero.totalReports')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 p-3 bg-green-50 rounded-xl">
                          <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-2xl font-extrabold text-slate-800">{allTimeStats?.resolved ?? '---'}</p>
                            <p className="text-xs text-slate-500">{t('transparency.hero.problemsFixed')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 p-3 bg-teal-50 rounded-xl">
                          <div className="w-11 h-11 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                            <Shield className="w-5 h-5 text-teal-600" />
                          </div>
                          <div>
                             <p className="text-2xl font-extrabold text-slate-800">{allTimeStats?.resolvedOnTime?.value != null ? `${allTimeStats.resolvedOnTime.value}%` : '---'}</p>
                            <p className="text-xs text-slate-500">{t('transparency.hero.resolvedOnTime')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPI Header */}
                <div id="metrics" className="bg-white rounded-3xl p-8 border border-slate-200/50 shadow-xl scroll-mt-24">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Activity className="w-6 sm:w-7 h-6 sm:h-7 text-green-600" />
                        {t('transparency.metrics.title')}
                      </h2>
                      <p className="text-slate-500 mt-1 text-sm">{t('transparency.metrics.subtitle')}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs sm:text-sm font-medium border border-green-200">
                        <Radio className="w-3 sm:w-4 h-3 sm:h-4 animate-pulse" />
                        {t('transparency.metrics.live')}
                      </span>
                      <div className="flex gap-1">
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
                            {t(`transparency.metrics.${p}`)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                       {[
                         { label: t('transparency.metrics.totalReports'), value: stats.total, icon: FileText, color: "bg-blue-100 text-blue-600" },
                         { label: t('transparency.metrics.problemsFixed'), value: stats.resolved, icon: CheckCircle2, color: "bg-green-100 text-green-600", suffix: `${stats.resolutionRate}%`, trend: stats.resolvedTrend },
                         { label: t('transparency.metrics.beingFixed'), value: stats.inProgress, icon: Clock, color: "bg-orange-100 text-orange-600" },
  { 
    label: t('transparency.metrics.avgFixTime'), 
    value: stats.avgFixTime?.value != null ? `${stats.avgFixTime.value.toFixed(1)} ${stats.avgFixTime.unit}` : 'N/A', 
    icon: Timer, 
    color: "bg-purple-100 text-purple-600", 
    isText: true, 
    trend: stats.avgFixTime?.vsLast !== null ? stats.avgFixTime.vsLast : undefined 
  },
  { 
    label: t('transparency.metrics.resolvedOnTime'), 
    value: stats.resolvedOnTime?.value != null ? `${stats.resolvedOnTime.value}%` : 'N/A', 
    icon: Shield, 
    color: "bg-teal-100 text-teal-600", 
    trend: stats.resolvedOnTime?.vsLast !== null ? stats.resolvedOnTime?.vsLast : undefined 
  }
].map((stat, idx) => (
                        <div 
                          key={stat.label}
                          className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 shadow-sm"
                          style={{ animationDelay: `${idx * 50}ms` }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-slate-500 text-xs font-medium">{stat.label}</span>
                            <div className={`w-10 h-10 rounded-full ${stat.color} flex items-center justify-center`}>
                              <stat.icon className="w-5 h-5" />
                            </div>
                          </div>
                          <p className="text-3xl font-extrabold text-slate-800">{stat.value}</p>
                          {stat.suffix && <p className="text-xs text-green-600 mt-1 font-semibold">{stat.suffix} success</p>}
                          {stat.trend !== undefined && (
                            <div className={`flex items-center gap-1 mt-2 text-xs ${stat.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {stat.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              <span className="font-medium">{stat.trend >= 0 ? '+' : ''}{stat.trend}%</span>
                              <span className="text-slate-400">{t('transparency.metrics.vsLast')}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Resolution Rate Donut Chart - Improved */}
                  {stats && (
                    <div className="mt-8 pt-6 border-t border-slate-100">
                      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5 text-green-600" />
                        {t('transparency.metrics.resolutionStatus')}
                      </h3>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 xl:gap-10 items-start">
                        <div className="w-56 h-56 min-w-[224px] relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: t('transparency.metrics.fixed'), value: stats.resolved, color: '#22c55e' },
                                  { name: t('transparency.metrics.beingFixed'), value: stats.inProgress, color: '#f59e0b' },
                                  { name: t('transparency.metrics.pending'), value: stats.pending, color: '#3b82f6' }
                                ].filter(d => d.value > 0)}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={90}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {[
                                  { name: t('transparency.metrics.fixed'), value: stats.resolved, color: '#22c55e' },
                                  { name: t('transparency.metrics.beingFixed'), value: stats.inProgress, color: '#f59e0b' },
                                  { name: t('transparency.metrics.pending'), value: stats.pending, color: '#3b82f6' }
                                ].filter(d => d.value > 0).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                              <p className="text-2xl font-extrabold text-green-600">{stats.resolutionRate}%</p>
                              <p className="text-[10px] text-slate-400 font-medium">{t('common.resolved')}</p>
                            </div>
                          </div>
                        </div>
                        {/* Legend with counts + Category Summary */}
                        <div className="space-y-4">
                          <div className="space-y-3">
                            {[
                              { label: t('transparency.metrics.fixed'), value: stats.resolved, color: '#22c55e', bg: 'bg-green-100' },
                              { label: t('transparency.metrics.beingFixed'), value: stats.inProgress, color: '#f59e0b', bg: 'bg-amber-100' },
                              { label: t('transparency.metrics.pending'), value: stats.pending, color: '#3b82f6', bg: 'bg-blue-100' }
                            ].map((item) => (
                              <div key={item.label} className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded-full ${item.bg}`} style={{ backgroundColor: item.color }} />
                                <span className="text-sm text-slate-600">{item.label}</span>
                                <span className="text-sm font-bold text-slate-800">{item.value}</span>
                              </div>
                            ))}
                            <div className="pt-3 border-t">
                              <p className="text-sm font-bold text-green-600">
                                {stats.resolutionRate}% {t('transparency.metrics.resolutionRate')}
                              </p>
                            </div>
                          </div>

                           {/* Citizen Satisfaction Widget — replaces SLA Performance */}
                           {stats.citizenSatisfaction && (
                             <div className="pt-3 border-t border-slate-100">
                               <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                                 {t('stats.citizenSatisfaction', 'Citizen Satisfaction')}
                               </p>
                               <div className="space-y-4">
                                 {/* Circular progress-style horizontal bar */}
                                 <div>
                                    <div className="flex items-center justify-between text-xs mb-2">
                                      <span className="text-slate-600">
                                        {t('stats.satisfactionRate', 'Satisfaction Rate')}
                                      </span>
                                       <span className={`font-bold ${
                                           (stats.citizenSatisfaction.value || 0) >= 70 ? 'text-green-600' :
                                           (stats.citizenSatisfaction.value || 0) >= 50 ? 'text-amber-600' :
                                           'text-red-600'
                                         }`}>
                                         {stats.citizenSatisfaction.value != null ? `${stats.citizenSatisfaction.value}%` : 'N/A'}
                                       </span>
                                    </div>
                                    {/* Trend indicator below rate */}
                                    {stats.citizenSatisfaction.vsLast !== null && stats.citizenSatisfaction.value != null && (
                                      <div className={`flex items-center gap-1 mt-1 text-xs ${stats.citizenSatisfaction.vsLast >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {stats.citizenSatisfaction.vsLast >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                        <span className="font-medium">{stats.citizenSatisfaction.vsLast >= 0 ? '+' : ''}{stats.citizenSatisfaction.vsLast}%</span>
                                        <span className="text-slate-400">{t('stats.vsLast', 'vs last')}</span>
                                      </div>
                                    )}
                                   <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                     <div
                                       className={`h-full rounded-full transition-all duration-700 ${
                                         (stats.citizenSatisfaction.value || 0) >= 70 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                                         (stats.citizenSatisfaction.value || 0) >= 50 ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                                         'bg-gradient-to-r from-red-400 to-red-600'
                                       }`}
                                       style={{ width: `${Math.min(stats.citizenSatisfaction.value || 0, 100)}%` }}
                                     />
                                   </div>
                                 </div>

                                 {/* Stats row */}
                                 <div className="grid grid-cols-2 gap-3">
                                   <div className="p-2 bg-slate-50 rounded-lg">
                                     <div className="text-lg font-bold text-slate-700">{stats.citizenSatisfaction.totalRated || 0}</div>
                                      <div className="text-xs text-slate-500">{t('stats.totalRated', 'Total Rated')}</div>
                                   </div>
                                   <div className="p-2 bg-slate-50 rounded-lg">
                                     <div className="text-lg font-bold text-slate-700">{stats.citizenSatisfaction.notConfirmed || 0}</div>
                                      <div className="text-xs text-slate-500">{t('stats.notConfirmed', 'Not Confirmed')}</div>
                                   </div>
                                 </div>

                                 {/* Description */}
                                 <div className="text-xs text-slate-500 leading-relaxed">
                                   {t('stats.citizenSatisfactionDesc', 'Based on citizen reviews of resolved complaints.')}
                                 </div>
                               </div>
                             </div>
                           )}
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Recent Resolutions Section */}
                <div id="resolutions" className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-xl scroll-mt-40">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      {t('transparency.resolutions.title')}
                    </h3>
                    <button
                      onClick={() => setActiveView("complaints")}
                      className="flex items-center gap-1 text-green-600 hover:text-green-700 text-sm font-medium transition-colors"
                    >
                      {t('transparency.resolutions.viewAll')}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recentResolutionComplaints.length === 0 && (
                      <div className="md:col-span-2 lg:col-span-3 text-center py-10 bg-slate-50 rounded-2xl border border-slate-100">
                        <CheckCircle2 className="w-9 h-9 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">No resolved complaints yet. Resolutions will appear here.</p>
                      </div>
                    )}
                    {recentResolutionComplaints.map((complaint) => {
                      const photoUrl = getPhotoUrl(complaint, complaint.afterPhotos?.[0]?.url || complaint.proofPhotos?.[0]?.url) || getPhotoUrl(complaint);
                      const resolvedDate = complaint.resolvedAt || complaint.updatedAt || complaint.createdAt;
                      const resolvedMs = new Date(resolvedDate).getTime();
                      const createdMs = new Date(complaint.createdAt).getTime();
                      const daysToFix = (!isNaN(resolvedMs) && !isNaN(createdMs) && resolvedMs > createdMs) 
                        ? Math.max(1, Math.round((resolvedMs - createdMs) / (1000 * 60 * 60 * 24))) 
                        : null;
                      return (
                      <div 
                        key={getComplaintKey(complaint)}
                        className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer"
                        onClick={() => {
                          const complaintId = getComplaintId(complaint);
                          if (complaintId) router.push(`/transparency/complaints/${complaintId}`);
                        }}
                      >
                        <div className="relative h-40 bg-gradient-to-br from-green-50 to-slate-50">
                          {photoUrl ? (
                            <img 
                              src={photoUrl} 
                              alt={complaint.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-green-50">
                              <ImageIcon className="w-10 h-10 text-green-300" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2">
                            <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-green-500 text-white flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {t('transparency.resolutions.resolved')}
                            </span>
                          </div>
                          <div className="absolute top-2 right-2">
                            <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-white/90 text-slate-700">
                              {getCategoryLabel(complaint.category)}
                            </span>
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="font-semibold text-slate-800 text-sm mb-2 line-clamp-2">
                            {getCategoryLabel(complaint.category)} {t('transparency.resolutions.resolvedIn', { municipality: complaint.municipalityName || complaint.location?.municipality || t('transparency.resolutions.unknown') })}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                            <MapPin className="w-3 h-3 text-green-500" />
                            <span>{complaint.municipalityName || complaint.location?.municipality || t('transparency.resolutions.unknown')}</span>
                            {daysToFix && (
                              <>
                                <span className="mx-0.5">·</span>
                                <span className="text-green-600 font-medium">{t('transparency.resolutions.fixedIn', { n: daysToFix })}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                              {(complaint.confirmationCount || 0) > 0 && (
                                <span className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs text-emerald-600 font-medium">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {complaint.confirmationCount} {t('transparency.complaintsView.confirmed')}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400">
                              {resolvedDate && !isNaN(new Date(resolvedDate).getTime()) 
                                ? new Date(resolvedDate).toLocaleDateString(undefined, { day: "numeric", month: "short" })
                                : new Date(complaint.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                </div>

                {/* Municipal Leaderboard */}
                <div id="leaderboard" className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-xl scroll-mt-40">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    {t('transparency.leaderboardSection.title')}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-green-50">
                          <th className="text-left py-3 px-3 text-green-700 font-medium">{t('transparency.leaderboardSection.rank')}</th>
                          <th className="text-left py-3 px-3 text-green-700 font-medium">{t('transparency.leaderboardSection.municipality')}</th>
                          <th className="text-right py-3 px-3 text-green-700 font-medium">{t('transparency.leaderboardSection.total')}</th>
                          <th className="text-right py-3 px-3 text-green-700 font-medium">{t('transparency.leaderboardSection.resolved')}</th>
                          <th className="text-right py-3 px-3 text-green-700 font-medium">{t('transparency.leaderboardSection.avgFixTime')}</th>
                          <th className="text-right py-3 px-3 text-green-700 font-medium">{t('transparency.leaderboardSection.onTime')}</th>
                        </tr>
                      </thead>
<tbody>
{municipalityStats.map((mun, idx) => (
                            <tr key={`${mun.name}-${mun.governorate}-${idx}`} className="border-b border-slate-50 hover:bg-green-50/50 transition-colors">
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
                            <td className="py-3 px-3 text-right text-slate-600">{mun.total}</td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-sm font-medium text-slate-700">{mun.resolved}</span>
                                <span className="text-xs text-slate-500">/ {mun.total}</span>
                                <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      mun.rate >= 70 ? 'bg-green-500' : mun.rate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${mun.rate}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  mun.rate >= 70 ? 'bg-green-100 text-green-700' : 
                                  mun.rate >= 50 ? 'bg-amber-100 text-amber-700' : 
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {mun.rate.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right text-slate-600">
                              {mun.tma !== null && mun.tma !== undefined ? `${mun.tma.toFixed(1)} days` : '-'}
                            </td>
                            <td className="py-3 px-3 text-right text-slate-600">
                              {mun.slaCompliance !== null && mun.slaCompliance !== undefined ? `${mun.slaCompliance.toFixed(0)}%` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Complaints by Category */}
                <div id="categories" className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-xl scroll-mt-40">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                    {t('transparency.categorySection.title')}
                  </h3>
                  <div className="space-y-4">
                    {categoryStats.map((cat) => {
                      // Get progress bar color based on resolution rate
                      const getBarColor = (rate: number, total: number) => {
                        if (total === 0) return "bg-gray-300";
                        if (rate >= 70) return "bg-green-500";
                        if (rate >= 40) return "bg-amber-500";
                        return "bg-red-500";
                      };
                      
                      const barColor = getBarColor(cat.rate, cat.total);
                      
                      return (
                        <div key={cat.category} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-slate-700 flex items-center gap-2">
                              {cat.label}
                            </span>
                            <div className="flex items-center gap-3">
                              {cat.total > 0 ? (
                                <>
                                  <span className="text-sm font-semibold text-slate-800">
                                    {cat.total} {cat.total === 1 ? 'complaint' : 'complaints'}
                                  </span>
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                    cat.rate !== undefined && cat.rate >= 70 ? 'bg-green-100 text-green-700' : 
                                    cat.rate !== undefined && cat.rate >= 40 ? 'bg-amber-100 text-amber-700' : 
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {cat.rate !== undefined ? cat.rate.toFixed(1) : '0'}% resolved
                                  </span>
                                </>
                              ) : (
                                <span className="text-sm italic text-gray-400">No reports yet</span>
                              )}
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                            <div 
                              className={`h-full ${barColor} rounded-full transition-all duration-500`}
                              style={{ width: `${cat.total > 0 ? cat.rate : 0}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Monthly Trends Chart */}
                <div id="trends" className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-xl scroll-mt-40">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      {t('transparency.trendsSection.title')}
                    </h3>
                    {monthlyTrends.length >= 2 && (() => {
                      const curr = monthlyTrends[monthlyTrends.length - 1];
                      const prev = monthlyTrends[monthlyTrends.length - 2];
                      const change = prev.submitted > 0 ? Math.round(((curr.submitted - prev.submitted) / prev.submitted) * 100) : 0;
                      if (prev.submitted === 0) {
                        return null;
                      }
                      return (
                        <span className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${change >= 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                          {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {change >= 0 ? '+' : ''}{change}% vs last month
                        </span>
                      );
                    })()}
                  </div>
                  {monthlyTrends.length > 0 ? (
                    <div style={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={monthlyTrends}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F0" />
                          <XAxis 
                            dataKey="month" 
                            tick={{fontSize: 12}} 
                            stroke="#64748b"
                          />
                          <YAxis tick={{fontSize: 12}} stroke="#64748b" allowDecimals={false} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                            formatter={(value, name) => {
                              const v = Number(value) || 0;
                              if (name === 'Problems Fixed') {
                                return [v, name];
                              }
                              return [v, name];
                            }}
                          />
                          <Legend />
                          <Bar dataKey="submitted" name="Reports Submitted" fill="#3B82F6" opacity={0.7} radius={[4, 4, 0, 0]} />
                          <Line type="monotone" dataKey="resolved" name="Problems Fixed" stroke="#10B981" strokeWidth={3} dot={{fill: '#10B981', r: 4}} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-400">{t('transparency.trendsSection.noData')}</p>
                    </div>
                  )}
                </div>

                {/* Most Reported Issues */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-xl">
                  <h3 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    {t('transparency.recurring.title')}
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">Recurring problems reported multiple times</p>
                  {mostReportedIssues.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {mostReportedIssues.map((issue, idx) => {
                        const getStatusBadge = (status: string) => {
                          switch (status) {
                            case "All Resolved":
                              return { label: "All Resolved", cls: "bg-green-100 text-green-700" };
                            case "Being Addressed":
                              return { label: "Being Addressed", cls: "bg-blue-100 text-blue-700" };
                            case "Pending":
                              return { label: "Pending", cls: "bg-amber-100 text-amber-700" };
                            default:
                              return { label: status, cls: "bg-slate-100 text-slate-700" };
                          }
                        };
                        
                        const statusBadge = getStatusBadge(issue.status);
                        const resolutionPercentage = issue.count > 0 ? Math.round((issue.resolvedCount / issue.count) * 100) : 0;

                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              setCategoryFilter(issue.category);
                              setSearchQuery(issue.municipality);
                              setActiveView("complaints");
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="block w-full text-left"
                          >
                            <div className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs px-2 py-1 bg-slate-100 rounded-lg text-slate-600 font-medium">
                                  {getCategoryLabel(issue.category)}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-lg font-medium ${statusBadge.cls}`}>
                                  {statusBadge.label}
                                </span>
                              </div>
                              <h4 className="font-semibold text-slate-800 text-sm mb-3">{getCategoryLabel(issue.category)} - {issue.municipality}</h4>
                              <p className="text-xs text-slate-500 mb-2">
                                {issue.count} {issue.count === 1 ? 'report' : 'reports'} • {issue.resolvedCount} resolved
                              </p>
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    resolutionPercentage === 100 ? 'bg-green-500' : 
                                    resolutionPercentage >= 50 ? 'bg-amber-500' : 
                                    'bg-red-400'
                                  }`}
                                  style={{ width: `${resolutionPercentage}%` }}
                                />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-400">{t('transparency.recurring.noIssues')}</p>
                    </div>
                  )}
                </div>

                {/* Interactive Map with Category Markers */}
                <div id="governorates" className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-xl scroll-mt-40">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <MapPinned className="w-5 h-5 text-green-600" />
                      {t('transparency.governorates.title')}
                    </h3>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700"
                    >
                      <option value="">{t('transparency.governorates.allCategories')}</option>
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[...TUNISIA_GEOGRAPHY].sort((a, b) => {
                      const aData = governorateStatsData.find(g => g.governorate.toLowerCase() === a.governorate.toLowerCase());
                      const bData = governorateStatsData.find(g => g.governorate.toLowerCase() === b.governorate.toLowerCase());
                      return (bData?.total || 0) - (aData?.total || 0);
                    }).map((gov) => {
                      const govData = governorateStatsData.find(g => g.governorate.toLowerCase() === gov.governorate.toLowerCase());
                      
                      let total = 0;
                      let resolved = 0;
                      let rate = 0;
                      
                      if (categoryFilter) {
                        const zoneData = zoneStats[gov.governorate] || {};
                        total = zoneData[categoryFilter] || 0;
                        const zoneResolved = zoneData[`${categoryFilter}_resolved`] || 0;
                        rate = total > 0 ? Math.round((zoneResolved / total) * 100) : 0;
                      } else {
                        total = govData?.total || 0;
                        resolved = govData?.resolved || 0;
                        rate = govData?.resolutionRate || 0;
                      }
                      
                      const badgeClass = rate >= 70 ? 'bg-green-100 text-green-700' : rate >= 50 ? 'bg-amber-100 text-amber-700' : total > 0 ? 'bg-red-100 text-red-700' : '';
                      const badgeLabel = rate >= 70 ? t('transparency.governorates.good') : rate >= 50 ? t('transparency.governorates.moderate') : total > 0 ? t('transparency.governorates.needsAttention') : '';
                      const borderClass = categoryFilter 
                        ? 'border-green-200 bg-green-50'
                        : rate >= 70 ? 'border-green-200 bg-green-50/50 hover:border-green-300' 
                        : rate >= 50 ? 'border-amber-200 bg-amber-50/50 hover:border-amber-300' 
                        : total > 0 ? 'border-red-200 bg-red-50/50 hover:border-red-300' 
                        : 'border-slate-200 bg-slate-50/50';
                      
                      return (
                        <div 
                          key={gov.governorate}
                          className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-lg hover:-translate-y-1 ${borderClass}`}
                          onClick={() => { setSelectedGovernorate(gov.governorate); setActiveView("municipalities"); }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-slate-500" />
                              <p className="font-semibold text-slate-800">{gov.governorate}</p>
                            </div>
                            {total > 0 && badgeLabel && !categoryFilter && (
                              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badgeClass}`}>{badgeLabel}</span>
                            )}
                          </div>
                          {total > 0 ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">
                                  {total} {categoryFilter ? getCategoryLabel(categoryFilter)?.split(" ")[0] : t('transparency.governorates.reports')}
                                </span>
                                {!categoryFilter && (
                                  <span className={`text-sm font-bold ${rate >= 70 ? 'text-green-600' : rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                    {rate}%
                                  </span>
                                )}
                              </div>
                              {!categoryFilter && (
                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      rate >= 70 ? 'bg-green-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${rate}%` }}
                                  />
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <MapPin className="w-3 h-3" />
                                <span>{gov.municipalities?.length || 0} {t('transparency.governorates.municipalities')}</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400">{t('transparency.governorates.noReports')}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {!categoryFilter && (
                    <div className="mt-4 pt-3 border-t flex items-center justify-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> {t('transparency.governorates.legendGood')}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> {t('transparency.governorates.legendModerate')}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> {t('transparency.governorates.legendBad')}</span>
                    </div>
                  )}
                </div>
            </div>
            )}

            {/* Complaints View */}
            {activeView === "complaints" && (
                <div id="complaints" className="space-y-6">
                {/* Back button when filtered */}
                {searchQuery && (
                  <button 
                    onClick={() => { setSearchQuery(""); setCategoryFilter(""); setActiveView("municipalities"); }}
                    className="flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    {t('transparency.govDetail.back')}
                  </button>
                )}
                {/* Filters */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/50 shadow-sm">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-500">{t('transparency.governorates.filters')}</span>
                    </div>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    >
                      <option value="">{t('transparency.governorates.allCategories')}</option>
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
                      {filteredComplaints.length} {t('transparency.complaintsView.found', { n: filteredComplaints.length }).split(' ').slice(1).join(' ')}
                    </span>
                  </div>
                </div>

                {/* Complaints Grid/List */}
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredComplaints.map((complaint) => {
                      const photoUrl = getPhotoUrl(complaint);
                      
                      const statusLabels: Record<string, string> = {
                        VALIDATED: t('transparency.complaintsView.verified'),
                        ASSIGNED: t('transparency.complaintsView.assigned'),
                        IN_PROGRESS: t('transparency.complaintsView.inProgress'),
                        RESOLVED: t('transparency.complaintsView.resolved'),
                        CLOSED: t('transparency.complaintsView.closed'),
                        SUBMITTED: t('status.SUBMITTED'),
                        REJECTED: t('status.REJECTED')
                      };
                      
                      const formattedDate = new Date(complaint.createdAt).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      });
                      
                      const municipality = complaint.municipalityName || complaint.location?.municipality || t('transparency.complaintsView.unknown');
                      
                      // Clean description: remove phone numbers and "Contact phone:" text
                      const cleanDescription = (complaint.description || "")
                        .replace(/Contact\s*phone\s*:?[\s\d+\-]*/gi, "")
                        .replace(/(\+?\d[\d\s\-]{7,})/g, "")
                        .trim()
                        .slice(0, 100);
                      
                      return (
                      <div 
                        key={getComplaintKey(complaint)}
                        className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all cursor-pointer"
                        onClick={() => setSelectedComplaint(complaint)}
                      >
                        {/* Header: Location + Date */}
                        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="w-3 h-3" />
                            <span>{municipality}</span>
                            <span className="mx-1">·</span>
                            <span>{formattedDate}</span>
                          </div>
                           <div className="text-xs">
                             <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                               {getCategoryLabel(complaint.category)}
                             </span>
                           </div>
                        </div>
                        
                        {/* Image - Full width 200px */}
                        <div className="relative h-[200px] bg-gradient-to-br from-green-50 to-slate-50">
                          {photoUrl ? (
                            <img 
                              src={photoUrl} 
                              alt={complaint.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-green-50">
                              <ImageIcon className="w-12 h-12 text-green-300" />
                            </div>
                          )}
                          {/* Status badge on image */}
                          <div className="absolute top-2 left-2">
                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                              complaint.status === 'RESOLVED' || complaint.status === 'CLOSED' ? 'bg-green-500 text-white' :
                              complaint.status === 'IN_PROGRESS' ? 'bg-orange-500 text-white' :
                              complaint.status === 'ASSIGNED' ? 'bg-purple-500 text-white' :
                              'bg-blue-500 text-white'
                            }`}>
                              {statusLabels[complaint.status] || complaint.status}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                          <h4 className="font-semibold text-slate-800 mb-2 line-clamp-2">{complaint.title}</h4>
                          <p className={`text-sm text-slate-500 mb-3 line-clamp-2`}>
                            {cleanDescription || t('transparency.complaintsView.noDescription')}
                          </p>
                           
                          {/* Action buttons - Comment, Views */}
                          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>{complaint.confirmationCount || 0}</span>
                              </span>
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  const complaintId = getComplaintId(complaint);
                                  if (complaintId) {
                                    router.push(`/transparency/complaints/${complaintId}`);
                                  }
                                }}
                                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-green-600 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                              </button>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <Eye className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredComplaints.map((complaint) => {
                      const photoUrl = getPhotoUrl(complaint);
                      
                      const statusLabels: Record<string, string> = {
                        VALIDATED: t('transparency.complaintsView.verified'),
                        ASSIGNED: t('transparency.complaintsView.assigned'),
                        IN_PROGRESS: t('transparency.complaintsView.inProgress'),
                        RESOLVED: t('transparency.complaintsView.resolved'),
                        CLOSED: t('transparency.complaintsView.closed'),
                        SUBMITTED: t('status.SUBMITTED'),
                        REJECTED: t('status.REJECTED')
                      };
                      
                      const formattedDate = new Date(complaint.createdAt).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      });
                      
                      return (
                      <div 
                        key={getComplaintKey(complaint)}
                        className="group bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition-all cursor-pointer"
                        onClick={() => setSelectedComplaint(complaint)}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-24 h-24 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                            {photoUrl ? (
                              <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-green-50">
                                <ImageIcon className="w-8 h-8 text-green-300" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {complaint.municipalityName || complaint.location?.municipality || t('transparency.complaintsView.unknown')}
                                <span className="mx-1">·</span>
                                {formattedDate}
                              </span>
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                              {getCategoryLabel(complaint.category)}
                              </span>
                            </div>
                            <h4 className="font-semibold text-slate-800 mb-1">{complaint.title}</h4>
                            <p className="text-sm text-slate-500 line-clamp-1 mb-2">
                              {(complaint.description || "").replace(/Contact\s*phone\s*:?[\s\d+\-]*/gi, "").replace(/(\+?\d[\d\s\-]{7,})/g, "").trim() || t('transparency.complaintsView.noDescription')}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded">
                                {statusLabels[complaint.status] || complaint.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-3 text-sm text-slate-400">
                              <span className="flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="w-4 h-4" />
                                {complaint.confirmationCount || 0}
                              </span>
                              <Eye className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}

                {filteredComplaints.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                    <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">{t('transparency.complaintsView.noMatch')}</p>
                  </div>
                )}
                </div>
            )}

            {/* Municipalities View */}
            {activeView === "municipalities" && (
                <div id="municipalities" className="space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200/50 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-green-600" />
                        All Municipalities in Tunisia
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {t('transparency.municipalitiesView.subtitle', { municipalities: ALL_MUNICIPALITIES.length, governorates: TUNISIA_GEOGRAPHY.length })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 px-3 py-1.5 bg-green-50 rounded-lg text-xs text-green-700">
                        <BarChart3 className="w-3 h-3" />
                        {allMunicipalityStats.filter(m => m.total > 0).length} {t('transparency.municipalitiesView.active')}
                      </div>
                    </div>
                  </div>
                  
                  {searchQuery && filteredMunicipalities.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {filteredMunicipalities.map((mun) => {
                        const munStats = allMunicipalityStats.find(m => normalizeStr(m.name) === normalizeStr(mun.name));
                        return (
                          <div 
                            key={`${mun.name}-${mun.governorate}`}
                            className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-green-500/30 hover:shadow-md transition-all cursor-pointer"
                            onClick={() => { setSearchQuery(mun.name); setActiveView("complaints"); }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-slate-800">{mun.name}</p>
                                <p className="text-xs text-slate-500">{mun.governorate}</p>
                              </div>
                              {munStats && munStats.total > 0 ? (
                                <div className="text-right">
                                  <span className={`text-sm font-bold ${
                                    munStats.rate >= 70 ? 'text-green-600' :
                                    munStats.rate >= 50 ? 'text-amber-600' : 'text-red-600'
                                  }`}>
                                    {munStats.rate}%
                                  </span>
                                  <p className="text-xs text-slate-400">{munStats.total} {t('transparency.municipalitiesView.complaints')}</p>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">{t('transparency.municipalitiesView.noData')}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : selectedGovernorate ? (
                    <div>
                      <button 
                        onClick={() => { setSelectedGovernorate(null); setSearchQuery(""); }}
                        className="flex items-center gap-2 text-green-600 hover:text-green-700 mb-4 font-medium"
                      >
                        <ArrowRight className="w-4 h-4 rotate-180" />
                        {t('transparency.govDetail.back')}
                      </button>
                      {(() => {
                        const gov = TUNISIA_GEOGRAPHY.find(g => g.governorate === selectedGovernorate);
                        if (!gov) return null;
                        const govDataFromStats = governorateStatsData.find(g => g.governorate === selectedGovernorate);
                        const govMunStats = allMunicipalityStats.filter(m => m.governorate === selectedGovernorate);
                        const total = govDataFromStats?.total || govMunStats.reduce((sum, m) => sum + m.total, 0);
                        const resolved = govDataFromStats?.resolved || govMunStats.reduce((sum, m) => sum + m.resolved, 0);
                        const rate = govDataFromStats?.resolutionRate ?? (total > 0 ? Math.round((resolved / total) * 100) : 0);
                        const govZone = zoneStats[selectedGovernorate!] || {};
                        const govZoneTotal = Object.values(govZone).reduce((a: number, b: number) => a + b, 0);
                        const categoryColorsHex = ["#22c55e", "#4b5563", "#eab308", "#3b82f6", "#ef4444", "#a855f7", "#10b981", "#64748b"];
                        const categoryKeys = ["WASTE", "ROAD", "LIGHTING", "WATER", "SAFETY", "PUBLIC_PROPERTY", "GREEN_SPACE", "OTHER"];
                        const photoUrl = governoratePhotos[selectedGovernorate] || governoratePhotos["default"];
                        const gradientClass = governorateGradients[selectedGovernorate] || governorateGradients["default"];
                        
                        return (
                          <div className="space-y-6">
                            <div className="relative h-56 rounded-2xl overflow-hidden">
                              <img 
                                src={photoUrl} 
                                alt={selectedGovernorate}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).parentElement?.classList.add(...gradientClass.split(' '));
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                                <div>
                                  <h2 className="text-3xl font-bold text-white mb-1">{selectedGovernorate}</h2>
                                  <p className="text-white/80 text-sm">{t('transparency.govDetail.ofTunisia')}</p>
                                </div>
                              </div>
                              <div className="absolute bottom-4 left-6 flex items-center gap-4">
                                <span className="flex items-center gap-1 text-white/90 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
                                  <Filter className="w-4 h-4" />
                                  {t('transparency.govDetail.complaints', { n: total })}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                  rate >= 70 ? 'bg-green-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                }`}>
                                  {rate}%
                                  {t('transparency.govDetail.resolved', { n: rate })}
                                </span>
                              </div>
                            </div>
                            
                            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                              <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                                <Trophy className="w-5 h-5" />
                                {t('transparency.govDetail.achievements')}
                              </h4>
                              <div className="grid grid-cols-3 sm:grid-cols-3 gap-4">
                                <div className="text-center">
                                  <p className="text-2xl font-bold text-green-600">{resolved}</p>
                                  <p className="text-xs text-green-700">{t('transparency.govDetail.resolvedLabel')}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-2xl font-bold text-green-600">{rate}%</p>
                                  <p className="text-xs text-green-700">{t('transparency.govDetail.successRate')}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-2xl font-bold text-green-600">{gov.municipalities.length}</p>
                                  <p className="text-xs text-green-700">{t('transparency.govDetail.municipalitiesLabel')}</p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Category Breakdown for this Governorate */}
                            {govZoneTotal > 0 && (
                              <div className="bg-white rounded-xl p-4 border border-slate-200">
                                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                  <BarChart3 className="w-5 h-5 text-green-600" />
                                  {t('transparency.govDetail.categoryTitle')}
                                </h4>
                                <div className="flex h-4 rounded-full overflow-hidden bg-slate-100 mb-3">
                                  {categoryKeys.map((cat, idx) => {
                                    const count = govZone[cat] || 0;
                                    if (count === 0) return null;
                                    return (
                                      <div
                                        key={cat}
                                        style={{ width: `${(count / govZoneTotal) * 100}%`, backgroundColor: categoryColorsHex[idx] }}
                                        title={`${getCategoryLabel(cat)}: ${count}`}
                                        className="transition-all"
                                      />
                                    );
                                  })}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {categoryKeys.map((cat, idx) => {
                                    const count = govZone[cat] || 0;
                                    if (count === 0) return null;
                                    return (
                                      <div key={cat} className="flex items-center gap-2 text-sm">
                                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: categoryColorsHex[idx] }} />
                                        <span className="text-slate-600 truncate">{getCategoryLabel(cat)}</span>
                                        <span className="font-semibold text-slate-800 ml-auto">{count}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            
                            <div>
                              <h4 className="font-semibold text-slate-800 mb-3">{t('transparency.govDetail.municipalitiesIn', { name: selectedGovernorate })}</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {gov.municipalities.map((mun) => {
                                  const munStat = allMunicipalityStats.find(m => normalizeStr(m.name) === normalizeStr(mun));
                                  const munTotal = munStat?.total || 0;
                                  const munRate = munStat?.rate || 0;
                                  return (
                                    <div 
                                      key={mun}
                                      onClick={() => { setSearchQuery(mun); setActiveView("complaints"); }}
                                      className="p-4 bg-white rounded-xl border border-slate-200 hover:border-green-400 hover:shadow-md transition-all cursor-pointer"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium text-slate-800">{mun}</span>
                                        {munTotal > 0 && (
                                          <span className={`text-sm font-bold ${
                                            munRate >= 70 ? 'text-green-600' : munRate >= 50 ? 'text-amber-600' : 'text-red-600'
                                          }`}>
                                            {munRate}%
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-slate-500 mt-1">{munTotal} {t('transparency.municipalitiesView.complaints')}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            
                            {total > 0 && (
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold text-slate-800 mb-3">{t('transparency.govDetail.recentReports', { name: selectedGovernorate })}</h4>
                                  <div className="space-y-2">
                                    {complaints.filter(c => {
                                      // Match by governorate directly or by municipality belonging to this governorate
                                      if (c.governorate === selectedGovernorate || c.location?.governorate === selectedGovernorate) return true;
                                      const mun = c.location?.municipality || c.municipalityName;
                                      if (!mun) return false;
                                      return !!ALL_MUNICIPALITIES.find(m => m.name === mun && m.governorate === selectedGovernorate);
                                    }).slice(0, 5).map((complaint) => {
                                      const cPhoto = getPhotoUrl(complaint);
                                      return (
                                      <div 
                                        key={getComplaintKey(complaint)}
                                        onClick={() => {
                                          const complaintId = getComplaintId(complaint);
                                          if (complaintId) router.push(`/transparency/complaints/${complaintId}`);
                                        }}
                                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-green-50 cursor-pointer transition-colors"
                                      >
                                        <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-green-100 flex items-center justify-center">
                                          {cPhoto ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img src={cPhoto} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                          ) : (
                                            <ImageIcon className="w-6 h-6 text-green-600" />
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-slate-800 truncate">{complaint.title}</p>
                                          <p className="text-xs text-slate-500">{complaint.municipalityName || complaint.location?.municipality} · {new Date(complaint.createdAt).toLocaleDateString()}</p>
                                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                            complaint.status === 'RESOLVED' || complaint.status === 'CLOSED' ? 'bg-green-100 text-green-700' :
                                            complaint.status === 'IN_PROGRESS' ? 'bg-orange-100 text-orange-700' :
                                            'bg-blue-100 text-blue-700'
                                          }`}>
                                             {complaint.status === 'IN_PROGRESS' ? t('transparency.govDetail.inProgress') : complaint.status === 'RESOLVED' ? t('transparency.complaintsView.resolved') : complaint.status === 'CLOSED' ? t('transparency.complaintsView.closed') : t(`status.${complaint.status}`)}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                    })}
                                    {total === 0 && (
                                      <p className="text-sm text-slate-500">{t('transparency.govDetail.noRecentReports')}</p>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Mini Map Placeholder */}
                                <div>
                                  <h4 className="font-semibold text-slate-800 mb-3">{t('transparency.govDetail.locationTitle')}</h4>
                                  <div className="h-40 bg-green-50 rounded-xl flex items-center justify-center border border-green-200 relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #22c55e 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                                    <div className="relative text-center">
                                      <MapIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                      <p className="text-base font-semibold text-green-800">{selectedGovernorate}</p>
                                      <p className="text-xs text-green-600">{t('transparency.govDetail.municipalitiesReports', { municipalities: gov.municipalities.length, reports: total })}</p>
                                    </div>
                                  </div>
                                </div>
                                
                                <button 
                                  onClick={() => { setSearchQuery(selectedGovernorate || ''); setSelectedGovernorate(null); setActiveView("complaints"); }}
                                  className="w-full py-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl text-green-600 font-medium transition-colors"
                                >
                                  {t('transparency.govDetail.viewAll', { n: total })}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[...TUNISIA_GEOGRAPHY].sort((a, b) => {
                        const aData = governorateStatsData.find(g => g.governorate === a.governorate);
                        const bData = governorateStatsData.find(g => g.governorate === b.governorate);
                        return (bData?.total || 0) - (aData?.total || 0);
                      }).map((gov) => {
                        // Use governorateStatsData (from /stats?period=all) for accurate totals
                        const govDataFromStats = governorateStatsData.find(g => g.governorate === gov.governorate);
                        const govMunStats = allMunicipalityStats.filter(m => m.governorate === gov.governorate);
                        const total = govDataFromStats?.total || govMunStats.reduce((sum, m) => sum + m.total, 0);
                        const resolved = govDataFromStats?.resolved || govMunStats.reduce((sum, m) => sum + m.resolved, 0);
                        const rate = govDataFromStats?.resolutionRate ?? (total > 0 ? Math.round((resolved / total) * 100) : 0);
                        const govZone = zoneStats[gov.governorate] || {};
                        const govZoneTotal = Object.values(govZone).reduce((a: number, b: number) => a + b, 0);
                        const categoryColorsHex = ["#22c55e", "#4b5563", "#eab308", "#3b82f6", "#ef4444", "#a855f7", "#10b981", "#64748b"];
                        const categoryKeys = ["WASTE", "ROAD", "LIGHTING", "WATER", "SAFETY", "PUBLIC_PROPERTY", "GREEN_SPACE", "OTHER"];
                        
                        return (
                          <div 
                            key={gov.governorate}
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                            onClick={() => setSelectedGovernorate(gov.governorate)}
                          >
                            <div className="relative h-32 bg-slate-200">
                              {governoratePhotos[gov.governorate] ? (
                                <img 
                                  src={governoratePhotos[gov.governorate]} 
                                  alt={gov.governorate}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).parentElement?.classList.add(...(governorateGradients[gov.governorate] || governorateGradients["default"]).split(' '));
                                  }}
                                />
                              ) : (
                                <div className={`w-full h-full bg-gradient-to-br ${governorateGradients[gov.governorate] || governorateGradients["default"]}`} />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                              <div className="absolute bottom-3 left-4">
                                <h4 className="font-bold text-white text-lg drop-shadow-md">{gov.governorate}</h4>
                              </div>
                            </div>
                            <div className={`p-3 border-b ${
                              rate >= 70 ? 'bg-green-50' : rate >= 50 ? 'bg-amber-50' : total > 0 ? 'bg-red-50' : 'bg-slate-50'
                            }`}>
                              <div className="flex items-center justify-between">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  rate >= 70 ? 'bg-green-500 text-white' : rate >= 50 ? 'bg-amber-500 text-white' : total > 0 ? 'bg-red-500 text-white' : 'bg-slate-400 text-white'
                                }`}>
                                  {rate >= 70 ? t('transparency.govCards.good') : rate >= 50 ? t('transparency.govCards.moderate') : total > 0 ? t('transparency.govCards.needsAttention') : t('transparency.govCards.noData')}
                                </span>
                                <div className="text-right">
                                  <span className={`text-sm font-bold ${
                                    rate >= 70 ? 'text-green-600' : rate >= 50 ? 'text-amber-600' : total > 0 ? 'text-red-600' : 'text-slate-500'
                                  }`}>
                                    {total > 0 ? `${rate}%` : '—'}
                                  </span>
                                  <p className="text-xs text-slate-500">{t('transparency.govCards.complaints', { n: total })}</p>
                                </div>
                              </div>
                            </div>
                            {/* Category breakdown bar for this governorate */}
                            {govZoneTotal > 0 && (
                              <div className="px-3 pt-2 pb-1">
                                <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
                                  {categoryKeys.map((cat, idx) => {
                                    const count = govZone[cat] || 0;
                                    if (count === 0) return null;
                                    return (
                                      <div
                                        key={cat}
                                        style={{ width: `${(count / govZoneTotal) * 100}%`, backgroundColor: categoryColorsHex[idx] }}
                                        title={`${getCategoryLabel(cat)}: ${count}`}
                                      />
                                    );
                                  })}
                                </div>
                                <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                                  {categoryKeys.map((cat, idx) => {
                                    const count = govZone[cat] || 0;
                                    if (count === 0) return null;
                                    return (
                                      <span key={cat} className="flex items-center gap-0.5 text-[10px] text-slate-500">
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: categoryColorsHex[idx] }} />
                                        {count}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            <div className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {gov.municipalities.map((mun) => {
                                  const munStat = allMunicipalityStats.find(m => normalizeStr(m.name) === normalizeStr(mun));
                                  const munTotal = munStat?.total || 0;
                                  return (
                                    <button 
                                      key={mun}
                                      onClick={(e) => { e.stopPropagation(); setSearchQuery(mun); setActiveView("complaints"); }}
                                      className={`px-2 py-1 rounded-lg text-xs border transition-colors cursor-pointer ${
                                        munTotal > 0 
                                          ? 'bg-white border-green-200 text-green-700 hover:bg-green-50' 
                                          : 'bg-white border-slate-100 text-slate-500 hover:border-green-300 hover:text-green-600'
                                      }`}
                                    >
                                      {mun}
                                      {munTotal > 0 && (
                                        <span className="ml-1 font-bold">{munTotal}</span>
                                      )}
                                    </button>
                                  );
                                })}
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
        <div className="mt-12 bg-gradient-to-r from-green-600 via-green-700 to-green-800 rounded-2xl shadow-xl p-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
          <div className="relative text-center">
            <h2 className="text-3xl font-bold mb-4">{t('transparency.cta.title')}</h2>
            <p className="text-white/90 mb-8 max-w-lg mx-auto text-lg">
              {t('transparency.cta.subtitle')}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {hydrated && token ? (
                <>
                  <Link
                    href="/dashboard"
                    className="px-8 py-4 bg-white text-green-600 font-semibold rounded-xl hover:bg-white/90 transition-all flex items-center gap-2 shadow-lg"
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    {t('transparency.myDashboard')}
                  </Link>
                  <Link
                    href="/complaints/new"
                    className="px-8 py-4 bg-white/10 backdrop-blur text-white font-semibold rounded-xl hover:bg-white/20 transition-all flex items-center gap-2 border-2 border-white/30"
                  >
                    {t('transparency.hero.reportBtn')}
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="px-8 py-4 bg-white text-green-600 font-semibold rounded-xl hover:bg-white/90 transition-all flex items-center gap-2 shadow-lg"
                  >
                    <Users className="w-5 h-5" />
                    {t('transparency.createAccount')}
                  </Link>
                  <Link
                    href="/login"
                    className="px-8 py-4 bg-white/10 backdrop-blur text-white font-semibold rounded-xl hover:bg-white/20 transition-all flex items-center gap-2 border-2 border-white/30"
                  >
                    {t('transparency.login')}
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 py-8 text-center text-sm text-slate-400 border-t border-slate-200">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <span className="font-semibold text-slate-600">{t('transparency.footer.smartCity')}</span>
          </div>
          <p>
            {t('transparency.footer.lastUpdated')} {new Date().toLocaleDateString(undefined, { 
              day: "numeric", 
              month: "long", 
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            })}
          </p>
        </footer>
      </main>

      {/* Complaint Detail Modal */}
      {selectedComplaint && (() => {
        const c = selectedComplaint;
        const photoUrl = getPhotoUrl(c, c.proofPhotos?.[0]?.url) || getPhotoUrl(c);
        const statusLabels: Record<string, { label: string; color: string }> = {
          VALIDATED: { label: t('transparency.modal.verified'), color: "bg-blue-100 text-blue-700" },
          ASSIGNED: { label: t('transparency.modal.teamAssigned'), color: "bg-purple-100 text-purple-700" },
          IN_PROGRESS: { label: t('transparency.modal.beingFixed'), color: "bg-orange-100 text-orange-700" },
          RESOLVED: { label: t('transparency.modal.fixed'), color: "bg-green-100 text-green-700" },
          CLOSED: { label: t('transparency.modal.closed'), color: "bg-slate-100 text-slate-700" }
        };
        const statusInfo = statusLabels[c.status] || { label: t(`status.${c.status}`), color: "bg-slate-100 text-slate-600" };
        const municipality = c.municipalityName || c.location?.municipality || t('transparency.complaintsView.unknown');
        const createdDate = new Date(c.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
        const resolvedDate = c.resolvedAt
          ? new Date(c.resolvedAt).toLocaleDateString(undefined, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : null;
        const reportPhotos = (c.afterPhotos && c.afterPhotos.length > 0)
          ? c.afterPhotos
          : (c.proofPhotos || []);
        const cleanDesc = (c.description || "")
          .replace(/Contact\s*phone\s*:?[\s\d+\-]*/gi, "")
          .replace(/(\+?\d[\d\s\-]{7,})/g, "")
          .trim();
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedComplaint(null)}>
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {/* Photo */}
              <div className="relative h-56 bg-gradient-to-br from-green-50 to-slate-50">
                {photoUrl ? (
                  <img src={photoUrl} alt={c.title} className="w-full h-full object-cover rounded-t-2xl" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-green-50 rounded-t-2xl">
                    <ImageIcon className="w-12 h-12 text-green-300" />
                  </div>
                )}
                <button onClick={() => setSelectedComplaint(null)} className="absolute top-3 right-3 p-2 bg-black/30 backdrop-blur-sm rounded-full hover:bg-black/50 transition-colors">
                  <X className="w-4 h-4 text-white" />
                </button>
                <div className="absolute top-3 left-3">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                </div>
              </div>
              {/* Content */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-green-100 text-green-700">{getCategoryLabel(c.category)}</span>
                  {c.referenceId && <span className="text-xs text-slate-400">#{c.referenceId}</span>}
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{c.title}</h3>
                {cleanDesc && <p className="text-sm text-slate-600 mb-4 leading-relaxed">{cleanDesc}</p>}
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-green-500" />{municipality}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" />{createdDate}</span>
                </div>

                {(c.status === "RESOLVED" || c.status === "CLOSED") && (
                  <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-green-700 mb-1">
                      Technician report
                    </p>
                    {c.resolutionNotes ? (
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.resolutionNotes}</p>
                    ) : (
                      <p className="text-sm text-slate-500">No technician description provided.</p>
                    )}
                    {resolvedDate && (
                      <p className="text-xs text-slate-500 mt-2">Resolved on {resolvedDate}</p>
                    )}
                    {reportPhotos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {reportPhotos.slice(0, 3).map((photo, idx) => {
                          const src = getPhotoUrl(c, photo.url);
                          if (!src) return null;
                          return (
                            <img
                              key={`${getComplaintKey(c)}-proof-${idx}`}
                              src={src}
                              alt={`Proof ${idx + 1}`}
                              className="w-full h-20 object-cover rounded-lg border border-green-200"
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{c.confirmationCount || 0} {t('transparency.modal.confirms')}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const complaintId = getComplaintId(c);
                      setSelectedComplaint(null);
                      if (complaintId) router.push(`/transparency/complaints/${complaintId}`);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    {t('transparency.modal.fullDetails')}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-700 p-6 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <HelpCircle className="w-6 h-6" />
                  {t('transparency.help.title')}
                </h2>
                <p className="text-green-100 text-sm mt-1">{t('transparency.help.subtitle')}</p>
              </div>
              <button 
                onClick={() => setShowHelp(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Steps */}
            <div className="p-6 space-y-1">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                  <div className="w-0.5 flex-1 bg-green-200 my-1" />
                </div>
                <div className="pb-6">
                  <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-green-600" />
                    {t('transparency.help.step1Title')}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {t('transparency.help.step1Desc')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">{t('transparency.help.step1Badge1')}</span>
                    <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">{t('transparency.help.step1Badge2')}</span>
                    <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">{t('transparency.help.step1Badge3')}</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                  <div className="w-0.5 flex-1 bg-green-200 my-1" />
                </div>
                <div className="pb-6">
                  <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    {t('transparency.help.step2Title')}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {t('transparency.help.step2Desc')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{t('transparency.help.step2Badge1')}</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{t('transparency.help.step2Badge2')}</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{t('transparency.help.step2Badge3')}</span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                  <div className="w-0.5 flex-1 bg-green-200 my-1" />
                </div>
                <div className="pb-6">
                  <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-green-600" />
                    {t('transparency.help.step3Title')}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {t('transparency.help.step3Desc')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full">{t('transparency.help.step3Badge1')}</span>
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full">{t('transparency.help.step3Badge2')}</span>
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full">{t('transparency.help.step3Badge3')}</span>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">4</div>
                  <div className="w-0.5 flex-1 bg-green-200 my-1" />
                </div>
                <div className="pb-6">
                  <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-green-600" />
                    {t('transparency.help.step4Title')}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {t('transparency.help.step4Desc')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded-full">{t('transparency.help.step4Badge1')}</span>
                    <span className="px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded-full">{t('transparency.help.step4Badge2')}</span>
                    <span className="px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded-full">{t('transparency.help.step4Badge3')}</span>
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">5</div>
                  <div className="w-0.5 flex-1 bg-green-200 my-1" />
                </div>
                <div className="pb-6">
                  <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-green-600" />
                    {t('transparency.help.step5Title')}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {t('transparency.help.step5Desc')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full">{t('transparency.help.step5Badge1')}</span>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full">{t('transparency.help.step5Badge2')}</span>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full">{t('transparency.help.step5Badge3')}</span>
                  </div>
                </div>
              </div>

              {/* Step 6 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">6</div>
                </div>
                <div className="pb-2">
                  <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-green-600" />
                    {t('transparency.help.step6Title')}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {t('transparency.help.step6Desc')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 text-xs rounded-full">{t('transparency.help.step6Badge1')}</span>
                    <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 text-xs rounded-full">{t('transparency.help.step6Badge2')}</span>
                    <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 text-xs rounded-full">{t('transparency.help.step6Badge3')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick tips */}
            <div className="mx-6 mb-4 p-4 bg-green-50 rounded-xl border border-green-100">
              <h4 className="text-sm font-semibold text-green-800 mb-2">{t('transparency.help.tipsTitle')}</h4>
              <ul className="text-xs text-green-700 space-y-1">
                <li>• {t('transparency.help.tip1')}</li>
                <li>• {t('transparency.help.tip2')}</li>
                <li>• {t('transparency.help.tip3')}</li>
                <li>• {t('transparency.help.tip4')}</li>
              </ul>
            </div>

            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-4 rounded-b-2xl">
              <button 
                onClick={() => setShowHelp(false)}
                className="w-full py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
              >
                {t('transparency.help.gotIt')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
