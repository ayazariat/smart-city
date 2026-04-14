"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  Loader2,
  Building2,
} from "lucide-react";
import { heatmapService } from "@/services/heatmap.service";
import { useTranslation } from "react-i18next";

// Dynamic import for the mini map (no SSR for Leaflet)
const MunicipalityMiniMap = dynamic<{ points: HeatmapPoint[]; municipality?: string }>(
  () => import("./MunicipalityMiniMap"),
  { ssr: false, loading: () => (
    <div className="h-[280px] bg-slate-50 rounded-xl flex items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-primary" />
    </div>
  )}
);

interface MunicipalityData {
  name: string;
  governorate?: string;
  total: number;
  resolved: number;
  rate: number;
  tma?: number;
  slaCompliance?: number;
  trend?: number;
}

interface HeatmapPoint {
  lat: number;
  lng: number;
  count: number;
  categories: string[];
}

interface MunicipalityOverviewProps {
  role: string;
  userMunicipality?: string;
  userGovernorate?: string;
}

export default function MunicipalityOverview({ role, userMunicipality }: MunicipalityOverviewProps) {
  const { t } = useTranslation();
  const [municipalities, setMunicipalities] = useState<MunicipalityData[]>([]);
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

        // Fetch municipality stats and heatmap points in parallel
        const [muniRes, heatmapRes, complaintsRes] = await Promise.all([
          fetch(`${apiUrl}/public/stats/by-municipality?period=all`).then(r => r.json()).catch(() => null),
          heatmapService.getHeatmapData(
            userMunicipality ? { municipality: userMunicipality } : {}
          ).catch(() => null),
          // Also fetch individual complaints for better map markers
          userMunicipality 
            ? fetch(`${apiUrl}/public/my-municipality-complaints?limit=50&status=VALIDATED,ASSIGNED,IN_PROGRESS,RESOLVED`, {
                headers: { "Content-Type": "application/json" }
              }).then(r => r.json()).catch(() => null)
            : Promise.resolve(null),
        ]);

        if (muniRes?.success && muniRes.data) {
          setMunicipalities(muniRes.data);
        }
        
        // Build heatmap points from individual complaints if available (more detailed)
        if (complaintsRes?.success && complaintsRes.complaints?.length > 0) {
          const complaintPoints: HeatmapPoint[] = complaintsRes.complaints
            .filter((c: { location?: { coordinates?: number[] } }) => c.location?.coordinates?.length === 2)
            .map((c: { location: { coordinates: number[] }; category: string; status: string; referenceId?: string; title: string; createdAt: string }) => ({
              lat: c.location.coordinates[1],
              lng: c.location.coordinates[0],
              count: 1,
              categories: [c.category],
              status: c.status,
              referenceId: c.referenceId,
              title: c.title,
              createdAt: c.createdAt,
            }));
          if (complaintPoints.length > 0) {
            setHeatmapPoints(complaintPoints);
          } else if (heatmapRes?.success && heatmapRes.data) {
            setHeatmapPoints(heatmapRes.data);
          }
        } else if (heatmapRes?.success && heatmapRes.data) {
          setHeatmapPoints(heatmapRes.data);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userMunicipality]);

  const userMuni = municipalities.find((m) => m.name === userMunicipality);

  // For admin: governorate aggregation
  const governorates = municipalities.reduce((acc, m) => {
    const gov = m.governorate || "Unknown";
    if (!acc[gov]) acc[gov] = { total: 0, resolved: 0, municipalities: 0 };
    acc[gov].total += m.total;
    acc[gov].resolved += m.resolved;
    acc[gov].municipalities += 1;
    return acc;
  }, {} as Record<string, { total: number; resolved: number; municipalities: number }>);

  const topGovernorates = Object.entries(governorates)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 8);

  const maxGovTotal = Math.max(...topGovernorates.map(([, g]) => g.total), 1);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-0">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          {role === "ADMIN"
            ? t('municipalityOverview.geographicOverview')
            : role === "CITIZEN"
            ? t('municipalityOverview.yourMunicipality')
            : role === "TECHNICIAN"
            ? t('municipalityOverview.workArea')
            : t('municipalityOverview.municipalityActivity')}
        </h3>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : error || (municipalities.length === 0 && heatmapPoints.length === 0) ? (
          <div className="text-center py-8">
            <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">{t('municipalityOverview.noData')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('municipalityOverview.noDataHint')}</p>
          </div>
        ) : (
          <>
            {/* User's Municipality highlight (Non-admin roles) */}
            {userMuni && role !== "ADMIN" && (
              <div className="mb-4 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-slate-800">{userMuni.name}</span>
                  </div>
                  <span className="text-xs text-primary font-medium px-2 py-0.5 bg-primary/10 rounded-full">
                    Your Area
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="text-center">
                    <p className="text-xl font-bold text-slate-800">{userMuni.total}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{t('municipalityOverview.total')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-green-600">{userMuni.rate}%</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{t('municipalityOverview.resolution')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-blue-600">{userMuni.tma ?? "—"}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{t('municipalityOverview.avgDays')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Mini Map — complaint locations in the municipality */}
            {role !== "ADMIN" && (
              <MunicipalityMiniMap points={heatmapPoints} municipality={userMunicipality} />
            )}

            {/* Admin: Governorate heat summary + full map */}
            {role === "ADMIN" && (
              <>
                {topGovernorates.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      {t('municipalityOverview.topGovernorates')}
                    </p>
                    <div className="space-y-2">
                      {topGovernorates.map(([gov, data]) => {
                        const rate = data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0;
                        const barWidth = Math.round((data.total / maxGovTotal) * 100);
                        return (
                          <div key={gov} className="group">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-slate-700 truncate max-w-[140px]">{gov}</span>
                              <div className="flex items-center gap-3 text-xs">
                                <span className="text-slate-600 font-semibold">{data.total}</span>
                                <span className={`font-medium ${rate >= 50 ? "text-green-600" : "text-amber-600"}`}>
                                  {rate}%
                                </span>
                              </div>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  rate >= 70
                                    ? "bg-gradient-to-r from-green-400 to-emerald-500"
                                    : rate >= 40
                                    ? "bg-gradient-to-r from-amber-400 to-orange-500"
                                    : "bg-gradient-to-r from-red-400 to-red-500"
                                }`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <MunicipalityMiniMap points={heatmapPoints} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
