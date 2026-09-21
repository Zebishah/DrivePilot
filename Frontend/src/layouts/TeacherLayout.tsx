"use client";
import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Box, Alert } from "@mui/material";
import {
  CalendarCheck,
  CalendarDays,
  CreditCard,
  FileText,
  LayoutDashboard,
  MessageSquare,
  MessageSquareText,
  ReceiptText,
  Settings,
  Star,
  HelpCircle,
  LogOut,
} from "lucide-react";
import type { MenuItem } from "../components/common/SideBar";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { FaUserGraduate } from "react-icons/fa6";
import { useQuery } from "@apollo/client";
import { GET_ALL_STUDENTS } from "../graphql/Queries/StudentQueries";
import { GET_TEACHER_PROFILE } from "../graphql/mutations/profile";
import { ConversationType, MessageType, UserType } from "../types/chatTypes";
import { getSocket, initSocket } from "../utils/socket";
import { useDispatch, useSelector } from "react-redux";
import {
  addMessage,
  setConversations,
  setHasUnreadMessages,
} from "../store/slices/chatSlice";
import { RootState } from "../store";
import { Student } from "../types/Student";
import dayjs from "dayjs";
import { useBookingNotifications } from "../utils/useBookingNotification";
import AssistantPanel from "../features/assistant/components/AssistantPanel";
import DashboardShell from "../components/dashboard/DashboardShell";

interface TeacherLayoutProps {
  children: React.ReactNode;
}

const DRAWER_WIDTH = 240;

export default function TeacherLayout({ children }: TeacherLayoutProps) {
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

  // ✅ Initialize socket for instructor (check for both cases)
  useEffect(() => {
    if (user?.role === "Instructor" || user?.role === "instructor") {
      initSocket(token || undefined);
    }
  }, [user, token]);

  // ✅ Use booking notifications hook
  const { unseenBookingsCount, clearUnseenCount } =
    useBookingNotifications(user?.id || "", user?.role || "");

  // ✅ Clear unseen count when visiting booking management page - FIXED PATH
  useEffect(() => {
    if (location.pathname === "/teacher-dashboard/bookingManagement") {
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

  const { data } = useQuery(GET_ALL_STUDENTS, {
    variables: {
      filter: {
        sortBy: "RECENT_TO_OLDEST",
      },
    },
    skip: !user?.id || !isChatRoute,
    fetchPolicy: "network-only",
  });

  const { data: teacherProfileData } = useQuery(GET_TEACHER_PROFILE, {
    skip: user?.role !== "Instructor",
    fetchPolicy: "cache-first",
  });

  const onboardingStatus =
    teacherProfileData?.teacherProfile?.onboardingStatus ?? null;
  const stripeIsActive = teacherProfileData?.teacherProfile?.isActive ?? false;

  const isPaymentReady =
    user?.role === "Instructor" &&
    user?.isProfileComplete &&
    stripeIsActive &&
    onboardingStatus === "verified";

  // Create or update conversations from students
  useEffect(() => {
    if (!user?.id || !data?.getAllStudents) {
      return;
    }
    const conversationsData = data.getAllStudents
      .filter((student: Student) => student.lessonStats?.totalLessons > 0)
      .map((student: Student) => {
        const studentName = `${student.firstName} ${student.lastName}`;
        const profileImage = student.profileImage?.trim()
          ? student.profileImage
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(
              studentName
            )}`;
        const conversationId = [user.id, student._id].sort().join("_");
        return {
          _id: conversationId,
          participants: [
            {
              _id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              name: `${user.firstName} ${user.lastName}`,
              email: user.email,
              profileImage: user.profileImage?.trim()
                ? user.profileImage
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    `${user.firstName} ${user.lastName}`
                  )}`,
              role: "instructor",
            },
            {
              _id: student._id,
              firstName: student.firstName,
              lastName: student.lastName,
              name: studentName,
              email: student.email,
              profileImage,
              role: student.role || "student",
            },
          ],
          user: {
            _id: student._id,
            firstName: student.firstName,
            lastName: student.lastName,
            name: studentName,
            email: student.email,
            profileImage,
            role: student.role || "student",
          },
          createdAt: student.createdAt || new Date().toISOString(),
          updatedAt:
            student.updatedAt && dayjs(student.updatedAt).isValid()
              ? student.updatedAt
              : new Date().toISOString(),
        } as ConversationType;
      });
    dispatch(setConversations(conversationsData));
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

  // ✅ Menu items defined AFTER hook call to get latest count
  const menuItems: MenuItem[] = [
    { text: "Overview", icon: LayoutDashboard, path: "/teacher-dashboard/overview", section: "Workspace" },
    {
      text: "Profile Setting",
      icon: Settings,
      path: "/teacher-dashboard/settings",
      section: "Workspace",
    },
    {
      text: "Documents",
      icon: FileText,
      path: "/teacher-dashboard/documents",
      section: "Workspace",
    },
    {
      text: "Availability & Calendar",
      icon: CalendarDays,
      path: "/teacher-dashboard/availability",
      section: "Workspace",
    },
    {
      text: "My Students",
      icon: FaUserGraduate,
      path: "/teacher-dashboard/my-students",
      section: "Manage",
    },
    {
      text: "Booking Management",
      icon: CalendarCheck,
      path: "/teacher-dashboard/bookingManagement",
      badge: unseenBookingsCount > 0 ? unseenBookingsCount : undefined,
      section: "Manage",
    },
    {
      text: "Messages",
      icon: MessageSquare,
      path: "/teacher-dashboard/chat",
      section: "Manage",
    },
    {
      text: "Payment Management",
      icon: CreditCard,
      path: "/teacher-dashboard/payment-management",
      section: "Manage",
    },
    {
      text: "Transaction History",
      icon: ReceiptText,
      path: "/teacher-dashboard/transaction-history",
      section: "Manage",
    },
    {
      text: "Reviews & Ratings",
      icon: Star,
      path: "/teacher-dashboard/reviews",
      section: "Reputation",
    },
    {
      text: "Help & Support",
      icon: HelpCircle,
      path: "/teacher-dashboard/help-support",
      section: "Support",
    },
    {
      text: "Feedback",
      icon: MessageSquareText,
      path: "/teacher-dashboard/feedback",
      section: "Support",
    },
    { text: "Logout", icon: LogOut, path: "/logout" },
  ];

  return (
    <DashboardShell
      drawerWidth={DRAWER_WIDTH}
      mobileOpen={mobileOpen}
      handleDrawerToggle={handleDrawerToggle}
      menuItems={menuItems}
      userName={user?.firstName}
      userAvatar={user?.profileImage}
      roleLabel="Instructor"
      onLogout={handleLogout}
      topContent={
        user?.role === "Instructor" && user?.isProfileComplete && !isPaymentReady ? (
          <Box sx={{ px: { xs: 1.5, md: 3 }, pt: 1.5 }}>
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              Stripe payment setup is not fully completed yet. You won&apos;t receive student payments until onboarding is finished. Go to
              <strong> Payment Management</strong> to complete it.
            </Alert>
          </Box>
        ) : null
      }
    >
      {children}
      <AssistantPanel pageContext="instructor-dashboard" />
    </DashboardShell>
  );
}
