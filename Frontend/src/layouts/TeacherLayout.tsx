"use client";

import type React from "react";

import { useState } from "react";
import { Box, CssBaseline, ThemeProvider, createTheme } from "@mui/material";
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
} from "lucide-react";
import Sidebar, { type MenuItem } from "../components/common/SideBar";
import Navbar from "../components/common/DashNavBar";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FaUserGraduate } from "react-icons/fa6";
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
  { text: "Logout", icon: LogOut, path: "/logout" },
];
const DRAWER_WIDTH = 280;

export default function TeacherLayout({ children }: TeacherLayoutProps) {
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
          <Navbar
            handleDrawerToggle={handleDrawerToggle}
            menuItems={menuItems}
          />{" "}
          {/* Pass menuItems */}
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
