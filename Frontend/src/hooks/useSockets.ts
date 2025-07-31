import { useEffect, useState } from "react";
import { connectSocket, getSocket } from "../utils/socket";
import { useAuth } from "../context/AuthContext";

const useSocket = () => {
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    // Wait for token to be fully validated
    const timeout = setTimeout(() => {
      const socket = connectSocket(token);

      socket.on("connect", () => {
        console.log("✅ Socket connected");
        setIsConnected(true);
      });

      socket.on("disconnect", () => setIsConnected(false));
    }, 500); // Small delay to ensure token is ready

    return () => {
      clearTimeout(timeout);
      if (getSocket()) {
        getSocket()?.disconnect();
      }
    };
  }, [token]);

  return isConnected;
};

export default useSocket;
