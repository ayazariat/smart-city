import { Notification } from "@/types";
import { clientGet, clientPut } from "@/lib/api";

/**
 * Get notification count
 */
export const getNotificationCount = async (): Promise<{ success: boolean; count?: number; message?: string }> => {
  try {
    const data = await clientGet<{ success: boolean; unread?: number }>("/notifications/count");
    return { success: data.success, count: data.unread ?? 0 };
  } catch (error) {
    // 401 = not authenticated yet, return 0 silently
    return { success: true, count: 0 };
  }
};

/**
 * Get all notifications
 */
export const getNotifications = async (): Promise<{ success: boolean; data?: Notification[]; message?: string }> => {
  try {
    const data = await clientGet<{ success: boolean; notifications?: Notification[] }>("/notifications");
    return { success: data.success, data: data.notifications };
  } catch (error) {
    // 401 = not authenticated yet, return empty silently
    return { success: true, data: [] };
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (id: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const data = await clientPut<{ success: boolean }>(`/notifications/${id}/read`);
    return data;
  } catch {
    return { success: false, message: "Failed to mark notification as read" };
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (): Promise<{ success: boolean; message?: string }> => {
  try {
    const data = await clientPut<{ success: boolean }>("/notifications/read-all");
    return data;
  } catch {
    return { success: false, message: "Failed to mark all notifications as read" };
  }
};

export const notificationService = {
  getNotificationCount,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
