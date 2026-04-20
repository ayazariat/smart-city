"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "last_visited_complaint_page";

export function useLastVisitedPage() {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Mark as hydrated after mount
    const timer = setTimeout(() => {
      setIsHydrated(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const saveLastPage = useCallback((path: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, path);
    }
  }, []);

  const getLastPage = useCallback((): string | null => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY);
    }
    return null;
  }, []);

  const clearLastPage = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return {
    isHydrated,
    saveLastPage,
    getLastPage,
    clearLastPage,
  };
}
