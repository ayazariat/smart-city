import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let currentToken: string | null = null;

const getSocketUrl = () =>
  process.env.NEXT_PUBLIC_SOCKET_URL || 
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

export const initSocket = (token?: string): Socket => {
  // Re-create socket if token changes (e.g. after login)
  if (socket && socket.connected && token === currentToken) {
    return socket;
  }

  // Disconnect stale socket before creating a new one
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  currentToken = token ?? null;

  socket = io(getSocketUrl(), {
    transports: ["websocket", "polling"],
    autoConnect: false,
    withCredentials: true,
    auth: token ? { token } : undefined,
  });

  socket.on("disconnect", () => {
    // no-op
  });

  socket.on("connect_error", (error) => {
    // Socket connection errors handled internally
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const connectSocket = (userId: string, token?: string): void => {
  if (!socket || currentToken !== (token ?? null)) {
    socket = initSocket(token);
  }

  const joinRoom = () => {
    socket?.emit("join", `user:${userId}`);
  };

  if (!socket.connected) {
    socket.connect();
    socket.once("connect", joinRoom);
  } else {
    joinRoom();
  }
};

export const disconnectSocket = (): void => {
  if (socket?.connected) {
    socket.disconnect();
  }
  socket = null;
  currentToken = null;
};

export const subscribeToNotifications = (
  callback: (notification: unknown) => void
): (() => void) => {
  // Reuse existing socket or create new one with stored token
  if (!socket) {
    socket = initSocket(currentToken ?? undefined);
  }

  if (!socket.connected) {
    socket.connect();
  }

  socket.on("notification:new", callback);

  return () => {
    socket?.off("notification:new", callback);
  };
};
