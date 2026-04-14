"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle,
  Loader2,
  AlertCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Heart,
  ThumbsUp,
  Eye,
  MessageCircle,
  ExternalLink,
  Sparkles,
  X,
  Menu,
  Home,
  List,
  BarChart3,
  Search,
  HelpCircle,
  Globe
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { categoryLabels, statusConfig as sharedStatusConfig, getComplaintIdDisplay } from "@/lib/complaints";
import { apiClient } from "@/services/api.client";
import { getPhotoUrl } from "@/lib/photos";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useTranslation } from "react-i18next";

interface ComplaintMedia {
  url: string;
  type: string;
}

interface Complaint {
  _id: string;
  referenceId?: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priorityScore: number;
  municipalityName: string;
  location: {
    municipality?: string;
    address?: string;
    governorate?: string;
    coordinates?: { lat: number; lng: number };
  };
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  media?: ComplaintMedia[];
  proofPhotos?: ComplaintMedia[];
  confirmationCount?: number;
  upvoteCount?: number;
  resolutionNote?: string;
  statusHistory?: Array<{ status: string; timestamp: string }>;
}

const statusSteps = ["SUBMITTED", "VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const resolveMediaUrl = (url?: string): string | null => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("//")) return `https:${url}`;

  if (url.startsWith("/uploads/")) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    const origin = apiUrl.replace(/\/api\/?$/, "");
    return `${origin}${url}`;
  }

  return getPhotoUrl(url);
};

export default function PublicComplaintDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const complaintId = params.id as string;
  const actionParam = searchParams.get("action");
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language || "en";
  
  const { user, token, hydrated } = useAuthStore();
  
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [comments, setComments] = useState<Array<{ _id: string; text: string; authorName: string; authorRoleLabel?: string; createdAt: string }>>([]);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchComplaint = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
        const response = await fetch(`${apiUrl}/public/complaints/${complaintId}`);
        
        if (!response.ok) {
          throw new Error("Complaint not found");
        }
        
        const data = await response.json();
        if (data.success && data.data) {
          setComplaint(data.data);
        } else {
          throw new Error("Complaint not found");
        }
      } catch {
        setError("Unable to load complaint details");
      } finally {
        setLoading(false);
      }
    };

    if (complaintId) {
      fetchComplaint();
    }
  }, [complaintId]);

  // Fetch public comments
  const fetchComments = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await fetch(`${apiUrl}/public/complaints/${complaintId}/comments`);
      const data = await res.json();
      if (data.success) {
        setComments(data.data || []);
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (complaintId) {
      fetchComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complaintId]);

  // Handle action after login redirect
  useEffect(() => {
    if (hydrated && user && token && actionParam) {
      if (actionParam === "upvote") {
        handleUpvote();
      } else if (actionParam === "confirm") {
        handleConfirm();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user, token, actionParam]);

  const handleUpvote = async () => {
    if (!user || !token) {
      const returnUrl = `/transparency/complaints/${complaintId}?action=upvote`;
      router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }
    try {
      const data = await apiClient.post<{ success: boolean; upvoteCount?: number; voteCount?: number }>(
        `/public/complaints/${complaintId}/upvote`,
        {}
      );
      const nextVotes = data.upvoteCount ?? data.voteCount ?? 0;
      if (data.success && complaint) {
        setComplaint({ ...complaint, upvoteCount: nextVotes });
      }
    } catch { /* silent */ }
  };

  const handleConfirm = async () => {
    if (!user || !token) {
      const returnUrl = `/transparency/complaints/${complaintId}?action=confirm`;
      router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }
    try {
      const data = await apiClient.post<{ success: boolean; confirmationCount?: number }>(
        `/citizen/complaints/${complaintId}/confirm`,
        {}
      );
      if (data.success && complaint) {
        setComplaint({
          ...complaint,
          confirmationCount: data.confirmationCount ?? (complaint.confirmationCount || 0) + 1,
        });
      }
    } catch { /* silent */ }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    if (!user || !token) {
      router.push(`/login?redirect=${encodeURIComponent(`/transparency/complaints/${complaintId}`)}`);
      return;
    }
    try {
      setSubmittingComment(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await fetch(`${apiUrl}/public/complaints/${complaintId}/comment`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: commentText, anonymous: isAnonymous })
      });
      const data = await res.json();
      if (data.success) {
        setCommentText("");
        setIsAnonymous(false);
        await fetchComments();
      }
    } catch { /* silent */ } finally {
      setSubmittingComment(false);
    }
  };

  const nextImage = () => {
    if (complaint?.media && complaint.media.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % complaint.media!.length);
    }
  };

  const prevImage = () => {
    if (complaint?.media && complaint.media.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + complaint.media!.length) % complaint.media!.length);
    }
  };

  // Clean description: strip phone numbers
  const cleanDescription = (text: string) =>
    text.replace(/Contact\s*phone\s*:?[\s\d+\-]*/gi, "").replace(/(\+?\d[\d\s\-]{7,})/g, "").trim();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-slate-600">{t("publicComplaint.loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-slate-50">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">{t("publicComplaint.notFound")}</h2>
          <p className="text-slate-600 mb-6">{error || t("publicComplaint.notPublicYet")}</p>
          <button
            onClick={() => router.push("/transparency")}
            className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
          >
            {t("publicComplaint.backToDashboard")}
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = sharedStatusConfig[complaint.status] || { label: complaint.status, bgClass: "bg-slate-100", textClass: "text-slate-700", dotClass: "bg-slate-500" };
  const currentStepIndex = statusSteps.indexOf(complaint.status);
  const municipality = complaint.municipalityName || complaint.location?.municipality || "Unknown";
  const governorate = complaint.location?.governorate || "";
  const canEngage = ["VALIDATED", "ASSIGNED", "IN_PROGRESS"].includes(complaint.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-slate-50">
      {/* Header — matches transparency page */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-50 shadow-sm ml-0 md:ml-[260px]">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors md:hidden"
                title={t("publicComplaint.menu")}
              >
                <Menu className="w-5 h-5 text-slate-600" />
              </button>
              <button
                onClick={() => router.back()}
                className="p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                title={t("publicComplaint.back")}
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-slate-800 leading-tight">{t("publicComplaint.complaintDetail")}</h1>
                <p className="text-xs text-slate-500">
                  {complaint.referenceId ? `#${complaint.referenceId}` : getComplaintIdDisplay(complaint._id)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgClass} ${statusInfo.textClass}`}>
                {statusInfo.label}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar — matches transparency page */}
      <aside className={`
        fixed left-0 top-0 h-full w-[260px] bg-white/95 backdrop-blur-xl border-r border-slate-200 z-40
        transform transition-transform duration-300 ease-in-out shadow-xl md:shadow-sm
        md:translate-x-0 md:block
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <Link href="/transparency" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-9 h-9 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 leading-tight">{t("publicComplaint.smartCity")}</h2>
                  <p className="text-[10px] text-slate-400 font-medium">{t("publicComplaint.publicDashboard")}</p>
                </div>
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg md:hidden">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <p className="px-3 mb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t("publicComplaint.navigation")}</p>
            <Link href="/transparency" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800 border-l-[3px] border-transparent pl-[9px] transition-all">
              <Home className="w-[18px] h-[18px] text-slate-400" />
              <span>{t("publicComplaint.overview")}</span>
            </Link>
            <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm bg-green-50 text-green-700 font-semibold border-l-[3px] border-green-600 pl-[9px]">
              <Eye className="w-[18px] h-[18px] text-green-600" />
              <span>{t("publicComplaint.complaintDetail")}</span>
            </div>
            <Link href="/transparency#complaints" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800 border-l-[3px] border-transparent pl-[9px] transition-all">
              <List className="w-[18px] h-[18px] text-slate-400" />
              <span>{t("publicComplaint.allComplaints")}</span>
            </Link>
            <Link href="/transparency#governorates" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800 border-l-[3px] border-transparent pl-[9px] transition-all">
              <Globe className="w-[18px] h-[18px] text-slate-400" />
              <span>{t("publicComplaint.governorates")}</span>
            </Link>
          </nav>

          <div className="p-4 border-t border-slate-100 space-y-2">
            {token ? (
              <Link 
                href="/dashboard"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all shadow-md shadow-green-500/20"
              >
                My Dashboard
              </Link>
            ) : (
              <>
                <Link 
                  href="/login"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all shadow-md shadow-green-500/20"
                >
                  {t("publicComplaint.login")}
                </Link>
                <Link 
                  href="/register"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm text-slate-500 hover:text-green-600 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  {t("publicComplaint.createAccount")}
                </Link>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="ml-0 md:ml-[260px] max-w-6xl mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photo Gallery */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              {complaint.media && complaint.media.length > 0 ? (
                <div className="relative h-72 md:h-96 bg-slate-100">
                  {resolveMediaUrl(complaint.media[currentImageIndex]?.url) ? (
                    <img
                      src={resolveMediaUrl(complaint.media[currentImageIndex]?.url) || ""}
                      alt={complaint.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-100 to-green-50">
                      <Building2 className="w-12 h-12 text-green-300" />
                    </div>
                  )}
                  {complaint.media.length > 1 && (
                    <>
                      <button onClick={prevImage} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white">
                        <ChevronLeft className="w-5 h-5 text-slate-700" />
                      </button>
                      <button onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white">
                        <ChevronRight className="w-5 h-5 text-slate-700" />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {complaint.media.map((_, idx) => (
                          <button key={idx} onClick={() => setCurrentImageIndex(idx)} className={`w-2 h-2 rounded-full transition-colors ${idx === currentImageIndex ? "bg-white" : "bg-white/50"}`} />
                        ))}
                      </div>
                    </>
                  )}
                  <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/50 backdrop-blur rounded text-xs text-white">
                    {currentImageIndex + 1} / {complaint.media.length}
                  </div>
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center">
                  <Building2 className="w-12 h-12 text-green-300" />
                </div>
              )}
            </div>

            {/* Title + Description */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                  {categoryLabels[complaint.category] || complaint.category}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgClass} ${statusInfo.textClass}`}>
                  {statusInfo.label}
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 mb-4">{complaint.title}</h1>
              {complaint.description && (
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {cleanDescription(complaint.description)}
                </p>
              )}
            </div>

            {/* Location */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-600" />
                {t("publicComplaint.location")}
              </h3>
              <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                <span>{municipality}{governorate ? `, ${governorate}` : ""}</span>
                {complaint.location?.address && <span className="text-slate-400">·</span>}
                {complaint.location?.address && <span>{complaint.location.address}</span>}
              </div>
              {complaint.location?.coordinates && (
                <a
                  href={`https://www.google.com/maps?q=${complaint.location.coordinates.lat},${complaint.location.coordinates.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-3 text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  {t("publicComplaint.openInGoogleMaps")}
                </a>
              )}
            </div>

            {/* Resolution Report (if RESOLVED or CLOSED) */}
            {(complaint.status === "RESOLVED" || complaint.status === "CLOSED") && (
              <div className="bg-green-50 rounded-2xl border border-green-200 p-6">
                <h3 className="text-base font-semibold text-green-800 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  {t("publicComplaint.resolutionReport")}
                </h3>
                <p className="text-sm text-green-700 mb-2">{t("publicComplaint.resolvedByTeam")}</p>
                {complaint.resolutionNote && (
                  <p className="text-sm text-green-800 bg-white rounded-lg p-3 border border-green-200 mb-3">{complaint.resolutionNote}</p>
                )}
                {complaint.resolvedAt && (
                  <p className="text-xs text-green-600">
                    {t("publicComplaint.resolvedOn", { date: new Date(complaint.resolvedAt).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }) })}
                    {complaint.createdAt && (() => {
                      const days = Math.round((new Date(complaint.resolvedAt!).getTime() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                      return ` · ${t("publicComplaint.fixedInDays", { n: days })}`;
                    })()}
                  </p>
                )}
                {complaint.proofPhotos && complaint.proofPhotos.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {complaint.proofPhotos.map((photo, idx) => {
                      const proofUrl = resolveMediaUrl(photo.url);
                      return proofUrl ? (
                        <img key={idx} src={proofUrl} alt="Resolution proof" className="w-full h-32 object-cover rounded-lg" />
                      ) : (
                        <div key={idx} className="w-full h-32 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-8 h-8 text-slate-300" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Comment Section */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-600" />
                {t("publicComplaint.communityComments")}
                {comments.length > 0 && (
                  <span className="ml-auto text-xs font-normal text-slate-400">{t("publicComplaint.commentCount", { n: comments.length })}</span>
                )}
              </h3>
              {user && token ? (
                <div className="mb-4">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={t("publicComplaint.commentPlaceholder")}
                    maxLength={1000}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                      <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="rounded border-slate-300" />
                      {t("publicComplaint.postAnonymously")}
                    </label>
                    <button
                      onClick={handleComment}
                      disabled={!commentText.trim() || submittingComment}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {submittingComment && <Loader2 className="w-3 h-3 animate-spin" />}
                      {t("publicComplaint.postComment")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 bg-slate-50 rounded-xl mb-4">
                  <p className="text-sm text-slate-500">
                    <button onClick={() => router.push(`/login?redirect=${encodeURIComponent(`/transparency/complaints/${complaintId}`)}`)} className="text-green-600 hover:text-green-700 font-medium">{t("publicComplaint.signIn")}</button> {t("publicComplaint.toAddComment")}
                  </p>
                </div>
              )}

              {/* Comments list */}
              {comments.length > 0 ? (
                <div className="space-y-3 border-t border-slate-100 pt-4">
                  {comments.map((c) => (
                    <div key={c._id} className="p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700">{c.authorName}</span>
                          {c.authorRoleLabel && c.authorRoleLabel !== "Citizen" && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 bg-green-100 text-green-700 rounded">{c.authorRoleLabel}</span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">
                          {new Date(c.createdAt).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{c.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-3">{t("publicComplaint.noComments")}</p>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            {/* Details Card */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-slate-600">
                  <Calendar className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>{t("publicComplaint.reported", { date: new Date(complaint.createdAt).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }) })}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>{municipality}{governorate ? `, ${governorate}` : ""}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Clock className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>{t("publicComplaint.daysAgo", { n: Math.round((Date.now() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60 * 24)) })}</span>
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">{t("publicComplaint.statusTimeline")}</h3>
              <div className="space-y-0">
                {statusSteps.map((step, idx) => {
                  const isCompleted = idx <= currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  const historyEntry = complaint.statusHistory?.find(h => h.status === step);
                  
                  return (
                    <div key={step} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${
                          isCurrent ? 'bg-green-500 border-green-500 ring-4 ring-green-100' :
                          isCompleted ? 'bg-green-500 border-green-500' :
                          'bg-white border-slate-300'
                        }`} />
                        {idx < statusSteps.length - 1 && (
                          <div className={`w-0.5 h-8 ${isCompleted && idx < currentStepIndex ? 'bg-green-500' : 'bg-slate-200'}`} />
                        )}
                      </div>
                      <div className="pb-6">
                        <p className={`text-sm font-medium ${isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                          {t(`publicComplaint.statusLabels.${step}`)}
                        </p>
                        {historyEntry && (
                          <p className="text-xs text-slate-400">{new Date(historyEntry.timestamp).toLocaleDateString(locale, { day: "numeric", month: "short" })}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Engagement Stats & Actions */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">{t("publicComplaint.communityEngagement")}</h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-2 bg-pink-50 rounded-xl">
                  <Heart className="w-4 h-4 text-pink-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-slate-800">{complaint.upvoteCount || 0}</p>
                  <p className="text-[10px] text-slate-500">{t("publicComplaint.likes")}</p>
                </div>
                <div className="text-center p-2 bg-green-50 rounded-xl">
                  <ThumbsUp className="w-4 h-4 text-green-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-slate-800">{complaint.confirmationCount || 0}</p>
                  <p className="text-[10px] text-slate-500">{t("publicComplaint.confirms")}</p>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-xl">
                  <Eye className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-slate-800">—</p>
                  <p className="text-[10px] text-slate-500">{t("publicComplaint.views")}</p>
                </div>
              </div>
              <div className="space-y-2">
                <button
                  onClick={(e) => { e.preventDefault(); handleUpvote(); }}
                  disabled={!canEngage}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-pink-50 hover:bg-pink-100 text-pink-600 font-medium rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Heart className="w-4 h-4" />
                  {t("publicComplaint.likeReport")}
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); handleConfirm(); }}
                  disabled={!canEngage}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-50 hover:bg-green-100 text-green-600 font-medium rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ThumbsUp className="w-4 h-4" />
                  {t("publicComplaint.confirmIssue")}
                </button>
                {!canEngage && (
                  <p className="text-xs text-slate-500 text-center pt-1">
                    {t("publicComplaint.actionsDisabled")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}