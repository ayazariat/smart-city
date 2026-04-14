"use client";

import { ToastContainer } from "@/components/ui/Toast";
import "@/lib/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
}
