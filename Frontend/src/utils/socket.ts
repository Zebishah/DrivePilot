import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
const MAX_ATTEMPTS = 5;
let currentAttempts = 0;

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_SERVER_URL || "http://localhost:4000";

export const connectSocket = (token: string): Socket => {
  if (socket?.connected) return socket;

  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"], // Fallback support
      reconnection: true,
      reconnectionAttempts: MAX_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: { token },
      query: { token },

      ...({
        pingInterval: 10000,
        pingTimeout: 5000,
      } as any),
    });

    socket.on("connect", () => {
      console.log("✅ Socket connected");
      currentAttempts = 0;
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error.message);
      currentAttempts++;

      if (currentAttempts < MAX_ATTEMPTS) {
        console.log(
          `🔄 Retrying connection (${currentAttempts}/${MAX_ATTEMPTS})...`
        );
      } else {
        console.warn("⚠️ Max reconnection attempts reached.");
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("🛑 Socket disconnected:", reason);

      if (reason === "io server disconnect") {
        setTimeout(() => {
          if (socket && !socket.connected) {
            socket.connect();
          }
        }, 1000);
      }
    });
  }

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    console.log("❎ Socket disconnected manually");
    socket = null;
  }
};
