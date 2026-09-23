"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { type MenuItem } from "../components/common/SideBar";
import DashboardShell from "../components/dashboard/DashboardShell";
import { Bell, BarChart3, CalendarDays, CreditCard, FileCheck2, GraduationCap, HelpCircle, LayoutDashboard, LogOut, MessageSquareText, ReceiptText, ShieldCheck, Star, UsersRound } from "lucide-react";
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

const DRAWER_WIDTH = 240;

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
  const { unseenBookingsCount, clearUnseenCount } = useBookingNotifications(
    user?.id || "",
    user?.role || "",
  );

  // ✅ Clear unseen count when visiting booking management page
  useEffect(() => {
    if (location.pathname === "/admin-dashboard/bookingManagement") {
      clearUnseenCount();
    }
  }, [location.pathname, clearUnseenCount]);

  const menuItems: MenuItem[] = [
    { text: "Overview", icon: LayoutDashboard, path: "/admin-dashboard/overview", section: "Overview" },
    { text: "Analytics & Reports", icon: BarChart3, path: "/admin-dashboard/analytics", section: "Overview" },
    {
      text: "Admin Access",
      icon: ShieldCheck,
      path: "/admin-dashboard/admin-access",
      section: "People",
    },
    {
      text: "Instructor Management",
      icon: UsersRound,
      path: "/admin-dashboard/InstructorManagement",
      section: "People",
    },
    {
      text: "Student Management",
      icon: GraduationCap,
      path: "/admin-dashboard/StudentManagement",
      section: "People",
    },
    {
      text: "Documents",
      icon: FileCheck2,
      path: "/admin-dashboard/documentsManagement",
      section: "Operations",
    },
    {
      text: "Booking Management",
      icon: CalendarDays,
      path: "/admin-dashboard/bookingManagement",
      section: "Operations",
      badge: unseenBookingsCount > 0 ? unseenBookingsCount : undefined,
    },
    {
      text: "Reviews & Ratings",
      icon: Star,
      path: "/admin-dashboard/reviews",
      section: "Operations",
    },
    {
      text: "Student Feedback",
      icon: MessageSquareText,
      path: "/admin-dashboard/student-feedback",
      section: "Operations",
    },
    {
      text: "Payment Management",
      icon: CreditCard,
      path: "/admin-dashboard/transactions",
      section: "Finance",
    },
    {
      text: "Refund Requests",
      icon: ReceiptText,
      path: "/admin-dashboard/refund-requests",
      section: "Finance",
    },
    {
      text: "Notifications",
      icon: Bell,
      path: "/admin-dashboard/notifications",
      section: "Account",
    },
    ...(user?.adminLevel === "super"
      ? [
          {
            text: "Help & Support",
            icon: HelpCircle,
            path: "/admin-dashboard/help-support",
            section: "Support",
          },
        ]
      : []),
    { text: "Logout", icon: LogOut, path: "/logout", section: "" },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    nav("/auth/signin");
    toast.success("Logout Successfully");
  };

  const sections = [
    "Overview",
    "People",
    "Operations",
    "Finance",
    "Account",
    "Support",
  ].map((label) => ({ label, items: menuItems.filter((item) => item.section === label) }));

  return (
    <div className="dsp-admin-shell">
      <DashboardShell
        drawerWidth={DRAWER_WIDTH}
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
        menuItems={menuItems}
        sections={sections}
        userName={user?.firstName || "Admin"}
        userIsDemo={Boolean(user?.isDemo)}
        roleLabel="Admin"
        onLogout={handleLogout}
      >
        {children}
      </DashboardShell>
      <AssistantPanel pageContext="admin-dashboard" />
    </div>
  );
}
