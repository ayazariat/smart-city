"use client";

import { useEffect, useState } from "react";
import { Copy, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { getDuplicateStats } from "@/services/complaint.service";
import { useTranslation } from "react-i18next";

interface Stats {
  total_checked: number;
  duplicates_found_today: number;
  merge_rate: number;
}

export default function DuplicateStatsCard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        const result = await getDuplicateStats();
        if (!cancelled) setStats(result);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Copy className="w-5 h-5 text-amber-600" />
          Duplicate Detection
        </h3>
        <div className="animate-pulse">
          <div className="h-16 bg-slate-100 rounded-xl mb-3"></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="h-20 bg-slate-100 rounded-xl"></div>
            <div className="h-20 bg-slate-100 rounded-xl"></div>
            <div className="h-20 bg-slate-100 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Copy className="w-5 h-5 text-amber-600" />
          Duplicate Detection
        </h3>
        <span className="text-[10px] text-slate-400 font-medium">Today's summary</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-slate-50 rounded-xl">
          <div className="text-2xl font-bold text-slate-800">{stats.total_checked}</div>
          <div className="text-xs text-slate-500 mt-1">Checked</div>
        </div>
        <div className="text-center p-3 bg-amber-50 rounded-xl">
          <div className="flex items-center justify-center gap-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-2xl font-bold text-amber-700">{stats.duplicates_found_today}</span>
          </div>
          <div className="text-xs text-amber-600 mt-1">Duplicates Today</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-xl">
          <div className="flex items-center justify-center gap-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-2xl font-bold text-green-700">{stats.mergeRate}%</span>
          </div>
          <div className="text-xs text-green-600 mt-1">Merge Rate</div>
        </div>
      </div>
    </div>
  );
}
