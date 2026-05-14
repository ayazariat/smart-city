"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { 
  Clock, 
  User, 
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Building2,
  UserCog,
  MessageSquare,
  Calendar,
  Phone,
  Mail,
  Shield,
  Loader2,
  X,
  ThumbsUp,
  CheckCircle,
  Camera,
  FileText,
  Copy,
  Search,
  Flag,
  Eye,
  Merge,
} from "lucide-react";
import { Complaint } from "@/types";
import { complaintService, processComplaintMedia } from "@/services/complaint.service";
import { apiClient } from "@/services/api.client";
import { adminService } from "@/services/admin.service";
import { managerService } from "@/services/manager.service";
import { agentService } from "@/services/agent.service";
import { useAuthStore } from "@/store/useAuthStore";
import { Button, PageHeader } from "@/components/ui";
import { showToast } from "@/components/ui/Toast";
import Timeline from "@/components/complaints/Timeline";
import InternalNotes from "@/components/complaints/InternalNotes";
import { categoryOptions, categoryLabels, statusConfig, getComplaintIdDisplay } from "@/lib/complaints";
import { getDepartmentLabel } from "@/lib/categories";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AIAnalysisCard from "@/components/dashboard/AIAnalysisCard";
import { useTranslation } from "react-i18next";

type InternalNoteItem = (NonNullable<Complaint["internalNotes"]>[number]) & {
  authorName?: string;
  authorRole?: string;
  createdAt?: string;
  text?: string;
  author?: {
    _id?: string;
    fullName?: string;
    role?: string;
  } | null;
};
type PublicComment = (NonNullable<Complaint["publicComments"]>[number]) & {
  text?: string;
  author?: { _id?: string; fullName?: string; name?: string };
  createdAt?: string;
};
type AssignedTeamMember = NonNullable<NonNullable<Complaint["assignedTeam"]>["members"]>[number];

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

export default function ComplaintDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const complaintId = params.id as string;
  const fromParam = searchParams.get("from");
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language || "en";

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
  const [selectedTechnician, setSelectedTechnician] = useState<string>("");
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [selectedUrgency, setSelectedUrgency] = useState<string>("");
  const [selectedPriorityScore, setSelectedPriorityScore] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [resolutionRejectionReason, setResolutionRejectionReason] = useState<string>("");

  // Notes state
  const [internalNotes, setInternalNotes] = useState<InternalNoteItem[]>([]);

  // BL-28: Confirm/Upvote state
  const [isUpvoting, setIsUpvoting] = useState(false);
  const [duplicateResults, setDuplicateResults] = useState<any[]>([]);
  const [showDuplicateResults, setShowDuplicateResults] = useState(false);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);
  const [duplicateCheckPerformed, setDuplicateCheckPerformed] = useState(false);
  const [mergingWith, setMergingWith] = useState<string | null>(null);
  const [publicCommentText, setPublicCommentText] = useState("");
  const [postingPublicComment, setPostingPublicComment] = useState(false);

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
          setInternalNotes(detailResponse.data.internalNotes as InternalNoteItem[]);
        }
      }
    } catch (error) {
    }
  };

  // BL-28: Check if current user has confirmed/upvoted
  // citizenId is stored as ObjectId in DB, so we must compare as strings
  const userId = user?.id;
  const hasUpvoted = (
    complaint?.upvotes as Array<{ citizenId?: string | { _id?: string } | null }> | undefined
  )?.some((u) => {
    const citizenId = u?.citizenId;
    const id =
      typeof citizenId === "object" && citizenId !== null
        ? citizenId._id
        : citizenId;
    return id?.toString() === userId?.toString();
  });
  const isOwnComplaint = (() => {
    if (!complaint || !userId) return false;
    const createdById = typeof complaint.createdBy === "string" 
      ? complaint.createdBy 
      : complaint.createdBy?._id;
    return createdById === userId;
  })();
  // Community actions available when complaint is active OR resolved/closed
  const canConfirmUpvote =
    user?.role === "CITIZEN" &&
    !isOwnComplaint &&
    complaint?._id &&
    ["VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"].includes(complaint?.status || "");

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
    } finally {
      setIsUpvoting(false);
    }
  };

  const refreshComplaint = async () => {
    if (!complaint?._id) return;
    const detailResponse = await complaintService.getComplaintDetail(complaint._id);
    if (detailResponse.success) {
      setComplaint(processComplaintMedia(detailResponse.data));
    }
  };

  const handleAddPublicComment = async () => {
    if (!complaint?._id || !publicCommentText.trim() || postingPublicComment) return;
    setPostingPublicComment(true);
    try {
      const result = await complaintService.addPublicComment(
        complaint._id,
        publicCommentText.trim()
      );
      if (result.success) {
        setPublicCommentText("");
        await refreshComplaint();
      }
    } catch (err) {
    } finally {
      setPostingPublicComment(false);
    }
  };

  const handleMergeDuplicate = async (existingComplaintId: string) => {
    if (!complaint) return;
    if (!confirm(t('complaintDetail.mergeConfirm', { rc: existingComplaintId }))) return;
    
    setMergingWith(existingComplaintId);
    try {
      const result = await apiClient.post<any>(
        `/complaints/${complaint._id || complaint.id}/merge`,
        {
          originalComplaintId: existingComplaintId,
        }
      );
      
      if (result.success) {
        const updatedMergedComplaint = result.mergedComplaint || {};
        setComplaint(prev => processComplaintMedia({
          ...(prev || complaint),
          ...updatedMergedComplaint,
          status: "REJECTED",
          rejectionReason: "duplicate",
          isDuplicate: true,
          duplicateOf: updatedMergedComplaint.duplicateOf || existingComplaintId,
          duplicateOfReferenceId: updatedMergedComplaint.duplicateOfReferenceId || result.originalComplaint?.referenceId,
          mergedAt: updatedMergedComplaint.mergedAt || new Date().toISOString(),
          mergedBy: updatedMergedComplaint.mergedBy || user?.fullName || user?.id || null,
          duplicateStatus: "CONFIRMED_DUPLICATE"
        } as Complaint));
        
        setActionModal(null);
        setShowDuplicateResults(false);
        setDuplicateResults([]);
        setDuplicateDismissed(true);
        setDuplicateCheckPerformed(true);
        
        showToast(t('agent.mergeSuccess'), 'success');
      } else {
        console.error('[handleMergeDuplicate] Backend error:', result);
        alert(result.message || t('complaintDetail.mergeFailed'));
      }
    } catch (err) {
      console.error('[handleMergeDuplicate] Error:', err);
      const errorMessage = err instanceof Error ? err.message : t('complaintDetail.mergeFailed');
      alert(errorMessage);
    } finally {
      setMergingWith(null);
    }
  };

  const handleCheckDuplicate = async () => {
    if (!complaint) return;
    setDuplicateLoading(true);
    setDuplicateResults([]);
    setShowDuplicateResults(true);
    setDuplicateCheckPerformed(true);
    try {
      const lat = complaint.location?.coordinates?.[1] ?? complaint.location?.latitude;
      const lng = complaint.location?.coordinates?.[0] ?? complaint.location?.longitude;
      const imageUrls = (complaint.media || []).map(m => m.url).filter(Boolean).slice(0, 3);

      const result = await apiClient.post<any>(
        "/ai/duplicate/check",
        {
          complaintId: complaint._id || complaint.id || "new",
          title: complaint.title,
          description: complaint.description,
          category: complaint.category,
          municipality: complaint.municipalityName,
          latitude: lat,
          longitude: lng,
          imageUrls,
          submittedAt: complaint.createdAt,
        },
        { requiresAuth: false }
      );
      
      // Handle different response formats
      const data = result.data || result;
      let matches = [];
      
      // Try to get matches from different possible response structures
      if (data && data.topMatches && Array.isArray(data.topMatches)) {
        matches = data.topMatches;
      } else if (data && data.matches && Array.isArray(data.matches)) {
        matches = data.matches;
      } else if (data && Array.isArray(data)) {
        matches = data;
      } else if (result && result.topMatches && Array.isArray(result.topMatches)) {
        matches = result.topMatches;
      } else if (result && result.matches && Array.isArray(result.matches)) {
        matches = result.matches;
      }
      
      const reviewableMatches = matches
        .filter((match: any) => match.status !== "REJECTED" && (match.overallScore || 0) >= 0.65)
        .slice(0, 3);
      setDuplicateResults(reviewableMatches);
      setShowDuplicateResults(reviewableMatches.length > 0);
      if (reviewableMatches.length === 0) {
        showToast(t("complaintDetail.noSimilarFound", { defaultValue: "No similar complaints found." }), "info");
      }
    } catch (error) {
      console.error("Error checking duplicates:", error);
      setDuplicateResults([]);
    } finally {
      setDuplicateLoading(false);
    }
  };

  // BL-25: Handle duplicate check
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
          setDuplicateResults([]);
          setShowDuplicateResults(false);
          // Load internal notes if available
          if (processedComplaint.internalNotes) {
            setInternalNotes(processedComplaint.internalNotes as InternalNoteItem[]);
          }
        } else {
          setError(t("complaintDetail.errorNotFound"));
        }
      } catch (err: unknown) {
        
        // Handle ApiError from client
        if (err && typeof err === 'object' && 'status' in err) {
          const apiError = err as { status: number; message?: string };
          if (apiError.status === 403) {
            setError(apiError.message || t("complaintDetail.errorAccessDenied"));
          } else if (apiError.status === 404) {
            setError(t("complaintDetail.errorNotFound"));
          } else if (apiError.status === 401) {
            setError(t("complaintDetail.errorSessionExpired"));
          } else {
            setError(apiError.message || t("complaintDetail.errorLoading"));
          }
        } else if (err instanceof Error) {
          // Check for specific error messages
          if (err.message?.toLowerCase().includes("access denied")) {
            setError(err.message);
          } else if (err.message?.toLowerCase().includes("login")) {
            setError(t("complaintDetail.errorSessionExpired"));
          } else {
            setError(err.message || t("complaintDetail.errorLoading"));
          }
        } else {
          setError(t("complaintDetail.errorLoading"));
        }
      } finally {
        setLoading(false);
      }
    };

    if (complaintId) {
      fetchComplaintDetail();
    }
  }, [complaintId, t]);

   // Fetch departments when opening department modal (agent only)
   useEffect(() => {
     const fetchDepartments = async () => {
       if (actionModal === "department" && user?.role === "MUNICIPAL_AGENT") {
         try {
           const response = await agentService.getAgentDepartments();
           if (response.data && Array.isArray(response.data)) {
             setDepartments(response.data);
           }
         } catch (error) {
           setDepartments([]);
         }
       }
     };
     fetchDepartments();
   }, [actionModal, user?.role]);

   // Fetch technicians for manager
   useEffect(() => {
     const fetchTechnicians = async () => {
       if (actionModal === "technician" && user?.role === "DEPARTMENT_MANAGER") {
         try {
           const techData = await managerService.getTechnicians();
           if (techData.data) {
             setTechnicians(techData.data);
           }
         } catch (error) {
           setTechnicians([]);
         }
       }
     };
     fetchTechnicians();
   }, [actionModal, user?.role]);

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

  const applyUpdatedComplaint = (updated?: Complaint | null) => {
    if (updated) {
      setComplaint(processComplaintMedia(updated));
    }
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
        applyUpdatedComplaint(response.data);
        setActionModal(null);
        setRejectionReason("");
      }
      } catch (err) {
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
        applyUpdatedComplaint(response.data);
        setActionModal(null);
        setSelectedUrgency("");
        setSelectedPriorityScore("");
      }
      } catch (err) {
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
        applyUpdatedComplaint(response.data);
        setActionModal(null);
        setSelectedDepartment("");
      }
      } catch (err) {
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
        // Re-fetch complaint to get fully populated assignedTeam/assignedTo
        await refreshComplaint();
        setActionModal(null);
        setSelectedTechnician("");
        setSelectedTechnicians([]);
        // Show success message
        if (techToUse.length > 1) {
          alert("Team assigned successfully!");
        } else {
          alert("Technician assigned successfully!");
        }
      }
      } catch (err) {
      } finally {
        setActionLoading(false);
      }
  };

  const isAgentOrManager =
    user?.role === "MUNICIPAL_AGENT" ||
    user?.role === "DEPARTMENT_MANAGER";
  const isAdmin = user?.role === "ADMIN";
  const canSeeAiInsights =
    user?.role === "DEPARTMENT_MANAGER" || user?.role === "ADMIN" || user?.role === "MUNICIPAL_AGENT";
  const canSeeUrgencyPrediction = user?.role === "DEPARTMENT_MANAGER" || user?.role === "ADMIN";
  const showUrgencyAi =
    canSeeUrgencyPrediction &&
    !!complaint?.aiUrgencyPrediction &&
    ["SUBMITTED", "VALIDATED", "ASSIGNED", "IN_PROGRESS"].includes(
      complaint?.status || ""
    );
  const showDuplicateAi =
    user?.role === "MUNICIPAL_AGENT" &&
    !!complaint?.aiDuplicateCheck &&
    Array.isArray(complaint?.aiDuplicateCheck?.topMatches) &&
    complaint.aiDuplicateCheck.topMatches.length > 0;

  // Check if current user is a technician assigned to this complaint
  const isAssignedTechnician = user?.role === "TECHNICIAN" && (() => {
    const assignedTo = complaint?.assignedTo;
    const assignedToId = typeof assignedTo === "object" ? assignedTo?._id : assignedTo;
    return assignedToId === user?.id;
  })();

  // Check if current user is the owner of the complaint
  const isOwner = (() => {
    if (!complaint || !user?.id) return false;
    const citizenId = typeof complaint.createdBy === "object" ? complaint.createdBy?._id : complaint.createdBy;
    return citizenId === user.id;
  })();

  // Show contact info for agents/managers/admins OR the owner
  const canViewContact = isAgentOrManager || isAdmin || isOwner;
  
  // Get citizen info - try createdBy first (for agent/manager view) or citizen (for some views)
  // Also check complaint.phone field directly for anonymous complaints
  const citizenInfo = (() => {
    if (!complaint) return null;
    if (complaint.createdBy && typeof complaint.createdBy === "object") {
      return complaint.createdBy;
    }
    if (complaint.citizen && typeof complaint.citizen === "object") {
      return complaint.citizen;
    }
    // For non-anonymous complaints where createdBy is a string ID (not populated), use complaint-level fields
    if (!complaint.isAnonymous) {
      const c = complaint as any;
      const name = c.ownerName || c.citizenName || c.fullName || "";
      const phone = c.phone || c.citizenPhone || "";
      const email = c.citizenEmail || "";
      if (name || phone || email) {
        return { fullName: name || "Citizen", phone, email };
      }
    }
    // For anonymous complaints, create citizen info from complaint fields
    const c2 = complaint as any;
    if (complaint.isAnonymous && (c2.ownerName || c2.phone)) {
      return {
        fullName: c2.ownerName || "Anonymous",
        phone: c2.phone,
        email: null
      };
    }
    return null;
  })();

  const hasLocation = complaint?.location?.coordinates && Array.isArray(complaint.location.coordinates) && complaint.location.coordinates.length >= 2;
  const afterPhotos = complaint?.afterPhotos || complaint?.resolutionPhotos || complaint?.media?.filter((m: any) => m.type === 'after' || m.category === 'after') || [];
  const beforePhotos = complaint?.beforePhotos || complaint?.media?.filter((m: any) => m.type === 'before' || m.category === 'before') || [];
  const duplicateReference = complaint?.duplicateOfTitle || complaint?.duplicateOfReferenceId || getComplaintIdDisplay(complaint?.duplicateOf || "");
  const duplicateReferenceId = complaint?.duplicateOfReferenceId || getComplaintIdDisplay(complaint?.duplicateOf || "");
  const isDuplicateRejection = !!complaint?.isDuplicate && !!complaint?.duplicateOf && complaint?.rejectionReason === "duplicate";
  const formatLongDate = (date?: string | null) =>
    date ? new Date(date).toLocaleDateString(locale, { month: "long", day: "numeric", year: "numeric" }) : "";
  const getStaffName = (value?: string | { fullName?: string } | null) =>
    typeof value === "object" ? value?.fullName : value;
  const getMediaSrc = (photo: string | { url?: string }) => {
    const url = typeof photo === "string" ? photo : photo?.url;
    if (!url) return "";
    if (url.startsWith("http")) return url;
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/api$/, "");
    return `${baseUrl}${url}`;
  };

  if (loading) {
    return (
      <DashboardLayout>
      <div className="min-h-screen flex items-center justify-center" role="status" aria-live="polite">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-slate-600">{t("common.loading")}</p>
        </div>
      </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
            {error}
          </div>
          <Button
            variant="primary"
            onClick={handleBack}
          >
            {t("common.back")}
          </Button>
        </div>
      </div>
      </DashboardLayout>
    );
  }

  if (!complaint) {
    return null;
  }

   const status = statusConfig[complaint.status] || {
     labelKey: `status.${complaint.status}`,
     bgClass: "bg-slate-100",
     textClass: "text-slate-800",
   };

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
      <PageHeader
        title={complaint.title || `${t("complaintDetail.complaint")} ${getComplaintIdDisplay(complaint._id || complaint.id || "")}`}
        onBackClick={handleBack}
        rightContent={
          <div className="flex items-center gap-3">
             {complaint.assignedDepartment && typeof complaint.assignedDepartment === 'object' && (
               <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                 {getDepartmentLabel(complaint.assignedDepartment.name)}
               </span>
             )}
              <div>
              <span 
                className={`px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${status.bgClass} ${status.textClass}`}
                aria-label={`${t("complaintDetail.status")}: ${t(status.labelKey, { defaultValue: complaint.status })}`}
              >
                {t(status.labelKey, { defaultValue: complaint.status })}
              </span>
              {isDuplicateRejection && (
                <p className="text-xs text-slate-500 mt-1 text-center">
                  {t("complaint.reasonDuplicateOf", { rc: duplicateReference })}
                </p>
              )}
              </div>
          </div>
        }
      />

      <main className="w-full max-w-7xl mx-auto px-4 py-4 overflow-x-hidden" role="main">
        <div className="w-full grid grid-cols-1 lg:grid-cols-[2fr_380px] gap-4 lg:gap-6 items-start overflow-x-hidden">
          {/* Main Content */}
          <div className="space-y-4">
            {/* Basic Info */}
            <section className="bg-white rounded-2xl shadow-lg p-2 border border-slate-100" aria-labelledby="basic-info-title">
              <h2 id="basic-info-title" className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                {t("complaintDetail.mainInformation")}
              </h2>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <label className="block text-sm font-medium text-slate-500 mb-2">{t("complaintDetail.category")}</label>
                  <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md">
                    {categoryLabels[complaint.category] || complaint.category}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <label className="block text-sm font-medium text-slate-500 mb-2">{t("complaintDetail.urgency")}</label>
                  <div className="flex items-center gap-2" role="group" aria-label={`${t("complaintDetail.urgency")}: ${getUrgencyValue(complaint.urgency)} / 5`}>
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
                      ({t(`complaintDetail.${(complaint.urgency as string || "MEDIUM").toLowerCase()}`) || complaint.urgency})
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Duplicate Detection Review Card */}
            {complaint.status === "SUBMITTED" && showDuplicateResults && duplicateResults.length > 0 && user?.role === "MUNICIPAL_AGENT" && (
              <section className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {t("complaintDetail.potentialDuplicatesFound", {
                          count: duplicateResults.length,
                          defaultValue: "Potential duplicates found!",
                        })}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {t("complaintDetail.duplicatesWarning", {
                          defaultValue: "These complaints appear similar. You can merge them or keep them separate.",
                        })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setDuplicateDismissed(true);
                      setShowDuplicateResults(false);
                    }}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    aria-label="Dismiss duplicates"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                {duplicateLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-sm text-slate-700 font-medium mb-2">
                        {t("complaintDetail.mainComplaint", { defaultValue: "Main complaint (target)" })}
                      </p>
                      <h3 className="font-semibold text-slate-900">{complaint.title}</h3>
                      <p className="text-sm text-slate-600 mt-1">{complaint.description}</p>
                      {complaint.location?.address && (
                        <p className="text-xs text-slate-500 mt-2">{complaint.location.address}</p>
                      )}
                    </div>

                    <p className="text-sm text-slate-600 mb-3 font-medium">
                      {t("complaintDetail.selectToMerge", { defaultValue: "Select complaints to merge:" })}
                    </p>

                    {duplicateResults.map((match: any, idx: number) => {
                      const matchId = match.complaintId || match._id || match.id;
                      return (
                      <div key={idx} className="rounded-lg border border-slate-200 hover:border-red-300 transition-all overflow-hidden bg-white">
                        <div className="flex gap-3 p-3">
                          {match.media?.[0]?.url ? (
                            <img
                              src={getMediaSrc(match.media[0])}
                              alt={match.title}
                              className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-6 h-6 text-slate-300" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-900 text-sm truncate">
                                {match.title}
                              </p>
                              <span className={`ml-auto flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                                Math.round((match.overallScore || 0) * 100) >= 80 ? 'bg-red-100 text-red-700' :
                                Math.round((match.overallScore || 0) * 100) >= 60 ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {Math.round((match.overallScore || 0) * 100)}% similar
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{match.description || 'No description'}</p>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1.5 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                match.status === 'RESOLVED' ? 'bg-green-100 text-green-700' :
                                match.status === 'IN_PROGRESS' ? 'bg-orange-100 text-orange-700' :
                                match.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-700' :
                                match.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {String(match.status || "UNKNOWN").replace("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                              </span>
                              <span className="text-xs text-slate-500">
                                {categoryLabels[match.category as keyof typeof categoryLabels] || match.category || 'UNKNOWN'}
                              </span>
                              {match.municipalityName && <span>{match.municipalityName}</span>}
                              {match.referenceId && <span className="font-mono">{match.referenceId}</span>}
                            </div>
                            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                              <button
                                onClick={() => window.open(`/dashboard/complaints/${matchId}`, '_blank')}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-sm font-medium transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </button>
                              <button
                                onClick={() => handleMergeDuplicate(matchId)}
                                disabled={mergingWith === matchId}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                              >
                                {mergingWith === matchId ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Merge className="w-4 h-4" />
                                )}
                                Merge
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                )}
                
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setDuplicateDismissed(true);
                      setShowDuplicateResults(false);
                    }}
                    className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={() => {
                      setDuplicateDismissed(true);
                      setShowDuplicateResults(false);
                    }}
                    className="flex-1 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-md font-medium transition-colors border border-slate-300"
                  >
                    {t("complaintDetail.keepSeparate", { defaultValue: "Keep Separate" })}
                  </button>
                </div>
              </section>
            )}

            {/* Status Timeline */}
            <section className="bg-gradient-to-r from-primary/5 to-secondary-50 rounded-2xl shadow-lg p-6 border border-primary/10">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                {t("complaintDetail.statusTimeline")}
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
                    <UserCog className="w-4 h-4" />
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

            {/* AI Analysis Section (BL-24, BL-25) - only before assignment */}
            {canSeeAiInsights && showUrgencyAi && !(complaint.assignedTo || complaint.assignedTeam || (complaint as any).repairTeamId) && (
              <section className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl shadow-lg p-6 border border-violet-200">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  {t("complaintDetail.aiAnalysis")}
                </h2>
                
                {/* BL-24: Urgency Prediction — Manager/Admin only - Hide when assigned */}
                {showUrgencyAi && complaint.aiUrgencyPrediction && !(complaint.assignedTo || complaint.assignedTeam || (complaint as any).repairTeamId) && (
                  <div className="mb-4 p-4 bg-white rounded-xl border border-violet-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">{t("complaintDetail.aiUrgencyPrediction")}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        complaint.aiPredictedUrgency === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                        complaint.aiPredictedUrgency === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                        complaint.aiPredictedUrgency === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {complaint.aiPredictedUrgency || 'UNKNOWN'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full"
                          style={{ width: `${(complaint.aiUrgencyPrediction.confidenceScore || 0) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">
                        {Math.round((complaint.aiUrgencyPrediction.confidenceScore || 0) * 100)}% confidence
                      </span>
                    </div>
                    {complaint.aiUrgencyPrediction?.breakdown?.keywordsDetected && complaint.aiUrgencyPrediction.breakdown.keywordsDetected.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {complaint.aiUrgencyPrediction.breakdown.keywordsDetected.slice(0, 5).map((kw: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                    {complaint.aiUrgencyPrediction.explanation && (
                      <p className="text-xs text-slate-600 mt-2">{complaint.aiUrgencyPrediction.explanation}</p>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Description */}
            <section className="bg-white rounded-xl shadow-sm p-3" aria-labelledby="description-title">
              <h2 id="description-title" className="text-base font-semibold text-slate-900 mb-3">{t("complaintDetail.description")}</h2>
              <p className="text-slate-800 whitespace-pre-wrap">{complaint.description}</p>
            </section>

            {/* Location */}
            <section className="bg-white rounded-xl shadow-sm p-3" aria-labelledby="location-title">
              <h2 id="location-title" className="text-base font-semibold text-slate-900 mb-3">{t("complaintDetail.location")}</h2>
              {!hasLocation ? (
                <div className="h-64 bg-red-50 rounded-lg flex items-center justify-center border-2 border-red-200 border-dashed">
                  <div className="text-center">
                    <svg className="w-12 h-12 mx-auto mb-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-red-600 font-medium">{t("complaintDetail.locationMissing")}</p>
                    {complaint.location?.address && <p className="text-sm text-slate-600">{complaint.location.address}</p>}
                  </div>
                </div>
              ) : (
                <div className="h-64 bg-slate-100 rounded-lg overflow-hidden">
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
                  <span className="text-xs bg-primary/10 px-2 py-1 rounded">{t("complaintDetail.openInMaps")}</span>
                </a>
              )}
            </section>

            {/* Media */}
            <section className="bg-white rounded-xl shadow-sm p-3" aria-labelledby="media-title">
              <h2 id="media-title" className="text-base font-semibold text-slate-900 mb-3">
                {t("complaintDetail.photos")} ({complaint.media?.length || 0})
              </h2>
              {!complaint.media || complaint.media.length === 0 ? (
                <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                  <svg className="w-12 h-12 mx-auto mb-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p>{t("complaintDetail.noPhotos")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {complaint.media.map((item, index) => (
                    <div key={`media-${index}`} className="relative group animate-gallery-item" style={{ animationDelay: `${index * 100}ms` }}>
                      {mediaErrors[index] ? (
                        <div className="w-full h-32 bg-slate-200 rounded-lg flex items-center justify-center">
                          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
              <section className="bg-white rounded-xl shadow-sm p-3 border-l-4 border-orange-500" aria-labelledby="before-photos-title">
                <h2 id="before-photos-title" className="text-base font-semibold text-slate-900 mb-3">
                  {t("complaintDetail.beforeWorkPhotos")} ({complaint.beforePhotos.length})
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
                        <p className="text-xs text-slate-500 mt-1">
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
              <section className="bg-white rounded-xl shadow-sm p-3 border-l-4 border-green-500" aria-labelledby="after-photos-title">
                <h2 id="after-photos-title" className="text-base font-semibold text-slate-900 mb-3">
                  {t("complaintDetail.afterWorkPhotos")} ({complaint.afterPhotos.length})
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
                        <p className="text-xs text-slate-500 mt-1">
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
              <section className="bg-white rounded-xl shadow-sm p-3" aria-labelledby="timeline-title">
                <h2 id="timeline-title" className="text-base font-semibold text-slate-900 mb-3">
                  {t("complaintDetail.history")}
                </h2>
                <Timeline 
                  history={complaint.history} 
                  userRole={user?.role}
                  userId={user?.id || (user as any)?._id}
                  complaintOwnerId={typeof complaint.createdBy === 'string' ? complaint.createdBy : complaint.createdBy?._id}
                />
              </section>
            )}

            {/* Comments */}
            <section className="bg-white rounded-xl shadow-sm p-3" aria-labelledby="comments-title">
                <h2 id="comments-title" className="text-base font-semibold text-slate-900 mb-3">
                  {t("complaintDetail.comments")} ({complaint.publicComments?.length || 0})
                </h2>
                {(complaint.publicComments?.length || 0) > 0 ? (
                  <div className="space-y-4">
                    {complaint.publicComments?.map((comment: PublicComment, idx: number) => {
                    const commentDate = comment.date || comment.createdAt || "";
                    const formattedDate = commentDate
                      ? new Date(commentDate).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : t("complaintDetail.dateUnknown");
                    return (
                      <div key={comment._id || idx} className="border-b pb-4 last:border-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-slate-900">
                            {comment.author?.fullName || comment.author?.name || t("complaintDetail.citizen")}
                          </span>
                          <time className="text-sm text-slate-500" dateTime={commentDate || undefined}>
                            {formattedDate}
                          </time>
                        </div>
                        <p className="text-slate-700">{comment.content || comment.text}</p>
                      </div>
                    );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">{t("complaintDetail.noCommentsYet", { defaultValue: "No comments yet. Be the first to comment!" })}</p>
                )}

                {user?.role === "CITIZEN" && (
                  <div className="mt-4 border-t pt-4">
                    <textarea
                      value={publicCommentText}
                      onChange={(e) => setPublicCommentText(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder={t("complaintDetail.addCommentPlaceholder")}
                    />
                    <div className="mt-3 flex justify-end">
                      <Button
                        onClick={handleAddPublicComment}
                        disabled={postingPublicComment || !publicCommentText.trim()}
                      >
                        {postingPublicComment ? <Loader2 className="w-4 h-4 animate-spin" /> : t("complaintDetail.addComment")}
                      </Button>
                    </div>
                  </div>
                )}
              </section>

            {/* Internal Notes - Staff only; Admin read-only */}
            {(isAgentOrManager || isAdmin) && (
              <section className="bg-white rounded-xl shadow-sm p-3" aria-labelledby="notes-title">
                <h2 id="notes-title" className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  {t("complaintDetail.internalNotes")}
                </h2>
                <InternalNotes
                  notes={internalNotes.map((n: InternalNoteItem) => ({
                    _id: n._id,
                    type: n.type === "BLOCAGE" || n.type === "PUBLIC" ? n.type : "NOTE",
                    authorName: n.author?.fullName || n.authorName || "Staff",
                    authorRole: n.author?.role || n.authorRole || "Staff",
                    content: n.content || n.text || "",
                    createdAt: n.date || n.createdAt || new Date().toISOString()
                  }))}
                  userRole={user?.role || ""}
                  canAdd={isAgentOrManager}
                  onAdd={isAgentOrManager ? handleAddNote : undefined}
                />
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6" role="complementary" aria-label="Additional information">
            {/* AI Analysis */}
            {(canSeeUrgencyPrediction ||
              (user?.role === 'MUNICIPAL_AGENT' && showDuplicateAi && !(complaint.assignedTo || complaint.assignedTeam || (complaint as any).repairTeamId))) ? (
              <AIAnalysisCard
                complaintId={complaint._id || complaintId}
                title={complaint.title || ""}
                description={complaint.description || ""}
                category={complaint.category || ""}
                municipality={
                  typeof complaint.municipality === "object"
                    ? complaint.municipality?.name || ""
                    : complaint.municipalityName || ""
                }
                currentUrgency={complaint.urgency as string || "MEDIUM"}
                userRole={user?.role}
              />
            ) : null}

            {/* Citizen Info - Only show for agents/managers/admins/technicians if not anonymous */}
            {(isAgentOrManager || isAdmin || user?.role === "TECHNICIAN") && (
              <section className="bg-white rounded-2xl shadow-lg p-3 border border-slate-100" aria-labelledby="citizen-title">
                <h2 id="citizen-title" className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                    {t("complaintDetail.citizen")}
                </h2>
                {complaint.isAnonymous ? (
                  <p className="text-slate-500 italic flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {t("complaintDetail.anonymousCitizen")}
                  </p>
                ) : citizenInfo ? (
                  <div className="space-y-3">
                    <p className="font-semibold text-slate-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      {citizenInfo.fullName || t("complaintDetail.citizen")}
                    </p>
                    {citizenInfo.email && canViewContact && (
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {citizenInfo.email}
                      </p>
                    )}
                    {citizenInfo.phone && canViewContact && (
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {citizenInfo.phone}
                      </p>
                    )}
                    {!canViewContact && (citizenInfo.email || citizenInfo.phone) && (
                      <p className="text-sm text-slate-400 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        {t("complaintDetail.contactHidden")}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500">{t("complaintDetail.infoNotAvailable")}</p>
                )}
              </section>
            )}

             {/* Department Info */}
             <section className="bg-white rounded-2xl shadow-lg p-3 border border-slate-100" aria-labelledby="department-title">
               <h2 id="department-title" className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                 <Building2 className="w-5 h-5 text-primary" />
                 {t("complaintDetail.department")}
               </h2>
               {(() => {
                  const deptName = (() => {
                    // First check assignedDepartment (for resolved complaints)
                    if (complaint.assignedDepartment) {
                      return typeof complaint.assignedDepartment === 'object'
                        ? complaint.assignedDepartment.name
                        : complaint.assignedDepartment;
                    }
                    const departmentId = (complaint as any).departmentId;
                    if (departmentId) {
                      return typeof departmentId === 'object'
                        ? departmentId.name
                        : departmentId;
                    }
                    if (complaint.department) {
                      return typeof complaint.department === 'object'
                        ? complaint.department.name
                        : complaint.department;
                    }
                    // Then check assignedTeam department (for in-progress complaints)
                    if (complaint.assignedTeam && typeof complaint.assignedTeam === 'object' && complaint.assignedTeam.department) {
                      return typeof complaint.assignedTeam.department === 'object'
                        ? complaint.assignedTeam.department.name
                        : complaint.assignedTeam.department;
                    }
                    return null;
                  })();
                  return deptName ? (
                    <p className="font-semibold text-slate-900">{getDepartmentLabel(deptName)}</p>
                  ) : (
                    <p className="text-slate-500 italic">{t("complaintDetail.notYetAssigned")}</p>
                  );
                })()}
             </section>

             {/* Assigned To */}
            {(complaint.assignedTo || complaint.assignedTeam || (complaint as any).repairTeamId) && (
              <section className="bg-white rounded-2xl shadow-lg p-3 border border-slate-100" aria-labelledby="assigned-title">
                {(complaint.assignedTeam && typeof complaint.assignedTeam === 'object') && (
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      {t("complaintDetail.repairTeam")}: {complaint.assignedTeam.name || t("complaintDetail.assignedToRepairTeam")}
                    </p>
                    {complaint.assignedTeam.members && Array.isArray(complaint.assignedTeam.members) && (
                      <div className="space-y-1 mt-2">
                    {complaint.assignedTeam.members.map((member: AssignedTeamMember, index: number) => (
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
                {complaint.assignedTo && !complaint.assignedTeam && (
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      {typeof complaint.assignedTo === 'object' ? complaint.assignedTo.fullName : t("complaintDetail.technicianAssigned")}
                    </p>
                    {typeof complaint.assignedTo === 'object' && complaint.assignedTo.email && (
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {complaint.assignedTo.email}
                      </p>
                    )}
                  </div>
                )}
                {/* Fallback: repairTeamId exists but no populated assignedTeam object */}
                {(complaint as any).repairTeamId && !complaint.assignedTeam && !complaint.assignedTo && (
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      {t("complaintDetail.assignedToRepairTeam")}
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Timestamps */}
            <section className="bg-white rounded-2xl shadow-lg p-3 border border-slate-100" aria-labelledby="dates-title">
              <h2 id="dates-title" className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {t("complaintDetail.dates")}
              </h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <dt className="text-slate-500 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {t("complaintDetail.created")}:
                  </dt>
                  <dd className="text-slate-900 font-medium">
                    <time dateTime={complaint.createdAt}>
                      {new Date(complaint.createdAt).toLocaleDateString(locale, {
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
                      {t("complaintDetail.updated")}:
                    </dt>
                    <dd className="text-slate-900 font-medium">
                      <time dateTime={complaint.updatedAt}>
                        {new Date(complaint.updatedAt).toLocaleDateString(locale, {
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
                      {t("complaintDetail.resolved")}:
                    </dt>
                    <dd className="text-green-700 font-medium">
                      <time dateTime={complaint.resolvedAt}>
                        {new Date(complaint.resolvedAt).toLocaleDateString(locale, {
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
                  {t("complaintDetail.rejectionReason")}
                </h2>
                <p className="text-red-800">{complaint.rejectionReason}</p>
              </section>
            )}

            {/* Resolution Report - Shown when RESOLVED or CLOSED */}
            {(complaint.status === "RESOLVED" || complaint.status === "CLOSED") && (complaint.resolutionNotes || (complaint.afterPhotos?.length ?? 0) > 0) && (
              <section className={`rounded-2xl shadow-lg p-6 border ${
                complaint.status === "CLOSED" 
                  ? "bg-green-50 border-green-200" 
                  : "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200"
              }`} aria-labelledby="resolution-title">
                <h2 id="resolution-title" className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <CheckCircle2 className={`w-5 h-5 ${complaint.status === "CLOSED" ? "text-green-600" : "text-amber-600"}`} />
                  Resolution Report
                  {complaint.status === "CLOSED" && (
                    <span className="ml-auto text-xs font-medium bg-green-200 text-green-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {t("complaintDetail.approved")}
                    </span>
                  )}
                  {complaint.status === "RESOLVED" && (
                    <span className="ml-auto text-xs font-medium bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {t("complaintDetail.pendingReview")}
                    </span>
                  )}
                </h2>
                
                {/* Resolution Notes from Technician */}
                {complaint.resolutionNotes && (
                  <div className="bg-white rounded-xl p-4 border border-slate-200 mb-4">
                    <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      {t("complaintDetail.techResolutionNotes")}
                    </p>
                    <p className="text-slate-800 whitespace-pre-wrap">{complaint.resolutionNotes}</p>
                    {complaint.resolvedAt && (
                      <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
                        {t("complaintDetail.resolvedOn")} {new Date(complaint.resolvedAt).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                )}

                {/* Proof Photos (After Work) - Show prominently */}
                {afterPhotos.length > 0 && (
                  <div className="bg-white rounded-xl p-4 border border-green-200 mb-4">
                    <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-green-600" />
                      {t("complaintDetail.afterWorkPhotos")} ({afterPhotos.length})
                      <span className="text-xs font-normal text-slate-500 ml-2">({t("complaintDetail.proofOfCompletion")})</span>
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {afterPhotos.map((photo, idx: number) => {
                        const src = getMediaSrc(photo);
                        return (
                          <a
                            key={idx}
                            href={src}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-lg overflow-hidden border-2 border-slate-100 hover:border-green-400 hover:shadow-md transition-all"
                          >
                            <img
                              src={src}
                              alt={`After work photo ${idx + 1}`}
                              className="w-full h-28 object-cover"
                            />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Approve/Reject Buttons for Manager - Only in Pending Review */}
                {complaint.status === "RESOLVED" && user?.role === "DEPARTMENT_MANAGER" && (
                  <div className="flex gap-3 pt-4 border-t border-amber-200">
                    <button
                      onClick={async () => {
                        try {
                          setActionLoading(true);
                          const result = await managerService.approveResolution(complaintId);
                          if (result.success) {
                            applyUpdatedComplaint(result.data as unknown as Complaint);
                            alert("Resolution approved! Complaint has been closed.");
                          } else {
                            alert(result.message || t("complaintDetail.failedApproveResolution"));
                          }
                        } catch (err) {
                          alert(t("complaintDetail.failedApproveResolution"));
                        } finally {
                          setActionLoading(false);
                        }
                      }}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all text-sm font-semibold disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {actionLoading ? "..." : t("complaintDetail.approve")}
                    </button>
                    <button
                      onClick={() => setActionModal("reject-resolution")}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all text-sm font-semibold disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      {t("complaintDetail.reject")}
                    </button>
                  </div>
                )}

                {/* Before Work Photos - Only for Agent/Admin */}
                {(user?.role === "MUNICIPAL_AGENT" || user?.role === "ADMIN") && beforePhotos.length > 0 && (
                  <div className="bg-white rounded-xl p-4 border border-blue-200 mb-4">
                    <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-blue-600" />
                      {t("complaintDetail.beforeWorkPhotos")} ({beforePhotos.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {beforePhotos.map((photo, idx: number) => {
                        const src = getMediaSrc(photo);
                        return (
                          <a key={idx} href={src} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border-2 border-slate-100 hover:border-blue-400 hover:shadow-md transition-all">
                            <img src={src} alt={`Before work photo ${idx + 1}`} className="w-full h-28 object-cover" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* BL-28: Confirmation/Upvote Panel for Citizens */}
            {canConfirmUpvote && !complaint.isDuplicate && complaint.status !== "REJECTED" && (
              <section className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-lg p-6 border border-emerald-200" aria-labelledby="community-title">
                <h2 id="community-title" className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <ThumbsUp className="w-5 h-5 text-emerald-600" />
                  {t("complaintDetail.communitySupport")}
                </h2>
                
                {/* Confirmation/Upvote stats */}
                <div className="flex gap-4 mb-4">
                  <div className="flex-1 bg-white/60 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-emerald-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-2xl font-bold">{complaint.confirmationCount || 0}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{t("complaintDetail.confirmations")}</p>
                  </div>
                  <div className="flex-1 bg-white/60 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-blue-600">
                      <ThumbsUp className="w-5 h-5" />
                      <span className="text-2xl font-bold">{complaint.upvoteCount || 0}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{t("complaintDetail.upvotes")}</p>
                  </div>
                </div>

                {(complaint.confirmationCount || 0) > 1 && (
                  <div className="mb-4 p-3 bg-emerald-100/60 rounded-xl border border-emerald-200">
                    <p className="text-sm text-emerald-800 font-medium">
                      {t("complaintDetail.supportedByCitizens", { count: complaint.confirmationCount || 0 })}
                    </p>
                    {(complaint.mergedComplaints?.length || 0) > 0 && (
                      <p className="text-xs text-emerald-700 mt-1">
                        {t("complaint.communitySupport.mergeNote", { count: complaint.mergedComplaints?.length || 0 })}
                      </p>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
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
                    {isUpvoting ? "..." : hasUpvoted ? t("complaintDetail.upvoted") : t("complaintDetail.upvote")}
                  </button>
                </div>
                
                <p className="text-xs text-slate-500 mt-3 text-center">
                  {["RESOLVED", "CLOSED"].includes(complaint?.status || "") ? t("complaintDetail.likeResolvedHint", { defaultValue: "You can like a resolved complaint to acknowledge the fix." }) : t("complaintDetail.communityActiveHint", { defaultValue: "Confirm this issue to help prioritize it." })}
                </p>
              </section>
            )}

            {/* Merged Reports Section - Only show on original complaint, not on merged ones */}
            {complaint.mergedComplaints && complaint.mergedComplaints.length > 0 && !complaint.isDuplicate && (
              <section className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <Copy className="w-5 h-5 text-purple-600" />
                  {t("complaint.mergedReports.title")}
                </h2>
                <p className="text-sm text-slate-600 mb-4">
                  {t("complaint.mergedReports.subtitle")}
                </p>
                <div className="space-y-3">
                  {complaint.mergedComplaints.map((merged: any) => (
                    <div key={merged.complaintId} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/dashboard/complaints/${merged.complaintId}`)}
                          className="font-semibold text-blue-700 hover:text-blue-900 text-sm"
                        >
                          {merged.title ||
                            merged.referenceId ||
                            getComplaintIdDisplay(merged.complaintId)}
                        </button>
                        {typeof merged.similarityScore === "number" && (
                          <span className="text-xs text-slate-600 bg-slate-200 px-2 py-1 rounded-full">
                            {Math.round(merged.similarityScore * 100)}% similar
                          </span>
                        )}
                      </div>
                      {merged.referenceId && merged.title && (
                        <p className="text-xs text-slate-500 truncate">
                          {merged.referenceId}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {merged.submittedBy || "Submitted by a citizen"}
                        {merged.municipality ? ` · ${merged.municipality}` : ""}
                      </p>
                      {merged.mergedAt && (
                        <p className="text-xs text-slate-500">
                          {t("complaint.duplicateRejectionBanner.mergedOn", { date: new Date(merged.mergedAt).toLocaleDateString(locale) })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Actions for Agent/Manager */}
            {isAgentOrManager && !complaint.isDuplicate && (
              <section className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl shadow-lg p-6 border border-primary/20" aria-labelledby="actions-title">
                <h2 id="actions-title" className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  {t("complaintDetail.actions")}
                </h2>
                <div className="space-y-3">
                  {/* SUBMITTED - Agent can check for duplicates, validate, or reject */}
                  {complaint.status === "SUBMITTED" && (
                    <>
                      {user?.role === "MUNICIPAL_AGENT" && (
                        <Button
                          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                          icon={<Search className="w-4 h-4" />}
                          onClick={handleCheckDuplicate}
                          disabled={duplicateLoading}
                        >
                          {duplicateLoading
                            ? t("complaintDetail.checkingDuplicates")
                            : t("complaintDetail.checkSimilarComplaints", { defaultValue: "Check for Similar Complaints" })}
                        </Button>
                      )}
                      {user?.role === "MUNICIPAL_AGENT" && (
                        <>
                          <Button
                            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                            icon={<CheckCircle2 className="w-4 h-4" />}
                            onClick={() => setActionModal("validate")}
                          >
                            {t("complaintDetail.validateComplaint")}
                          </Button>
                          <Button
                            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                            icon={<X className="w-4 h-4" />}
                            onClick={() => setActionModal("reject")}
                          >
                            {t("complaintDetail.rejectComplaint")}
                          </Button>
                        </>
                      )}
                    </>
                  )}

                   {/* VALIDATED - Agent assigns Department, Manager can set Priority */}
                  {complaint.status === "VALIDATED" && (
                     <>
                       {user?.role === "MUNICIPAL_AGENT" && !complaint.assignedDepartment && (
                         <Button
                           className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                           icon={<Building2 className="w-4 h-4" />}
                           onClick={() => setActionModal("department")}
                         >
                           {t("complaintDetail.assignToDepartment")}
                         </Button>
                       )}
                     </>
                   )}

                  {user?.role === "MUNICIPAL_AGENT" && ["ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REJECTED"].includes(complaint.status) && (
                    <p className="text-sm italic text-slate-500">
                      This complaint has been forwarded. No further actions required.
                    </p>
                  )}

                  {/* ASSIGNED - Manager assigns Technician/Team and sets Priority */}
                  {!(complaint.assignedTo || complaint.assignedTeam || (complaint as any).repairTeamId) && !(complaint.status === "IN_PROGRESS" || complaint.status === "RESOLVED" || complaint.status === "CLOSED") && (complaint.status === "ASSIGNED" || complaint.status === "VALIDATED") && user?.role === "DEPARTMENT_MANAGER" && (
                    <>
                      <Button
                        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                        icon={<Flag className="w-4 h-4" />}
                        onClick={() => setActionModal("priority")}
                      >
                        {t("complaintDetail.setPriority", {
                          defaultValue: "Set Priority",
                        })}
                      </Button>
                      <Button
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                        icon={<Users className="w-4 h-4" />}
                        onClick={() => setActionModal("technician")}
                      >
                        {t("complaintDetail.assignToRepairTeam")}
                      </Button>
                    </>
                  )}
                  {/* Show assigned/resolved message based on status */}
                  {(complaint.assignedTo || complaint.assignedTeam || (complaint as any).repairTeamId) && user?.role === "DEPARTMENT_MANAGER" && !["RESOLVED", "CLOSED"].includes(complaint.status) && (
                    <div className="mb-3 p-3 bg-green-50 rounded-xl border border-green-200">
                      <p className="text-sm font-medium text-green-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        {complaint.assignedTeam
                          ? t("complaintDetail.assignedToRepairTeam", { defaultValue: "Assigned to repair team" })
                          : t("complaintDetail.assignedToTechnician", { defaultValue: "Assigned to technician" })}
                      </p>
                    </div>
                  )}
                  {/* Show resolved message when complaint is CLOSED */}
                  {(complaint.assignedTo || complaint.assignedTeam || (complaint as any).repairTeamId) && user?.role === "DEPARTMENT_MANAGER" && ["RESOLVED", "CLOSED"].includes(complaint.status) && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                      <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        {t("complaintDetail.resolved", { defaultValue: "Complaint resolved" })}
                      </p>
                    </div>
                  )}

                  {/* IN_PROGRESS - Manager checks SLA, Admin monitors globally */}
                  {(complaint.status === "IN_PROGRESS") && (
                    <>
                      {(user?.role === "DEPARTMENT_MANAGER" || user?.role === "ADMIN") && (
                        <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <p className="text-sm text-orange-800 font-medium">{t("complaintDetail.inProgress")}</p>
                          <p className="text-xs text-orange-600">{t("complaintDetail.techWorking")}</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* CLOSED - Manager sees Stats, Admin sees Reports */}
                  {complaint.status === "CLOSED" && (
                    <>
                      {user?.role === "DEPARTMENT_MANAGER" && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-sm text-green-800 font-medium">{t("complaintDetail.departmentStats")}</p>
                          <p className="text-xs text-green-600">{t("complaintDetail.viewPerformanceMetrics")}</p>
                        </div>
                      )}
                      {user?.role === "ADMIN" && (
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-sm text-purple-800 font-medium">{t("complaintDetail.reports")}</p>
                          <p className="text-xs text-purple-600">{t("complaintDetail.generateGlobalReports")}</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* REJECTED - All roles can see archived */}
                  {complaint.status === "REJECTED" && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-slate-600 font-medium">{t("complaintDetail.archived")}</p>
                      <p className="text-xs text-slate-500">{t("complaintDetail.rejectedArchived")}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {isAgentOrManager && isDuplicateRejection && (
              <section className="bg-blue-50 rounded-2xl shadow-lg p-6 border border-blue-200" aria-labelledby="merged-actions-title">
                <h2 id="merged-actions-title" className="text-lg font-semibold text-blue-950 mb-2 flex items-center gap-2">
                  <Merge className="w-5 h-5 text-blue-700" />
                  {t("complaint.mergedRejectionTitle")}
                </h2>
                <p className="text-sm text-blue-800 mb-4">
                  {t("complaint.mergedRejectionBody")}
                </p>
                {(complaint.mergedAt || complaint.mergedBy) && (
                  <p className="text-xs text-blue-900 mb-3">
                    Merged by {getStaffName(complaint.mergedBy) || user?.fullName || "Agent"}
                    {complaint.mergedAt ? ` on ${formatLongDate(complaint.mergedAt)}` : ""}
                  </p>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/dashboard/complaints/${complaint.duplicateOf}`)}
                >
                  {t("complaint.duplicateRejectionBanner.viewOriginal", { rc: duplicateReference })}
                  {duplicateReferenceId && duplicateReference !== duplicateReferenceId && (
                    <span className="ml-1 text-xs text-slate-400">({duplicateReferenceId})</span>
                  )}
                </Button>
              </section>
            )}

            {/* Actions for Technician */}
            {isAssignedTechnician && (
              <section className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-lg p-6 border border-indigo-200" aria-labelledby="tech-actions-title">
                <h2 id="tech-actions-title" className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-indigo-600" />
                  {t("complaintDetail.technicianActions")}
                </h2>
                <div className="space-y-3">
                  {/* ASSIGNED - Technician can Start */}
                  {complaint.status === "ASSIGNED" && (
                    <Button
                      className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
                      icon={<CheckCircle2 className="w-4 h-4" />}
                      onClick={() => setActionModal("start-work")}
                    >
                      {t("complaintDetail.startWork")}
                    </Button>
                  )}

                  {/* IN_PROGRESS - Technician can Resolve */}
                  {complaint.status === "IN_PROGRESS" && (
                    <Button
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                      icon={<CheckCircle2 className="w-4 h-4" />}
                      onClick={() => setActionModal("resolve")}
                    >
                      {t("complaintDetail.markAsResolved")}
                    </Button>
                  )}

                  {/* RESOLVED/CLOSED - Technician can see archived */}
                  {(complaint.status === "RESOLVED" || complaint.status === "CLOSED") && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-slate-600 font-medium">{t("complaintDetail.archived")}</p>
                      <p className="text-xs text-slate-500">{t("complaintDetail.completedArchived")}</p>
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
              {actionModal === "validate" && t("complaintDetail.validateComplaint")}
              {actionModal === "reject" && t("complaintDetail.rejectComplaint")}
              {actionModal === "department" && t("complaintDetail.assignToDepartment")}
              {actionModal === "priority" && t("complaintDetail.updatePriority")}
              {actionModal === "technician" && t("complaintDetail.assignToRepairTeam")}
              {actionModal === "reject-resolution" && t("complaintDetail.rejectResolutionReport")}
              {actionModal === "start-work" && t("complaintDetail.startWork")}
              {actionModal === "resolve" && t("complaintDetail.submitResolution")}
            </h3>
            
            {actionModal === "validate" && (
              <div className="space-y-4">
                <p className="text-slate-600">
                  {t("complaintDetail.validateHelp")}
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setActionModal(null)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleStatusUpdate("VALIDATED")}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("complaintDetail.validate")}
                  </Button>
                </div>
              </div>
            )}

            {actionModal === "reject" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t("complaintDetail.rejectionReason")}
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    rows={3}
                    placeholder={t("complaintDetail.rejectReasonPlaceholder")}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setActionModal(null)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={() => handleStatusUpdate("REJECTED")}
                    disabled={actionLoading || !rejectionReason.trim()}
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("complaintDetail.reject")}
                  </Button>
                </div>
              </div>
            )}

{actionModal === "priority" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-4">
                    {t("complaintDetail.setPriority")} - Current: {complaint.priorityScore || 0}
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      {level: 'LOW', color: 'bg-green-500 hover:bg-green-600 text-white border-2 border-green-400', score: 3},
                      {level: 'MEDIUM', color: 'bg-amber-500 hover:bg-amber-600 text-white border-2 border-amber-400', score: 6},
                      {level: 'HIGH', color: 'bg-orange-500 hover:bg-orange-600 text-white border-2 border-orange-400', score: 8},
                      {level: 'URGENT', color: 'bg-red-500 hover:bg-red-600 text-white border-2 border-red-400 shadow-md shadow-red-200', score: 10}
                    ].map(({level, color, score}) => (
                      <button
                        key={level}
                        className={`p-4 rounded-xl font-bold transition-all ${color} shadow-sm hover:shadow-lg hover:scale-[1.02] active:scale-100 flex flex-col items-center justify-center gap-1`}
                        onClick={async () => {
                          setActionLoading(true);
                          try {
                            const response = await managerService.updatePriority(
                              complaintId,
                              { urgency: level as string, priorityScore: score }
                            );
                            if (response.success) {
                              await refreshComplaint();
                              console.log('Priority updated successfully');
                            }
                          } catch (err) {
                            console.error('Priority update failed', err);
                          } finally {
                            setActionLoading(false);
                            setActionModal(null);
                          }
                        }}
                        disabled={actionLoading}
                      >
                        <Flag className="w-5 h-5" />
                        <span className="text-base">{level}</span>
                        <span className="text-xs opacity-90">Score: {score}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-3 text-center">
                    Click to update priority
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setActionModal(null)}
                  >
                    {t("common.cancel")}
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
                            {getDepartmentLabel(dept.name)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t("complaintDetail.selectDepartment")}
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">{t("complaintDetail.chooseDepartment")}</option>
                    {(departments || []).map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {getDepartmentLabel(dept.name)}
                      </option>
                    ))}
                  </select>
                  {(!departments || departments.length === 0) && (
                    <p className="text-sm text-slate-500 mt-2">{t("complaintDetail.noDepartments")}</p>
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
                    {t("common.cancel")}
                  </Button>
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={handleDepartmentUpdate}
                    disabled={actionLoading || !selectedDepartment}
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("complaintDetail.assign")}
                  </Button>
                </div>
              </div>
            )}

            {actionModal === "technician" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t("complaintDetail.selectTechnicians")}
                  </label>
                  {technicians.length === 0 ? (
                    <div className="text-center py-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-amber-800 font-medium">{t("complaintDetail.noTechnicians")}</p>
                      <p className="text-sm text-amber-600 mt-1">
                        {t("complaintDetail.noTechniciansHint")}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-200 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-2">{t("complaintDetail.selectOneOrMore")}</p>
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
                      {t("complaintDetail.techTeamSelected", { count: selectedTechnicians.length })}
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
                    {t("common.cancel")}
                  </Button>
                  <Button
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    onClick={handleTechnicianUpdate}
                    disabled={actionLoading || (selectedTechnicians.length === 0 && !selectedTechnician)}
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                      selectedTechnicians.length > 1 ? t("complaintDetail.createTeamAssign") : t("complaintDetail.assign")
                    }
                  </Button>
                </div>
              </div>
            )}

            {actionModal === "approve-resolution" && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-green-800">{t("complaintDetail.aboutToApprove")}</p>
                  <p className="text-sm text-green-700 mt-1 font-semibold">{getComplaintIdDisplay(complaint._id || complaint.id || "")}</p>
                  {complaint.resolutionNotes && (
                    <p className="text-sm text-slate-600 mt-2 italic">&quot;{complaint.resolutionNotes.slice(0, 200)}{complaint.resolutionNotes.length > 200 ? '...' : ''}&quot;</p>
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  {t("complaintDetail.approveWillClose")}
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setActionModal(null)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={async () => {
                      try {
                        setActionLoading(true);
                        const result = await managerService.approveResolution(complaintId);
                        if (result.success) {
                          const updatedResponse = await complaintService.getComplaintDetail(complaintId);
                          if (updatedResponse.success) setComplaint(processComplaintMedia(updatedResponse.data));
                          setActionModal(null);
                          alert(t("complaintDetail.resolutionApproved") || "Resolution approved successfully");
                        } else {
                          alert(result.message || t("complaintDetail.failedApproveResolution"));
                        }
                      } catch (err) {
                        alert(t("complaintDetail.failedApproveResolution") || "Failed to approve resolution");
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("complaintDetail.approve")}
                  </Button>
                </div>
              </div>
            )}

            {actionModal === "reject-resolution" && (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm font-medium text-red-800">{t("complaintDetail.aboutToReject")}</p>
                  <p className="text-sm text-red-700 mt-1 font-semibold">{getComplaintIdDisplay(complaint._id || complaint.id || "")}</p>
                  {complaint.resolutionNotes && (
                    <p className="text-sm text-slate-600 mt-2 italic">&quot;{complaint.resolutionNotes.slice(0, 200)}{complaint.resolutionNotes.length > 200 ? '...' : ''}&quot;</p>
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  {t("complaintDetail.rejectWillReturnToProgress")}
                </p>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t("complaintDetail.rejectionReason")} *
                  </label>
                  <textarea
                    value={resolutionRejectionReason}
                    onChange={(e) => setResolutionRejectionReason(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    rows={3}
                    placeholder={t("complaintDetail.rejectionReasonPlaceholder")}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setActionModal(null);
                      setResolutionRejectionReason("");
                    }}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={async () => {
                      try {
                        setActionLoading(true);
                        let result;
                        if (user?.role === 'DEPARTMENT_MANAGER' || user?.role === 'ADMIN') {
                          result = await managerService.rejectResolution(complaintId, resolutionRejectionReason);
                        } else {
                          result = await agentService.rejectResolution(complaintId, resolutionRejectionReason);
                        }
                        if (result.success) {
                          const updatedResponse = await complaintService.getComplaintDetail(complaintId);
                          if (updatedResponse.success) setComplaint(processComplaintMedia(updatedResponse.data));
                          setActionModal(null);
                          setResolutionRejectionReason("");
                          alert(t("complaintDetail.resolutionRejected") || "Resolution rejected successfully");
                        } else {
                          alert(result.message || t("complaintDetail.failedRejectResolution"));
                        }
                      } catch (err) {
                        alert(t("complaintDetail.failedRejectResolution") || "Failed to reject resolution");
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("complaintDetail.reject")}
                  </Button>
                </div>
              </div>
            )}

            {actionModal === "start-work" && (
              <div className="space-y-4">
                <p className="text-slate-600">
                  {t("complaintDetail.startWorkConfirm", { id: getComplaintIdDisplay(complaint._id || complaint.id || "") })}
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setActionModal(null)}>{t("common.cancel")}</Button>
                  <Button
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => handleStatusUpdate("IN_PROGRESS")}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("complaintDetail.startWork")}
                  </Button>
                </div>
              </div>
            )}

            {actionModal === "resolve" && (
              <div className="space-y-4">
                <p className="text-slate-600">
                  {t("complaintDetail.resolveConfirm", { id: getComplaintIdDisplay(complaint._id || complaint.id || "") })}
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setActionModal(null)}>{t("common.cancel")}</Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleStatusUpdate("RESOLVED")}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("complaintDetail.submitResolution")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
)}
      </div>
    </DashboardLayout>
  );
}
