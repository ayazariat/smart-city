"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, token, verifySession } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // If no token, redirect to login
      if (!token) {
        router.push("/");
        return;
      }

      // If user is already loaded, we're good
      if (user) {
        setIsVerifying(false);
        return;
      }

      // Verify session with backend
      const isValid = await verifySession();
      if (!isValid) {
        router.push("/");
        return;
      }

      setIsVerifying(false);
    };

    checkAuth();
  }, [token, user, router, verifySession]);

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600">Verifying session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
