"use client";

import { useEffect, useState, useCallback } from "react";
import { notificationService } from "@/services/notification.service";
import { Notification } from "@/types";
import { useAuthStore } from "@/store/useAuthStore";

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const { token, hydrated } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!token || !hydrated) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [countResult, notificationsResult] = await Promise.all([
        notificationService.getNotificationCount(),
        notificationService.getNotifications(),
      ]);

      if (countResult.success) {
        setUnreadCount(countResult.count ?? 0);
      }

      if (notificationsResult.success) {
        setNotifications(notificationsResult.data || []);
      } else {
        setError(notificationsResult.message || "Failed to fetch notifications");
      }
    } catch {
      setError("Failed to fetch notifications");
    } finally {
      setLoading(false);
    }
  }, [token, hydrated]);

  const markAsRead = useCallback(async (id: string) => {
    if (!token) return;

    try {
      const result = await notificationService.markNotificationAsRead(id);
      if (result.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // Silent fail
    }
  }, [token]);

  const markAllAsRead = useCallback(async () => {
    if (!token) return;

    try {
      const result = await notificationService.markAllNotificationsAsRead();
      if (result.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch {
      // Silent fail
    }
  }, [token]);

  useEffect(() => {
    if (hydrated && token) {
      fetchNotifications();
    } else if (hydrated && !token) {
      setLoading(false);
    }
  }, [hydrated, token, fetchNotifications]);

  useEffect(() => {
    if (!hydrated || !token) {
      return;
    }

    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [hydrated, token, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}
