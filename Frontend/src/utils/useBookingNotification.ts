import { useEffect, useState, useCallback } from "react";
import { getSocket } from "../utils/socket";
import toast from "react-hot-toast";

interface NewBookingData {
  bookingId: string;
  studentName: string;
  instructorName: string;
  slotsCount: number;
  createdAt: string;
}

const UNSEEN_BOOKINGS_KEY = "unseen_bookings_count";

// Helper functions for localStorage
const getStoredCount = (userId: string): number => {
  try {
    const stored = localStorage.getItem(`${UNSEEN_BOOKINGS_KEY}_${userId}`);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
};

const setStoredCount = (userId: string, count: number): void => {
  try {
    localStorage.setItem(`${UNSEEN_BOOKINGS_KEY}_${userId}`, count.toString());
  } catch (error) {
    console.error("Failed to save count to localStorage:", error);
  }
};

export const useBookingNotifications = (userId: string, role: string) => {
  // ✅ Initialize from localStorage
  const [unseenBookingsCount, setUnseenBookingsCount] = useState(() => {
    if (!userId || role !== "Admin") return 0;
    return getStoredCount(userId);
  });

  const [isRegistered, setIsRegistered] = useState(false);

  console.log("🔔 useBookingNotifications initialized", {
    userId,
    role,
    unseenBookingsCount,
  });

  // ✅ Persist count to localStorage whenever it changes
  useEffect(() => {
    if (userId && role === "Admin") {
      setStoredCount(userId, unseenBookingsCount);
      console.log(
        "💾 Saved unseen count to localStorage:",
        unseenBookingsCount
      );
    }
  }, [unseenBookingsCount, userId, role]);

  useEffect(() => {
    if (!userId || role !== "Admin") {
      console.log("❌ Not an admin or no userId, skipping registration");
      return;
    }

    const socket = getSocket();
    if (!socket) {
      console.error("❌ Socket instance not available");
      return;
    }

    // Handle connection events
    const handleConnect = () => {
      console.log("✅ Socket connected, registering admin...");
      socket.emit("register_admin", { userId, role });
      console.log("📤 Sent register_admin event", { userId, role });
    };

    const handleAdminRegistered = (data: any) => {
      console.log("✅ Admin registration confirmed:", data);
      setIsRegistered(true);
    };

    const handleDisconnect = () => {
      console.log("❌ Socket disconnected");
      setIsRegistered(false);
    };

    const handleConnectError = (error: Error) => {
      console.error("❌ Socket connection error:", error);
      setIsRegistered(false);
    };

    // Listen for new booking events
    const handleNewBooking = (data: NewBookingData) => {
      console.log("🔔 New booking notification received:", data);

      setUnseenBookingsCount((prev) => {
        const newCount = prev + 1;
        console.log(`📊 Updated unseen count: ${prev} -> ${newCount}`);
        return newCount;
      });

      // Show toast notification
      toast.success(
        `New booking from ${data.studentName} (${data.slotsCount} slots)`,
        {
          duration: 5000,
          icon: "🎉",
        }
      );
    };

    // Register event listeners
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("admin_registered", handleAdminRegistered);
    socket.on("new_booking_created", handleNewBooking);

    // If already connected, register immediately
    if (socket.connected) {
      handleConnect();
    }

    // Cleanup
    return () => {
      console.log("🧹 Cleaning up booking notification listeners");
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("admin_registered", handleAdminRegistered);
      socket.off("new_booking_created", handleNewBooking);
    };
  }, [userId, role]);

  const clearUnseenCount = useCallback(() => {
    console.log("🔄 Clearing unseen count");
    const socket = getSocket();
    if (socket) {
      socket.emit("booking_viewed", { userId });
    }

    setUnseenBookingsCount(0);
  }, [userId]);

  return {
    unseenBookingsCount,
    clearUnseenCount,
    isRegistered,
  };
};
