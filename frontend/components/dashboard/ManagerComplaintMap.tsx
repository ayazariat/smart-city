'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { getCategoryLabel } from '@/lib/categories';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Loader2 } from 'lucide-react';

// Fix default marker icon issue in Next.js/Webpack - only on client side
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
    ._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

export interface ComplaintMapPoint {
  _id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  priorityScore?: number;
  urgency?: string;
  referenceId?: string;
  createdAt: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  municipalityName?: string;
}

interface ManagerComplaintMapProps {
  data?: ComplaintMapPoint[];
  municipality?: string;
  height?: string;
}

// Status color mapping
const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: '#6b7280', // gray
  VALIDATED: '#3b82f6', // blue
  ASSIGNED: '#06b6d4', // cyan
  IN_PROGRESS: '#f97316', // orange
  RESOLVED: '#22c55e', // green
  CLOSED: '#374151', // dark gray
  REJECTED: '#ef4444', // red
};

// Create custom colored markers
function createCustomIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });
}

// Auto-fit the map to the points
function FitBounds({ data }: { data: ComplaintMapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (data.length === 0) return;
    const bounds = L.latLngBounds(
      data.map((p) => [p.location.lat, p.location.lng])
    );
    map.fitBounds(bounds.pad(0.1), { maxZoom: 15, animate: true });
  }, [data, map]);

  return null;
}

export default function ManagerComplaintMap({
  data = [],
  municipality,
  height = '400px',
}: ManagerComplaintMapProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, [data]);

  // Default center: Tunisia center
  const defaultCenter: [number, number] = [33.8, 9.5];

  // Calculate center from data if available
  const center: [number, number] =
    data.length > 0
      ? [
          data.reduce((sum, p) => sum + p.location.lat, 0) / data.length,
          data.reduce((sum, p) => sum + p.location.lng, 0) / data.length,
        ]
      : defaultCenter;

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      SUBMITTED: 'Submitted',
      VALIDATED: 'Validated',
      ASSIGNED: 'Assigned',
      IN_PROGRESS: 'In Progress',
      RESOLVED: 'Resolved',
      CLOSED: 'Closed',
      REJECTED: 'Rejected',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div
        className="rounded-2xl border border-slate-200 shadow-sm bg-white flex items-center justify-center"
        style={{ height }}
      >
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white relative"
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={data.length > 0 ? 12 : 7}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          attribution='© <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {data.length > 0 && <FitBounds data={data} />}

        {data.map((point) => (
          <Marker
            key={point._id}
            position={[point.location.lat, point.location.lng]}
            icon={createCustomIcon(STATUS_COLORS[point.status] || '#6b7280')}
          >
            <Popup>
              <div className="min-w-[200px] p-1">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: STATUS_COLORS[point.status] || '#6b7280',
                    }}
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    {getStatusLabel(point.status)}
                  </span>
                </div>

                {point.referenceId && (
                  <p className="text-xs font-bold text-slate-900 mb-1">
                    #{point.referenceId}
                  </p>
                )}

                <p className="text-sm font-semibold text-slate-900 mb-1">
                  {point.title}
                </p>

                {point.description && (
                  <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                    {point.description.slice(0, 100)}
                    {point.description.length > 100 ? '...' : ''}
                  </p>
                )}

                <div className="flex flex-wrap gap-1 mb-2">
                  <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium">
                    {getCategoryLabel(point.category)}
                  </span>
                  {point.urgency && (
                    <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">
                      {point.urgency}
                    </span>
                  )}
                </div>

                <p className="text-[10px] text-slate-400 mb-2">
                  {new Date(point.createdAt).toLocaleDateString()}
                </p>

                {point.location.address && (
                  <p className="text-[10px] text-slate-500 italic">
                    {point.location.address}
                  </p>
                )}

                <a
                  href={`/dashboard/complaints/${point._id}`}
                  className="block mt-2 text-center px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-700 transition-colors"
                >
                  View Details
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend at bottom-right */}
      <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg shadow-md border border-slate-200 px-3 py-2 z-[1000]">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Status
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="capitalize">{status.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>

      {data.length === 0 && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-[1000]">
          <MapPin className="w-8 h-8 text-slate-400 mb-2" />
          <p className="text-sm text-slate-500 font-medium">
            No complaint locations
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Complaints with coordinates will appear here
          </p>
        </div>
      )}
    </div>
  );
}
