"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Clock,
  User,
  Building2,
  Camera,
  Wrench,
  Flag,
  ChevronRight,
  ThumbsUp,
  CheckCircle,
  AlertCircle,
  MoreHorizontal,
} from "lucide-react";
import { statusConfig, categoryLabels, getComplaintIdDisplay } from "@/lib/complaints";
import { useAuthStore } from "@/store/useAuthStore";
import { confirmComplaint, unconfirmComplaint, upvoteComplaint, removeUpvote } from "@/services/complaint.service";

export interface BaseComplaint {
  _id?: string;
  id?: string;
  description: string;
  category: string;
  status: string;
  priorityScore?: number;
  urgency?: string;
  createdAt: string;
  location?: { address?: string; municipality?: string; governorate?: string };
  media?: Array<{ url: string; type?: string }>;
  citizen?: { fullName: string } | null;
  department?: { _id?: string; name: string } | null;
  assignedTo?: { _id?: string; fullName: string };
  municipality?: { _id?: string; name: string; governorate?: string } | string;
  municipalityName?: string;
  confirmationCount?: number;
  upvoteCount?: number;
  confirmations?: Array<{ citizenId: string; confirmedAt: string }>;
  upvotes?: Array<{ citizenId: string; upvotedAt: string }>;
  createdBy?: string | { _id?: string; fullName?: string; email?: string };
}

interface ComplaintCardProps {
  complaint: BaseComplaint;
  href?: string;
  showCitizen?: boolean;
  showDepartment?: boolean;
  showAssignedTo?: boolean;
  showPriority?: boolean;
  showMunicipality?: boolean;
  actions?: ReactNode;
  onUpdate?: (updatedComplaint: BaseComplaint) => void;
  index?: number;
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  SUBMITTED: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  VALIDATED: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  ASSIGNED: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
  IN_PROGRESS: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  RESOLVED: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  CLOSED: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-500" },
  REJECTED: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

const urgencyColors: Record<string, { bg: string; text: string }> = {
  URGENT: { bg: "bg-red-100", text: "text-red-700" },
  HIGH: { bg: "bg-orange-100", text: "text-orange-700" },
  MEDIUM: { bg: "bg-amber-100", text: "text-amber-700" },
};

export const ComplaintCard = ({
  complaint,
  href,
  showCitizen = false,
  showDepartment = false,
  showAssignedTo = false,
  showPriority = false,
  showMunicipality = false,
  actions,
  onUpdate,
  index = 0,
}: ComplaintCardProps) => {
  const id = complaint._id || complaint.id || "";
  const { user } = useAuthStore();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isUpvoting, setIsUpvoting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const statusCfg = statusConfig[complaint.status] ?? {
    label: complaint.status,
    bgClass: "bg-slate-100",
    textClass: "text-slate-600",
  };

  const statusStyle = statusColors[complaint.status] ?? { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-500" };

  const userId = user?._id || user?.id;
  const hasConfirmed = complaint.confirmations?.some(
    c => c.citizenId === userId || (user as any)?.sub === c.citizenId
  );
  const hasUpvoted = complaint.upvotes?.some(
    u => u.citizenId === userId || (user as any)?.sub === u.citizenId
  );

  const createdById = typeof complaint.createdBy === "string" 
    ? complaint.createdBy 
    : complaint.createdBy?._id;
  const isOwnComplaint = userId === createdById || (user as any)?.sub === createdById;

  const canConfirmUpvote = user?.role === "CITIZEN" && !isOwnComplaint && complaint._id;

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!complaint._id || isConfirming) return;
    setIsConfirming(true);
    try {
      if (hasConfirmed) {
        const result = await unconfirmComplaint(complaint._id);
        if (result.success && onUpdate) {
          onUpdate({
            ...complaint,
            confirmationCount: result.confirmationCount,
            confirmations: complaint.confirmations?.filter(
              c => c.citizenId !== userId && c.citizenId !== (user as any)?.sub
            ),
          });
        }
      } else {
        const result = await confirmComplaint(complaint._id);
        if (result.success && onUpdate) {
          onUpdate({
            ...complaint,
            confirmationCount: result.confirmationCount,
            confirmations: [
              ...(complaint.confirmations || []),
              { citizenId: userId || (user as any)?.sub, confirmedAt: new Date().toISOString() },
            ],
          });
        }
      }
    } catch (err) {
      console.error("Confirm error:", err);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleUpvote = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!complaint._id || isUpvoting) return;
    setIsUpvoting(true);
    try {
      if (hasUpvoted) {
        const result = await removeUpvote(complaint._id);
        if (result.success && onUpdate) {
          onUpdate({
            ...complaint,
            upvoteCount: result.upvoteCount,
            upvotes: complaint.upvotes?.filter(
              u => u.citizenId !== userId && u.citizenId !== (user as any)?.sub
            ),
          });
        }
      } else {
        const result = await upvoteComplaint(complaint._id);
        if (result.success && onUpdate) {
          onUpdate({
            ...complaint,
            upvoteCount: result.upvoteCount,
            upvotes: [
              ...(complaint.upvotes || []),
              { citizenId: userId || (user as any)?.sub, upvotedAt: new Date().toISOString() },
            ],
          });
        }
      }
    } catch (err) {
      console.error("Upvote error:", err);
    } finally {
      setIsUpvoting(false);
    }
  };

  const getMunicipalityName = (): string => {
    if (!complaint.municipality && !complaint.municipalityName && !complaint.location?.municipality) {
      return "";
    }
    if (typeof complaint.municipality === "string") {
      return complaint.municipality;
    }
    if (complaint.municipality?.name) {
      return complaint.municipality.name;
    }
    return complaint.municipalityName || complaint.location?.municipality || "";
  };

  const municipalityName = getMunicipalityName();
  const isHighPriority = (complaint.confirmationCount ?? 0) >= 5 || (complaint.priorityScore ?? 0) >= 30;

  const cardContent = (
    <div 
      className={`
        bg-white rounded-2xl border border-slate-200 shadow-sm
        hover:shadow-xl hover:border-primary/20 transition-all duration-300
        ${isHighPriority ? 'ring-2 ring-primary/20' : ''}
        ${href ? 'cursor-pointer' : ''}
        animate-fadeInUp
      `}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* High Priority Indicator */}
      {isHighPriority && (
        <div className="h-1 bg-gradient-to-r from-primary via-primary-600 to-primary rounded-t-2xl" />
      )}

      <div className="p-5">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 text-slate-500 text-xs font-mono font-medium">
              {getComplaintIdDisplay(id)}
            </span>
            
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot} animate-pulse-soft`} />
              {statusCfg.label}
            </span>
            
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
              {categoryLabels[complaint.category] || complaint.category}
            </span>

            {complaint.urgency && complaint.urgency !== "LOW" && urgencyColors[complaint.urgency] && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${urgencyColors[complaint.urgency].bg} ${urgencyColors[complaint.urgency].text}`}>
                <AlertCircle className="w-3 h-3" />
                {complaint.urgency}
              </span>
            )}

            {(complaint.confirmationCount ?? 0) >= 5 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm">
                <CheckCircle className="w-3 h-3" />
                Popular
              </span>
            )}
          </div>

          {/* Date */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-shrink-0">
            <Clock className="w-3.5 h-3.5" />
            {new Date(complaint.createdAt).toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
            })}
          </div>
        </div>

        {/* Description */}
        <p className={`text-slate-800 text-sm leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
          {complaint.description}
        </p>

        {complaint.description.length > 120 && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-xs text-primary hover:text-primary-700 mt-1 font-medium"
          >
            {isExpanded ? "Show less" : "Show more"}
          </button>
        )}

        {/* Meta Row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-xs text-slate-500">
          {complaint.location?.address && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate max-w-[150px]">{complaint.location.address}</span>
            </span>
          )}
          {showMunicipality && municipalityName && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {municipalityName}
            </span>
          )}
          {showCitizen && complaint.citizen && (
            <span className="inline-flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              {complaint.citizen.fullName}
            </span>
          )}
          {showDepartment && complaint.department && (
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {complaint.department.name}
            </span>
          )}
          {showAssignedTo && complaint.assignedTo && (
            <span className="inline-flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-slate-400" />
              {complaint.assignedTo.fullName}
            </span>
          )}
          {showPriority && complaint.priorityScore !== undefined && (
            <span className="inline-flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-slate-400" />
              Priority: {complaint.priorityScore}
            </span>
          )}
        </div>

        {/* Media Thumbnails */}
        {complaint.media && complaint.media.length > 0 && (
          <div className="flex items-center gap-2 mt-4">
            <Camera className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <div className="flex gap-1.5">
              {complaint.media.slice(0, 4).map((item, idx) => (
                <div
                  key={idx}
                  className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 group"
                >
                  {item.type === "photo" || !item.type ? (
                    <img
                      src={item.url?.startsWith('blob:') ? '/placeholder.png' : item.url}
                      alt={`Media ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <video src={item.url} className="w-full h-full object-cover" />
                  )}
                  {idx === 3 && complaint.media!.length > 4 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">
                        +{complaint.media!.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Community Stats (BL-28) */}
        {(complaint.confirmationCount !== undefined || complaint.upvoteCount !== undefined) && (
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
            {complaint.confirmationCount !== undefined && (
              <div className={`flex items-center gap-1.5 text-sm ${hasConfirmed ? 'text-emerald-600' : 'text-slate-500'}`}>
                <CheckCircle className={`w-4 h-4 ${hasConfirmed ? '' : 'opacity-50'}`} />
                <span className="font-medium">{complaint.confirmationCount}</span>
                <span className="text-xs text-slate-400">confirmed</span>
              </div>
            )}
            {complaint.upvoteCount !== undefined && (
              <div className={`flex items-center gap-1.5 text-sm ${hasUpvoted ? 'text-blue-600' : 'text-slate-500'}`}>
                <ThumbsUp className={`w-4 h-4 ${hasUpvoted ? '' : 'opacity-50'}`} />
                <span className="font-medium">{complaint.upvoteCount}</span>
                <span className="text-xs text-slate-400">upvotes</span>
              </div>
            )}
          </div>
        )}

        {/* Actions Row */}
        {(actions || canConfirmUpvote) && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100">
            {actions}
            
            {canConfirmUpvote && (
              <>
                <button
                  onClick={handleConfirm}
                  disabled={isConfirming}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    transition-all duration-200 hover:scale-105 active:scale-95
                    ${hasConfirmed
                      ? "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                    }
                    disabled:opacity-50 disabled:hover:scale-100
                  `}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {isConfirming ? "..." : hasConfirmed ? "Confirmed" : "Confirm"}
                </button>
                
                <button
                  onClick={handleUpvote}
                  disabled={isUpvoting}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    transition-all duration-200 hover:scale-105 active:scale-95
                    ${hasUpvoted
                      ? "bg-blue-500 text-white shadow-sm hover:bg-blue-600"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                    }
                    disabled:opacity-50 disabled:hover:scale-100
                  `}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  {isUpvoting ? "..." : hasUpvoted ? "Upvoted" : "Upvote"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* View Detail Arrow */}
      {href && (
        <div className="px-5 pb-4">
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              View details
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group block">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
};
