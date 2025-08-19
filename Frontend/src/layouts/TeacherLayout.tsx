"use client";
import type React from "react";
import { useState, useEffect } from "react";
import { Box, CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import {
  LayoutGrid,
  MessageSquare,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";
import Sidebar, { type MenuItem } from "../components/common/SideBar";
import Navbar from "../components/common/DashNavBar";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { FaUserGraduate } from "react-icons/fa6";
import { useQuery } from "@apollo/client";
import { GET_ALL_STUDENTS } from "../graphql/Queries/StudentQueries";
import { ConversationType, MessageType } from "../types/chatTypes";
import { getSocket } from "../utils/socket";
import { useDispatch, useSelector } from "react-redux";
import {
  addMessage,
  setConversations,
  setHasUnreadMessages,
} from "../store/slices/chatSlice";
import { RootState } from "../store";
import { Student } from "../types/Student";
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

interface TeacherLayoutProps {
  children: React.ReactNode;
}

const menuItems: MenuItem[] = [
  { text: "Overview", icon: LayoutGrid, path: "/teacher-dashboard/overview" },
  {
    text: "Profile Setting",
    icon: Settings,
    path: "/teacher-dashboard/settings",
  },
  {
    text: "Help & Support",
    icon: HelpCircle,
    path: "/teacher-dashboard/help-support",
  },
  {
    text: "Feedback",
    icon: MessageSquare,
    path: "/teacher-dashboard/feedback",
  },
  {
    text: "My Students",
    icon: FaUserGraduate,
    path: "/teacher-dashboard/my-students",
  },
  {
    text: "Messages",
    icon: MessageSquare,
    path: "/teacher-dashboard/chat",
  },
  { text: "Logout", icon: LogOut, path: "/logout" },
];

const DRAWER_WIDTH = 280;

export default function TeacherLayout({ children }: TeacherLayoutProps) {
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

  const { data } = useQuery(GET_ALL_STUDENTS, {
    variables: {
      filter: {
        sortBy: "RECENT_TO_OLDEST",
      },
    },
    skip: !user?.id,
    fetchPolicy: "network-only",
  });

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
