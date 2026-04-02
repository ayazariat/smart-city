"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, useMapEvents, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import { useAuthStore } from "@/store/useAuthStore";
import { categoryLabels } from "@/lib/complaints";
import { Layers, RefreshCw } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface SimplePoint {
  lat: number;
  lng: number;
  title?: string;
  category?: string;
  status?: string;
}

interface ComplaintHeatmapProps {
  category?: string;
  municipality?: string;
  roleScope?: "public" | "agent" | "manager" | "admin";
  height?: string;
}

export default function ComplaintHeatmap({ category, height = "500px" }: ComplaintHeatmapProps) {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SimplePoint[]>([]);
  const [filterCategory, setFilterCategory] = useState(category || "all");

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/complaints?status=VALIDATED&limit=500`,
        { credentials: "include" }
      );
      const result = await response.json();
      if (result.complaints) {
        const points: SimplePoint[] = result.complaints
          .filter((c: any) => c.location?.coordinates?.length >= 2)
          .map((c: any) => ({
            lat: c.location.coordinates[0],
            lng: c.location.coordinates[1],
            title: c.title,
            category: c.category,
            status: c.status,
          }));
        setData(points);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, filterCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const categories = ["all", "ROAD", "LIGHTING", "WASTE", "WATER", "SAFETY", "PUBLIC_PROPERTY", "GREEN_SPACE", "OTHER"];

  return (
    <div className="h-full w-full flex flex-col" style={{ height }}>
      <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "all" ? "All Categories" : categoryLabels[cat] || cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 min-h-[400px]">
        <MapContainer
          center={[36.8, 10.15]}
          zoom={10}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MarkerClusterGroup>
            {data
              .filter(point => filterCategory === "all" || point.category === filterCategory)
              .map((point, idx) => (
              <Marker
                key={idx}
                position={[point.lat, point.lng]}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold">{point.title || "Complaint"}</p>
                    <p className="text-xs text-slate-500">{categoryLabels[point.category || "OTHER"]}</p>
                    <p className="text-xs mt-1">{point.status}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
