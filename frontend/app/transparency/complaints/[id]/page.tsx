"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
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
  ExternalLink
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { categoryLabels } from "@/lib/complaints";

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
const statusLabelsMap: Record<string, string> = {
  SUBMITTED: "Submitted",
  VALIDATED: "Verified by municipality",
  ASSIGNED: "Team assigned",
  IN_PROGRESS: "Work in progress",
  RESOLVED: "Fixed — under review",
  CLOSED: "Fully resolved"
};

const statusConfig: Record<string, { label: string; bgClass: string; textClass: string }> = {
  SUBMITTED: { label: "📝 Submitted", bgClass: "bg-slate-100", textClass: "text-slate-700" },
  VALIDATED: { label: "✅ Verified", bgClass: "bg-blue-100", textClass: "text-blue-700" },
  ASSIGNED: { label: "🔧 Team Assigned", bgClass: "bg-purple-100", textClass: "text-purple-700" },
  IN_PROGRESS: { label: "🚧 Being Fixed", bgClass: "bg-orange-100", textClass: "text-orange-700" },
  RESOLVED: { label: "🎉 Fixed", bgClass: "bg-green-100", textClass: "text-green-700" },
  CLOSED: { label: "✅ Closed", bgClass: "bg-green-100", textClass: "text-green-800" },
};

export default function PublicComplaintDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const complaintId = params.id as string;
  const actionParam = searchParams.get("action");
  
  const { user, token, hydrated } = useAuthStore();
  
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${apiUrl}/public/complaints/${complaintId}/upvote`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();
      if (data.success && complaint) {
        setComplaint({ ...complaint, upvoteCount: data.voteCount });
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${apiUrl}/citizen/complaints/${complaintId}/confirm`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && complaint) {
        setComplaint({ ...complaint, confirmationCount: (complaint.confirmationCount || 0) + 1 });
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      await fetch(`${apiUrl}/public/complaints/${complaintId}/comment`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: commentText, anonymous: isAnonymous })
      });
      setCommentText("");
    } catch { /* silent */ }
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
          <p className="text-slate-600">Loading complaint...</p>
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
          <h2 className="text-xl font-bold text-slate-800 mb-2">Complaint Not Found</h2>
          <p className="text-slate-600 mb-6">{error || "This complaint may not be public yet."}</p>
          <button
            onClick={() => router.push("/transparency")}
            className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[complaint.status] || { label: complaint.status, bgClass: "bg-slate-100", textClass: "text-slate-700" };
  const currentStepIndex = statusSteps.indexOf(complaint.status);
  const municipality = complaint.municipalityName || complaint.location?.municipality || "Unknown";
  const governorate = complaint.location?.governorate || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-slate-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <span className="text-sm font-mono text-slate-400">
            {complaint.referenceId ? `#${complaint.referenceId}` : `#${complaint._id.slice(-6).toUpperCase()}`}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgClass} ${statusInfo.textClass}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photo Gallery */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              {complaint.media && complaint.media.length > 0 ? (
                <div className="relative h-72 md:h-96 bg-slate-100">
                  <img
                    src={complaint.media[currentImageIndex]?.url}
                    alt={complaint.title}
                    className="w-full h-full object-cover"
                  />
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
                Location
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
                  Open in Google Maps
                </a>
              )}
            </div>

            {/* Resolution Report (if RESOLVED or CLOSED) */}
            {(complaint.status === "RESOLVED" || complaint.status === "CLOSED") && (
              <div className="bg-green-50 rounded-2xl border border-green-200 p-6">
                <h3 className="text-base font-semibold text-green-800 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Resolution Report
                </h3>
                <p className="text-sm text-green-700 mb-2">Issue resolved by municipal team.</p>
                {complaint.resolutionNote && (
                  <p className="text-sm text-green-800 bg-white rounded-lg p-3 border border-green-200 mb-3">{complaint.resolutionNote}</p>
                )}
                {complaint.resolvedAt && (
                  <p className="text-xs text-green-600">
                    Resolved on {new Date(complaint.resolvedAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
                    {complaint.createdAt && (() => {
                      const days = Math.round((new Date(complaint.resolvedAt!).getTime() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                      return ` · Fixed in ${days} day${days !== 1 ? 's' : ''}`;
                    })()}
                  </p>
                )}
                {complaint.proofPhotos && complaint.proofPhotos.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {complaint.proofPhotos.map((photo, idx) => (
                      <img key={idx} src={photo.url} alt="Resolution proof" className="w-full h-32 object-cover rounded-lg" />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Comment Section */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-600" />
                Community Comments
              </h3>
              {user && token ? (
                <div className="mb-4">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Share your experience..."
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                      <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="rounded border-slate-300" />
                      Post anonymously
                    </label>
                    <button
                      onClick={handleComment}
                      disabled={!commentText.trim()}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Post Comment
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">
                    <button onClick={() => router.push(`/login?redirect=${encodeURIComponent(`/transparency/complaints/${complaintId}`)}`)} className="text-green-600 hover:text-green-700 font-medium">Sign in</button> to add a comment
                  </p>
                </div>
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
                  <span>Reported {new Date(complaint.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>{municipality}{governorate ? `, ${governorate}` : ""}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Clock className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>{Math.round((Date.now() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days ago</span>
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Status Timeline</h3>
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
                          {statusLabelsMap[step]}
                        </p>
                        {historyEntry && (
                          <p className="text-xs text-slate-400">{new Date(historyEntry.timestamp).toLocaleDateString("en-US", { day: "numeric", month: "short" })}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Engagement Stats & Actions */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Community Engagement</h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-2 bg-pink-50 rounded-xl">
                  <Heart className="w-4 h-4 text-pink-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-slate-800">{complaint.upvoteCount || 0}</p>
                  <p className="text-[10px] text-slate-500">Likes</p>
                </div>
                <div className="text-center p-2 bg-green-50 rounded-xl">
                  <ThumbsUp className="w-4 h-4 text-green-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-slate-800">{complaint.confirmationCount || 0}</p>
                  <p className="text-[10px] text-slate-500">Confirms</p>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-xl">
                  <Eye className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-slate-800">—</p>
                  <p className="text-[10px] text-slate-500">Views</p>
                </div>
              </div>
              <div className="space-y-2">
                <button
                  onClick={(e) => { e.preventDefault(); handleUpvote(); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-pink-50 hover:bg-pink-100 text-pink-600 font-medium rounded-xl text-sm transition-colors"
                >
                  <Heart className="w-4 h-4" />
                  Like This Report
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); handleConfirm(); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-50 hover:bg-green-100 text-green-600 font-medium rounded-xl text-sm transition-colors"
                >
                  <ThumbsUp className="w-4 h-4" />
                  Confirm This Issue
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}