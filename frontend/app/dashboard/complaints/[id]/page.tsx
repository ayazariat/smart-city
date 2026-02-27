"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  MapPin, 
  Image as ImageIcon, 
  Video, 
  Clock, 
  User, 
  AlertTriangle,
  CheckCircle2,
  Building2,
  UserCog,
  MessageSquare,
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  Shield,
  Loader2,
  X
} from "lucide-react";
import { Complaint } from "@/types";
import { complaintService } from "@/services/complaint.service";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui";

// Category labels
const categoryLabels: Record<string, string> = {
  ROAD: "Roads",
  LIGHTING: "Lighting",
  WASTE: "Waste",
  WATER: "Water",
  SAFETY: "Safety",
  PUBLIC_PROPERTY: "Public Property",
  GREEN_SPACE: "Green Spaces",
  BUILDING: "Buildings",
  NOISE: "Noise",
  OTHER: "Other",
};

// Status labels (as per BL-16 specifications)
const statusConfig: Record<string, { label: string; bgClass: string; textClass: string }> = {
  SUBMITTED: { label: "SUBMITTED", bgClass: "bg-yellow-100", textClass: "text-yellow-800" },
  VALIDATED: { label: "VALIDATED", bgClass: "bg-blue-100", textClass: "text-blue-800" },
  ASSIGNED: { label: "ASSIGNED", bgClass: "bg-purple-100", textClass: "text-purple-800" },
  IN_PROGRESS: { label: "IN PROGRESS", bgClass: "bg-orange-100", textClass: "text-orange-800" },
  RESOLVED: { label: "RESOLVED", bgClass: "bg-green-100", textClass: "text-green-800" },
  CLOSED: { label: "CLOSED", bgClass: "bg-gray-100", textClass: "text-gray-800" },
  REJECTED: { label: "REJECTED", bgClass: "bg-red-100", textClass: "text-red-800" },
};

// Urgency labels
const urgencyLabels: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export default function ComplaintDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const complaintId = params.id as string;

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mediaErrors, setMediaErrors] = useState<Record<number, boolean>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [actionModal, setActionModal] = useState<string | null>(null);
  const [selectedUrgency, setSelectedUrgency] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");

  useEffect(() => {
    const fetchComplaintDetail = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await complaintService.getComplaintDetail(complaintId);

        if (response.success) {
          setComplaint(response.data);
        } else {
          setError("Complaint not found");
        }
      } catch (err: unknown) {
        console.error("Error fetching complaint:", err);
        const apiError = err as { response?: { status?: number; data?: { message?: string } } };
        if (apiError.response?.status === 403) {
          setError(apiError.response.data?.message || "Access denied. You don't have permission to view this complaint.");
        } else if (apiError.response?.status === 404) {
          setError("Complaint not found");
        } else {
          setError("Error loading complaint");
        }
      } finally {
        setLoading(false);
      }
    };

    if (complaintId) {
      fetchComplaintDetail();
    }
  }, [complaintId]);

  const getComplaintIdDisplay = (id: string) => {
    return `RC-${id.slice(-6)}`;
  };

  const getUrgencyValue = (urgency: string | number): number => {
    if (typeof urgency === "number") return urgency;
    const urgencyMap: Record<string, number> = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 4,
      URGENT: 5,
    };
    return urgencyMap[urgency] || 3;
  };

  const handleMediaError = (index: number) => {
    setMediaErrors((prev) => ({ ...prev, [index]: true }));
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!complaint) return;
    setActionLoading(true);
    try {
      const response = await complaintService.updateComplaintStatus(
        complaint._id || complaint.id || "",
        newStatus,
        newStatus === "REJECTED" ? rejectionReason : undefined
      );
      if (response.success) {
        setComplaint(response.data);
        setActionModal(null);
        setRejectionReason("");
      }
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePriorityUpdate = async () => {
    if (!complaint || !selectedUrgency) return;
    setActionLoading(true);
    try {
      const response = await complaintService.updateComplaintPriority(
        complaint._id || complaint.id || "",
        selectedUrgency
      );
      if (response.success) {
        setComplaint(response.data);
        setActionModal(null);
        setSelectedUrgency("");
      }
    } catch (err) {
      console.error("Error updating priority:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const isAgentOrManager =
    user?.role === "MUNICIPAL_AGENT" ||
    user?.role === "DEPARTMENT_MANAGER" ||
    user?.role === "ADMIN";

  // Check if current user is the owner of the complaint
  const isOwner = (() => {
    if (!complaint || !user?.id) return false;
    const citizenId = typeof complaint.citizen?._id === "string" ? complaint.citizen._id : 
                      typeof complaint.createdBy === "object" ? complaint.createdBy?._id :
                      complaint.createdBy;
    return citizenId === user.id;
  })();

  // Show contact info for agents/managers OR the owner
  const canViewContact = isAgentOrManager || isOwner;

  const hasLocation = complaint?.location?.latitude && complaint?.location?.longitude;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" role="status" aria-live="polite">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" aria-hidden="true"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
            {error}
          </div>
          <Button
            variant="primary"
            onClick={() => router.push("/dashboard")}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!complaint) {
    return null;
  }

  const status = statusConfig[complaint.status] || {
    label: complaint.status,
    bgClass: "bg-gray-100",
    textClass: "text-gray-800",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200" role="banner">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                icon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => router.push("/dashboard")}
              >
                Back
              </Button>
              <div className="h-6 w-px bg-slate-300" aria-hidden="true"></div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Complaint {getComplaintIdDisplay(complaint._id || complaint.id || "")}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <span 
                className={`px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${status.bgClass} ${status.textClass} flex items-center gap-2`}
                aria-label={`Status: ${status.label}`}
              >
                <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                {status.label}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6" role="main">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <section className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100" aria-labelledby="basic-info-title">
              <h2 id="basic-info-title" className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Main Information
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <label className="block text-sm font-medium text-slate-500 mb-2">Category</label>
                  <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md">
                    {categoryLabels[complaint.category] || complaint.category}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <label className="block text-sm font-medium text-slate-500 mb-2">Urgency</label>
                  <div className="flex items-center gap-2" role="group" aria-label={`Urgency: ${getUrgencyValue(complaint.urgency)} out of 5`}>
                    <div className="flex gap-1" aria-hidden="true">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`w-4 h-4 rounded-full transition-all ${
                            level <= getUrgencyValue(complaint.urgency)
                              ? "bg-gradient-to-r from-orange-400 to-red-500 shadow-sm"
                              : "bg-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xl font-bold text-orange-600">
                      {getUrgencyValue(complaint.urgency)}
                    </span>
                    <span className="text-sm text-slate-500">
                      ({urgencyLabels[complaint.urgency as string] || "Moyenne"})
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Status Timeline */}
            <section className="bg-gradient-to-r from-primary/5 to-secondary-50 rounded-2xl shadow-lg p-6 border border-primary/10">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Status Timeline
              </h2>
              <div className="flex items-center justify-between relative">
                {/* Progress line */}
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 rounded-full -translate-y-1/2"></div>
                <div 
                  className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-green-400 to-primary rounded-full -translate-y-1/2 transition-all duration-500"
                  style={{ width: complaint.status === 'RESOLVED' || complaint.status === 'CLOSED' ? '100%' : complaint.status === 'IN_PROGRESS' || complaint.status === 'ASSIGNED' ? '60%' : complaint.status === 'VALIDATED' ? '30%' : '15%' }}
                ></div>
                
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${complaint.status !== 'SUBMITTED' && complaint.status !== 'REJECTED' ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'} transition-all duration-300`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs mt-1 font-medium text-slate-600">Submitted</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${complaint.status !== 'SUBMITTED' && complaint.status !== 'REJECTED' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-400'} transition-all duration-300`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs mt-1 font-medium text-slate-600">Validated</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(complaint.status) ? 'bg-purple-500 text-white' : 'bg-slate-200 text-slate-400'} transition-all duration-300`}>
                    <UserCog className="w-4 h-4" />
                  </div>
                  <span className="text-xs mt-1 font-medium text-slate-600">Assigned</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${['IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(complaint.status) ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-400'} transition-all duration-300`}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-xs mt-1 font-medium text-slate-600">In Progress</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${['RESOLVED', 'CLOSED'].includes(complaint.status) ? 'bg-green-600 text-white' : complaint.status === 'REJECTED' ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-400'} transition-all duration-300`}>
                    {complaint.status === 'REJECTED' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <span className="text-xs mt-1 font-medium text-slate-600">{complaint.status === 'REJECTED' ? 'Rejected' : 'Resolved'}</span>
                </div>
              </div>
            </section>

            {/* Description */}
            <section className="bg-white rounded-xl shadow-sm p-6" aria-labelledby="description-title">
              <h2 id="description-title" className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
              <p className="text-gray-800 whitespace-pre-wrap">{complaint.description}</p>
            </section>

            {/* Location */}
            <section className="bg-white rounded-xl shadow-sm p-6" aria-labelledby="location-title">
              <h2 id="location-title" className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
              {!hasLocation ? (
                <div className="h-64 bg-red-50 rounded-lg flex items-center justify-center border-2 border-red-200 border-dashed">
                  <div className="text-center">
                    <svg className="w-12 h-12 mx-auto mb-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-red-600 font-medium">Missing location ⚠️</p>
                    {complaint.location?.address && <p className="text-sm text-gray-600">{complaint.location.address}</p>}
                  </div>
                </div>
              ) : (
                <div className="h-64 bg-gray-100 rounded-lg overflow-hidden">
                  {complaint.location && complaint.location.latitude && complaint.location.longitude && (
                    <iframe
                      title={`Carte de la réclamation à ${complaint.location.address || 'cette position'}`}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      aria-hidden="true"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                        complaint.location.longitude - 0.01
                      }%2C${complaint.location.latitude - 0.01}%2C${
                        complaint.location.longitude + 0.01
                      }%2C${complaint.location.latitude + 0.01}&layer=mapnik&marker=${
                        complaint.location.latitude
                      }%2C${complaint.location.longitude}`}
                    ></iframe>
                  )}
                </div>
              )}
              {complaint.location?.address && (
                <p className="mt-2 text-sm text-gray-600">
                  📍 {complaint.location.address}
                  {complaint.location?.commune && `, ${complaint.location.commune}`}
                  {complaint.location?.governorate && `, ${complaint.location.governorate}`}
                </p>
              )}
            </section>

            {/* Media */}
            <section className="bg-white rounded-xl shadow-sm p-6" aria-labelledby="media-title">
              <h2 id="media-title" className="text-lg font-semibold text-gray-900 mb-4">
                Media ({complaint.media?.length || 0})
              </h2>
              {!complaint.media || complaint.media.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p>No media provided</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {complaint.media.map((item, index) => (
                    <div key={index} className="relative">
                      {mediaErrors[index] ? (
                        <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                      ) : item.type === "video" ? (
                        <video
                          src={item.url}
                          controls
                          className="w-full h-32 object-cover rounded-lg"
                          aria-label={`Vidéo ${index + 1}`}
                        />
                      ) : (
                        <img
                          src={item.url}
                          alt={`Photo ${index + 1} de la réclamation`}
                          className="w-full h-32 object-cover rounded-lg hover:opacity-90 transition"
                          onError={() => handleMediaError(index)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Comments/History */}
            {complaint.comments && complaint.comments.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm p-6" aria-labelledby="history-title">
                <h2 id="history-title" className="text-lg font-semibold text-gray-900 mb-4">
                  History ({complaint.comments.length})
                </h2>
                <div className="space-y-4">
                  {complaint.comments.map((comment) => (
                    <div key={comment._id} className="border-b pb-4 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">
                          {comment.author?.fullName || "User"}
                        </span>
                        <time className="text-sm text-gray-500" dateTime={comment.createdAt}>
                          {new Date(comment.createdAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                      <p className="text-gray-700">{comment.text}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6" role="complementary" aria-label="Additional information">
            {/* Citizen Info */}
            <section className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100" aria-labelledby="citizen-title">
              <h2 id="citizen-title" className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Citizen
              </h2>
              {complaint.isAnonymous ? (
                <p className="text-slate-500 italic flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Anonymous Citizen
                </p>
              ) : complaint.citizen ? (
                <div className="space-y-3">
                  <p className="font-semibold text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    {complaint.citizen.fullName}
                  </p>
                  {complaint.citizen.email && canViewContact && (
                    <p className="text-sm text-slate-500 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {complaint.citizen.email}
                    </p>
                  )}
                  {complaint.citizen.phone && canViewContact && (
                    <p className="text-sm text-slate-500 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {complaint.citizen.phone}
                    </p>
                  )}
                  {!canViewContact && (complaint.citizen.email || complaint.citizen.phone) && (
                    <p className="text-sm text-slate-400 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Contact hidden
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-slate-500">Information not available</p>
              )}
            </section>

            {/* Department Info */}
            {complaint.department && (
              <section className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100" aria-labelledby="department-title">
                <h2 id="department-title" className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Department
                </h2>
                <p className="font-semibold text-slate-900">{complaint.department.name}</p>
              </section>
            )}

            {/* Assigned To */}
            {complaint.assignedTo && (
              <section className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100" aria-labelledby="assigned-title">
                <h2 id="assigned-title" className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-primary" />
                  Assigned to
                </h2>
                <p className="font-semibold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  {complaint.assignedTo.fullName}
                </p>
                {complaint.assignedTo.email && (
                  <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4" />
                    {complaint.assignedTo.email}
                  </p>
                )}
              </section>
            )}

            {/* Timestamps */}
            <section className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100" aria-labelledby="dates-title">
              <h2 id="dates-title" className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Dates
              </h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <dt className="text-slate-500 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Created:
                  </dt>
                  <dd className="text-slate-900 font-medium">
                    <time dateTime={complaint.createdAt}>
                      {new Date(complaint.createdAt).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </time>
                  </dd>
                </div>
                {complaint.updatedAt && complaint.updatedAt !== complaint.createdAt && (
                  <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                    <dt className="text-slate-500 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Updated:
                    </dt>
                    <dd className="text-slate-900 font-medium">
                      <time dateTime={complaint.updatedAt}>
                        {new Date(complaint.updatedAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </time>
                    </dd>
                  </div>
                )}
                {complaint.resolvedAt && (
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
                    <dt className="text-green-600 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Resolved:
                    </dt>
                    <dd className="text-green-700 font-medium">
                      <time dateTime={complaint.resolvedAt}>
                        {new Date(complaint.resolvedAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </time>
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Rejection Reason */}
            {complaint.rejectionReason && (
              <section className="bg-red-50 rounded-2xl shadow-lg p-6 border border-red-200" aria-labelledby="rejection-title">
                <h2 id="rejection-title" className="text-lg font-semibold text-red-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Motif de rejet
                </h2>
                <p className="text-red-800">{complaint.rejectionReason}</p>
              </section>
            )}

            {/* Actions for Agent/Manager */}
            {isAgentOrManager && (
              <section className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl shadow-lg p-6 border border-primary/20" aria-labelledby="actions-title">
                <h2 id="actions-title" className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Actions
                </h2>
                <div className="space-y-3">
                  {complaint.status === "SUBMITTED" && (
                    <>
                      <Button
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                        icon={<CheckCircle2 className="w-4 h-4" />}
                        onClick={() => setActionModal("validate")}
                      >
                        Valider la réclamation
                      </Button>
                      <Button
                        className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                        icon={<X className="w-4 h-4" />}
                        onClick={() => setActionModal("reject")}
                      >
                        Rejeter la réclamation
                      </Button>
                    </>
                  )}
                  <Button
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    icon={<Building2 className="w-4 h-4" />}
                    onClick={() => setActionModal("department")}
                  >
                    Assigner un département
                  </Button>
                  <Button
                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                    icon={<AlertTriangle className="w-4 h-4" />}
                    onClick={() => setActionModal("priority")}
                  >
                    Modifier la priorité
                  </Button>
                </div>
              </section>
            )}
          </aside>
        </div>
      </main>

      {/* Action Modals */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {actionModal === "validate" && "Valider la réclamation"}
              {actionModal === "reject" && "Rejeter la réclamation"}
              {actionModal === "department" && "Assigner un département"}
              {actionModal === "priority" && "Modifier la priorité"}
            </h3>
            
            {actionModal === "validate" && (
              <div className="space-y-4">
                <p className="text-slate-600">
                  Voulez-vous valider cette réclamation ? Elle sera envoyée au département approprié.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setActionModal(null)}
                  >
                    Annuler
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleStatusUpdate("VALIDATED")}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Valider"}
                  </Button>
                </div>
              </div>
            )}

            {actionModal === "reject" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Motif du rejet
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    rows={3}
                    placeholder="Expliquez pourquoi cette réclamation est rejetée..."
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setActionModal(null)}
                  >
                    Annuler
                  </Button>
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={() => handleStatusUpdate("REJECTED")}
                    disabled={actionLoading || !rejectionReason.trim()}
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Rejeter"}
                  </Button>
                </div>
              </div>
            )}

            {actionModal === "priority" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Niveau de priorité
                  </label>
                  <select
                    value={selectedUrgency}
                    onChange={(e) => setSelectedUrgency(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="LOW">Basse</option>
                    <option value="MEDIUM">Moyenne</option>
                    <option value="HIGH">Haute</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setActionModal(null)}
                  >
                    Annuler
                  </Button>
                  <Button
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    onClick={handlePriorityUpdate}
                    disabled={actionLoading || !selectedUrgency}
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mettre à jour"}
                  </Button>
                </div>
              </div>
            )}

            {actionModal === "department" && (
              <div className="space-y-4">
                <p className="text-slate-600">
                  La fonctionnalité d'assignation de département sera bientôt disponible.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setActionModal(null)}
                >
                  Fermer
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
