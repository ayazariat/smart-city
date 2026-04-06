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
  ThumbsUp,
  User,
  Loader2,
  AlertCircle,
  Building2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { categoryLabels } from "@/lib/complaints";

interface ComplaintMedia {
  url: string;
  type: string;
}

interface Complaint {
  _id: string;
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
  };
  createdAt: string;
  updatedAt: string;
  media?: ComplaintMedia[];
  confirmationCount?: number;
  upvoteCount?: number;
}

const statusConfig: Record<string, { label: string; bgClass: string; textClass: string }> = {
  VALIDATED: { label: "Validated", bgClass: "bg-blue-100", textClass: "text-blue-700" },
  ASSIGNED: { label: "Assigned", bgClass: "bg-purple-100", textClass: "text-purple-700" },
  IN_PROGRESS: { label: "In Progress", bgClass: "bg-orange-100", textClass: "text-orange-700" },
  RESOLVED: { label: "Resolved", bgClass: "bg-green-100", textClass: "text-green-700" },
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
  const [actionPerformed, setActionPerformed] = useState<string | null>(null);

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
      } catch (err) {
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
    if (hydrated && user && token && actionParam && !actionPerformed) {
      // User just logged in and has pending action
      if (actionParam === "upvote") {
        setActionPerformed("upvote");
        // Could trigger upvote API here
      } else if (actionParam === "confirm") {
        setActionPerformed("confirm");
        // Could trigger confirm API here
      }
    }
  }, [hydrated, user, token, actionParam, actionPerformed]);

  const handleUpvote = () => {
    if (!user || !token) {
      const returnUrl = `/transparency/complaints/${complaintId}?action=upvote`;
      router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
    } else {
      setActionPerformed("upvote");
      // Could trigger upvote API here
    }
  };

  const handleConfirm = () => {
    if (!user || !token) {
      const returnUrl = `/transparency/complaints/${complaintId}?action=confirm`;
      router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
    } else {
      setActionPerformed("confirm");
      // Could trigger confirm API here
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Dashboard</span>
        </button>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {complaint.media && complaint.media.length > 0 ? (
            <div className="relative h-80 md:h-96 bg-slate-100">
              <img
                src={complaint.media[currentImageIndex]?.url}
                alt={complaint.title}
                className="w-full h-full object-cover"
              />
              {complaint.media.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-700" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-700" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {complaint.media.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          idx === currentImageIndex ? "bg-white" : "bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="h-48 bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Building2 className="w-8 h-8 text-green-600" />
              </div>
            </div>
          )}

          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgClass} ${statusInfo.textClass}`}>
                {statusInfo.label}
              </span>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700">
                {categoryLabels[complaint.category] || complaint.category}
              </span>
              {complaint.priorityScore >= 15 && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                  High Priority
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">{complaint.title}</h1>

            <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-6">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-600" />
                <span>{complaint.municipalityName || complaint.location?.municipality || "Unknown"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-green-600" />
                <span>{new Date(complaint.createdAt).toLocaleDateString("fr-FR")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-600" />
                <span>Score: {complaint.priorityScore}</span>
              </div>
              {complaint.assignedDepartment && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  <span className="text-purple-600 font-medium">{complaint.assignedDepartment.name || "Assigned"}</span>
                </div>
              )}
            </div>

            {complaint.description && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-slate-800 mb-3">Description</h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{complaint.description}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-200">
              <button
                onClick={handleUpvote}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
              >
                <ThumbsUp className="w-5 h-5" />
                Upvote ({complaint.upvoteCount || 0})
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-green-600 text-green-700 rounded-xl hover:bg-green-50 transition-colors font-medium"
              >
                <CheckCircle className="w-5 h-5" />
                Confirm ({complaint.confirmationCount || 0})
              </button>
            </div>

            <p className="text-center text-sm text-slate-500 mt-4">
              Login to upvote or confirm this complaint
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}