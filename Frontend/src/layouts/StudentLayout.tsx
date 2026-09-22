"use client";
import type React from "react";
import { useState, useEffect, useRef } from "react";
import type { MenuItem } from "../components/common/SideBar";
import {
  LayoutGrid,
  Search,
  BookOpenCheck,
  MessageCircle,
  Settings,
  HelpCircle,
  LogOut,
  CreditCard,
  BarChart3,
  Star,
  Heart,
  Bell,
  History,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useQuery } from "@apollo/client";
import { GET_STUDENT_BOOKINGS } from "../graphql/Queries/StudentQueries";
import { StudentBooking } from "../types/Bookings";
import { ConversationType, MessageType, UserType } from "../types/chatTypes";
import { getSocket, initSocket } from "../utils/socket";
import { useDispatch, useSelector } from "react-redux";
import {
  addMessage,
  setConversations,
  setHasUnreadMessages,
} from "../store/slices/chatSlice";
import { RootState } from "../store";
import dayjs from "dayjs";
import { useBookingNotifications } from "../utils/useBookingNotification";
import AssistantPanel from "../features/assistant/components/AssistantPanel";
import DashboardShell from "../components/dashboard/DashboardShell";

interface StudentLayoutProps {
  children: React.ReactNode;
}

const DRAWER_WIDTH = 240;

export default function StudentLayout({ children }: StudentLayoutProps) {
  const { user, token, logout } = useAuth();
  const nav = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const dispatch = useDispatch();
  const location = useLocation();
  const isChatRoute = location.pathname.includes("/chat");
  const conversations = useSelector(
    (state: RootState) => state.chat.conversations
  );
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  useEffect(() => {
    if (user?.role === "Student") {
      initSocket(token || undefined);
    }
  }, [user, token]);

  // ✅ Use booking notifications hook
  const { unseenBookingsCount, clearUnseenCount } = useBookingNotifications(
    user?.id || "",
    user?.role || ""
  );

  // ✅ Clear unseen count when visiting booking management page
  useEffect(() => {
    if (location.pathname === "/student-dashboard/book") {
      clearUnseenCount();
    }
  }, [location.pathname, clearUnseenCount]);
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    nav("/auth/signin");
    toast.success("Logout Successfully");
  };

  const { data } = useQuery(GET_STUDENT_BOOKINGS, {
    variables: { studentId: user?.id },
    skip: !user?.id || !isChatRoute,
    fetchPolicy: "network-only",
  });

  // Create or update conversations from bookings
  useEffect(() => {
    if (!user?.id || !data?.getStudentBookings) {
      return;
    }
    const uniqueInstructorMap = new Map<string, ConversationType>();
    data.getStudentBookings.forEach(
      (booking: StudentBooking) => {
        const instructor = booking.instructorId;
        if (!instructor?._id) {
          return;
        }
        if (uniqueInstructorMap.has(instructor._id)) {
          return;
        }
        const instructorName = `${instructor.firstName || "Unknown"} ${
          instructor.lastName || ""
        }`.trim();
        const profileImage = instructor.profileImage?.trim()
          ? instructor.profileImage
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(
              instructorName || "Instructor"
            )}`;
        const conversationId = [user.id, instructor._id].sort().join("_");
        const conversation: ConversationType = {
          _id: conversationId,
          participants: [
            {
              _id: user.id,
              firstName: user.firstName || "Student",
              lastName: user.lastName || "",
              name: `${user.firstName || "Student"} ${
                user.lastName || ""
              }`.trim(),
              email: user.email || "",
              profileImage: user.profileImage || "",
              role: user.role || "STUDENT",
            },
            {
              _id: instructor._id,
              firstName: instructor.firstName || "Unknown",
              lastName: instructor.lastName || "",
              name: instructorName,
              email: instructor.email || "",
              profileImage,
              role: instructor.role || "INSTRUCTOR",
            },
          ],
          user: {
            _id: instructor._id,
            firstName: instructor.firstName || "Unknown",
            lastName: instructor.lastName || "",
            name: instructorName,
            email: instructor.email || "",
            profileImage,
            role: instructor.role || "INSTRUCTOR",
          },
          createdAt: booking.createdAt || new Date().toISOString(),
          updatedAt:
            booking.updatedAt && dayjs(booking.updatedAt).isValid()
              ? booking.updatedAt
              : new Date().toISOString(),
        };
        uniqueInstructorMap.set(instructor._id, conversation);
      }
    );
    const newConversations = Array.from(uniqueInstructorMap.values());
    dispatch(setConversations(newConversations));
  }, [data, dispatch, user]);

  // Socket setup — re-join all chat rooms on (re)connect so messages aren't missed after idle/tab sleep
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !conversations.length) return;

    const joinAllConversationRooms = () => {
      conversationsRef.current.forEach((conv) => {
        socket.emit("joinConversation", conv._id);
      });
    };

    joinAllConversationRooms();

    const handleSocketConnect = () => {
      joinAllConversationRooms();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && socket.connected) {
        joinAllConversationRooms();
      }
    };

    socket.on("connect", handleSocketConnect);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const handleReceiveMessage = (msg: Partial<MessageType> & {
      sender?: UserType;
      receiver?: UserType;
    }) => {
      if (!msg?.conversationId || !msg?.sender || !msg?.receiver) return;
      const message: MessageType = {
        ...msg,
        _id: msg._id || `${msg.conversationId}-${Date.now()}`,
        content: msg.content || "",
        conversationId: msg.conversationId,
        sender: {
          ...msg.sender,
          name:
            msg.sender.name ||
            `${msg.sender.firstName || "Unknown"} ${
              msg.sender.lastName || ""
            }`.trim(),
        },
        receiver: {
          ...msg.receiver,
          name:
            msg.receiver.name ||
            `${msg.receiver.firstName || "Unknown"} ${
              msg.receiver.lastName || ""
            }`.trim(),
        },
        createdAt:
          msg.createdAt && dayjs(msg.createdAt).isValid()
            ? msg.createdAt
            : new Date().toISOString(),
      };
      dispatch(addMessage({ conversationId: message.conversationId, message }));
      const senderId = String(message.sender._id ?? "");
      const currentUserId = String(user?.id ?? "");
      if (
        senderId &&
        currentUserId &&
        senderId !== currentUserId &&
        !location.pathname.includes("/chat")
      ) {
        dispatch(setHasUnreadMessages());
      }
    };

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("connect", handleSocketConnect);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      conversations.forEach((conv) => {
        socket.emit("leaveConversation", conv._id);
      });
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [conversations, dispatch, user, location.pathname]);
  const menuItems: MenuItem[] = [
    { text: "Overview", icon: LayoutGrid, path: "/student-dashboard/overview", section: "Workspace" },
    {
      text: "Search Instructors",
      icon: Search,
      path: "/student-dashboard/search",
      section: "Workspace",
    },
    { text: "Saved Instructors", icon: Heart, path: "/student-dashboard/saved-instructors", section: "Workspace" },
    {
      text: "Booked Lessons",
      icon: BookOpenCheck,
      path: "/student-dashboard/book",
      badge: unseenBookingsCount > 0 ? unseenBookingsCount : undefined,
      section: "Workspace",
    },
    { text: "Learning Timeline", icon: History, path: "/student-dashboard/learning-timeline", section: "Workspace" },
    {
      text: "Profile Setting",
      icon: Settings,
      path: "/student-dashboard/settings",
      section: "Workspace",
    },
    { text: "Notifications", icon: Bell, path: "/student-dashboard/notifications", section: "Account" },
    { text: "Notification settings", icon: Settings, path: "/student-dashboard/notification-settings", section: "Account" },
    {
      text: "Payment history",
      icon: CreditCard,
      path: "/student-dashboard/payment-history",
      section: "Workspace",
    },
    {
      text: "Help & Support",
      icon: HelpCircle,
      path: "/student-dashboard/help-support",
      section: "Account",
    },
    {
      text: "Reviews & Ratings",
      icon: BarChart3,
      path: "/student-dashboard/reviews",
      section: "Account",
    },
    {
      text: "Instructor feedback",
      icon: Star,
      path: "/student-dashboard/Feedback",
      section: "Account",
    },
    {
      text: "Messages",
      icon: MessageCircle,
      path: "/student-dashboard/chat",
      section: "Account",
    },
    { text: "Logout", icon: LogOut, path: "/logout", section: "Account" },
  ];

  return (
    <DashboardShell
      drawerWidth={DRAWER_WIDTH}
      mobileOpen={mobileOpen}
      handleDrawerToggle={handleDrawerToggle}
      menuItems={menuItems}
      userName={user?.firstName}
      userAvatar={user?.profileImage}
      roleLabel="Student"
      onLogout={handleLogout}
    >
      {children}
      <AssistantPanel pageContext="student-dashboard" />
    </DashboardShell>
  );
}
