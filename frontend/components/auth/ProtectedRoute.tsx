"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, refreshToken, verifySession, refreshAccessToken, hydrated } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // Wait for auth store to be hydrated from localStorage
      if (!hydrated) {
        return;
      }

      // If no token at all, redirect to login
      if (!token) {
        router.push(`/?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      // If user is already loaded from persisted storage, access is granted
      if (user) {
        // Check role-based access
        if (allowedRoles && !allowedRoles.includes(user.role)) {
          router.push("/unauthorized");
          return;
        }
        setIsReady(true);
        return;
      }

      // We have token but no user yet - need to verify
      setIsVerifying(true);
      
      // Try to refresh token first if we have a refresh token
      if (refreshToken) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          // Token was refreshed, now verify session
          const { token: newToken, user: refreshedUser } = useAuthStore.getState();
          if (refreshedUser) {
            if (allowedRoles && !allowedRoles.includes(refreshedUser.role)) {
              router.push("/unauthorized");
              return;
            }
            setIsReady(true);
            setIsVerifying(false);
            return;
          }
        }
      }

      try {
        const isValid = await verifySession();
        if (!isValid) {
          router.push(`/?redirect=${encodeURIComponent(pathname)}`);
          return;
        }
      } catch {
        router.push(`/?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      // Re-check user after verification
      const { user: verifiedUser } = useAuthStore.getState();
      if (verifiedUser) {
        if (allowedRoles && !allowedRoles.includes(verifiedUser.role)) {
          router.push("/unauthorized");
          return;
        }
      }

      setIsVerifying(false);
      setIsReady(true);
    };

    // Small delay to allow zustand persistence to hydrate
    const timer = setTimeout(checkAuth, 50);
    return () => clearTimeout(timer);
  }, [token, user, router, pathname, verifySession, refreshAccessToken, allowedRoles, hydrated]);

  // Show loading while waiting for hydration
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Show loading while waiting for hydration
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // If not ready and no verification needed, show nothing to prevent flash
  if (!isReady && !isVerifying) {
    return null;
  }

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

// Role-based access control component
export function RoleBasedAccess({
  children,
  allowedRoles,
  fallback,
}: {
  children: React.ReactNode;
  allowedRoles: string[];
  fallback?: React.ReactNode;
}) {
  const { user } = useAuthStore();

  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback || null}</>;
  }

  return <>{children}</>;
}
