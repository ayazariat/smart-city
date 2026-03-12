"use client";

import { ReactNode } from "react";
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
} from "lucide-react";
import { statusConfig, categoryLabels, getComplaintIdDisplay } from "@/lib/complaints";

/** Minimal shape required by the card — compatible with both Complaint and ManagerComplaint. */
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
}

interface ComplaintCardProps {
  complaint: BaseComplaint;
  /** If provided the whole card is wrapped in a Next.js Link. */
  href?: string;
  showCitizen?: boolean;
  showDepartment?: boolean;
  showAssignedTo?: boolean;
  showPriority?: boolean;
  showMunicipality?: boolean;
  /** Renders inside a bordered row below the main content. */
  actions?: ReactNode;
}

/**
 * Reusable complaint card used on all complaint list pages.
 */
export const ComplaintCard = ({
  complaint,
  href,
  showCitizen = false,
  showDepartment = false,
  showAssignedTo = false,
  showPriority = false,
  showMunicipality = false,
  actions,
}: ComplaintCardProps) => {
  const id = complaint._id || complaint.id || "";
  const statusCfg = statusConfig[complaint.status] ?? {
    label: complaint.status,
    bgClass: "bg-slate-100",
    textClass: "text-slate-600",
  };

  // Get municipality display name
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

  // Get governorate display name
  const getGovernorateName = (): string => {
    if (complaint.municipality && typeof complaint.municipality !== "string" && complaint.municipality.governorate) {
      return complaint.municipality.governorate;
    }
    return complaint.location?.governorate || "";
  };

  const municipalityName = getMunicipalityName();
  const governorateName = getGovernorateName();

  const urgencyVariant: Record<string, string> = {
    URGENT: "bg-red-100 text-red-700",
    HIGH:   "bg-orange-100 text-orange-700",
    MEDIUM: "bg-amber-100 text-amber-700",
  };

  const inner = (
    <div className="p-5">
      <div className="flex items-start justify-between gap-4">
        {/* ── Left: main content ── */}
        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <span className="text-xs font-mono text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
              {getComplaintIdDisplay(id)}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusCfg.bgClass} ${statusCfg.textClass}`}
            >
              {statusCfg.label}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              {categoryLabels[complaint.category] || complaint.category}
            </span>
            {complaint.urgency && complaint.urgency !== "LOW" && (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  urgencyVariant[complaint.urgency] ?? "bg-amber-100 text-amber-700"
                }`}
              >
                {complaint.urgency}
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-slate-800 text-sm leading-relaxed line-clamp-2 mb-3">
            {complaint.description}
          </p>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {complaint.location?.address && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate max-w-[180px]">
                  {complaint.location.address}
                </span>
              </span>
            )}
            {showCitizen && complaint.citizen && (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {complaint.citizen.fullName}
              </span>
            )}
            {showDepartment && complaint.department && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {complaint.department.name}
              </span>
            )}
            {showMunicipality && municipalityName && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {municipalityName}
                {governorateName && <span className="text-slate-400">, {governorateName}</span>}
              </span>
            )}
            {showAssignedTo && complaint.assignedTo && (
              <span className="flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-slate-400" />
                {complaint.assignedTo.fullName}
              </span>
            )}
            {showPriority && complaint.priorityScore !== undefined && (
              <span className="flex items-center gap-1">
                <Flag className="w-3.5 h-3.5 text-slate-400" />
                Priority: {complaint.priorityScore}
              </span>
            )}
          </div>

          {/* Media thumbnails */}
          {complaint.media && complaint.media.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <Camera className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <div className="flex gap-1.5">
                {complaint.media.slice(0, 4).map((item, idx) => (
                  <div
                    key={idx}
                    className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0"
                  >
                    {item.type === "photo" || !item.type ? (
                      <img
                        src={item.url}
                        alt={`Media ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <video src={item.url} className="w-full h-full object-cover" />
                    )}
                    {idx === 3 && complaint.media!.length > 4 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xs font-medium">
                          +{complaint.media!.length - 4}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: date + arrow ── */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="w-3 h-3" />
            {new Date(complaint.createdAt).toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
            })}
          </span>
          {href && (
            <ChevronRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>

      {/* Action buttons row */}
      {actions && (
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100">
          {actions}
        </div>
      )}
    </div>
  );

  const cardClass =
    "bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100 hover:border-primary/30 group hover:-translate-y-1 transform hover:rotate-x-2";

  if (href) {
    return (
      <Link href={href} className={`block ${cardClass}`}>
        {inner}
      </Link>
    );
  }

  return <div className={cardClass}>{inner}</div>;
};
