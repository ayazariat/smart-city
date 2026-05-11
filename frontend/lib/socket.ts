/**
 * Socket.IO client for real-time notifications
 * Connects to the backend Socket.IO server and handles:
 * - notification:new events
 * - notification events (legacy)
 */

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
const notificationCallbacks: Array<(notification: unknown) => void> = [];

export const connectSocket = (userId: string, token?: string): void => {
  // If socket exists but token changed or userId changed, disconnect and reconnect
  if (socket) {
    const currentToken = (socket.auth as { token?: string })?.token;
    if (socket.connected && currentToken === token) {
      return; // already connected with same token
    }
    // Token changed or disconnected — tear down old socket
    socket.disconnect();
    socket = null;
  }

  const serverUrl =
    process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ||
    'http://localhost:5000';

  socket = io(serverUrl, {
    auth: token ? { token } : {},
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    if (socket && userId) {
      socket.emit('join', `user:${userId}`);
    }
  });

  // Handle both event names the backend emits
  socket.on('notification:new', (notification: unknown) => {
    notificationCallbacks.forEach((cb) => cb(notification));
  });

  socket.on('notification', (notification: unknown) => {
    notificationCallbacks.forEach((cb) => cb(notification));
  });

  socket.on('disconnect', () => {
    // Will auto-reconnect
  });

  socket.on('connect_error', () => {
    // Silent fail – polling will cover real-time
  });
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const subscribeToNotifications = (
  callback: (notification: unknown) => void
): (() => void) => {
  notificationCallbacks.push(callback);
  return () => {
    const idx = notificationCallbacks.indexOf(callback);
    if (idx > -1) notificationCallbacks.splice(idx, 1);
  };
};

export const getSocket = (): Socket | null => socket;
