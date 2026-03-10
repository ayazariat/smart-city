"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  MapPin, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Building2,
  ArrowLeft,
  Calendar,
  Shield,
  Loader2,
  Pencil,
  Trash2,
  X,
  Save
} from "lucide-react";
import { Complaint, ComplaintCategory, ComplaintUrgency } from "@/types";
import { complaintService } from "@/services/complaint.service";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui";
import { useLastVisitedPage } from "@/hooks/useLastVisitedPage";

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

// Status labels
const statusConfig: Record<string, { label: string; bgClass: string; textClass: string }> = {
  SUBMITTED: { label: "SUBMITTED", bgClass: "bg-yellow-100", textClass: "text-yellow-800" },
  VALIDATED: { label: "VALIDATED", bgClass: "bg-blue-100", textClass: "text-blue-800" },
  ASSIGNED: { label: "ASSIGNED", bgClass: "bg-purple-100", textClass: "text-purple-800" },
  IN_PROGRESS: { label: "IN PROGRESS", bgClass: "bg-orange-100", textClass: "text-orange-800" },
  RESOLVED: { label: "RESOLVED", bgClass: "bg-green-100", textClass: "text-green-800" },
  CLOSED: { label: "CLOSED", bgClass: "bg-gray-100", textClass: "text-gray-800" },
  REJECTED: { label: "REJECTED", bgClass: "bg-red-100", textClass: "text-red-800" },
};

export default function MyComplaintDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token, hydrated } = useAuthStore();
  const complaintId = params.id as string;
  const { isHydrated, saveLastPage, getLastPage } = useLastVisitedPage();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: "",
    description: "",
    category: "",
    urgency: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Photo modal state
  const [photoModal, setPhotoModal] = useState<{url: string; index: number} | null>(null);

  // Save current page when component mounts
  useEffect(() => {
    if (complaintId && isHydrated) {
      saveLastPage(`/my-complaints/${complaintId}`);
    }
  }, [complaintId, isHydrated, saveLastPage]);

  // Redirect logic - check for saved page first
  useEffect(() => {
    if (!hydrated || !isHydrated) return;
    
    if (!token) {
      router.push("/");
      return;
    }
    if (user && user.role !== "CITIZEN") {
      // For non-citizens, check if there's a saved page to return to
      const lastPage = getLastPage();
      if (lastPage && lastPage.startsWith("/my-complaints/")) {
        router.push(lastPage);
      } else {
        router.push("/dashboard");
      }
      return;
    }
  }, [token, user, router, hydrated, isHydrated, getLastPage]);

  useEffect(() => {
    const fetchComplaintDetail = async () => {
      if (!token || !complaintId) return;

      try {
        setLoading(true);
        setError(null);

        // Use the citizen endpoint to get their own complaint
        const response = await complaintService.getComplaintById(complaintId);

        if (response.complaint) {
          setComplaint(response.complaint);
        } else {
          setError("Complaint not found");
        }
      } catch (err: unknown) {
        console.error("Error fetching complaint:", err);
        const apiError = err as { response?: { status?: number; data?: { message?: string } } };
        if (apiError.response?.status === 403) {
          setError(apiError.response.data?.message || "Access denied. You can only view your own complaints.");
        } else if (apiError.response?.status === 404) {
          setError("Complaint not found");
        } else {
          setError("Error loading complaint");
        }
      } finally {
        setLoading(false);
      }
    };

    if (complaintId && token) {
      fetchComplaintDetail();
    }
  }, [complaintId, token]);

  // Update edit data when complaint loads
  useEffect(() => {
    if (complaint) {
      setEditData({
        title: complaint.title,
        description: complaint.description,
        category: complaint.category,
        urgency: complaint.urgency
      });
    }
  }, [complaint]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (complaint) {
      setEditData({
        title: complaint.title,
        description: complaint.description,
        category: complaint.category,
        urgency: complaint.urgency
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!complaintId || !token) return;
    
    setIsSaving(true);
    try {
      const response = await complaintService.updateComplaint(complaintId, {
        title: editData.title,
        description: editData.description,
        category: editData.category as ComplaintCategory,
        urgency: editData.urgency as ComplaintUrgency
      });
      
      if (response.complaint) {
        setComplaint(response.complaint);
        setIsEditing(false);
      }
    } catch (err: unknown) {
      console.error("Error updating complaint:", err);
      setError("Failed to update complaint. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!complaintId || !token) return;
    
    setIsDeleting(true);
    try {
      await complaintService.deleteComplaint(complaintId);
      router.push("/my-complaints");
    } catch (err: unknown) {
      console.error("Error deleting complaint:", err);
      setError("Failed to delete complaint. Please try again.");
      setDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmResolution = async () => {
    if (!complaintId || !token) return;
    
    setConfirmLoading(true);
    try {
      const response = await complaintService.confirmResolution(complaintId);
      if (response.success) {
        setComplaint(response.data);
      }
    } catch (err: unknown) {
      console.error("Error confirming resolution:", err);
      setError("Failed to confirm resolution. Please try again.");
    } finally {
      setConfirmLoading(false);
    }
  };

  const getComplaintIdDisplay = (id: string) => {
    return `RC-${id.slice(-6)}`;
  };

  const hasLocation = complaint && (
    (complaint.location?.latitude && complaint.location?.longitude) || 
    (complaint.location?.coordinates && complaint.location.coordinates[0] !== 0 && complaint.location.coordinates[1] !== 0)
  );

  // Wait for hydration before rendering
  if (!hydrated || !isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10" role="status" aria-live="polite">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "CITIZEN") {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10" role="status" aria-live="polite">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
        <div className="text-center max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
            {error}
          </div>
          <Button
            variant="primary"
            onClick={() => router.back()}
          >
            Back
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
      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Delete</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this complaint? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {photoModal && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
          onClick={() => setPhotoModal(null)}
        >
          <button
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full transition-colors"
            onClick={() => setPhotoModal(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={photoModal.url}
            alt={`Photo ${photoModal.index + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />
        </div>
      )}

      {/* Header - Green gradient matching dashboard */}
      <header className="bg-gradient-to-r from-primary to-primary-700 text-white shadow-lg" role="banner">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 backdrop-blur-sm flex items-center justify-center text-white"
                aria-label="Go back to my complaints"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="h-6 w-px bg-white/30" aria-hidden="true"></div>
              <h1 className="text-2xl font-bold text-white">
                My Complaint {getComplaintIdDisplay(complaint._id || complaint.id || "")}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <span 
                className={`px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${status.bgClass} ${status.textClass} flex items-center gap-2`}
                aria-label={`Statut: ${status.label}`}
              >
                <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                {status.label}
              </span>
              {complaint.status === "SUBMITTED" && !isEditing && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200 backdrop-blur-sm font-medium flex items-center gap-2"
                    title="Edit complaint"
                  >
                    <Pencil className="w-4 h-4" />
                    Modifier
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-all duration-200 backdrop-blur-sm text-red-200"
                    title="Delete complaint"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              {/* RESOLVED - Citizen can Confirm */}
              {complaint.status === "RESOLVED" && (
                <button
                  onClick={handleConfirmResolution}
                  disabled={confirmLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium text-sm disabled:opacity-50"
                >
                  {confirmLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Confirm Resolution
                </button>
              )}
              {isEditing && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    className="p-2 hover:bg-green-500/20 rounded-lg transition-all duration-200 backdrop-blur-sm text-green-200 disabled:opacity-50"
                    title="Save changes"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 backdrop-blur-sm text-white"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
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
                  <label className="block text-sm font-medium text-slate-500 mb-2">Priority</label>
                  <span className="text-lg font-semibold text-orange-600">
                    {complaint.urgency || "Medium"}
                  </span>
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
                    <CheckCircle2 className="w-4 h-4" />
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
                    <MapPin className="w-12 h-12 mx-auto mb-2 text-red-400" />
                    <p className="text-red-600 font-medium">Location not provided</p>
                    {complaint.location?.address && <p className="text-sm text-gray-600">{complaint.location.address}</p>}
                  </div>
                </div>
              ) : (
                <div className="h-64 bg-gray-100 rounded-lg overflow-hidden">
                  {(() => {
                    // Get coordinates from either format
                    const lat = complaint.location?.latitude || (complaint.location?.coordinates?.[1]);
                    const lng = complaint.location?.longitude || (complaint.location?.coordinates?.[0]);
                    
                    if (lat && lng) {
                      return (
                        <iframe
                          title={`Map of complaint at ${complaint.location.address || 'this location'}`}
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          loading="lazy"
                          allowFullScreen
                          aria-hidden="true"
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                            lng - 0.01
                          }%2C${lat - 0.01}%2C${
                            lng + 0.01
                          }%2C${lat + 0.01}&layer=mapnik&marker=${
                            lat
                          }%2C${lng}`}
                        ></iframe>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
              {complaint.location?.address && (
                <p className="mt-2 text-sm text-gray-600">
                  📍 {complaint.location.address}
                  {complaint.location?.commune && `, ${complaint.location.commune}`}
                  {complaint.location?.governorate && `, ${complaint.location.governorate}`}
                </p>
              )}
              {/* Google Maps Link */}
              {hasLocation && complaint.location?.latitude && complaint.location?.longitude && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${complaint.location.latitude},${complaint.location.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full mt-3 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  Open in Google Maps
                </a>
              )}
            </section>

            {/* Media */}
            <section className="bg-white rounded-xl shadow-sm p-6" aria-labelledby="media-title">
              <h2 id="media-title" className="text-lg font-semibold text-gray-900 mb-4">
                Photos ({complaint.media?.length || 0})
              </h2>
              {!complaint.media || complaint.media.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  <p>No photos provided</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {complaint.media.map((item, index) => (
                    <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      {item.type === "video" ? (
                        <video
                          src={item.url}
                          controls
                          className="w-full h-full object-cover"
                          aria-label={`Video ${index + 1}`}
                        />
                      ) : (
                        <img
                          src={item.url}
                          alt={`Photo ${index + 1} of the complaint`}
                          className="w-full h-full object-cover hover:opacity-90 transition"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = '<div class=\"flex items-center justify-center h-full text-gray-400\"><svg class=\"w-8 h-8\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z\"></path></svg></div>';
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6" role="complementary" aria-label="Additional information">
            {/* Department Info */}
            {complaint.department && (
              <section className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100" aria-labelledby="department-title">
                <h2 id="department-title" className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Département
                </h2>
                <p className="font-semibold text-slate-900">{complaint.department.name}</p>
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
                  <dt className="text-slate-500">Créée:</dt>
                  <dd className="text-slate-900 font-medium">
                    {new Date(complaint.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </dd>
                </div>
                {complaint.updatedAt && complaint.updatedAt !== complaint.createdAt && (
                  <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                    <dt className="text-slate-500">Modifiée:</dt>
                    <dd className="text-slate-900 font-medium">
                      {new Date(complaint.updatedAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
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
          </aside>
        </div>
      </main>
    </div>
  );
}
