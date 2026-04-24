"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
  Trash2,
  TrafficCone,
  Lightbulb,
  Droplets,
  ShieldAlert,
  Building2,
  TreePine,
  Tag,
  Sparkles,
  Map as MapIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ComplaintCategory, ComplaintUrgency, ComplaintMedia, CreateComplaintData } from "@/types";
import { complaintService, uploadMedia, predictCategory } from "@/services/complaint.service";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "react-i18next";
import type * as LeafletNS from "leaflet";

type CategoryConfig = {
  value: ComplaintCategory;
  labelKey: string;
  descKey: string;
  icon: typeof MapPin;
};

const CATEGORIES: CategoryConfig[] = [
  { value: "WASTE", labelKey: "categories.waste", descKey: "categories.wasteDesc", icon: Trash2 },
  { value: "ROAD", labelKey: "categories.roads", descKey: "categories.roadsDesc", icon: TrafficCone },
  { value: "LIGHTING", labelKey: "categories.lighting", descKey: "categories.lightingDesc", icon: Lightbulb },
  { value: "WATER", labelKey: "categories.water", descKey: "categories.waterDesc", icon: Droplets },
  { value: "SAFETY", labelKey: "categories.safety", descKey: "categories.safetyDesc", icon: ShieldAlert },
  { value: "PUBLIC_PROPERTY", labelKey: "categories.property", descKey: "categories.propertyDesc", icon: Building2 },
  { value: "GREEN_SPACE", labelKey: "categories.parks", descKey: "categories.parksDesc", icon: TreePine },
  { value: "OTHER", labelKey: "categories.other", descKey: "categories.otherDesc", icon: Tag },
];

export default function AdminNewComplaintPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, token, isLoading: authLoading, hydrated } = useAuthStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ComplaintCategory | "">("");
  const [urgency, setUrgency] = useState<ComplaintUrgency>("MEDIUM");
  const [urgencySlider, setUrgencySlider] = useState(2);
  const [address, setAddress] = useState("");
  const [media, setMedia] = useState<ComplaintMedia[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [complaintId, setComplaintId] = useState<string | null>(null);

  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split("T")[0]);
  const [incidentTime, setIncidentTime] = useState(new Date().toTimeString().slice(0, 5));
  const [phone, setPhone] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [locationMode, setLocationMode] = useState<'manual' | 'gps' | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [commune, setCommune] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [showMap, setShowMap] = useState(true);

  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [aiSuggestedCategory, setAiSuggestedCategory] = useState<ComplaintCategory | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<LeafletNS.Map | null>(null);
  const markerRef = useRef<LeafletNS.Marker | null>(null);

  const urgencyLevels = [
    { value: "LOW", label: t('urgency.LOW'), color: "bg-green-500", time: t('urgency.lowDesc') },
    { value: "MEDIUM", label: t('urgency.MEDIUM'), color: "bg-yellow-500", time: t('urgency.mediumDesc') },
    { value: "HIGH", label: t('urgency.HIGH'), color: "bg-orange-500", time: t('urgency.highDesc') },
    { value: "CRITICAL", label: t('urgency.CRITICAL'), color: "bg-red-500", time: t('urgency.criticalDesc') },
  ];

  const displayLocation = location || { latitude: 36.8065, longitude: 10.1815 };

  useEffect(() => {
    if (!showMap || typeof window === "undefined") return;
    const container = mapContainerRef.current;
    if (!container) return;

    const setupMap = async () => {
      const L = (window as Window & typeof globalThis & { L?: typeof LeafletNS }).L;
      if (!L || leafletMapRef.current) return;

      const map = L.map(container).setView([displayLocation.latitude, displayLocation.longitude], 14);
      leafletMapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      const marker = L.marker([displayLocation.latitude, displayLocation.longitude], { draggable: true }).addTo(map);
      markerRef.current = marker;

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        setLocation({ latitude: pos.lat, longitude: pos.lng });
      });
    };

    const loadLeaflet = async () => {
      if (!window.document.getElementById("leaflet-css")) {
        const link = window.document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        window.document.head.appendChild(link);
      }
      if (!window.L) {
        await new Promise<void>((resolve) => {
          const script = window.document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = () => resolve();
          script.onerror = () => resolve();
          window.document.body.appendChild(script);
        });
      }
      setupMap();
    };

    loadLeaflet();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [showMap]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported");
      return;
    }
    setLocationLoading(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
        setLocationLoading(false);
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          if (data.address) {
            setCommune(data.address.city || data.address.town || data.address.municipality || data.address.county || "");
            setGovernorate(data.address.state || "");
          }
        } catch (e) {
          console.error("Failed to reverse geocode:", e);
        }
      },
      (err) => {
        setLocationError(err.message);
        setLocationLoading(false);
      }
    );
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadResult = await uploadMedia(files);
      if (uploadResult.success && uploadResult.data) {
        setMedia([...media, ...uploadResult.data]);
      } else {
        setError(uploadResult.message || "Failed to upload media");
      }
    } catch (err) {
      setError("Failed to upload media");
    } finally {
      setIsUploading(false);
    }
  };

  const removeMedia = (index: number) => {
    setMedia(media.filter((_, i) => i !== index));
  };

  const handleCategorySuggestion = async (text: string) => {
    if (!text.trim()) return;
    setIsAiSuggesting(true);
    try {
      const result = await predictCategory(text);
      if (result?.predicted) {
        setAiSuggestedCategory(result.predicted as ComplaintCategory);
        setCategory(result.predicted as ComplaintCategory);
      }
    } catch (err) {
      console.error("AI suggestion failed:", err);
    } finally {
      setIsAiSuggesting(false);
    }
  };

  useEffect(() => {
    if (!title.trim() || !description.trim()) return;
    const timer = setTimeout(() => {
      handleCategorySuggestion(`${title} ${description}`);
    }, 1500);
    return () => clearTimeout(timer);
  }, [title, description]);

  useEffect(() => {
    setUrgency(urgencyLevels[urgencySlider].value as ComplaintUrgency);
  }, [urgencySlider]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !category) {
      setError("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const complaintData: CreateComplaintData = {
        title,
        description,
        category: category as ComplaintCategory,
        urgency,
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          address: address || undefined,
        } : undefined,
        municipality: commune || undefined,
        governorate: governorate || undefined,
        incidentDate: incidentDate ? new Date(incidentDate) : undefined,
        incidentTime: incidentTime || undefined,
        phone: phone || undefined,
        isAnonymous,
        media: media.map((m) => ({
          url: m.url,
          type: m.type,
        })),
      };

const result = await complaintService.submitComplaint(complaintData);
      // API returns { message: string, complaint: Complaint } on success
      const resultObj = result as { complaint?: { _id?: string } };
      if (result && resultObj.complaint?._id) {
        setSuccess(true);
        setComplaintId(resultObj.complaint._id || null);
      } else {
        setError(result.message || "Failed to create complaint");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!token) {
    router.push("/login?redirect=/admin/complaints/new");
    return null;
  }

  if (success) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{t('complaint.created')}</h2>
            <p className="text-slate-600 mb-6">{t('complaint.successMessage')}</p>
            <div className="space-y-3">
              <Button onClick={() => router.push(`/admin/complaints/${complaintId}`)} className="w-full">
                {t('complaint.viewDetails')}
              </Button>
              <Button variant="outline" onClick={() => router.push("/admin/complaints")} className="w-full">
                {t('complaint.backToList')}
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <Link href="/admin/complaints" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary mb-4">
          <ArrowLeft className="w-4 h-4" />
          {t('common.back')}
        </Link>

        <h1 className="text-2xl font-bold text-slate-800 mb-6">{t('admin.createComplaint')}</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-medium text-red-700">{t('common.error')}</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg border border-white/50 p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {t('complaint.title')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              placeholder={t('complaint.titlePlaceholder')}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-white/50 p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {t('complaint.description')} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
              placeholder={t('complaint.descriptionPlaceholder')}
            />
            {isAiSuggesting && (
              <div className="flex items-center gap-2 mt-2 text-sm text-primary">
                <Sparkles className="w-4 h-4 animate-pulse" />
                {t('complaint.aiSuggesting')}
              </div>
            )}
            {aiSuggestedCategory && category !== aiSuggestedCategory && (
              <button
                type="button"
                onClick={() => setCategory(aiSuggestedCategory)}
                className="mt-2 text-sm text-primary hover:underline"
              >
                {t('complaint.useSuggested')} {aiSuggestedCategory}
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-white/50 p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-4">
              {t('complaint.category')} <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <Icon className={`w-6 h-6 mb-2 ${isSelected ? "text-primary" : "text-slate-400"}`} />
                    <p className={`text-sm font-medium ${isSelected ? "text-primary" : "text-slate-600"}`}>
                      {t(cat.labelKey)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-white/50 p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-4">
              {t('complaint.urgencyLabel')} <span className="text-red-500">*</span>
            </label>
            <div className="relative mb-4">
              <input
                type="range"
                min="0"
                max="3"
                value={urgencySlider}
                onChange={(e) => setUrgencySlider(parseInt(e.target.value))}
                className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #22c55e 0%, #eab308 33%, #f97316 66%, #ef4444 100%)`,
                }}
              />
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full ${urgencyLevels[urgencySlider].color} shadow-sm`}></span>
                <span className="font-semibold text-slate-700">{urgencyLevels[urgencySlider].label}</span>
                <span className="text-sm text-slate-500">({urgencyLevels[urgencySlider].time})</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-white/50 p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-4">
              {t('complaint.location')}
            </label>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={locationLoading}
                className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                  locationMode === 'gps'
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <MapIcon className="w-4 h-4 inline mr-2" />
                {locationLoading ? t('common.loading') : t('complaint.useGPS')}
              </button>
              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                  showMap
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <MapPin className="w-4 h-4 inline mr-2" />
                {showMap ? t('complaint.hideMap') : t('complaint.showMap')}
              </button>
            </div>

            {showMap && (
              <div ref={mapContainerRef} className="h-64 rounded-lg overflow-hidden mb-4" />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder={t('complaint.address')}
              />
              <input
                type="text"
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                className="px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder={t('complaint.commune')}
              />
            </div>
            {locationError && (
              <p className="text-red-500 text-sm mt-2">{locationError}</p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-white/50 p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-4">
              {t('complaint.media')}
            </label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
                id="media-upload"
                disabled={isUploading}
              />
              <label htmlFor="media-upload" className="cursor-pointer">
                {isUploading ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <p className="text-slate-600 mt-2">{t('complaint.uploading')} {uploadProgress}%</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto text-slate-400" />
                    <p className="text-slate-600 mt-2">{t('complaint.uploadMedia')}</p>
                    <p className="text-xs text-slate-400">{t('complaint.uploadHint')}</p>
                  </>
                )}
              </label>
            </div>
            {media.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-4">
                {media.map((m, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden aspect-square">
                    {m.type === 'video' ? (
                      <video src={m.url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={m.url} alt="" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(i)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {t('common.submitting')}
                </>
              ) : (
                t('complaint.submit')
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
