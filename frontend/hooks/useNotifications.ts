import { useEffect, useState, useCallback } from "react";
import { notificationService } from "@/services/notification.service";
import { Notification } from "@/types";
import { useAuthStore } from "@/store/useAuthStore";
import { subscribeToNotifications, connectSocket } from "@/lib/socket";
import { showToast } from "@/components/ui/Toast";

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
  const { user, token, hydrated } = useAuthStore();
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

  const handleNewNotification = useCallback((notification: unknown) => {
    const notif = notification as Notification;
    setNotifications(prev => [notif, ...prev]);
    setUnreadCount(prev => prev + 1);
    showToast(notif.message || "New notification", "info");
  }, []);

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

  // Initial fetch and socket connection
  useEffect(() => {
    if (hydrated && token && user?.id) {
      fetchNotifications();
      connectSocket(user.id);
      const unsubscribe = subscribeToNotifications(handleNewNotification);
      return () => unsubscribe();
    }
  }, [hydrated, token, user, fetchNotifications, handleNewNotification]);

  // Cleanup on logout
  useEffect(() => {
    if (hydrated && !token) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [hydrated, token]);

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
