"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
}

interface MunicipalityMiniMapProps {
  points: HeatmapPoint[];
  municipality?: string;
}

function getColor(count: number, max: number): string {
  const ratio = max > 0 ? count / max : 0;
  if (ratio > 0.75) return "#ef4444";
  if (ratio > 0.5) return "#f97316";
  if (ratio > 0.25) return "#eab308";
  return "#3b82f6";
}

function getRadius(count: number, max: number): number {
  const ratio = max > 0 ? count / max : 0;
  return Math.max(6, Math.min(20, 6 + ratio * 14));
}

// Auto-fit bounds to the data points
function FitBounds({ points }: { points: HeatmapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds.pad(0.15), { maxZoom: 14 });
  }, [map, points]);

  return null;
}

export default function MunicipalityMiniMap({ points, municipality }: MunicipalityMiniMapProps) {
  const maxCount = Math.max(...points.map((p) => p.count), 1);

  // Default center: Tunisia
  const defaultCenter: [number, number] = [34.0, 9.0];
  const center: [number, number] =
    points.length > 0
      ? [
          points.reduce((s, p) => s + p.lat, 0) / points.length,
          points.reduce((s, p) => s + p.lng, 0) / points.length,
        ]
      : defaultCenter;

  if (points.length === 0) {
    return (
      <div className="h-[250px] bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200">
        <p className="text-xs text-slate-400">No complaint locations to display</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      {municipality && (
        <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[11px] font-medium text-slate-600">
            {municipality} — {points.length} location{points.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: "250px", width: "100%" }}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds points={points} />
        {points.map((point, idx) => {
          const color = getColor(point.count, maxCount);
          const radius = getRadius(point.count, maxCount);
          return (
            <CircleMarker
              key={idx}
              center={[point.lat, point.lng]}
              radius={radius}
              pathOptions={{
                fillColor: color,
                color: "#fff",
                weight: 2,
                opacity: 0.9,
                fillOpacity: 0.7,
              }}
            >
              <Popup>
                <div className="text-xs font-medium">
                  <p className="text-slate-800">{point.count} complaint{point.count !== 1 ? "s" : ""}</p>
                  {point.categories.length > 0 && (
                    <p className="text-slate-500 mt-0.5">{point.categories.slice(0, 3).join(", ")}</p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Compact legend */}
      <div className="bg-slate-50 px-3 py-1.5 border-t border-slate-200 flex items-center justify-center gap-4">
        {[
          { color: "#3b82f6", label: "Low" },
          { color: "#eab308", label: "Med" },
          { color: "#f97316", label: "High" },
          { color: "#ef4444", label: "Critical" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[10px] text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
