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
  Save,
  Phone
} from "lucide-react";
import { Complaint, ComplaintCategory, ComplaintUrgency } from "@/types";
import { complaintService } from "@/services/complaint.service";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui";
import { useLastVisitedPage } from "@/hooks/useLastVisitedPage";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { categoryLabels, statusConfig, getComplaintIdDisplay } from "@/lib/complaints";
import { useTranslation } from "react-i18next";

export default function MyComplaintDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token, hydrated } = useAuthStore();
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language || "en";
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
    urgency: "",
    phone: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Photo modal state
  const [photoModal, setPhotoModal] = useState<{url: string; index: number} | null>(null);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);

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
          setError(t("complaintDetail.errorNotFound"));
        }
      } catch (err: unknown) {
        const apiError = err as { response?: { status?: number; data?: { message?: string } } };
        if (apiError.response?.status === 403) {
          setError(apiError.response.data?.message || t("complaintDetail.errorOwnOnly"));
        } else if (apiError.response?.status === 404) {
          setError(t("complaintDetail.errorNotFound"));
        } else {
          setError(t("complaintDetail.errorLoading"));
        }
      } finally {
        setLoading(false);
      }
    };

    if (complaintId && token) {
      fetchComplaintDetail();
    }
  }, [complaintId, token, t]);

  // Update edit data when complaint loads
  useEffect(() => {
    if (complaint) {
      setEditData({
        title: complaint.title,
        description: complaint.description,
        category: complaint.category,
        urgency: complaint.urgency,
        phone: complaint.phone || ""
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
        urgency: complaint.urgency,
        phone: complaint.phone || ""
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
        urgency: editData.urgency as ComplaintUrgency,
        phone: editData.phone
      });
      
      if (response.complaint) {
        setComplaint(response.complaint);
        setIsEditing(false);
      }
    } catch {
      setError(t("complaintDetail.errorUpdate"));
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
    } catch {
      setError(t("complaintDetail.errorDelete"));
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
    } catch {
      setError(t("complaintDetail.errorConfirm"));
    } finally {
      setConfirmLoading(false);
    }
  };

  const hasLocation = complaint && (
    (complaint.location?.latitude && complaint.location?.longitude) || 
    (complaint.location?.coordinates && complaint.location.coordinates[0] !== 0 && complaint.location.coordinates[1] !== 0)
  );

  // Helper to get full Cloudinary URL
  const getPhotoUrl = (url: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo';
    if (url.includes('/')) {
      return `https://res.cloudinary.com/${cloudName}/image/upload/${url}`;
    }
    return `https://res.cloudinary.com/${cloudName}/image/upload/${url}`;
  };

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
    <DashboardLayout>
    <div className="min-h-screen bg-slate-50/50">
      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("complaintDetail.confirmDeleteTitle")}</h3>
            <p className="text-gray-600 mb-4">
              {t("complaintDetail.confirmDeleteBody")}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isDeleting}
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? t("complaintDetail.deleting") : t("common.delete")}
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

      {/* Header - White design matching dashboard */}
      <header className="bg-white border-b border-slate-200 shadow-sm" role="banner">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all duration-300 hover:scale-110 active:scale-95"
                aria-label="Go back to my complaints"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="h-6 w-px bg-slate-200" aria-hidden="true"></div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  {complaint.title || `${t("complaintDetail.complaint")} ${getComplaintIdDisplay(complaint._id || complaint.id || "")}`}
                </h1>
                {complaint.department && (
                  <p className="text-xs text-slate-500">{t("complaintDetail.assignedTo")}: {complaint.department.name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {complaint.assignedDepartment && typeof complaint.assignedDepartment === 'object' && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  {complaint.assignedDepartment.name}
                </span>
              )}
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
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all duration-200 font-medium flex items-center gap-2"
                    title="Edit complaint"
                  >
                    <Pencil className="w-4 h-4" />
                    {t("complaintDetail.edit")}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-all duration-200 text-red-500"
                    title="Delete complaint"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              {/* Note: Citizen confirmation removed - complaint auto-confirmed when resolved */}
              {isEditing && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    className="p-2 hover:bg-green-50 rounded-lg transition-all duration-200 text-green-600 disabled:opacity-50"
                    title="Save changes"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-all duration-200 text-slate-600"
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
                {t("complaintDetail.mainInformation")}
              </h2>
              
              {/* Title */}
              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <label className="block text-sm font-medium text-slate-500 mb-2">{t("complaintDetail.title")}</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary"
                    placeholder={t("complaintDetail.titlePlaceholder")}
                  />
                ) : (
                  <span className="text-lg font-semibold text-slate-900">{complaint.title}</span>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <label className="block text-sm font-medium text-slate-500 mb-2">{t("complaintDetail.category")}</label>
                  {isEditing ? (
                    <select
                      value={editData.category}
                      onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary"
                    >
                      <option value="ROAD">{categoryLabels.ROAD}</option>
                      <option value="LIGHTING">{categoryLabels.LIGHTING}</option>
                      <option value="WASTE">{categoryLabels.WASTE}</option>
                      <option value="WATER">{categoryLabels.WATER}</option>
                      <option value="SAFETY">{categoryLabels.SAFETY}</option>
                      <option value="PUBLIC_PROPERTY">{categoryLabels.PUBLIC_PROPERTY}</option>
                      <option value="OTHER">{categoryLabels.OTHER}</option>
                    </select>
                  ) : (
                    <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md">
                      {categoryLabels[complaint.category] || complaint.category}
                    </span>
                  )}
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <label className="block text-sm font-medium text-slate-500 mb-2">{t("complaintDetail.priority")}</label>
                  {isEditing ? (
                    <select
                      value={editData.urgency}
                      onChange={(e) => setEditData({ ...editData, urgency: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary"
                    >
                      <option value="LOW">{t("complaintDetail.low")}</option>
                      <option value="MEDIUM">{t("complaintDetail.medium")}</option>
                      <option value="HIGH">{t("complaintDetail.high")}</option>
                      <option value="URGENT">{t("complaintDetail.urgent")}</option>
                    </select>
                  ) : (
                    <span className="text-lg font-semibold text-orange-600">
                      {complaint.urgency || t("complaintDetail.medium")}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-4 bg-slate-50 rounded-xl p-4">
                <label className="block text-sm font-medium text-slate-500 mb-2">{t("complaintDetail.phone")}</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    placeholder={t("complaintDetail.phonePlaceholder")}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <span className="text-slate-700">{complaint.phone || t("complaintDetail.notProvided")}</span>
                )}
              </div>
            </section>

            {/* Status Timeline */}
            <section className="bg-gradient-to-r from-primary/5 to-secondary-50 rounded-2xl shadow-lg p-6 border border-primary/10">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                {t("complaintDetail.statusTimeline")}
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
                  <span className="text-xs mt-1 font-medium text-slate-600">{t("complaintDetail.submitted")}</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${complaint.status !== 'SUBMITTED' && complaint.status !== 'REJECTED' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-400'} transition-all duration-300`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs mt-1 font-medium text-slate-600">{t("complaintDetail.validated")}</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(complaint.status) ? 'bg-purple-500 text-white' : 'bg-slate-200 text-slate-400'} transition-all duration-300`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs mt-1 font-medium text-slate-600">{t("complaintDetail.assigned")}</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${['IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(complaint.status) ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-400'} transition-all duration-300`}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-xs mt-1 font-medium text-slate-600">{t("complaintDetail.inProgress")}</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${['RESOLVED', 'CLOSED'].includes(complaint.status) ? 'bg-green-600 text-white' : complaint.status === 'REJECTED' ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-400'} transition-all duration-300`}>
                    {complaint.status === 'REJECTED' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <span className="text-xs mt-1 font-medium text-slate-600">{complaint.status === 'REJECTED' ? t("complaintDetail.rejected") : t("complaintDetail.resolved")}</span>
                </div>
              </div>
            </section>

            {/* History Timeline */}
            {complaint.statusHistory && complaint.statusHistory.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm p-6" aria-labelledby="history-title">
                <h2 id="history-title" className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  {t("complaintDetail.history")}
                </h2>
                <div className="space-y-4">
                  {complaint.statusHistory.map((entry, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-3 bg-slate-50 rounded-lg">
                      <div className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-900">
                            {entry.status === 'SUBMITTED' ? 'Submitted' :
                             entry.status === 'VALIDATED' ? 'Validated' :
                             entry.status === 'ASSIGNED' ? 'Assigned to department' :
                             entry.status === 'IN_PROGRESS' ? 'Work started' :
                             entry.status === 'RESOLVED' ? 'Resolved' :
                             entry.status === 'CLOSED' ? 'Closed' :
                             entry.status === 'REJECTED' ? 'Rejected' :
                             entry.status}
                          </span>
                          <span className="text-xs text-slate-500">
                            {entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : ''}
                          </span>
                        </div>
                        {entry.updatedBy?.fullName && (
                          <p className="text-sm text-slate-600">By {entry.updatedBy.fullName}</p>
                        )}
                        {entry.notes && (
                          <p className="text-sm text-slate-500 mt-1 italic">{entry.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Description */}
            <section className="bg-white rounded-xl shadow-sm p-6" aria-labelledby="description-title">
              <h2 id="description-title" className="text-lg font-semibold text-gray-900 mb-4">{t("complaintDetail.description")}</h2>
              {isEditing ? (
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Describe the issue in detail..."
                />
              ) : (
                (() => {
                  const contactMatch = complaint.description.match(/Contact phone:\s*(\+216\s*\d+|\d+)/i);
                  const contactPhone = contactMatch ? contactMatch[0].replace('Contact phone:', '').trim() : null;
                  const cleanDescription = contactPhone 
                    ? complaint.description.replace(/Contact phone:\s*\+?216?\s*\d+/gi, '').trim()
                    : complaint.description;
                  return (
                    <>
                      <p className="text-gray-800 whitespace-pre-wrap">{cleanDescription}</p>
                      {contactPhone && (
                        <div className="mt-4 p-3 bg-primary/5 rounded-xl border border-primary/20">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <Phone className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t("complaintDetail.contactPhone")}</p>
                              <p className="text-lg font-bold text-primary">{contactPhone}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()
              )}
            </section>

            {/* Location */}
            <section className="bg-white rounded-xl shadow-sm p-6" aria-labelledby="location-title">
              <h2 id="location-title" className="text-lg font-semibold text-gray-900 mb-4">{t("complaintDetail.location")}</h2>
              {!hasLocation ? (
                <div className="h-64 bg-red-50 rounded-lg flex items-center justify-center border-2 border-red-200 border-dashed">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 mx-auto mb-2 text-red-400" />
                    <p className="text-red-600 font-medium">{t("complaintDetail.locationNotProvided")}</p>
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
                  {t("complaintDetail.openInGoogleMaps")}
                </a>
              )}
            </section>

{/* Media */}
            <section className="bg-white rounded-xl shadow-sm p-6" aria-labelledby="media-title">
              <h2 id="media-title" className="text-lg font-semibold text-gray-900 mb-4">
                {t("complaintDetail.photos")} ({complaint.media?.length || 0})
              </h2>
              {!complaint.media || complaint.media.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  <p>{t("complaintDetail.noPhotos")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {complaint.media.map((item, index) => (
                    <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      {item.type === "video" ? (
                        <video
                          src={getPhotoUrl(item.url) || undefined}
                          controls
                          className="w-full h-full object-cover"
                          aria-label={`Video ${index + 1}`}
                        />
                      ) : (
                        <img
                          src={getPhotoUrl(item.url) || undefined}
                          alt={`Photo ${index + 1} of the complaint`}
                          className="w-full h-full object-cover hover:opacity-90 transition"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Resolution Photos - Show when resolved */}
            {(complaint.status === "RESOLVED" || complaint.status === "CLOSED") && complaint.afterPhotos && complaint.afterPhotos.length > 0 && (
              <section className="bg-green-50 rounded-xl shadow-sm p-6" aria-labelledby="resolution-photos-title">
                <h2 id="resolution-photos-title" className="text-lg font-semibold text-green-900 mb-4">
                  {t("complaintDetail.resolutionPhotos") || "Resolution Photos"} ({complaint.afterPhotos?.length || 0})
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {complaint.afterPhotos.map((item, index) => (
                    <div key={index} className="relative aspect-square bg-green-100 rounded-lg overflow-hidden">
                      <img
                        src={getPhotoUrl(item.url) || undefined}
                        alt={`Resolution photo ${index + 1}`}
                        className="w-full h-full object-cover hover:opacity-90 transition"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = '<div class="flex items-center justify-center h-full text-green-400"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></div>';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Fullscreen Photo Viewer */}
            {fullscreenPhoto && (
              <div
                onClick={() => setFullscreenPhoto(null)}
                style={{
                  position: 'fixed', inset: 0, zIndex: 200,
                  background: 'rgba(0,0,0,0.9)',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer'
                }}
              >
                <img
                  src={fullscreenPhoto}
                  alt=""
                  style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8 }}
                  onClick={e => e.stopPropagation()}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6" role="complementary" aria-label="Additional information">
            {/* Department Info */}
            {complaint.department && (
              <section className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100" aria-labelledby="department-title">
                <h2 id="department-title" className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  {t("complaintDetail.department")}
                </h2>
                <p className="font-semibold text-slate-900">{complaint.department.name}</p>
              </section>
            )}

            {/* Timestamps */}
            <section className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100" aria-labelledby="dates-title">
              <h2 id="dates-title" className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {t("complaintDetail.dates")}
              </h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <dt className="text-slate-500">{t("complaintDetail.created")}:</dt>
                  <dd className="text-slate-900 font-medium">
                    {new Date(complaint.createdAt).toLocaleDateString(locale, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </dd>
                </div>
                {complaint.updatedAt && complaint.updatedAt !== complaint.createdAt && (
                  <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                    <dt className="text-slate-500">{t("complaintDetail.updated")}:</dt>
                    <dd className="text-slate-900 font-medium">
                      {new Date(complaint.updatedAt).toLocaleDateString(locale, {
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
                  {t("complaintDetail.rejectionReason")}
                </h2>
                <p className="text-red-800">{complaint.rejectionReason}</p>
              </section>
            )}
          </aside>
        </div>
      </main>
    </div>
    </DashboardLayout>
  );
}
