"use client";

import type React from "react";

import { useState } from "react";
import { Box, CssBaseline, ThemeProvider, createTheme } from "@mui/material";

import Sidebar, { type MenuItem } from "../components/common/SideBar";
import Navbar from "../components/common/DashNavBar";
import { LayoutGrid, HelpCircle, LogOut, UserRoundCog } from "lucide-react";
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

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAuth();

  const nav = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuItems: MenuItem[] = [
    { text: "Overview", icon: LayoutGrid, path: "/admin-dashboard/overview" },

    {
      text: "Admin Access",
      icon: UserRoundCog,
      path: "/admin-dashboard/admin-access",
    },
    {
      text: "Documents",
      icon: LayoutGrid,
      path: "/admin-dashboard/documentsManagement",
    },
    {
      text: "Instructor Management",
      icon: LayoutGrid,
      path: "/admin-dashboard/InstructorManagement",
    },
    {
      text: "Student Management",
      icon: LayoutGrid,
      path: "/admin-dashboard/StudentManagement",
    },
    ...(user?.adminLevel === "super"
      ? [
          {
            text: "Help & Support",
            icon: HelpCircle,
            path: "/admin-dashboard/help-support",
          },
        ]
      : []),

    { text: "Logout", icon: LogOut, path: "/logout" },
  ];

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
          />
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
