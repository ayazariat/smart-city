"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { 
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
  X,
  ThumbsUp,
  CheckCircle,
} from "lucide-react";
import { Complaint } from "@/types";
import { complaintService, processComplaintMedia } from "@/services/complaint.service";
import { adminService } from "@/services/admin.service";
import { managerService } from "@/services/manager.service";
import { useAuthStore } from "@/store/useAuthStore";
import { Button, PageHeader } from "@/components/ui";
import Timeline from "@/components/complaints/Timeline";
import InternalNotes from "@/components/complaints/InternalNotes";

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

// Category to department name mapping for suggestions
const categoryToDepartmentMap: Record<string, string[]> = {
  ROAD: ["Roads", "Infrastructure", "Public Works"],
  LIGHTING: ["Lighting", "Electricity", "Infrastructure"],
  WASTE: ["Waste", "Sanitation", "Environment"],
  WATER: ["Water", "Hydraulics", "Infrastructure"],
  SAFETY: ["Safety", "Security", "Civil Protection"],
  PUBLIC_PROPERTY: ["Public Property", "Infrastructure"],
  GREEN_SPACE: ["Green Spaces", "Environment", "Parks"],
  BUILDING: ["Urban Planning", "Buildings", "Infrastructure"],
  NOISE: ["Environment", "Sanitation"],
  OTHER: ["General", "Infrastructure"],
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
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const complaintId = params.id as string;
  const fromParam = searchParams.get("from");

  // Smart back navigation
  const handleBack = () => {
    if (fromParam === "manager") router.push("/manager/pending");
    else if (fromParam === "agent") router.push("/agent/complaints");
    else if (fromParam === "admin") router.push("/admin/complaints");
    else if (fromParam === "tasks") router.push("/tasks");
    else if (fromParam === "archive") router.push("/archive");
    else router.back();
  };

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mediaErrors, setMediaErrors] = useState<Record<number, boolean>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [actionModal, setActionModal] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Array<{_id: string; name: string; description?: string; email?: string; phone?: string}>>([]);
  const [technicians, setTechnicians] = useState<Array<{_id: string; fullName: string; email?: string}>>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [suggestedDepartment, setSuggestedDepartment] = useState<string>("");
  const [selectedTechnician, setSelectedTechnician] = useState<string>("");
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [selectedUrgency, setSelectedUrgency] = useState<string>("");
  const [selectedPriorityScore, setSelectedPriorityScore] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");

  // Notes state
  const [internalNotes, setInternalNotes] = useState<any[]>([]);

  // BL-28: Confirm/Upvote state
  const [isConfirming, setIsConfirming] = useState(false);
  const [isUpvoting, setIsUpvoting] = useState(false);

  // Add note handler
  const handleAddNote = async (type: string, content: string) => {
    if (!complaint) return;
    try {
      const response = await complaintService.addComplaintComment(
        complaint._id || complaint.id || "",
        content,
        type === "NOTE"
      );
      if (response.success) {
        // Refresh complaint to get updated notes
        const detailResponse = await complaintService.getComplaintDetail(complaint._id || complaint.id || "");
        if (detailResponse.success && detailResponse.data.internalNotes) {
          setInternalNotes(detailResponse.data.internalNotes);
        }
      }
    } catch (error) {
      console.error("Error adding note:", error);
    }
  };

  // BL-28: Check if current user has confirmed/upvoted
  const userId = user?._id || user?.id;
  const hasConfirmed = complaint?.confirmations?.some(
    c => c.citizenId === userId
  );
  const hasUpvoted = complaint?.upvotes?.some(
    u => u.citizenId === userId
  );
  const isOwnComplaint = (() => {
    if (!complaint || !userId) return false;
    const createdById = typeof complaint.createdBy === "string" 
      ? complaint.createdBy 
      : complaint.createdBy?._id;
    return createdById === userId;
  })();
  const canConfirmUpvote = user?.role === "CITIZEN" && !isOwnComplaint && complaint?._id;

  const handleConfirm = async () => {
    if (!complaint?._id || isConfirming) return;
    setIsConfirming(true);
    try {
      if (hasConfirmed) {
        const result = await complaintService.unconfirmComplaint(complaint._id);
        if (result.success) {
          const detailResponse = await complaintService.getComplaintDetail(complaint._id);
          if (detailResponse.success) {
            setComplaint(detailResponse.data);
          }
        }
      } else {
        const result = await complaintService.confirmComplaint(complaint._id);
        if (result.success) {
          const detailResponse = await complaintService.getComplaintDetail(complaint._id);
          if (detailResponse.success) {
            setComplaint(detailResponse.data);
          }
        }
      }
    } catch (err) {
      console.error("Confirm error:", err);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleUpvote = async () => {
    if (!complaint?._id || isUpvoting) return;
    setIsUpvoting(true);
    try {
      if (hasUpvoted) {
        const result = await complaintService.removeUpvote(complaint._id);
        if (result.success) {
          const detailResponse = await complaintService.getComplaintDetail(complaint._id);
          if (detailResponse.success) {
            setComplaint(detailResponse.data);
          }
        }
      } else {
        const result = await complaintService.upvoteComplaint(complaint._id);
        if (result.success) {
          const detailResponse = await complaintService.getComplaintDetail(complaint._id);
          if (detailResponse.success) {
            setComplaint(detailResponse.data);
          }
        }
      }
    } catch (err) {
      console.error("Upvote error:", err);
    } finally {
      setIsUpvoting(false);
    }
  };

  useEffect(() => {
    const fetchComplaintDetail = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await complaintService.getComplaintDetail(complaintId);

        if (response.success) {
          // Process media URLs to ensure they are full URLs
          const processedComplaint = processComplaintMedia(response.data);
          setComplaint(processedComplaint);
          // Load internal notes if available
          if (processedComplaint.internalNotes) {
            setInternalNotes(processedComplaint.internalNotes);
          }
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

  // Fetch departments when opening department modal
  useEffect(() => {
    const fetchDepartments = async () => {
      if (actionModal === "department") {
        try {
          const deptData = await adminService.getDepartments();
          setDepartments(deptData);
        } catch (error) {
          console.error("Error fetching departments:", error);
        }
      }
      
      // Fetch technicians for manager
      if (actionModal === "technician") {
        try {
          const techData = await managerService.getTechnicians();
          if (techData.data) {
            setTechnicians(techData.data);
          }
        } catch (error) {
          console.error("Error fetching technicians:", error);
        }
      }
    };
    fetchDepartments();
  }, [actionModal]);

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
      // Show error message to user but don't throw
    } finally {
      setActionLoading(false);
    }
  };

  const handlePriorityUpdate = async () => {
    if (!complaint || (!selectedUrgency && !selectedPriorityScore)) return;
    setActionLoading(true);
    try {
      let response;
      if (selectedUrgency && selectedPriorityScore) {
        response = await complaintService.updateComplaintPriority(
          complaint._id || complaint.id || "",
          selectedUrgency,
          parseInt(selectedPriorityScore)
        );
      } else if (selectedUrgency) {
        response = await complaintService.updateComplaintPriority(
          complaint._id || complaint.id || "",
          selectedUrgency
        );
      } else if (selectedPriorityScore) {
        response = await complaintService.updateComplaintPriority(
          complaint._id || complaint.id || "",
          complaint.urgency,
          parseInt(selectedPriorityScore)
        );
      }
      
      if (response && response.success) {
        setComplaint(response.data);
        setActionModal(null);
        setSelectedUrgency("");
        setSelectedPriorityScore("");
      }
    } catch (err) {
      console.error("Error updating priority:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDepartmentUpdate = async () => {
    if (!complaint || !selectedDepartment) return;
    setActionLoading(true);
    try {
      const response = await complaintService.updateComplaintDepartment(
        complaint._id || complaint.id || "",
        selectedDepartment
      );
      if (response.success) {
        setComplaint(response.data);
        setActionModal(null);
        setSelectedDepartment("");
      }
    } catch (err) {
      console.error("Error updating department:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTechnicianUpdate = async () => {
    if (!complaint) return;
    
    // Need at least one technician selected
    const techToUse = selectedTechnicians.length > 0 ? selectedTechnicians : (selectedTechnician ? [selectedTechnician] : []);
    if (techToUse.length === 0) return;
    
    setActionLoading(true);
    try {
      let response;
      if (techToUse.length > 1) {
        // Multiple technicians - create a team
        response = await managerService.assignTeam(
          complaint._id || complaint.id || "",
          techToUse
        );
      } else {
        // Single technician
        response = await managerService.assignTechnician(
          complaint._id || complaint.id || "",
          techToUse[0]
        );
      }
      
      if (response.success) {
        // Refresh complaint details
        const detailResponse = await complaintService.getComplaintDetail(complaint._id || complaint.id || "");
        if (detailResponse.success) {
          setComplaint(detailResponse.data);
        }
        setActionModal(null);
        setSelectedTechnician("");
        setSelectedTechnicians([]);
      }
    } catch (err) {
      console.error("Error assigning technician:", err);
      alert("Failed to assign technician. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const isAgentOrManager =
    user?.role === "MUNICIPAL_AGENT" ||
    user?.role === "DEPARTMENT_MANAGER" ||
    user?.role === "ADMIN";

  // Check if current user is a technician assigned to this complaint
  const isAssignedTechnician = user?.role === "TECHNICIAN" && 
    complaint?.assignedTo?._id === user?.id;

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

  const hasLocation = complaint?.location?.coordinates && Array.isArray(complaint.location.coordinates) && complaint.location.coordinates.length >= 2;

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
            onClick={handleBack}
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
      <PageHeader
        title={`Complaint ${getComplaintIdDisplay(complaint._id || complaint.id || "")}`}
        onBackClick={handleBack}
        rightContent={
          <span 
            className={`px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${status.bgClass} ${status.textClass}`}
            aria-label={`Status: ${status.label}`}
          >
            {status.label}
          </span>
        }
      />

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
                          className={`w-8 h-2 rounded-sm transition-all ${
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
                      ({urgencyLabels[complaint.urgency as string] || "Medium"})
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
                  {complaint.location && complaint.location.coordinates && Array.isArray(complaint.location.coordinates) && complaint.location.coordinates.length >= 2 && (
                    <iframe
                      title={`Map of complaint at ${complaint.location.address || 'this location'}`}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      aria-hidden="true"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                        complaint.location.coordinates[0] - 0.01
                      }%2C${complaint.location.coordinates[1] - 0.01}%2C${
                        complaint.location.coordinates[0] + 0.01
                      }%2C${complaint.location.coordinates[1] + 0.01}&layer=mapnik&marker=${
                        complaint.location.coordinates[1]
                      }%2C${complaint.location.coordinates[0]}`}
                    ></iframe>
                  )}
                </div>
              )}
              {complaint.location?.address && complaint.location?.coordinates && complaint.location.coordinates.length >= 2 && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${complaint.location.coordinates[1]},${complaint.location.coordinates[0]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:text-primary-700 font-medium mt-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  🏛️ {complaint.location?.commune}{complaint.location?.commune && complaint.location?.governorate && ` (Gouvernorat ${complaint.location.governorate})`} 📍 {complaint.location.address}
                  <span className="text-xs bg-primary/10 px-2 py-1 rounded">Open in Maps</span>
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
                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p>No photos provided</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {complaint.media.map((item, index) => (
                    <div key={`media-${index}`} className="relative group">
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
                          aria-label={`Video ${index + 1}`}
                        />
                      ) : (
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block w-full"
                        >
                          <img
                            src={item.url}
                            alt={`Photo ${index + 1} of the complaint`}
                            className="w-full h-32 object-cover rounded-lg hover:opacity-90 transition opacity-100"
                            onError={() => handleMediaError(index)}
                            crossOrigin="anonymous"
                          />
                        </a>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Before Photos (Technician) */}
            {complaint.beforePhotos && complaint.beforePhotos.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500" aria-labelledby="before-photos-title">
                <h2 id="before-photos-title" className="text-lg font-semibold text-gray-900 mb-4">
                  Before Work Photos ({complaint.beforePhotos.length})
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {complaint.beforePhotos.map((item, index) => (
                    <div key={`before-${index}`} className="relative group">
                      {item.type === "video" ? (
                        <video
                          src={item.url}
                          controls
                          className="w-full h-32 object-cover rounded-lg"
                          aria-label={`Video before work ${index + 1}`}
                        />
                      ) : (
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block w-full"
                        >
                          <img
                            src={item.url}
                            alt={`Photo before work ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg hover:opacity-90 transition opacity-100"
                          />
                        </a>
                      )}
                      {item.takenAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(item.takenAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* After Photos (Technician) */}
            {complaint.afterPhotos && complaint.afterPhotos.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500" aria-labelledby="after-photos-title">
                <h2 id="after-photos-title" className="text-lg font-semibold text-gray-900 mb-4">
                  After Work Photos ({complaint.afterPhotos.length})
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {complaint.afterPhotos.map((item, index) => (
                    <div key={`after-${index}`} className="relative group">
                      {item.type === "video" ? (
                        <video
                          src={item.url}
                          controls
                          className="w-full h-32 object-cover rounded-lg"
                          aria-label={`Video after work ${index + 1}`}
                        />
                      ) : (
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block w-full"
                        >
                          <img
                            src={item.url}
                            alt={`Photo after work ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg hover:opacity-90 transition opacity-100"
                          />
                        </a>
                      )}
                      {item.takenAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(item.takenAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Timeline/History */}
            {complaint.history && complaint.history.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm p-6" aria-labelledby="timeline-title">
                <h2 id="timeline-title" className="text-lg font-semibold text-gray-900 mb-4">
                  Historique
                </h2>
                <Timeline history={complaint.history} />
              </section>
            )}

            {/* Comments */}
            {complaint.publicComments && complaint.publicComments.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm p-6" aria-labelledby="comments-title">
                <h2 id="comments-title" className="text-lg font-semibold text-gray-900 mb-4">
                  Commentaires ({complaint.publicComments.length})
                </h2>
                <div className="space-y-4">
                  {complaint.publicComments.map((comment: any, idx: number) => (
                    <div key={comment._id || idx} className="border-b pb-4 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">
                          {comment.author?.fullName || comment.author?.name || "Utilisateur"}
                        </span>
                        <time className="text-sm text-gray-500" dateTime={comment.date || comment.createdAt}>
                          {new Date(comment.date || comment.createdAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                      <p className="text-gray-700">{comment.content || comment.text}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Internal Notes - Only for staff */}
            {isAgentOrManager && (
              <section className="bg-white rounded-xl shadow-sm p-6" aria-labelledby="notes-title">
                <h2 id="notes-title" className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Internal Notes
                </h2>
                <InternalNotes
                  notes={internalNotes.map((n: any) => ({
                    _id: n._id,
                    type: n.type || "NOTE",
                    authorName: n.author?.fullName || n.authorName || "Staff",
                    authorRole: n.authorRole || "Staff",
                    content: n.content || n.text || "",
                    createdAt: n.date || n.createdAt
                  }))}
                  userRole={user?.role || ""}
                  canAdd={true}
                  onAdd={handleAddNote}
                />
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
            {(complaint.assignedTo || complaint.assignedTeam) && (
              <section className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100" aria-labelledby="assigned-title">
                <h2 id="assigned-title" className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-primary" />
                  Assigned to
                </h2>
                {complaint.assignedTo && (
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      {typeof complaint.assignedTo === 'object' ? complaint.assignedTo.fullName : 'Technician Assigned'}
                    </p>
                    {typeof complaint.assignedTo === 'object' && complaint.assignedTo.email && (
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {complaint.assignedTo.email}
                      </p>
                    )}
                  </div>
                )}
                {complaint.assignedTeam && typeof complaint.assignedTeam === 'object' && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-sm font-medium text-slate-700 mb-2">
                      Repair Team: {complaint.assignedTeam.name || 'Team Assigned'}
                    </p>
                    {complaint.assignedTeam.members && Array.isArray(complaint.assignedTeam.members) && (
                      <div className="space-y-1">
                        {complaint.assignedTeam.members.map((member: any, index: number) => (
                          <p key={member._id || index} className="text-sm text-slate-600 flex items-center gap-2">
                            <span className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </span>
                            {member.fullName}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
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

            {/* BL-28: Confirmation/Upvote Panel for Citizens */}
            {canConfirmUpvote && (
              <section className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-lg p-6 border border-emerald-200" aria-labelledby="community-title">
                <h2 id="community-title" className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <ThumbsUp className="w-5 h-5 text-emerald-600" />
                  Community Support
                </h2>
                
                {/* Confirmation/Upvote stats */}
                <div className="flex gap-4 mb-4">
                  <div className="flex-1 bg-white/60 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-emerald-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-2xl font-bold">{complaint.confirmationCount || 0}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Confirmations</p>
                  </div>
                  <div className="flex-1 bg-white/60 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-blue-600">
                      <ThumbsUp className="w-5 h-5" />
                      <span className="text-2xl font-bold">{complaint.upvoteCount || 0}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Upvotes</p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirm}
                    disabled={isConfirming}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                      hasConfirmed
                        ? "bg-emerald-500 text-white hover:bg-emerald-600"
                        : "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
                    } disabled:opacity-50`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    {isConfirming ? "..." : hasConfirmed ? "Confirmed" : "Confirm Issue"}
                  </button>
                  <button
                    onClick={handleUpvote}
                    disabled={isUpvoting}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                      hasUpvoted
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-white text-blue-700 border border-blue-200 hover:bg-blue-50"
                    } disabled:opacity-50`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    {isUpvoting ? "..." : hasUpvoted ? "Upvoted" : "Upvote"}
                  </button>
                </div>
                
                <p className="text-xs text-slate-500 mt-3 text-center">
                  Help prioritize this issue by confirming it exists in your area
                </p>
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
                  {/* SUBMITTED - Agent can Validate/Reject, Admin can Validate */}
                  {complaint.status === "SUBMITTED" && (
                    <>
                      {(user?.role === "MUNICIPAL_AGENT" || user?.role === "ADMIN") && (
                        <>
                          <Button
                            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                            icon={<CheckCircle2 className="w-4 h-4" />}
                            onClick={() => setActionModal("validate")}
                          >
                            Validate Complaint
                          </Button>
                          <Button
                            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                            icon={<X className="w-4 h-4" />}
                            onClick={() => setActionModal("reject")}
                          >
                            Reject Complaint
                          </Button>
                        </>
                      )}
                    </>
                  )}

                  {/* VALIDATED - Agent assigns Department, Manager can set Priority, Admin can do everything */}
                  {complaint.status === "VALIDATED" && (
                    <>
                      {(user?.role === "MUNICIPAL_AGENT" || user?.role === "ADMIN") && (
                        <Button
                          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                          icon={<Building2 className="w-4 h-4" />}
                          onClick={() => setActionModal("department")}
                        >
                          Assign to Department
                        </Button>
                      )}
                      {(user?.role === "DEPARTMENT_MANAGER" || user?.role === "ADMIN") && (
                        <Button
                          className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                          icon={<AlertTriangle className="w-4 h-4" />}
                          onClick={() => setActionModal("priority")}
                        >
                          Set Priority
                        </Button>
                      )}
                    </>
                  )}

                  {/* ASSIGNED - Manager assigns Technician/Team */}
                  {complaint.status === "ASSIGNED" && (
                    <>
                      {(user?.role === "DEPARTMENT_MANAGER" || user?.role === "ADMIN") && (
                        <>
                          <Button
                            className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
                            icon={<UserCog className="w-4 h-4" />}
                            onClick={() => setActionModal("technician")}
                          >
                            {complaint.assignedTo ? "Change Technician" : "Assign to Repair Team"}
                          </Button>
                          {!complaint.assignedTo && (
                            <p className="text-xs text-slate-500 text-center mt-2">
                              Select a technician to assign this task
                            </p>
                          )}
                        </>
                      )}
                      {(user?.role === "MUNICIPAL_AGENT" || user?.role === "ADMIN") && complaint.assignedDepartment && !complaint.assignedTo && (
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-sm text-purple-800 font-medium">Department Assigned</p>
                          <p className="text-xs text-purple-600">Waiting for technician assignment from manager</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* IN_PROGRESS - Manager checks SLA, Admin monitors globally */}
                  {(complaint.status === "IN_PROGRESS") && (
                    <>
                      {(user?.role === "DEPARTMENT_MANAGER" || user?.role === "ADMIN") && (
                        <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <p className="text-sm text-orange-800 font-medium">In Progress</p>
                          <p className="text-xs text-orange-600">Technician is working on this complaint</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* RESOLVED - Agent/Manager/Admin can Close */}
                  {complaint.status === "RESOLVED" && (
                    <>
                      {(user?.role === "MUNICIPAL_AGENT" || user?.role === "DEPARTMENT_MANAGER" || user?.role === "ADMIN") && (
                        <Button
                          className="w-full bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700"
                          icon={<CheckCircle2 className="w-4 h-4" />}
                          onClick={() => handleStatusUpdate("CLOSED")}
                        >
                          Close Complaint
                        </Button>
                      )}
                    </>
                  )}

                  {/* CLOSED - Manager sees Stats, Admin sees Reports */}
                  {complaint.status === "CLOSED" && (
                    <>
                      {user?.role === "DEPARTMENT_MANAGER" && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-sm text-green-800 font-medium">Department Statistics</p>
                          <p className="text-xs text-green-600">View performance metrics</p>
                        </div>
                      )}
                      {user?.role === "ADMIN" && (
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-sm text-purple-800 font-medium">Reports</p>
                          <p className="text-xs text-purple-600">Generate global reports</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* REJECTED - All roles can see archived */}
                  {complaint.status === "REJECTED" && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600 font-medium">Archived</p>
                      <p className="text-xs text-gray-500">This complaint has been rejected</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Actions for Technician */}
            {isAssignedTechnician && (
              <section className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-lg p-6 border border-indigo-200" aria-labelledby="tech-actions-title">
                <h2 id="tech-actions-title" className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-indigo-600" />
                  Technician Actions
                </h2>
                <div className="space-y-3">
                  {/* ASSIGNED - Technician can Start */}
                  {complaint.status === "ASSIGNED" && (
                    <Button
                      className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
                      icon={<CheckCircle2 className="w-4 h-4" />}
                      onClick={() => handleStatusUpdate("IN_PROGRESS")}
                    >
                      Start Work
                    </Button>
                  )}

                  {/* IN_PROGRESS - Technician can Resolve */}
                  {complaint.status === "IN_PROGRESS" && (
                    <Button
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                      icon={<CheckCircle2 className="w-4 h-4" />}
                      onClick={() => handleStatusUpdate("RESOLVED")}
                    >
                      Mark as Resolved
                    </Button>
                  )}

                  {/* RESOLVED/CLOSED - Technician can see archived */}
                  {(complaint.status === "RESOLVED" || complaint.status === "CLOSED") && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600 font-medium">Archived</p>
                      <p className="text-xs text-gray-500">This complaint has been completed</p>
                    </div>
                  )}
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
              {actionModal === "validate" && "Validate Complaint"}
              {actionModal === "reject" && "Reject Complaint"}
              {actionModal === "department" && "Assign to Department"}
              {actionModal === "priority" && "Update Priority"}
              {actionModal === "technician" && "Assign to Repair Team"}
            </h3>
            
            {actionModal === "validate" && (
              <div className="space-y-4">
                <p className="text-slate-600">
                  Do you want to validate this complaint? It will be sent to the appropriate department.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setActionModal(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleStatusUpdate("VALIDATED")}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Validate"}
                  </Button>
                </div>
              </div>
            )}

            {actionModal === "reject" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Rejection Reason
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    rows={3}
                    placeholder="Explain why this complaint is being rejected..."
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setActionModal(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={() => handleStatusUpdate("REJECTED")}
                    disabled={actionLoading || !rejectionReason.trim()}
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
                  </Button>
                </div>
              </div>
            )}

            {actionModal === "priority" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Priority Level
                  </label>
                  <select
                    value={selectedUrgency}
                    onChange={(e) => setSelectedUrgency(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select...</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Priority Score (1-10)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={selectedPriorityScore}
                    onChange={(e) => setSelectedPriorityScore(e.target.value)}
                    placeholder={complaint.priorityScore?.toString() || "Enter score"}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <p className="text-xs text-slate-500 mt-1">Current score: {complaint.priorityScore || 0}</p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setActionModal(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    onClick={handlePriorityUpdate}
                    disabled={actionLoading || (!selectedUrgency && !selectedPriorityScore)}
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
                  </Button>
                </div>
              </div>
            )}

            {actionModal === "department" && (
              <div className="space-y-4">
                {/* Department Suggestion based on Category - Clickable */}
                {complaint.category && !complaint.department && (() => {
                  const suggestedNames = categoryToDepartmentMap[complaint.category] || [];
                  const matchingDepts = (departments || []).filter(dept => 
                    suggestedNames.some(name => dept.name.toLowerCase().includes(name.toLowerCase()))
                  );
                  return matchingDepts.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-blue-800 font-medium">
                        Suggested department based on category &quot;{categoryLabels[complaint.category] || complaint.category}&quot;:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {matchingDepts.map(dept => (
                          <button
                            key={dept._id}
                            onClick={() => {
                              setSelectedDepartment(dept._id);
                            }}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              selectedDepartment === dept._id 
                                ? 'bg-primary text-white' 
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                          >
                            {dept.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select Department
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Choose a department...</option>
                    {(departments || []).map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  {(!departments || departments.length === 0) && (
                    <p className="text-sm text-slate-500 mt-2">No departments available</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setActionModal(null);
                      setSelectedDepartment("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={handleDepartmentUpdate}
                    disabled={actionLoading || !selectedDepartment}
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign"}
                  </Button>
                </div>
              </div>
            )}

            {actionModal === "technician" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select Technician(s) for Repair Team
                  </label>
                  {technicians.length === 0 ? (
                    <div className="text-center py-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-amber-800 font-medium">No technicians available</p>
                      <p className="text-sm text-amber-600 mt-1">
                        There are no technicians assigned to this department yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-200 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-2">Select one or more technicians:</p>
                      {technicians.map((tech) => {
                        const isSelected = selectedTechnicians.includes(tech._id);
                        return (
                          <label
                            key={tech._id}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-primary/10 border border-primary/30' 
                                : 'hover:bg-slate-50 border border-transparent'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTechnicians([...selectedTechnicians, tech._id]);
                                } else {
                                  setSelectedTechnicians(selectedTechnicians.filter(id => id !== tech._id));
                                }
                              }}
                              className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-700">{tech.fullName}</p>
                              {tech.email && <p className="text-xs text-slate-500">{tech.email}</p>}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {selectedTechnicians.length > 1 && (
                    <p className="text-sm text-primary font-medium mt-2">
                      {selectedTechnicians.length} technicians selected - A repair team will be created
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setActionModal(null);
                      setSelectedTechnician("");
                      setSelectedTechnicians([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    onClick={handleTechnicianUpdate}
                    disabled={actionLoading || (selectedTechnicians.length === 0 && !selectedTechnician)}
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                      selectedTechnicians.length > 1 ? "Create Team & Assign" : "Assign"
                    }
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
