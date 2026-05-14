'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  AlertTriangle,
  Calendar,
  Minus,
} from 'lucide-react';
import { getTrendForecast } from '@/services/complaint.service';

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

const DAY_LABELS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_LABELS_FULL = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

function getSpikeThreshold(data: number[]): number {
  const avg = data.reduce((s, v) => s + v, 0) / data.length;
  return avg * 1.5;
}

function getDayColor(val: number, max: number, spike: number): string {
  if (val >= spike && val >= max * 0.7) return '#ef4444'; // spike
  if (val >= max * 0.6) return '#f97316';
  if (val >= max * 0.35) return '#f59e0b';
  return '#10b981';
}

function getRecommendation(val: number, spike: number): string {
  if (val >= spike) return 'Pre-assign extra teams';
  if (val >= spike * 0.75) return 'Monitor closely';
  return 'Normal capacity';
}

export default function TrendForecastChart({
  municipality = '',
  category = '',
}: TrendForecastChartProps) {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

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
    return () => {
      cancelled = true;
    };
  }, [municipality, category]);

  if (loading) {
    return (
      <div className="w-full h-full bg-white rounded-2xl shadow-lg p-6 border border-slate-100 animate-pulse">
        <h3 className="text-lg font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-slate-200" />
          AI Trend Forecasts — Next 7 Days
        </h3>
        <div className="flex items-end gap-2 h-28">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-slate-100 rounded-t-md"
              style={{ height: `${30 + Math.random() * 60}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data || !data.dailyForecast?.length) return null;

  const forecast = data.dailyForecast.slice(0, 7);
  const max = Math.max(...forecast, 1);
  const spike = getSpikeThreshold(forecast);
  const spikeDays = forecast.filter((v) => v >= spike);
  const isUp =
    data.trend === 'increasing' || data.changeVsLastWeek?.startsWith('+');
  const isDown =
    data.trend === 'decreasing' || data.changeVsLastWeek?.startsWith('-');
  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const trendColor = isUp
    ? 'text-red-500'
    : isDown
      ? 'text-green-500'
      : 'text-slate-400';
  const trendBg = isUp
    ? 'bg-red-100 text-red-700'
    : isDown
      ? 'bg-green-100 text-green-700'
      : 'bg-slate-100 text-slate-600';

  return (
    <div className="w-full h-full bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
      {/* Header - FIXED: Title + Updated same line */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-white/90" />
            <h3 className="text-sm font-bold text-white">
              AI Trend Forecasts — Next 7 Days
            </h3>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-white/80">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Updated automatically
          </div>
        </div>
        <div className="flex flex-col gap-2 mb-2">
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${trendBg}`}
            >
              <TrendIcon className={`w-3 h-3 ${trendColor}`} />
              {data.changeVsLastWeek || 'Stable'} vs last week
            </div>
            <div className="text-white/90 text-xs">
              Expected total:{' '}
              <span className="font-bold">{data.expectedTotal}</span>
            </div>
          </div>
          {spikeDays.length > 0 && (
            <div className="flex items-center gap-2 bg-red-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-lg shadow-lg text-sm font-bold w-full">
              <AlertTriangle className="w-4 h-4" />
              <div>
                <div>SPIKE PREDICTED</div>
                <div>
                  Peak of {Math.max(...spikeDays)} complaints expected on{' '}
                  {spikeDays.length} day(s) in{' '}
                  {municipality || 'your municipality'}
                </div>
                <div className="text-xs font-normal text-red-100 mt-1">
                  Plan for high volume
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-5">
        {/* Bar chart */}
        <div className="flex items-end gap-1.5 h-32 mb-2">
          {forecast.map((val, i) => {
            const pct = (val / max) * 100;
            const color = getDayColor(val, max, spike);
            const isSpike = val >= spike;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-0.5 relative"
              >
                {isSpike && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  </div>
                )}
                <span className="text-[10px] font-bold" style={{ color }}>
                  {val}
                </span>
                <div
                  className="w-full rounded-t-lg transition-all duration-700 relative overflow-hidden"
                  style={{
                    height: `${Math.max(pct, 6)}%`,
                    background: `linear-gradient(to top, ${color}dd, ${color}99)`,
                    boxShadow: isSpike ? `0 0 8px ${color}60` : 'none',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Day labels */}
        <div className="flex gap-1.5 mb-4">
          {forecast.map((_, i) => (
            <div
              key={i}
              className="flex-1 text-center text-[10px] text-slate-400 font-semibold"
            >
              {DAY_LABELS_SHORT[i % 7]}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mb-4">
          {[
            { color: '#10b981', label: 'Normal' },
            { color: '#f59e0b', label: 'Elevated' },
            { color: '#f97316', label: 'High' },
            { color: '#ef4444', label: 'Spike' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: l.color }}
              />
              <span className="text-[10px] text-slate-500">{l.label}</span>
            </div>
          ))}
        </div>

        {/* Daily Action Plan — uses slate colors since it's on white background */}
        <div className="border-t border-slate-100 pt-4 mt-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-violet-600" />
              <span className="text-slate-700 font-semibold text-sm">
                Daily action plan
              </span>
            </div>
            {forecast.length > 3 && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-violet-600 hover:text-violet-700 font-medium"
              >
                {showDetails
                  ? 'Show less'
                  : `+${forecast.length - 3} more days →`}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {forecast.slice(0, showDetails ? 7 : 3).map((val, i) => {
              const color = getDayColor(val, max, spike);
              const isSpike = val >= spike;
              const rec = getRecommendation(val, spike);
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-2.5 rounded-xl text-xs ${
                    isSpike
                      ? 'bg-red-50 border border-red-200'
                      : val >= max * 0.6
                        ? 'bg-amber-50 border border-amber-200'
                        : 'bg-emerald-50 border border-emerald-200'
                  }`}
                >
                  <div className="w-6 flex-shrink-0">
                    <div className="text-[20px] font-bold" style={{ color }}>
                      {val}
                    </div>
                  </div>
                  <div className="font-semibold text-slate-700 min-w-0 flex-1">
                    {DAY_LABELS_FULL[i % 7]}
                  </div>
                  <div
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ml-auto text-white ${
                      isSpike
                        ? 'bg-red-500'
                        : val >= max * 0.6
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    }`}
                  >
                    {rec}
                  </div>
                </div>
              );
            })}
            {!showDetails && forecast.length > 3 && (
              <div className="text-center pt-2 text-slate-400 text-xs border-t border-slate-100">
                +{forecast.length - 3} more days →
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
