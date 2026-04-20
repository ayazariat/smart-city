"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { categoryLabels } from "@/lib/complaints";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue in Next.js/Webpack
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface HeatmapDataPoint {
  lat: number;
  lng: number;
  count: number;
  categories: string[];
}

interface ComplaintHeatmapProps {
  data?: HeatmapDataPoint[];
  category?: string;
  height?: string;
}

// Colors based on density
function getDensityColor(count: number, max: number): string {
  const ratio = max > 0 ? count / max : 0;
  if (ratio > 0.75) return "#ef4444"; // red
  if (ratio > 0.5) return "#f97316";  // orange
  if (ratio > 0.25) return "#eab308"; // yellow
  return "#3b82f6";                    // blue
}

function getDensityRadius(count: number, max: number): number {
  const ratio = max > 0 ? count / max : 0;
  return Math.max(8, Math.min(30, 8 + ratio * 22));
}

// Auto-fit the map to the points
function FitBounds({ data }: { data: HeatmapDataPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (data.length === 0) return;
    const bounds = L.latLngBounds(data.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [data, map]);

  return null;
}

export default function ComplaintHeatmap({ data = [], category, height = "500px" }: ComplaintHeatmapProps) {
  const filtered = category && category !== "all"
    ? data.filter((p) => p.categories.includes(category))
    : data;

  const maxCount = Math.max(...filtered.map((p) => p.count), 1);

  // Tunisia center
  const defaultCenter: [number, number] = [34.5, 9.5];

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style={{ height }}>
      <MapContainer
        center={defaultCenter}
        zoom={7}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          attribution='© <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {filtered.length > 0 && <FitBounds data={filtered} />}

        {filtered.map((point, idx) => {
          const color = getDensityColor(point.count, maxCount);
          const radius = getDensityRadius(point.count, maxCount);
          return (
            <CircleMarker
              key={`${point.lat}-${point.lng}-${idx}`}
              center={[point.lat, point.lng]}
              radius={radius}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.55,
                weight: 2,
                opacity: 0.8,
              }}
            >
              <Popup>
                <div className="text-sm min-w-[140px]">
                  <p className="font-bold text-slate-900 mb-1">
                    {point.count} complaint{point.count > 1 ? "s" : ""}
                  </p>
                  {point.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {point.categories.map((cat) => (
                        <span
                          key={cat}
                          className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium"
                        >
                          {categoryLabels[cat] || cat}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Floating legend */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg shadow-md border border-slate-200 px-3 py-2 z-[1000]">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Density</p>
        <div className="flex items-center gap-2.5 text-[11px] text-slate-600">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Low</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> Med</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> High</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Critical</span>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-[1000]">
          <div className="text-center">
            <p className="text-sm text-slate-500">No complaint data with coordinates</p>
            <p className="text-xs text-slate-400 mt-1">Submit complaints with location to see them here</p>
          </div>
        </div>
      )}
    </div>
  );
}
