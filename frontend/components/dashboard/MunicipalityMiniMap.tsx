"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, ZoomControl } from "react-leaflet";
import { formatTimeAgo } from "@/lib/date-utils";
import { categoryLabels } from "@/data/complaints";
import { statusConfig } from "@/lib/complaints";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslation } from "react-i18next";
import { MapPin, Layers, Activity, CheckCircle2, AlertTriangle } from "lucide-react";

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

// Improved color scheme — more distinct, accessible
const SEVERITY_LEVELS = [
  { key: "low",      color: "#10b981", border: "#059669", label: "Low",      threshold: 0 },
  { key: "medium",   color: "#f59e0b", border: "#d97706", label: "Medium",   threshold: 0.25 },
  { key: "high",     color: "#f97316", border: "#ea580c", label: "High",     threshold: 0.5 },
  { key: "critical", color: "#ef4444", border: "#dc2626", label: "Critical", threshold: 0.75 },
];

function getSeverity(count: number, max: number) {
  const ratio = max > 0 ? count / max : 0;
  let level = SEVERITY_LEVELS[0];
  for (const l of SEVERITY_LEVELS) {
    if (ratio >= l.threshold) level = l;
  }
  return level;
}

function getRadius(count: number, max: number): number {
  const ratio = max > 0 ? count / max : 0;
  return Math.max(8, Math.min(28, 8 + ratio * 20));
}

function formatCategory(cat: string): string {
  return categoryLabels[cat] || cat;
}

function FitBounds({ points }: { points: HeatmapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds.pad(0.2), { maxZoom: 15, animate: true });
  }, [map, points]);
  return null;
}

type FilterMode = "all" | "active" | "resolved";

// Map tile options — use a cleaner tile style
const TILE_LAYERS = [
  {
    id: "streets",
    label: "Streets",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '© <a href="https://carto.com/">CARTO</a>',
  },
  {
    id: "satellite",
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri",
  },
  {
    id: "dark",
    label: "Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '© <a href="https://carto.com/">CARTO</a>',
  },
];

export default function MunicipalityMiniMap({ points, municipality }: MunicipalityMiniMapProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FilterMode>("all");
  const [tileIdx, setTileIdx] = useState(0);

  const tile = TILE_LAYERS[tileIdx];

  const filteredPoints = points.filter((p) => {
    if (filter === "all") return true;
    if (filter === "active") return !p.status || !["RESOLVED", "CLOSED", "ARCHIVED"].includes(p.status);
    return p.status === "RESOLVED" || p.status === "CLOSED";
  });

  const maxCount = Math.max(...filteredPoints.map((p) => p.count), 1);
  // totalFiltered kept in sync for consistency
  void filteredPoints.reduce((s, p) => s + p.count, 0);

  const defaultCenter: [number, number] = [34.0, 9.0];
  const center: [number, number] =
    filteredPoints.length > 0
      ? [
          filteredPoints.reduce((s, p) => s + p.lat, 0) / filteredPoints.length,
          filteredPoints.reduce((s, p) => s + p.lng, 0) / filteredPoints.length,
        ]
      : defaultCenter;

  // Status breakdown
  const activeCount = points.filter(p => !["RESOLVED", "CLOSED", "ARCHIVED"].includes(p.status || "")).reduce((s, p) => s + p.count, 0);
  const resolvedCount = points.filter(p => ["RESOLVED", "CLOSED"].includes(p.status || "")).reduce((s, p) => s + p.count, 0);
  const totalAll = points.reduce((s, p) => s + p.count, 0);

  if (points.length === 0) {
    return (
      <div className="h-[420px] bg-gradient-to-b from-slate-50 to-slate-100 rounded-2xl flex flex-col items-center justify-center border border-slate-200 gap-3">
        <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
          <MapPin className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-sm text-slate-400 font-medium">{t("map.noLocations")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg bg-white">
      {/* ── Header ── */}
      <div className="relative bg-gradient-to-r from-primary to-primary-700 px-5 py-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 opacity-90" />
              <span className="text-sm font-bold">
                {municipality ? `${municipality} — Activity Map` : t("map.title")}
              </span>
            </div>
            <p className="text-[11px] text-white/80">
              {totalAll} complaint{totalAll !== 1 ? "s" : ""} across {points.length} location{points.length !== 1 ? "s" : ""}
            </p>
          </div>
          {/* Filter pills */}
          <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-xl p-1">
            {(["all", "active", "resolved"] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  filter === mode
                    ? "bg-white text-primary shadow-sm"
                    : "text-white/80 hover:bg-white/20"
                }`}
              >
                {mode === "all" ? "All" : mode === "active" ? "Active" : "Resolved"}
              </button>
            ))}
          </div>
        </div>

        {/* Quick stats row */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/20">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Activity className="w-3 h-3 text-amber-300" />
            <span className="text-white/70">Active:</span>
            <span className="font-bold">{activeCount}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <CheckCircle2 className="w-3 h-3 text-emerald-300" />
            <span className="text-white/70">Resolved:</span>
            <span className="font-bold">{resolvedCount}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] ml-auto">
            <AlertTriangle className="w-3 h-3 text-red-300" />
            <span className="text-white/70">Hotspots:</span>
            <span className="font-bold">{filteredPoints.filter(p => p.count >= maxCount * 0.75).length}</span>
          </div>
        </div>
      </div>

      {/* ── Tile layer switcher (overlay on map) ── */}
      <div className="relative" style={{ height: 420 }}>
        {/* Tile switcher button */}
        <div className="absolute top-3 right-3 z-[400] flex gap-1 bg-white/95 rounded-xl shadow-lg border border-slate-200 p-1">
          {TILE_LAYERS.map((layer, i) => (
            <button
              key={layer.id}
              onClick={() => setTileIdx(i)}
              title={layer.label}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                tileIdx === i
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {layer.label}
            </button>
          ))}
        </div>

        <MapContainer
          center={center}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          attributionControl={false}
          scrollWheelZoom={true}
          className="z-0"
        >
          <TileLayer key={tile.id} url={tile.url} attribution={tile.attribution} />
          <ZoomControl position="bottomright" />
          <FitBounds points={filteredPoints} />
          {filteredPoints.map((point, idx) => {
            const sev = getSeverity(point.count, maxCount);
            const radius = getRadius(point.count, maxCount);
            return (
              <CircleMarker
                key={`${idx}-${filter}`}
                center={[point.lat, point.lng]}
                radius={radius}
                pathOptions={{
                  fillColor: sev.color,
                  color: sev.border,
                  weight: 2.5,
                  opacity: 1,
                  fillOpacity: 0.82,
                }}
                eventHandlers={{
                  mouseover: (e) => e.target.openPopup(),
                }}
              >
                <Popup closeButton={false}>
                  <div style={{ minWidth: 180, fontFamily: "Inter, sans-serif" }}>
                    {/* Popup header with severity indicator */}
                    <div style={{
                      background: sev.color,
                      margin: "-12px -20px 10px -20px",
                      padding: "8px 14px",
                      borderRadius: "8px 8px 0 0",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "white" }} />
                        <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>
                          {sev.label.toUpperCase()} ({point.count})
                        </span>
                      </div>
                    </div>

                    {point.referenceId && (
                      <p style={{ fontWeight: 700, fontSize: 12, color: "#1e293b", marginBottom: 4 }}>
                        {point.referenceId}
                      </p>
                    )}
                    {point.title && (
                      <p style={{ fontSize: 11, color: "#475569", marginBottom: 6, lineHeight: 1.4 }}>
                        {point.title.length > 60 ? point.title.slice(0, 57) + "…" : point.title}
                      </p>
                    )}

                    {/* Categories */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 6 }}>
                      {point.categories.slice(0, 3).map((cat) => (
                        <span
                          key={cat}
                          style={{
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        >
                          {formatCategory(cat)}
                        </span>
                      ))}
                      {point.status && statusConfig[point.status] && (
                        <span style={{
                          background: "#f0fdf4",
                          color: "#15803d",
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                        }}>
                          {statusConfig[point.status].label}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8" }}>
                      <span>{point.count} report{point.count !== 1 ? "s" : ""}</span>
                      {point.createdAt && <span>{formatTimeAgo(point.createdAt)}</span>}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* ── Legend footer ── */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-200">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4">
            {SEVERITY_LEVELS.map((lev) => (
              <div key={lev.key} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full border-2"
                  style={{ backgroundColor: lev.color, borderColor: lev.border }}
                />
                <span className="text-[10px] font-medium text-slate-500">{lev.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Layers className="w-3 h-3" />
            <span>Circle size = complaint count</span>
          </div>
        </div>
      </div>
    </div>
  );
}


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

