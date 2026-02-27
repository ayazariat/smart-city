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
  Image,
  Video,
  Loader2,
  Calendar,
  Clock,
  Phone,
  EyeOff,
  Sparkles,
  Maximize2,
  Minimize2,
  Shield,
  Trash2,
  TrafficCone,
  Lightbulb,
  Droplets,
  ShieldAlert,
  Building2,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ComplaintCategory, ComplaintUrgency, ComplaintMedia, CreateComplaintData } from "@/types";
import { complaintService } from "@/services/complaint.service";
import { useAuthStore } from "@/store/useAuthStore";

type CategoryConfig = {
  value: ComplaintCategory;
  label: string;
  description: string;
  icon: typeof MapPin;
};

const CATEGORIES: CategoryConfig[] = [
  {
    value: "WASTE",
    label: "Waste & Cleanliness",
    description: "Garbage, overflowing bins, illegal dumps, street cleaning.",
    icon: Trash2,
  },
  {
    value: "ROAD",
    label: "Roads & Traffic",
    description: "Damaged roads, sidewalks, parking, traffic signs or signals.",
    icon: TrafficCone,
  },
  {
    value: "LIGHTING",
    label: "Street Lighting",
    description: "Broken lamps, dark streets, flashing or unstable lights.",
    icon: Lightbulb,
  },
  {
    value: "WATER",
    label: "Water & Drainage",
    description: "Leaks, flooded areas, blocked drains, sewage issues.",
    icon: Droplets,
  },
  {
    value: "SAFETY",
    label: "Public Safety & Noise",
    description: "Dangerous situations, accidents, noise, unsafe areas.",
    icon: ShieldAlert,
  },
  {
    value: "PUBLIC_PROPERTY",
    label: "Parks & Public Spaces",
    description: "Parks, benches, monuments, municipal buildings.",
    icon: Building2,
  },
  {
    value: "OTHER",
    label: "Other",
    description: "Anything that does not fit in the other categories.",
    icon: Tag,
  },
];

const detectCategory = (title: string, description: string): ComplaintCategory => {
  const desc = `${title} ${description}`.toLowerCase();

  const onlyLetters = desc.replace(/[^a-zàâçéèêëîïôûùüÿñæœ]/gi, "");
  if (onlyLetters.length >= 3 && new Set(onlyLetters).size === 1) {
    return "OTHER";
  }

  if (
    desc.includes("waste") ||
    desc.includes("garbage") ||
    desc.includes("trash") ||
    desc.includes("bin") ||
    desc.includes("poubelle") ||
    desc.includes("déchet") ||
    desc.includes("ordure") ||
    desc.includes("saleté") ||
    desc.includes("propreté")
  ) {
    return "WASTE";
  }

  if (
    desc.includes("road") ||
    desc.includes("street") ||
    desc.includes("pavement") ||
    desc.includes("sidewalk") ||
    desc.includes("pothole") ||
    desc.includes("route") ||
    desc.includes("rue") ||
    desc.includes("nid-de-poule") ||
    desc.includes("parking") ||
    desc.includes("trafic") ||
    desc.includes("traffic")
  ) {
    return "ROAD";
  }

  if (
    desc.includes("light") ||
    desc.includes("lamp") ||
    desc.includes("streetlight") ||
    desc.includes("éclairage") ||
    desc.includes("lampadaire") ||
    desc.includes("lumière") ||
    desc.includes("éteint")
  ) {
    return "LIGHTING";
  }

  if (
    desc.includes("water") ||
    desc.includes("flood") ||
    desc.includes("drain") ||
    desc.includes("leak") ||
    desc.includes("égout") ||
    desc.includes("inondation") ||
    desc.includes("fuite") ||
    desc.includes("canalisation")
  ) {
    return "WATER";
  }

  if (
    desc.includes("safety") ||
    desc.includes("danger") ||
    desc.includes("accident") ||
    desc.includes("security") ||
    desc.includes("sécurité") ||
    desc.includes("bruit") ||
    desc.includes("tapage") ||
    desc.includes("agression")
  ) {
    return "SAFETY";
  }

  if (
    desc.includes("park") ||
    desc.includes("bench") ||
    desc.includes("fountain") ||
    desc.includes("building") ||
    desc.includes("monument") ||
    desc.includes("propriété") ||
    desc.includes("jardin") ||
    desc.includes("square") ||
    desc.includes("place publique")
  ) {
    return "PUBLIC_PROPERTY";
  }
  return "OTHER";
};

export default function NewComplaintPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMarkerRef = useRef<any>(null);
  
  const { user, token, isLoading: authLoading, hydrated } = useAuthStore();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ComplaintCategory | "">("");
  const [aiSuggestedCategory, setAiSuggestedCategory] = useState<ComplaintCategory | null>(null);
  const [urgency, setUrgency] = useState<ComplaintUrgency>("MEDIUM");
  const [urgencySlider, setUrgencySlider] = useState(2);
  const [address, setAddress] = useState("");
  const [media, setMedia] = useState<ComplaintMedia[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [complaintId, setComplaintId] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);

  // Additional fields
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split("T")[0]);
  const [incidentTime, setIncidentTime] = useState(new Date().toTimeString().slice(0, 5));
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Location state
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [commune, setCommune] = useState("");
  const [detectedCommune, setDetectedCommune] = useState<string | null>(null);
  const [governorate, setGovernorate] = useState("");
  const [showMap, setShowMap] = useState(true);

  // AI suggestion state
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);

  // Check authentication - wait for hydration
  useEffect(() => {
    if (!authLoading && hydrated && !token) {
      setAuthError(true);
    }
  }, [authLoading, hydrated, token]);

  // Urgency levels
  const urgencyLevels: { value: ComplaintUrgency; label: string; color: string; time: string }[] = [
    { value: "LOW", label: "Low", color: "bg-green-500", time: "Not urgent" },
    { value: "MEDIUM", label: "Medium", color: "bg-yellow-500", time: "This week" },
    { value: "HIGH", label: "High", color: "bg-orange-500", time: "Within 48h" },
    { value: "URGENT", label: "Urgent", color: "bg-red-500", time: "Immediate" },
  ];

  // Default to Tunis coordinates
  const defaultLocation = { latitude: 36.8065, longitude: 10.1815 };
  const displayLocation = location || defaultLocation;

  useEffect(() => {
    const totalLength = title.length + description.length;
    if (totalLength < 4) {
      setAiSuggestedCategory(null);
      return;
    }

    const timer = setTimeout(() => {
      setIsAiSuggesting(true);
      const detected = detectCategory(title, description);
      setAiSuggestedCategory(detected);
      setIsAiSuggesting(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [title, description]);

  useEffect(() => {
    if (!category && aiSuggestedCategory) {
      setCategory(aiSuggestedCategory);
    }
  }, [aiSuggestedCategory, category]);

  useEffect(() => {
    setUrgency(urgencyLevels[urgencySlider].value);
  }, [urgencySlider]);

  useEffect(() => {
    if (!showMap) return;
    if (typeof window === "undefined") return;

    const container = mapContainerRef.current;
    if (!container) return;

    const setupMap = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L;
      if (!L || leafletMapRef.current) return;

      const initialLat = displayLocation.latitude;
      const initialLon = displayLocation.longitude;

      const map = L.map(container).setView([initialLat, initialLon], 14);
      leafletMapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const marker = L.marker([initialLat, initialLon], { draggable: true }).addTo(map);
      leafletMarkerRef.current = marker;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setLocation({ latitude: lat, longitude: lng });
        reverseGeocode(lat, lng);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      marker.on("dragend", (e: any) => {
        const { lat, lng } = e.target.getLatLng();
        setLocation({ latitude: lat, longitude: lng });
        reverseGeocode(lat, lng);
      });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).L) {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src*="unpkg.com/leaflet"]'
      );
      if (!existingScript) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
        link.crossOrigin = "";
        document.head.appendChild(link);

        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
        script.crossOrigin = "";
        script.onload = () => setupMap();
        document.body.appendChild(script);
      } else if (typeof window !== "undefined") {
         
        setupMap();
      }
    } else {
      setupMap();
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        leafletMarkerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMap]);

  useEffect(() => {
    if (!location || !leafletMapRef.current || !leafletMarkerRef.current) return;
    const { latitude, longitude } = location;
    leafletMapRef.current.setView([latitude, longitude], leafletMapRef.current.getZoom() || 14);
    leafletMarkerRef.current.setLatLng([latitude, longitude]);
  }, [location]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (media.length >= 5) {
      setError("Maximum 5 photos/videos allowed");
      return;
    }

    const newMedia: ComplaintMedia[] = [];
    const maxSize = 10 * 1024 * 1024;
    const remainingSlots = 5 - media.length;

    Array.from(files).slice(0, remainingSlots).forEach((file) => {
      if (file.size > maxSize) {
        setError(`File ${file.name} is too large. Max 10MB.`);
        return;
      }

      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        setError(`File ${file.name} must be an image or video.`);
        return;
      }

      const url = URL.createObjectURL(file);
      newMedia.push({
        type: isImage ? "photo" : "video",
        url,
      });
    });

    setMedia([...media, ...newMedia]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeMedia = (index: number) => {
    const newMedia = [...media];
    URL.revokeObjectURL(newMedia[index].url);
    newMedia.splice(index, 1);
    setMedia(newMedia);
  };

  const reverseGeocode = (lat: number, lon: number) => {
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`
    )
      .then((res) => res.json())
      .then((data) => {
        const addr = data.address || {};
        const communeName =
          addr.municipality ||
          addr.village ||
          addr.town ||
          addr.city ||
          addr.county ||
          addr.suburb ||
          null;
        if (communeName) {
          setDetectedCommune(communeName);
          setCommune((prev) => prev || communeName);
        }
        const govName = addr.state || addr.region || addr.county || null;
        if (govName) {
          setGovernorate(govName);
        }
      })
      .catch(() => {});
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported by your browser");
      return;
    }

    setLocationLoading(true);
    setLocationError(null);
    setDetectedCommune(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLocation(newLocation);
        setUseCurrentLocation(true);
        setLocationLoading(false);
        reverseGeocode(newLocation.latitude, newLocation.longitude);
      },
      (error) => {
        setLocationError("Unable to get your location. Please check permissions.");
        setLocationLoading(false);
      }
    );
  };

  const openInMap = () => {
    const lat = displayLocation.latitude;
    const lon = displayLocation.longitude;
    window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`, "_blank");
  };

  const validatePhone = (phoneValue: string): boolean => {
    if (!phoneValue.trim()) return true;
    const cleanPhone = phoneValue.replace(/[\s-]/g, "");
    const tunisianPhoneRegex = /^[2459]\d{7}$/;
    if (!tunisianPhoneRegex.test(cleanPhone)) {
      setPhoneError("Format invalide. Entrez 8 chiffres (ex: 98765432)");
      return false;
    }
    setPhoneError(null);
    return true;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, "");
    if (value.length <= 8) {
      setPhone(value);
      if (value.length > 0) {
        validatePhone(value);
      } else {
        setPhoneError(null);
      }
    }
  };

  const validateForm = (): boolean => {
    if (!title.trim() || title.trim().length < 5) {
      setError("Title must be at least 5 characters");
      return false;
    }
    if (!description.trim() || description.trim().length < 20) {
      setError("Description must be at least 20 characters");
      return false;
    }
    if (!category) {
      setError("Please select a category");
      return false;
    }
    if (media.length === 0) {
      setError("Please add at least one photo");
      return false;
    }
    if (phone && !validatePhone(phone)) {
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const complaintData: CreateComplaintData = {
        title: title.trim(),
        description: description.trim(),
        category: category as ComplaintCategory,
        urgency,
        location: {
          address: address.trim() || undefined,
          latitude: displayLocation.latitude,
          longitude: displayLocation.longitude,
          commune: commune || detectedCommune || undefined,
          governorate: governorate.trim() || undefined,
        },
        media: media.length > 0 ? media : undefined,
        isAnonymous,
      };

      if (phone && !isAnonymous) {
        complaintData.description += `\n\nContact phone: ${phone}`;
      }

      const result = await complaintService.submitComplaint(complaintData);
      const complaintIdValue = result.complaint.id ?? result.complaint._id;
      setComplaintId(complaintIdValue ?? null);
      setSuccess(true);
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "Failed to submit complaint";
      const normalized = rawMessage.toLowerCase();

      // Handle invalid/expired token or unauthorized uniformly
      if (
        normalized.includes("401") ||
        normalized.includes("unauthorized") ||
        normalized.includes("invalid or expired token") ||
        normalized.includes("jwt") ||
        (normalized.includes("expired") && normalized.includes("session"))
      ) {
        setError("Your session has expired. Please sign in again to submit a complaint.");
        setTimeout(() => router.push("/"), 2500);
      } else {
        setError("We couldn't submit your complaint right now. Please try again in a moment.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state - wait for auth to hydrate
  if (authLoading || !hydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (authError || !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Authentication Required</h2>
          <p className="text-slate-600 mb-6">Please log in to submit a complaint.</p>
          <Link href="/">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Success view
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-success/5 via-secondary-50 to-success/10 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-success-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Complaint Submitted!
          </h2>
          <p className="text-slate-600 mb-2">
            Your complaint has been submitted successfully.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            Reference ID: <span className="font-mono font-bold text-primary">{complaintId}</span>
          </p>
          <div className="space-y-3">
            <Button onClick={() => router.push("/dashboard")} fullWidth>
              Back to Dashboard
            </Button>
            <Button
              onClick={() => {
                setSuccess(false);
                setComplaintId(null);
                setTitle("");
                setDescription("");
                setCategory("");
                setUrgency("MEDIUM");
                setUrgencySlider(2);
                setAddress("");
                setMedia([]);
                setLocation(null);
                setCommune("");
                setDetectedCommune(null);
                setGovernorate("");
                setPhone("");
                setPhoneError(null);
                setIsAnonymous(false);
              }}
              variant="outline"
              fullWidth
            >
              Submit Another Complaint
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-700 text-white shadow-xl">
        <div className="container mx-auto max-w-3xl px-4 py-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 backdrop-blur-sm flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Report an Issue</h1>
              <p className="text-primary-200 text-sm">
                Help improve your city - Your voice matters!
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold">{(user?.fullName || "U")[0].toUpperCase()}</span>
              </div>
              <span className="text-sm font-medium">{user?.fullName || "User"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Location with Map */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-700">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-600 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="font-semibold">Location</span>
                  {location && (
                    <span className="text-xs text-success-600 ml-2">(Detected)</span>
                  )}
                </div>
              </div>
              {location && (
                <button
                  type="button"
                  onClick={openInMap}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <Maximize2 className="w-3 h-3" />
                  Full Screen
                </button>
              )}
            </div>

            {/* Address Input */}
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter address manually (e.g., Rue de la République, Tunis)"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all mb-4 bg-slate-50/50"
            />

            {/* OpenStreetMap Embed (interactive via Leaflet) */}
            {showMap && (
              <div className="relative mb-4 rounded-xl overflow-hidden border-2 border-slate-100 shadow-inner">
                <div className="flex justify-between items-center bg-gradient-to-r from-slate-100 to-slate-50 px-4 py-2">
                  <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {displayLocation.latitude.toFixed(6)}, {displayLocation.longitude.toFixed(6)}
                  </span>
                  <span className="text-xs text-slate-400">Tunisia</span>
                </div>
                <div className="relative">
                  <div
                    ref={mapContainerRef}
                    className="w-full h-[220px] bg-slate-100 cursor-crosshair"
                  />
                  <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-medium text-slate-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-primary" />
                      Click on the map to set location
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Governorate / Commune */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Governorate</label>
                <div className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs text-slate-700">
                  {governorate || "Will be detected from your GPS"}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Commune / municipality</label>
                <input
                  type="text"
                  value={commune}
                  onChange={(e) => setCommune(e.target.value)}
                  placeholder={detectedCommune || "e.g., Beni Khiar"}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-slate-50/50 text-sm"
                />
              </div>
            </div>

            {/* Location Buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant={location ? "primary" : "outline"}
                onClick={handleGetLocation}
                disabled={locationLoading}
                className="flex-1"
              >
                {locationLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : location ? (
                  <CheckCircle className="w-4 h-4 mr-2" />
                ) : (
                  <MapPin className="w-4 h-4 mr-2" />
                )}
                {locationLoading ? "Detecting..." : location ? "Location Set" : "Use My GPS"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMap(!showMap)}
                className="px-4"
              >
                {showMap ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>

            {locationError && (
              <p className="text-xs text-red-500 mt-2">{locationError}</p>
            )}

            {/* Commune Display (detected) */}
            {(detectedCommune || commune) && (
              <div className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
                <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <span className="text-xs text-slate-500 block">Commune</span>
                  <span className="text-sm font-semibold text-primary">{commune || detectedCommune}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCommune("");
                    setDetectedCommune(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of the issue..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-slate-50/50"
              maxLength={150}
              required
            />
            <p className="text-xs text-slate-400 mt-2 text-right">
              {title.length}/150 characters
            </p>
          </div>

          {/* AI Suggested Category */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-slate-700">
                Category <span className="text-red-500">*</span>
              </label>
              {isAiSuggesting && (
                <span className="text-xs text-primary flex items-center gap-1">
                  <Sparkles className="w-3 h-3 animate-pulse" />
                  AI analyzing your text...
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.value;
                const isSuggested = aiSuggestedCategory === cat.value;

                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`flex items-start gap-3 rounded-2xl border-2 px-3 py-3 text-left transition-all duration-200 hover:shadow-md ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-lg"
                        : "border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl ${
                        isSelected ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-800">{cat.label}</span>
                        {isSuggested && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            <Sparkles className="w-3 h-3" />
                            Suggested
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] leading-snug text-slate-500 line-clamp-2">
                        {cat.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Urgency Slider */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-4">
              Urgency Level <span className="text-red-500">*</span>
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
              <div className="flex items-center gap-0.5">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`text-xl ${i <= urgencySlider ? "text-yellow-500 drop-shadow-sm" : "text-slate-300"}`}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail. Include relevant details like location, time, and any other information that might help us resolve this faster..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-slate-50/50 resize-none"
              rows={5}
              maxLength={1000}
              required
            />
            <p className="text-xs text-slate-400 mt-2 text-right">
              {description.length}/1000 characters (minimum 20)
            </p>
          </div>

          {/* Date/Time & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date/Time */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Incident Date/Time
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-slate-50/50"
                  />
                </div>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="time"
                    value={incidentTime}
                    onChange={(e) => setIncidentTime(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-slate-50/50"
                  />
                </div>
              </div>
            </div>

            {/* Phone */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <span className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-500" />
                  Phone (for follow-up)
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                  +216
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="98765432"
                  maxLength={8}
                  className={`w-full pl-14 pr-4 py-2.5 rounded-xl border transition-all bg-slate-50/50 ${
                    phoneError
                      ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                      : "border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  }`}
                />
              </div>
              {phoneError && (
                <p className="text-xs text-red-500 mt-1.5">{phoneError}</p>
              )}
              {!phoneError && phone.length > 0 && phone.length < 8 && (
                <p className="text-xs text-slate-400 mt-1.5">
                  Format: 8 chiffres (ex: 98765432)
                </p>
              )}
            </div>
          </div>

          {/* Anonymous */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-5">
            <label className="flex items-center gap-4 cursor-pointer p-2 rounded-xl hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="flex items-center gap-2 text-slate-700">
                <EyeOff className="w-5 h-5 text-slate-400" />
                <span className="font-medium">Submit anonymously</span>
              </span>
            </label>
            <p className="mt-1 ml-9 text-xs text-slate-400">
              Your identity will not be shown in the public complaint
            </p>
          </div>

          {/* Media Upload */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Photos (1-5, max 10MB each) <span className="text-red-500">*</span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={media.length >= 5}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {media.length >= 5 ? "Maximum reached" : "Add Photos/Videos"}
            </Button>

            {media.length > 0 && (
              <div className="mt-4 grid grid-cols-3 md:grid-cols-5 gap-3">
                {media.map((item, index) => (
                  <div key={index} className="relative group aspect-square">
                    {item.type === "photo" ? (
                      <img
                        src={item.url}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-full object-cover rounded-xl shadow-md"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
                        <Video className="w-8 h-8 text-slate-400" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-1 left-1">
                      {item.type === "photo" ? (
                        <Image className="w-4 h-4 text-white drop-shadow-lg" />
                      ) : (
                        <Video className="w-4 h-4 text-white drop-shadow-lg" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-slate-400 mt-3">
              📷 {media.length}/5 photos added - Click to preview
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-4">
            <Link href="/dashboard" className="flex-1">
              <Button type="button" variant="outline" size="lg" fullWidth>
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting || !title || !description || !category || media.length === 0}
              size="lg"
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Complaint
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
