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

// Helper functions for in-memory storage (replacing localStorage)
const storageMap = new Map<string, number>();

const getStoredCount = (userId: string): number => {
  return storageMap.get(`${UNSEEN_BOOKINGS_KEY}_${userId}`) || 0;
};

const setStoredCount = (userId: string, count: number): void => {
  storageMap.set(`${UNSEEN_BOOKINGS_KEY}_${userId}`, count);
};

export const useBookingNotifications = (userId: string, role: string) => {
  const [unseenBookingsCount, setUnseenBookingsCount] = useState(() => {
    if (
      !userId ||
      (role !== "Admin" && role !== "Instructor" && role !== "Student")
    )
      return 0;
    return getStoredCount(userId);
  });

  const [isRegistered, setIsRegistered] = useState(false);

  console.log("🔔 useBookingNotifications initialized", {
    userId,
    role,
    unseenBookingsCount,
  });

  // Persist count whenever it changes
  useEffect(() => {
    if (
      userId &&
      (role === "Admin" || role === "Instructor" || role === "Student")
    ) {
      setStoredCount(userId, unseenBookingsCount);
      console.log("💾 Saved unseen count:", unseenBookingsCount);
    }
  }, [unseenBookingsCount, userId, role]);

  useEffect(() => {
    if (
      !userId ||
      (role !== "Admin" && role !== "Instructor" && role !== "Student")
    ) {
      console.log("❌ Invalid role or no userId, skipping registration");
      return;
    }

    const socket = getSocket();
    if (!socket) {
      console.error("❌ Socket instance not available");
      return;
    }

    // Handle connection events
    const handleConnect = () => {
      console.log("✅ Socket connected, registering user...");

      if (role === "Admin") {
        socket.emit("register_admin", { userId, role });
        console.log("📤 Sent register_admin event", { userId, role });
      } else if (role === "Instructor") {
        socket.emit("register_instructor", { userId, role });
        console.log("📤 Sent register_instructor event", { userId, role });
      } else if (role === "Student") {
        socket.emit("register_student", { userId, role });
        console.log("📤 Sent register_student event", { userId, role });
      }
    };

    const handleRegistered = (data: any) => {
      console.log(`✅ ${role} registration confirmed:`, data);
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

    // Listen for new booking events based on role
    const handleNewBooking = (data: NewBookingData) => {
      console.log("🔔 New booking notification received:", data);

      setUnseenBookingsCount((prev) => {
        const newCount = prev + data.slotsCount;
        console.log(`📊 Updated unseen count: ${prev} -> ${newCount}`);
        return newCount;
      });

      // Show appropriate toast based on role
      let toastMessage = "";
      if (role === "Admin") {
        toastMessage = `New booking from ${data.studentName} (${data.slotsCount} slots)`;
      } else if (role === "Instructor") {
        toastMessage = `New booking from ${data.studentName} (${data.slotsCount} slots)`;
      } else if (role === "Student") {
        toastMessage = `Your booking with ${data.instructorName} is confirmed (${data.slotsCount} slots)`;
      }

      toast.success(toastMessage, {
        duration: 5000,
        icon: "🎉",
      });
    };

    // Register event listeners
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    // Register for specific role events
    if (role === "Admin") {
      socket.on("admin_registered", handleRegistered);
      socket.on("new_booking_created", handleNewBooking);
    } else if (role === "Instructor") {
      socket.on("instructor_registered", handleRegistered);
      socket.on("instructor_booking_created", handleNewBooking);
    } else if (role === "Student") {
      socket.on("student_registered", handleRegistered);
      socket.on("student_booking_confirmed", handleNewBooking);
    }

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

      if (role === "Admin") {
        socket.off("admin_registered", handleRegistered);
        socket.off("new_booking_created", handleNewBooking);
      } else if (role === "Instructor") {
        socket.off("instructor_registered", handleRegistered);
        socket.off("instructor_booking_created", handleNewBooking);
      } else if (role === "Student") {
        socket.off("student_registered", handleRegistered);
        socket.off("student_booking_confirmed", handleNewBooking);
      }
    };
  }, [userId, role]);

  const clearUnseenCount = useCallback(() => {
    console.log("🔄 Clearing unseen count");
    const socket = getSocket();
    if (socket) {
      socket.emit("booking_viewed", { userId, role });
    }

    setUnseenBookingsCount(0);
  }, [userId, role]);

  return {
    unseenBookingsCount,
    clearUnseenCount,
    isRegistered,
  };
};
