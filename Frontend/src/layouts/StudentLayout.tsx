"use client";
import type React from "react";
import { useState, useEffect } from "react";
import { Box, CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import Sidebar, { type MenuItem } from "../components/common/SideBar";
import Navbar from "../components/common/DashNavBar";
import {
  LayoutGrid,
  Search,
  BookOpen,
  MessageSquare,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useQuery } from "@apollo/client";
import { GET_STUDENT_BOOKINGS } from "../graphql/Queries/StudentQueries";
import { StudentBooking } from "../types/Bookings";
import { ConversationType, MessageType } from "../types/chatTypes";
import { getSocket } from "../utils/socket";
import { useDispatch, useSelector } from "react-redux";
import {
  addMessage,
  setConversations,
  setHasUnreadMessages,
} from "../store/slices/chatSlice";
import { RootState } from "../store";
import dayjs from "dayjs";

const theme = createTheme({
  palette: {
    primary: {
      main: "#5ec2d2",
    },
    secondary: {
      main: "#de4ef5",
    },
    background: {
      default: "#fafafa",
    },
  },
});

interface StudentLayoutProps {
  children: React.ReactNode;
}

const DRAWER_WIDTH = 280;

const menuItems: MenuItem[] = [
  { text: "Overview", icon: LayoutGrid, path: "/student-dashboard/overview" },
  {
    text: "Search Instructors",
    icon: Search,
    path: "/student-dashboard/search",
  },
  { text: "Booked Lessons", icon: BookOpen, path: "/student-dashboard/book" },
  {
    text: "Profile Setting",
    icon: Settings,
    path: "/student-dashboard/settings",
  },
  {
    text: "Help & Support",
    icon: HelpCircle,
    path: "/student-dashboard/help-support",
  },
  {
    text: "FeedBack & Rating",
    icon: MessageSquare,
    path: "/student-dashboard/reviews",
  },
  {
    text: "Messages",
    icon: MessageSquare,
    path: "/student-dashboard/chat",
  },
  { text: "Logout", icon: LogOut, path: "/logout" },
];

export default function StudentLayout({ children }: StudentLayoutProps) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const dispatch = useDispatch();
  const location = useLocation();
  const conversations = useSelector(
    (state: RootState) => state.chat.conversations
  );

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
    skip: !user?.id,
    fetchPolicy: "network-only",
  });

  // Create or update conversations from bookings
  useEffect(() => {
    if (!user?.id || !data?.getStudentBookings) {
      return;
    }
    const uniqueInstructorMap = new Map<string, ConversationType>();
    data.getStudentBookings.forEach(
      (booking: StudentBooking, index: number) => {
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

  // Socket setup
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !conversations.length) return;

    conversations.forEach((conv) => {
      socket.emit("joinConversation", conv._id);
    });

    const handleReceiveMessage = (msg: any) => {
      if (!msg?.conversationId || !msg?.sender || !msg?.receiver) return;
      const message: MessageType = {
        ...msg,
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
      if (
        message.sender._id !== user?.id &&
        !location.pathname.includes("/chat")
      ) {
        dispatch(setHasUnreadMessages());
      }
    };

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      conversations.forEach((conv) => {
        socket.emit("leaveConversation", conv._id);
      });
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [conversations, dispatch, user, location.pathname]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar
          drawerWidth={DRAWER_WIDTH}
          mobileOpen={mobileOpen}
          handleDrawerToggle={handleDrawerToggle}
          menuItems={menuItems}
          userName={user?.firstName}
          onLogout={handleLogout}
        />
        <Box
          component="main"
          sx={{
            width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          }}
        >
          <Navbar
            handleDrawerToggle={handleDrawerToggle}
            menuItems={menuItems}
          />
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
