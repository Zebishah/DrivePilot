import type React from "react";
import { Suspense, useRef, useState } from "react";
import { Box, CssBaseline } from "@mui/material";
import { useLocation } from "react-router-dom";
import Sidebar, { type MenuItem } from "../common/SideBar";
import Navbar from "../common/DashNavBar";
import DashboardExperience from "./DashboardExperience";
import RouteLoadingFallback from "../loaders/RouteLoadingFallback";
import LogoutDialog from "../common/LogoutDialog";

interface DashboardShellProps {
  children: React.ReactNode;
  drawerWidth: number;
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
  menuItems: MenuItem[];
  sections?: import("../common/SideBar").SidebarSection[];
  userName?: string;
  userAvatar?: string;
  userIsDemo?: boolean;
  roleLabel: "Student" | "Instructor" | "Admin";
  onLogout?: () => void | Promise<void>;
  topContent?: React.ReactNode;
}

/** Shared authenticated shell for the Student and Instructor products. */
export default function DashboardShell({
  children,
  drawerWidth,
  mobileOpen,
  handleDrawerToggle,
  menuItems,
  sections,
  userName,
  userAvatar,
  userIsDemo,
  roleLabel,
  onLogout,
  topContent,
}: DashboardShellProps) {
  const location = useLocation();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const logoutPending = useRef(false);
  const requestLogout = () => {
    setLogoutError(null);
    setLogoutOpen(true);
  };
  const confirmLogout = async () => {
    if (logoutPending.current || !onLogout) return;
    logoutPending.current = true;
    setLoggingOut(true);
    try {
      await onLogout();
      setLogoutOpen(false);
    } catch {
      setLogoutError("We couldn’t finish logging out. Please try again.");
    } finally {
      logoutPending.current = false;
      setLoggingOut(false);
    }
  };
  const isInstructorOverview =
    roleLabel === "Instructor" &&
    location.pathname === "/teacher-dashboard/overview";
  const isOverview = /\/(student|teacher|admin)-dashboard\/overview\/?$/.test(
    location.pathname,
  );

  return (
    <>
      <CssBaseline />
      <Box
        className={`dsp-dashboard-shell${isInstructorOverview ? " dsp-dashboard-shell--instructor-overview" : ""}`}
        sx={{ display: "flex", minHeight: "100vh" }}
      >
        <Sidebar
          drawerWidth={drawerWidth}
          mobileOpen={mobileOpen}
          handleDrawerToggle={handleDrawerToggle}
          menuItems={menuItems}
          sections={sections}
          userName={userName}
          userAvatar={userAvatar}
          userIsDemo={userIsDemo}
          roleLabel={roleLabel}
          overviewMode={isInstructorOverview}
          onLogout={onLogout ? requestLogout : undefined}
        />
        <Box
          component="main"
          className={`dsp-dashboard-main dsp-dashboard-main--${roleLabel.toLowerCase()}${isInstructorOverview ? " dsp-dashboard-main--instructor-overview" : ""}`}
          sx={{ width: { sm: `calc(100% - ${drawerWidth}px)` }, minWidth: 0 }}
        >
          <Navbar
            handleDrawerToggle={handleDrawerToggle}
            menuItems={menuItems}
            onLogout={onLogout ? requestLogout : undefined}
          />
          {topContent}
          <DashboardExperience
            role={roleLabel}
            name={userName}
            isDemo={userIsDemo}
            overview={isOverview}
          />
          <Suspense fallback={<RouteLoadingFallback />}>{children}</Suspense>
        </Box>
      </Box>
      <LogoutDialog
        open={logoutOpen}
        busy={loggingOut}
        error={logoutError}
        onCancel={() => {
          if (!logoutPending.current) setLogoutOpen(false);
        }}
        onConfirm={() => void confirmLogout()}
      />
    </>
  );
}
