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
  { text: "Logout", icon: LogOut, path: "/logout" },
];

export default function StudentLayout({ children }: StudentLayoutProps) {
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
