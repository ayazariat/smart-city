import { Notification } from "@/types";
import { clientGet, clientPatch, clientPut } from "@/lib/api";

/**
 * Get notification count
 */
export const getNotificationCount = async (): Promise<{ success: boolean; count?: number; message?: string }> => {
  try {
    const data = await clientGet<{ success: boolean; unread?: number }>("/notifications/count");
    return { success: data.success, count: data.unread ?? 0 };
  } catch {
    // 401 = not authenticated yet, return 0 silently
    return { success: true, count: 0 };
  }
};

/**
 * Get all notifications
 */
export const getNotifications = async (
  options: { unreadOnly?: boolean } = {}
): Promise<{ success: boolean; data?: Notification[]; message?: string }> => {
  const searchParams = new URLSearchParams();
  if (options.unreadOnly) {
    searchParams.set("unread", "true");
  }

  const queryString = searchParams.toString();
  const endpoint = `/notifications${queryString ? `?${queryString}` : ""}`;

  try {
    const data = await clientGet<{ success: boolean; notifications?: Notification[] }>(endpoint);
    return { success: data.success, data: Array.isArray(data.notifications) ? data.notifications : [] };
  } catch {
    // 401 = not authenticated yet, return empty silently
    return { success: true, data: [] };
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (id: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const data = await clientPatch<{ success: boolean }>(`/notifications/${id}/read`);
    return data;
  } catch {
    try {
      const data = await clientPut<{ success: boolean }>(`/notifications/${id}/read`);
      return data;
    } catch {
      return { success: false, message: "Failed to mark notification as read" };
    }
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (): Promise<{ success: boolean; message?: string }> => {
  try {
    const data = await clientPatch<{ success: boolean }>("/notifications/read-all");
    return data;
  } catch {
    try {
      const data = await clientPut<{ success: boolean }>("/notifications/read-all");
      return data;
    } catch {
      return { success: false, message: "Failed to mark all notifications as read" };
    }
  }
};

export const notificationService = {
  getNotificationCount,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
