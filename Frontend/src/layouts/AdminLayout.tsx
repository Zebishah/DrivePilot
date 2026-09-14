"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Box, CssBaseline } from "@mui/material";
import Sidebar, { type MenuItem } from "../components/common/SideBar";
import Navbar from "../components/common/DashNavBar";
import { LayoutGrid, HelpCircle, LogOut, UserRoundCog } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useBookingNotifications } from "../utils/useBookingNotification";
import { initSocket } from "../utils/socket";
import AssistantPanel from "../features/assistant/components/AssistantPanel";
// ✅ Import initSocket

interface AdminLayoutProps {
  children: React.ReactNode;
}

const DRAWER_WIDTH = 280;

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, token, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // ✅ Initialize socket connection when component mounts
  useEffect(() => {
    if (user?.role === "Admin") {
      initSocket(token || undefined);
    }
  }, [user, token]);

  // ✅ Use booking notifications hook
  const { unseenBookingsCount, clearUnseenCount } =
    useBookingNotifications(user?.id || "", user?.role || "");

  // ✅ Clear unseen count when visiting booking management page
  useEffect(() => {
    if (location.pathname === "/admin-dashboard/bookingManagement") {
      clearUnseenCount();
    }
  }, [location.pathname, clearUnseenCount]);

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
      text: "Booking Management",
      icon: LayoutGrid,
      path: "/admin-dashboard/bookingManagement",
      badge: unseenBookingsCount > 0 ? unseenBookingsCount : undefined, // ✅ Only show badge if > 0
    },
    {
      text: "Student Management",
      icon: LayoutGrid,
      path: "/admin-dashboard/StudentManagement",
    },
    {
      text: "Payment management",
      icon: LayoutGrid,
      path: "/admin-dashboard/transactions",
    },
    {
      text: "Refund requests",
      icon: LayoutGrid,
      path: "/admin-dashboard/refund-requests",
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
    <>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar
          drawerWidth={DRAWER_WIDTH}
          mobileOpen={mobileOpen}
          handleDrawerToggle={handleDrawerToggle}
          menuItems={menuItems}
          userName={user?.firstName}
          roleLabel="Admin"
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
          <AssistantPanel pageContext="admin-dashboard" />
        </Box>
      </Box>
    </>
  );
}
