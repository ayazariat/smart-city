"use client";

import { useEffect, useState } from "react";
import { Sparkles, AlertTriangle, Copy, Loader2, Zap } from "lucide-react";
import { predictUrgency, checkDuplicate } from "@/services/complaint.service";
import { useTranslation } from "react-i18next";

interface AIAnalysisCardProps {
  complaintId: string;
  title: string;
  description: string;
  category: string;
  municipality: string;
  currentUrgency: string;
}

interface UrgencyResult {
  urgency: string;
  confidence: number;
  explanation: string;
}

interface DuplicateMatch {
  complaintId: string;
  referenceId?: string;
  title: string;
  similarity: number;
}

export default function AIAnalysisCard({
  complaintId,
  title,
  description,
  category,
  municipality,
  currentUrgency,
}: AIAnalysisCardProps) {
  const { t } = useTranslation();
  const [urgency, setUrgency] = useState<UrgencyResult | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchAI() {
      setLoading(true);
      try {
        const [urgResult, dupResult] = await Promise.allSettled([
          predictUrgency(title, description, category, currentUrgency || "MEDIUM", municipality),
          checkDuplicate(title, description, category, municipality),
        ]);

        if (cancelled) return;

        if (urgResult.status === "fulfilled" && urgResult.value) {
          const raw = urgResult.value as Record<string, unknown>;
          setUrgency({
            urgency: (raw.predictedUrgency || raw.urgency || "MEDIUM") as string,
            confidence: (raw.confidenceScore ?? raw.confidence ?? 0) as number,
            explanation: (raw.explanation || "") as string,
          });
        }
        if (dupResult.status === "fulfilled" && dupResult.value?.matches) {
          setDuplicates(
            dupResult.value.matches
              .filter((m: DuplicateMatch) => m.complaintId !== complaintId)
              .slice(0, 3)
          );
        }
      } catch {
        // silent — AI panels are informational
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (title && description) fetchAI();
    return () => { cancelled = true; };
  }, [complaintId, title, description, category, municipality]);

  if (loading) {
    return (
      <section className="bg-gradient-to-br from-violet-50 to-blue-50 rounded-2xl shadow-lg p-6 border border-violet-100">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-600" />
          AI Analysis
        </h2>
        <div className="flex items-center justify-center py-6 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          {t("ai.analyzing")}
        </div>
      </section>
    );
  }

  if (!urgency && duplicates.length === 0) return null;

  const urgencyColors: Record<string, string> = {
    LOW: "bg-green-100 text-green-700",
    MEDIUM: "bg-amber-100 text-amber-700",
    HIGH: "bg-orange-100 text-orange-700",
    URGENT: "bg-red-100 text-red-700",
    CRITICAL: "bg-red-100 text-red-700",
  };

  return (
    <section className="bg-gradient-to-br from-violet-50 to-blue-50 rounded-2xl shadow-lg p-6 border border-violet-100">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-violet-600" />
        {t("ai.title")}
      </h2>

      {/* Urgency Prediction */}
      {urgency && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-slate-700">{t("ai.predictedUrgency")}</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${urgencyColors[urgency.urgency] || "bg-slate-100 text-slate-600"}`}>
              {urgency.urgency}
            </span>
            <span className="text-xs text-slate-500">
              {t("ai.confidence", { n: Math.round(urgency.confidence * 100) })}
            </span>
            {urgency.urgency !== currentUrgency && (
              <span className="text-xs text-amber-600 font-medium">
                {t("ai.currentMismatch", { current: currentUrgency })}
              </span>
            )}
          </div>
          {urgency.explanation && (
            <p className="text-xs text-slate-500 mt-1">{urgency.explanation}</p>
          )}
        </div>
      )}

      {/* Duplicate Detection */}
      {duplicates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Copy className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-slate-700">{t("ai.similarComplaints")}</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="space-y-2">
            {duplicates.map((dup, i) => (
              <a
                key={i}
                href={`/dashboard/complaints/${dup.complaintId}`}
                className="block p-2.5 bg-white/70 rounded-lg border border-violet-100 hover:bg-white transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700 truncate max-w-[180px]">
                    {dup.referenceId || dup.complaintId.slice(-6)}
                  </span>
                  <span className="text-xs font-semibold text-violet-600">
                    {t("ai.match", { n: Math.round(dup.similarity * 100) })}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{dup.title}</p>
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
