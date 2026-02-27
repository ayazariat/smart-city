"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  MapPin, 
  Clock, 
  User, 
  AlertTriangle,
  CheckCircle2,
  Building2,
  ArrowLeft,
  Calendar,
  Shield,
  Loader2
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

// Status labels
const statusConfig: Record<string, { label: string; bgClass: string; textClass: string }> = {
  SUBMITTED: { label: "SOUMISE", bgClass: "bg-yellow-100", textClass: "text-yellow-800" },
  VALIDATED: { label: "VALIDÉE", bgClass: "bg-blue-100", textClass: "text-blue-800" },
  ASSIGNED: { label: "ASSIGNÉE", bgClass: "bg-purple-100", textClass: "text-purple-800" },
  IN_PROGRESS: { label: "EN COURS", bgClass: "bg-orange-100", textClass: "text-orange-800" },
  RESOLVED: { label: "RÉSOLUE", bgClass: "bg-green-100", textClass: "text-green-800" },
  CLOSED: { label: "FERMÉE", bgClass: "bg-gray-100", textClass: "text-gray-800" },
  REJECTED: { label: "REJETÉE", bgClass: "bg-red-100", textClass: "text-red-800" },
};

export default function MyComplaintDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuthStore();
  const complaintId = params.id as string;

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      router.push("/");
      return;
    }
    if (user && user.role !== "CITIZEN") {
      router.push("/dashboard");
      return;
    }
  }, [token, user, router]);

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
          setError("Réclamation non trouvée");
        }
      } catch (err: unknown) {
        console.error("Error fetching complaint:", err);
        const apiError = err as { response?: { status?: number; data?: { message?: string } } };
        if (apiError.response?.status === 403) {
          setError(apiError.response.data?.message || "Accès refusé. Vous ne pouvez voir que vos propres réclamations.");
        } else if (apiError.response?.status === 404) {
          setError("Réclamation non trouvée");
        } else {
          setError("Erreur lors du chargement de la réclamation");
        }
      } finally {
        setLoading(false);
      }
    };

    if (complaintId && token) {
      fetchComplaintDetail();
    }
  }, [complaintId, token]);

  const getComplaintIdDisplay = (id: string) => {
    return `RC-${id.slice(-6)}`;
  };

  const hasLocation = complaint?.location?.latitude && complaint?.location?.longitude;

  if (!user || user.role !== "CITIZEN") {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" role="status" aria-live="polite">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600">Chargement...</p>
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
            onClick={() => router.push("/my-complaints")}
          >
            Retour à mes réclamations
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
                onClick={() => router.push("/my-complaints")}
              >
                Retour
              </Button>
              <div className="h-6 w-px bg-slate-300" aria-hidden="true"></div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Ma Réclamation {getComplaintIdDisplay(complaint._id || complaint.id || "")}
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
                Informations Principales
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <label className="block text-sm font-medium text-slate-500 mb-2">Catégorie</label>
                  <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md">
                    {categoryLabels[complaint.category] || complaint.category}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <label className="block text-sm font-medium text-slate-500 mb-2">Priorité</label>
                  <span className="text-lg font-semibold text-orange-600">
                    {complaint.urgency || "Moyenne"}
                  </span>
                </div>
              </div>
            </section>

            {/* Status Timeline */}
            <section className="bg-gradient-to-r from-primary/5 to-secondary-50 rounded-2xl shadow-lg p-6 border border-primary/10">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Suivi du Statut
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
                  <span className="text-xs mt-1 font-medium text-slate-600">Soumise</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${complaint.status !== 'SUBMITTED' && complaint.status !== 'REJECTED' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-400'} transition-all duration-300`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs mt-1 font-medium text-slate-600">Validée</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(complaint.status) ? 'bg-purple-500 text-white' : 'bg-slate-200 text-slate-400'} transition-all duration-300`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs mt-1 font-medium text-slate-600">Assignée</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${['IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(complaint.status) ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-400'} transition-all duration-300`}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-xs mt-1 font-medium text-slate-600">En cours</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${['RESOLVED', 'CLOSED'].includes(complaint.status) ? 'bg-green-600 text-white' : complaint.status === 'REJECTED' ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-400'} transition-all duration-300`}>
                    {complaint.status === 'REJECTED' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <span className="text-xs mt-1 font-medium text-slate-600">{complaint.status === 'REJECTED' ? 'Rejetée' : 'Résolue'}</span>
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
              <h2 id="location-title" className="text-lg font-semibold text-gray-900 mb-4">Emplacement</h2>
              {!hasLocation ? (
                <div className="h-64 bg-red-50 rounded-lg flex items-center justify-center border-2 border-red-200 border-dashed">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 mx-auto mb-2 text-red-400" />
                    <p className="text-red-600 font-medium">Localisation non fournie</p>
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
                Photos ({complaint.media?.length || 0})
              </h2>
              {!complaint.media || complaint.media.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  <p>Aucune photo fournie</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {complaint.media.map((item, index) => (
                    <div key={index} className="relative">
                      {item.type === "video" ? (
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
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6" role="complementary" aria-label="Informations supplémentaires">
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
