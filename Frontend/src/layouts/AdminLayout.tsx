"use client";

import type React from "react";

import { useState } from "react";
import { Box, CssBaseline, ThemeProvider, createTheme } from "@mui/material";

import Sidebar, { type MenuItem } from "../components/common/SideBar";
import Navbar from "../components/common/DashNavBar";
import {
  LayoutGrid,
  Search,
  BookOpen,
  Activity,
  Wallet,
  MessageSquare,
  Settings,
  HelpCircle,
  LogOut,
  UserRoundCog,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
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

interface AdminLayoutProps {
  children: React.ReactNode;
}

const DRAWER_WIDTH = 280;

const menuItems: MenuItem[] = [
  { text: "Overview", icon: LayoutGrid, path: "/admin-dashboard/overview" },
  // {
  //   text: "Search Instructors",
  //   icon: Search,
  //   path: "/admin-dashboard/search",
  // },
  // { text: "Book lesson", icon: BookOpen, path: "/admin-dashboard/book" },
  // {
  //   text: "Progress Tracker",
  //   icon: Activity,
  //   path: "/admin-dashboard/progress",
  // },
  // {
  //   text: "Payment History",
  //   icon: Wallet,
  //   path: "/admin-dashboard/payments",
  // },
  // {
  //   text: "Feedback & Rating",
  //   icon: MessageSquare,
  //   path: "/admin-dashboard/feedback",
  // },
  // {
  //   text: "Messages",
  //   icon: MessageSquare,
  //   path: "/admin-dashboard/messages",
  // },
  // {
  //   text: "Profile Setting",
  //   icon: Settings,
  //   path: "/admin-dashboard/settings",
  // },
  {
    text: "Admin Access",
    icon: UserRoundCog,
    path: "/admin-dashboard/admin-access",
  },
  // {
  //   text: "Help & Chat bot",
  //   icon: HelpCircle,
  //   path: "/admin-dashboard/help",
  // },
  { text: "Logout", icon: LogOut, path: "/logout" },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  const handleLogout = () => {
    logout();
    nav("/auth/signin");
    toast.success("Logout Successfully");
  };

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
            // flexGrow: 1,
            width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
            // ml: { sm: `${DRAWER_WIDTH}px` },
          }}
        >
          <Navbar handleDrawerToggle={handleDrawerToggle} />
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
