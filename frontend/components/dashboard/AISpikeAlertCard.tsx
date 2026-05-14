'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3 } from 'lucide-react';
import { getTrendForecast } from '@/services/complaint.service';

interface ForecastData {
  expectedTotal: number;
  dailyForecast: number[];
  changeVsLastWeek: string;
  trend: string;
}

interface AISpikeAlertCardProps {
  municipality?: string;
}

function getSpikeThreshold(data: number[]): number {
  const avg = data.reduce((s, v) => s + v, 0) / data.length;
  return avg * 1.5;
}

export default function AISpikeAlertCard({
  municipality = '',
}: AISpikeAlertCardProps) {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchForecast() {
      setLoading(true);
      try {
        const result = await getTrendForecast(municipality, '', 7);
        if (!cancelled) setData(result);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchForecast();
    return () => {
      cancelled = true;
    };
  }, [municipality]);

  if (loading) {
    return (
      <div className="w-full bg-white rounded-2xl shadow-lg p-6 border border-slate-100 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-800">
              AI Trend Forecasts — Next 7 Days
            </h3>
          </div>
          <span className="text-[10px] text-slate-500">
            Updated automatically
          </span>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
          <div className="h-16 bg-amber-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data || !data.dailyForecast?.length) return null;

  const forecast = data.dailyForecast.slice(0, 7);
  const spike = getSpikeThreshold(forecast);
  const spikeDays = forecast.filter((v) => v >= spike);
  const maxSpike = Math.max(...spikeDays, 0);

  if (spikeDays.length === 0) {
    return (
      <div className="w-full bg-white rounded-2xl shadow-lg p-6 border border-slate-100 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-violet-600" />
            <h3 className="text-sm font-bold text-slate-800">
              AI Trend Forecasts — Next 7 Days
            </h3>
          </div>
          <span className="text-[10px] text-slate-500">
            Updated automatically
          </span>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-2 text-green-700">
            <BarChart3 className="w-5 h-5" />
            <span className="font-medium">No spike predicted</span>
          </div>
          <p className="text-xs text-green-600 mt-1">
            Complaint volume expected to remain within normal range for the next
            7 days.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-2xl shadow-lg p-6 border border-slate-100 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-600" />
          <h3 className="text-sm font-bold text-slate-800">
            AI Trend Forecasts — Next 7 Days
          </h3>
        </div>
        <span className="text-[10px] text-slate-500">
          Updated automatically
        </span>
      </div>

      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 w-full">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          <div className="flex items-center gap-3 md:flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div className="font-semibold text-amber-800 text-sm whitespace-nowrap">
              SPIKE PREDICTED
            </div>
          </div>
          <div className="text-xs text-amber-700 md:text-center md:flex-1">
            Peak of {maxSpike} complaints expected on {spikeDays.length} day
            {spikeDays.length > 1 ? 's' : ''} in{' '}
            {municipality || 'your municipality'}
          </div>
          <div className="md:flex-shrink-0">
            <span className="inline-block px-3 py-1 bg-amber-200 text-amber-800 rounded-full text-xs font-medium whitespace-nowrap">
              Plan for high volume
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
