import { Notification } from "@/types";

const API_URL = "/api";

/**
 * Get notification count
 */
export const getNotificationCount = async (): Promise<{ success: boolean; count?: number; message?: string }> => {
  try {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("accessToken="))
      ?.split("=")[1];

    const response = await fetch(`${API_URL}/notifications/count`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
      credentials: "include",
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching notification count:", error);
    return { success: false, message: "Failed to fetch notification count" };
  }
};

/**
 * Get all notifications
 */
export const getNotifications = async (): Promise<{ success: boolean; data?: Notification[]; message?: string }> => {
  try {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("accessToken="))
      ?.split("=")[1];

    const response = await fetch(`${API_URL}/notifications`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
      credentials: "include",
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return { success: false, message: "Failed to fetch notifications" };
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (id: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("accessToken="))
      ?.split("=")[1];

    const response = await fetch(`${API_URL}/notifications/${id}/read`, {
      method: "PUT",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
      credentials: "include",
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { success: false, message: "Failed to mark notification as read" };
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (): Promise<{ success: boolean; message?: string }> => {
  try {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("accessToken="))
      ?.split("=")[1];

    const response = await fetch(`${API_URL}/notifications/read-all`, {
      method: "PUT",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
      credentials: "include",
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return { success: false, message: "Failed to mark all notifications as read" };
  }
};

export const notificationService = {
  getNotificationCount,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
