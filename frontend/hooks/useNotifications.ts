'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '@/services/api.client';
import { useAuthStore } from '@/store/useAuthStore';

export interface Notification {
  _id: string;
  userId: string;
  type: 'validated' | 'assigned' | 'in_progress' | 'resolved' | 'sla_at_risk' | 'rejected';
  title: string;
  message: string;
  complaintId?: string;
  read: boolean;
  createdAt: string;
}

// Query keys
export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
  unread: () => [...notificationKeys.all, 'unread'] as const,
};

// API functions
const notificationApi = {
  getNotifications: async () => {
    return apiClient.get<{ message: string; notifications: Notification[] }>('/notifications');
  },

  getUnreadCount: async () => {
    return apiClient.get<{ message: string; count: number }>('/notifications/unread-count');
  },

  markAsRead: async (id: string) => {
    return apiClient.put<{ message: string }>(`/notifications/${id}/read`);
  },

  markAllAsRead: async () => {
    return apiClient.put<{ message: string }>('/notifications/read-all');
  },

  deleteNotification: async (id: string) => {
    return apiClient.delete<{ message: string }>(`/notifications/${id}`);
  },
};

// Hook
export function useNotifications() {
  const { user, token } = useAuthStore();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const userIdRef = useRef<string | undefined>(user?.id);
  const tokenRef = useRef<string | undefined>(token);

  // Keep refs updated
  useEffect(() => {
    userIdRef.current = user?.id;
    tokenRef.current = token;
  }, [user?.id, token]);

  // Fetch notifications (REST fallback)
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: notificationKeys.list(),
    queryFn: () => notificationApi.getNotifications(),
    enabled: !!token,
    refetchInterval: 60000, // Poll every 60 seconds as fallback
  });

  // Fetch unread count
  const { data: unreadCountData } = useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: () => notificationApi.getUnreadCount(),
    enabled: !!token,
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  // Connect to Socket.io
  useEffect(() => {
    if (!userIdRef.current || !tokenRef.current) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

    // Create socket connection
    const newSocket = io(socketUrl, {
      auth: {
        token: tokenRef.current,
      },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = newSocket;

    // Connection events
    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);

      // Join user room
      if (userIdRef.current) {
        newSocket.emit('join', `user:${userIdRef.current}`);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    // Listen for notifications
    newSocket.on('notification', (notification: Notification) => {
      console.log('Received notification:', notification);
      
      // Show toast notification
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico',
          });
        }
      }

      // Update query cache
      queryClient.setQueryData<{ message: string; notifications: Notification[] }>(
        notificationKeys.list(),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            notifications: [notification, ...old.notifications],
          };
        }
      );

      // Invalidate unread count
      queryClient.invalidateQueries({ queryKey: notificationKeys.unread() });
    });

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [queryClient]);

  // Update socket state after connection
  useEffect(() => {
    if (socketRef.current && !socket) {
      setSocket(socketRef.current);
    }
  }, [socket]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    }
  }, []);

  // Handlers
  const handleMarkAsRead = useCallback((id: string) => {
    markAsReadMutation.mutate(id);
  }, [markAsReadMutation]);

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    notifications: notificationsData?.notifications || [],
    unreadCount: unreadCountData?.count || 0,
    isLoading,
    error,
    isConnected,
    socket,
    requestNotificationPermission,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    refresh: handleRefresh,
  };
}
