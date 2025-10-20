import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
const MAX_ATTEMPTS = 5;
let currentAttempts = 0;

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_SERVER_URL || "http://localhost:4000";

/**
 * Initialize and connect socket with authentication token
 * Call this when user logs in or app initializes
 */
export const connectSocket = (token?: string): Socket => {
  // If already connected, return existing socket
  if (socket?.connected) {
    console.log("✅ Socket already connected:", socket.id);
    return socket;
  }

  // If socket exists but disconnected, reconnect
  if (socket && !socket.connected) {
    console.log("🔄 Reconnecting existing socket...");
    socket.connect();
    return socket;
  }

  console.log("🔌 Creating new socket connection to:", SOCKET_URL);

  // Create new socket instance
  socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: MAX_ATTEMPTS,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    autoConnect: true, // ✅ Auto-connect on creation
    withCredentials: true, // ✅ Important for CORS
    ...(token && {
      auth: { token },
      query: { token },
    }),
  });

  // Connection successful
  socket.on("connect", () => {
    console.log("✅ Socket connected successfully:", socket?.id);
    currentAttempts = 0;
  });

  // Connection error
  socket.on("connect_error", (error) => {
    console.error("❌ Socket connection error:", error.message);
    currentAttempts++;

    if (currentAttempts < MAX_ATTEMPTS) {
      console.log(
        `🔄 Retrying connection (${currentAttempts}/${MAX_ATTEMPTS})...`
      );
    } else {
      console.error("⚠️ Max reconnection attempts reached. Giving up.");
    }
  });

  // Disconnection
  socket.on("disconnect", (reason) => {
    console.log("🛑 Socket disconnected. Reason:", reason);

    // If server disconnected us, try to reconnect
    if (reason === "io server disconnect") {
      console.log("🔄 Server disconnected us, attempting reconnect...");
      setTimeout(() => {
        if (socket && !socket.connected) {
          socket.connect();
        }
      }, 1000);
    }
  });

  // Reconnection attempt
  socket.on("reconnect_attempt", (attemptNumber) => {
    console.log(`🔄 Reconnection attempt #${attemptNumber}`);
  });

  // Reconnection successful
  socket.on("reconnect", (attemptNumber) => {
    console.log(`✅ Reconnected after ${attemptNumber} attempts`);
    currentAttempts = 0;
  });

  // Reconnection failed
  socket.on("reconnect_failed", () => {
    console.error("❌ Reconnection failed after all attempts");
  });

  return socket;
};

/**
 * Get existing socket instance
 * Returns null if socket not initialized
 */
export const getSocket = (): Socket | null => {
  if (!socket) {
    console.warn("⚠️ Socket not initialized. Call connectSocket() first.");
  }
  return socket;
};

/**
 * Initialize socket without token (for admin notifications)
 * Use this if you don't have auth token but still need socket
 */
export const initSocket = (): Socket => {
  return connectSocket();
};

/**
 * Manually disconnect socket
 * Call this on logout or app unmount
 */
export const disconnectSocket = (): void => {
  if (socket) {
    console.log("❎ Disconnecting socket manually");
    socket.disconnect();
    socket.removeAllListeners(); // ✅ Clean up all listeners
    socket = null;
    currentAttempts = 0;
  }
};

/**
 * Check if socket is currently connected
 */
export const isSocketConnected = (): boolean => {
  return socket?.connected ?? false;
};
