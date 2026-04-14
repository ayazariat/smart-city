"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Loader2, BarChart3 } from "lucide-react";
import { getTrendForecast } from "@/services/complaint.service";
import { useTranslation } from "react-i18next";

interface ForecastData {
  expectedTotal: number;
  dailyForecast: number[];
  changeVsLastWeek: string;
  trend: string;
}

interface TrendForecastChartProps {
  municipality?: string;
  category?: string;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function TrendForecastChart({
  municipality = "",
  category = "",
}: TrendForecastChartProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      setLoading(true);
      try {
        const result = await getTrendForecast(municipality, category, 7);
        if (!cancelled) setData(result);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, [municipality, category]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-violet-600" />
          {t('forecast.title')}
        </h3>
        <div className="flex items-center justify-center py-8 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          {t('forecast.loading')}
        </div>
      </div>
    );
  }

  if (!data || !data.dailyForecast?.length) {
    return null;
  }

  const max = Math.max(...data.dailyForecast, 1);
  const isUp = data.trend === "increasing" || data.changeVsLastWeek?.startsWith("+");

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-violet-600" />
          {t('forecast.title')}
        </h3>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            isUp ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
          }`}>
            {data.changeVsLastWeek}
          </span>
          <TrendingUp className={`w-4 h-4 ${isUp ? "text-red-500" : "text-green-500"}`} />
        </div>
      </div>

      {/* Mini bar chart */}
      <div className="flex items-end gap-2 h-28 mb-3">
        {data.dailyForecast.map((val, i) => {
          const pct = (val / max) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center">
              <span className="text-[10px] font-medium text-slate-500 mb-1">{val}</span>
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-violet-500 to-violet-400 transition-all duration-500"
                style={{ height: `${Math.max(pct, 4)}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Day labels */}
      <div className="flex gap-2">
        {data.dailyForecast.map((_, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-slate-400 font-medium">
            {DAY_LABELS[i % 7]}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-sm text-slate-600">
          Expected: <strong className="text-slate-800">{data.expectedTotal}</strong> complaints
        </span>
        <span className={`text-xs font-medium ${
          data.trend === "increasing" ? "text-red-600" : data.trend === "decreasing" ? "text-green-600" : "text-slate-500"
        }`}>
          {data.trend === "increasing" ? t('forecast.trendUp') : data.trend === "decreasing" ? t('forecast.trendDown') : t('forecast.stable')}
        </span>
      </div>
    </div>
  );
}
