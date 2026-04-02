"use client";

import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "success";
  isLoading?: boolean;
  requireReason?: boolean;
  reasonPlaceholder?: string;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
  requireReason = false,
  reasonPlaceholder = "Enter reason...",
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const styles = {
    danger: {
      button: "bg-red-600 hover:bg-red-700 text-white",
      icon: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
    },
    warning: {
      button: "bg-orange-500 hover:bg-orange-600 text-white",
      icon: "text-orange-500",
      bg: "bg-orange-50",
      border: "border-orange-200",
    },
    success: {
      button: "bg-green-600 hover:bg-green-700 text-white",
      icon: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
    },
  }[variant];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scaleIn">
        <div className={`h-1 ${styles.button.split(" ")[0].replace("bg-", "from-").replace("-600", "-500").replace("-700", "-600")} bg-gradient-to-r from-primary via-primary-600 to-primary rounded-t-2xl`} />
        
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full ${styles.bg} flex items-center justify-center flex-shrink-0`}>
              {variant === "danger" && <AlertTriangle className={`w-6 h-6 ${styles.icon}`} />}
              {variant === "warning" && <AlertTriangle className={`w-6 h-6 ${styles.icon}`} />}
              {variant === "success" && <CheckCircle className={`w-6 h-6 ${styles.icon}`} />}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
              <p className="text-slate-600">{message}</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 ${styles.button}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                {confirmText}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
