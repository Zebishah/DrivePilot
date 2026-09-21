import type React from "react";
import { Box, CssBaseline } from "@mui/material";
import { useLocation } from "react-router-dom";
import Sidebar, { type MenuItem } from "../common/SideBar";
import Navbar from "../common/DashNavBar";

interface DashboardShellProps {
  children: React.ReactNode;
  drawerWidth: number;
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
  menuItems: MenuItem[];
  userName?: string;
  userAvatar?: string;
  roleLabel: "Student" | "Instructor";
  onLogout?: () => void;
  topContent?: React.ReactNode;
}

/** Shared authenticated shell for the Student and Instructor products. */
export default function DashboardShell({
  children,
  drawerWidth,
  mobileOpen,
  handleDrawerToggle,
  menuItems,
  userName,
  userAvatar,
  roleLabel,
  onLogout,
  topContent,
}: DashboardShellProps) {
  const location = useLocation();
  const isInstructorOverview = roleLabel === "Instructor" && location.pathname === "/teacher-dashboard/overview";

  return (
    <>
      <CssBaseline />
      <Box className={`dsp-dashboard-shell${isInstructorOverview ? " dsp-dashboard-shell--instructor-overview" : ""}`} sx={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar
          drawerWidth={drawerWidth}
          mobileOpen={mobileOpen}
          handleDrawerToggle={handleDrawerToggle}
          menuItems={menuItems}
          userName={userName}
          userAvatar={userAvatar}
          roleLabel={roleLabel}
          overviewMode={isInstructorOverview}
          onLogout={onLogout}
        />
        <Box
          component="main"
          className={`dsp-dashboard-main dsp-dashboard-main--${roleLabel.toLowerCase()}${isInstructorOverview ? " dsp-dashboard-main--instructor-overview" : ""}`}
          sx={{ width: { sm: `calc(100% - ${drawerWidth}px)` }, minWidth: 0 }}
        >
          <Navbar handleDrawerToggle={handleDrawerToggle} menuItems={menuItems} />
          {topContent}
          {children}
        </Box>
      </Box>
    </>
  );
}
