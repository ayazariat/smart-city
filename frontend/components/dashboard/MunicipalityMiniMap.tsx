"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { formatTimeAgo } from "@/lib/date-utils";
import { categoryLabels } from "@/data/complaints";
import { statusConfig } from "@/lib/complaints";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslation } from "react-i18next";

// @ts-expect-error -- reset default icon paths for Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface HeatmapPoint {
  lat: number;
  lng: number;
  count: number;
  categories: string[];
  status?: string;
  referenceId?: string;
  title?: string;
  createdAt?: string;
}

interface MunicipalityMiniMapProps {
  points: HeatmapPoint[];
  municipality?: string;
}

const URGENCY_COLORS: Record<string, string> = {
  LOW: "#22c55e",
  MEDIUM: "#f59e0b",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

function getColor(count: number, max: number): string {
  const ratio = max > 0 ? count / max : 0;
  if (ratio > 0.75) return URGENCY_COLORS.CRITICAL;
  if (ratio > 0.5) return URGENCY_COLORS.HIGH;
  if (ratio > 0.25) return URGENCY_COLORS.MEDIUM;
  return URGENCY_COLORS.LOW;
}

function getRadius(count: number, max: number): number {
  const ratio = max > 0 ? count / max : 0;
  return Math.max(7, Math.min(22, 7 + ratio * 15));
}

function formatCategory(cat: string): string {
  return categoryLabels[cat] || cat;
}

function FitBounds({ points }: { points: HeatmapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds.pad(0.15), { maxZoom: 14 });
  }, [map, points]);
  return null;
}

type FilterMode = "all" | "active" | "resolved";

export default function MunicipalityMiniMap({ points, municipality }: MunicipalityMiniMapProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FilterMode>("all");

  const filteredPoints = points.filter((p) => {
    if (filter === "all") return true;
    if (filter === "active") {
      return !p.status || !["RESOLVED", "CLOSED", "ARCHIVED"].includes(p.status);
    }
    return p.status === "RESOLVED" || p.status === "CLOSED";
  });

  const maxCount = Math.max(...filteredPoints.map((p) => p.count), 1);
  const totalComplaints = filteredPoints.reduce((s, p) => s + p.count, 0);

  const defaultCenter: [number, number] = [34.0, 9.0];
  const center: [number, number] =
    filteredPoints.length > 0
      ? [
          filteredPoints.reduce((s, p) => s + p.lat, 0) / filteredPoints.length,
          filteredPoints.reduce((s, p) => s + p.lng, 0) / filteredPoints.length,
        ]
      : defaultCenter;

  // Status count breakdown
  const statusCounts = points.reduce((acc, p) => {
    const s = p.status || "SUBMITTED";
    acc[s] = (acc[s] || 0) + p.count;
    return acc;
  }, {} as Record<string, number>);

  if (points.length === 0) {
    return (
      <div className="h-[350px] bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200">
        <p className="text-xs text-slate-400">{t('map.noLocations')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">📍</span>
          <div>
            <span className="text-sm font-semibold text-slate-700">
              {municipality ? t('map.titleWithMunicipality', { municipality }) : t('map.title')}
            </span>
            <p className="text-[10px] text-slate-400">
              {totalComplaints} {t('map.complaintsAcross', { n: filteredPoints.length })}
            </p>
          </div>
        </div>
        {/* Layer toggle */}
        <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-0.5">
          {(["all", "active", "resolved"] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                filter === mode
                  ? "bg-primary text-white"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {mode === "all" ? t('map.filterAll') : mode === "active" ? t('map.filterActive') : t('map.filterResolved')}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: "350px", width: "100%", borderRadius: "0" }}
        zoomControl={true}
        attributionControl={false}
        scrollWheelZoom={true}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds points={filteredPoints} />
        {filteredPoints.map((point, idx) => {
          const color = getColor(point.count, maxCount);
          const radius = getRadius(point.count, maxCount);
          return (
            <CircleMarker
              key={`${idx}-${filter}`}
              center={[point.lat, point.lng]}
              radius={radius}
              pathOptions={{
                fillColor: color,
                color: "#fff",
                weight: 2,
                opacity: 0.9,
                fillOpacity: 0.75,
              }}
            >
              <Popup>
                <div className="text-xs min-w-[160px]">
                  {point.referenceId && (
                    <p className="font-bold text-slate-800 mb-1">{point.referenceId}</p>
                  )}
                  {point.title && (
                    <p className="text-slate-700 mb-1 line-clamp-2">{point.title}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mb-1">
                    {point.categories.slice(0, 3).map((cat) => (
                      <span
                        key={cat}
                        className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium"
                      >
                        {formatCategory(cat)}
                      </span>
                    ))}
                    {point.status && statusConfig[point.status] && (
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${statusConfig[point.status].bgClass} ${statusConfig[point.status].textClass}`}>
                        {statusConfig[point.status].label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{point.count} {t('map.complaints')}</span>
                    {point.createdAt && <span>{formatTimeAgo(point.createdAt)}</span>}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Legend + Status counts */}
      <div className="bg-slate-50 px-4 py-2 border-t border-slate-200">
        <div className="flex items-center justify-between">
          {/* Legend */}
          <div className="flex items-center gap-3">
            {[
              { color: URGENCY_COLORS.LOW, label: t('map.urgency.LOW') },
              { color: URGENCY_COLORS.MEDIUM, label: t('map.urgency.MEDIUM') },
              { color: URGENCY_COLORS.HIGH, label: t('map.urgency.HIGH') },
              { color: URGENCY_COLORS.CRITICAL, label: t('map.urgency.CRITICAL') },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] text-slate-500">{item.label}</span>
              </div>
            ))}
          </div>
          {/* Status counts */}
          <div className="flex items-center gap-2">
            {Object.entries(statusCounts).slice(0, 4).map(([status, count]) => (
              <div key={status} className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  statusConfig[status]?.dotClass || "bg-slate-400"
                }`} />
                <span className="text-[10px] text-slate-500">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
