import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const initSocket = (): Socket => {
  if (socket?.connected) {
    return socket;
  }

  const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
  
  socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    autoConnect: false,
    withCredentials: true,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const connectSocket = (userId: string): void => {
  if (!socket) {
    socket = initSocket();
  }

  if (!socket.connected) {
    socket.connect();
    // Emit join after connection is established
    socket.once('connect', () => {
      socket?.emit('join', `user:${userId}`);
    });
  } else {
    socket.emit('join', `user:${userId}`);
  }
};

export const disconnectSocket = (): void => {
  if (socket?.connected) {
    socket.disconnect();
  }
};

export const subscribeToNotifications = (
  callback: (notification: unknown) => void
): (() => void) => {
  if (!socket) {
    socket = initSocket();
  }

  if (!socket.connected) {
    socket.connect();
  }

  socket.on('notification', callback);

  return () => {
    socket?.off('notification', callback);
  };
};