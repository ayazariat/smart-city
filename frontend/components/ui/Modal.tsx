"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: ModalProps) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className={`
          bg-white rounded-2xl shadow-2xl w-full ${sizes[size]}
          animate-scaleIn
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Decorative top border */}
        <div className="h-1 bg-gradient-to-r from-primary via-primary-600 to-primary rounded-t-2xl" />
        
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="pr-8">
            <h3 id="modal-title" className="text-lg font-bold text-slate-900">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className={`
              p-2 rounded-xl transition-all duration-200
              hover:bg-slate-100 text-slate-400 hover:text-slate-600
              flex-shrink-0 hover:scale-110 active:scale-95
            `}
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50/50 rounded-b-2xl border-t border-slate-100">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
