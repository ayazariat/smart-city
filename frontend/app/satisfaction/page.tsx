"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Star, X, Send, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { satisfactionService } from "@/services/satisfaction.service";
import { showToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function SatisfactionPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuthStore();

  const [survey, setSurvey] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPendingSurvey();
  }, []);

  const fetchPendingSurvey = async () => {
    try {
      const response = await satisfactionService.getPendingSurvey();
      if (response.success && response.data) {
        setSurvey(response.data);
      } else {
        // No pending survey, redirect to dashboard
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error fetching survey:", error);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      showToast("Please select a rating", "error");
      return;
    }

    setSubmitting(true);
    try {
      const response = await satisfactionService.createSurvey(survey.complaint, rating, comment);
      if (response.success) {
        showToast("Thank you for your feedback!", "success");
        router.push("/dashboard");
      } else {
        showToast(response.message || "Failed to submit rating", "error");
      }
    } catch (error) {
      console.error("Error submitting survey:", error);
      showToast("Failed to submit rating", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    try {
      const response = await satisfactionService.dismissSurvey(survey.complaint);
      if (response.success) {
        showToast("Survey dismissed", "info");
        router.push("/dashboard");
      } else {
        showToast(response.message || "Failed to dismiss survey", "error");
      }
    } catch (error) {
      console.error("Error dismissing survey:", error);
      showToast("Failed to dismiss survey", "error");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!survey) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">No pending surveys</h2>
            <p className="text-slate-600 mb-4">You have no surveys to complete at this time.</p>
            <Button onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50/50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  {t("satisfaction.title") || "Rate Your Experience"}
                </h1>
                <p className="text-slate-600">
                  {t("satisfaction.subtitle") || "How satisfied are you with how your complaint was handled?"}
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title={t("satisfaction.dismiss") || "Dismiss"}
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Star Rating */}
            <div className="mb-6">
              <div className="flex gap-2 justify-center mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`p-2 transition-all ${
                      star <= rating
                        ? "text-yellow-400 scale-110"
                        : "text-slate-300 hover:text-yellow-200"
                    }`}
                  >
                    <Star className="w-10 h-10 fill-current" />
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-slate-500">
                {rating === 0
                  ? t("satisfaction.selectRating") || "Select a rating"
                  : rating === 1
                    ? t("satisfaction.veryDissatisfied") || "Very Dissatisfied"
                    : rating === 2
                      ? t("satisfaction.dissatisfied") || "Dissatisfied"
                      : rating === 3
                        ? t("satisfaction.neutral") || "Neutral"
                        : rating === 4
                          ? t("satisfaction.satisfied") || "Satisfied"
                          : t("satisfaction.verySatisfied") || "Very Satisfied"}
              </p>
            </div>

            {/* Comment */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t("satisfaction.commentLabel") || "Additional comments (optional)"}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t("satisfaction.commentPlaceholder") || "Tell us more about your experience..."}
                rows={4}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                disabled={submitting || rating === 0}
                className="flex-1 bg-primary hover:bg-primary-700 text-white"
              >
                {submitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{t("satisfaction.submitting") || "Submitting..."}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" />
                    <span>{t("satisfaction.submit") || "Submit Rating"}</span>
                  </div>
                )}
              </Button>
              <Button
                onClick={handleDismiss}
                variant="outline"
                disabled={submitting}
                className="flex-1"
              >
                {t("satisfaction.skip") || "Skip"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
