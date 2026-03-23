"use client";

import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

export const showToast = (message: string, type: ToastType = "info") => {
  const id = Math.random().toString(36).substring(2, 9);
  const toast: Toast = { id, message, type };
  toasts = [...toasts, toast];
  toastListeners.forEach((listener) => listener(toasts));
  
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    toastListeners.forEach((listener) => listener(toasts));
  }, 4000);
};

export const ToastContainer = () => {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => setCurrentToasts(newToasts);
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, []);

  if (currentToasts.length === 0) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 24,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      pointerEvents: "none",
    }}>
      {currentToasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            background: toast.type === "success" ? "#16a34a" : toast.type === "error" ? "#dc2626" : "#2563eb",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            animation: "slideUp 0.2s ease",
            maxWidth: 400,
            textAlign: "center",
            pointerEvents: "auto",
          }}
        >
          {toast.type === "success" && "✓ "}
          {toast.type === "error" && "✕ "}
          {toast.message}
        </div>
      ))}
    </div>
  );
};
