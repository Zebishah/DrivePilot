import React, { useEffect, useRef, useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  ListSubheader,
  Toolbar,
  Typography,
} from "@mui/material";
import { LogOut, MenuIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useQuery } from "@apollo/client";
import { GET_STUDENT_PROFILE } from "../../graphql/mutations/studentProfile";
import { GET_TEACHER_PROFILE } from "../../graphql/mutations/profile";
import { designTokens } from "../../themes/tokens";
import NotificationBell from "../dashboard/NotificationBell";

interface MenuItemProps {
  text: string;
  icon: React.ElementType;
  path: string;
}

interface NavbarProps {
  handleDrawerToggle: () => void;
  menuItems: MenuItemProps[];
  onLogout?: () => void;
}

export default function Navbar({
  handleDrawerToggle,
  menuItems,
  onLogout,
}: NavbarProps) {
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(
    null,
  );
  const logoutRequested = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isImageLoading, setIsImageLoading] = useState(false);

  const isStudent = user?.role === "Student";
  const isInstructor = user?.role === "Instructor";
  const isAdmin = user?.role === "Admin";
  const isInstructorOverview =
    isInstructor && location.pathname === "/teacher-dashboard/overview";

  const { data: studentData, loading: studentLoading } = useQuery(
    GET_STUDENT_PROFILE,
    {
      skip: !isStudent,
    },
  );
  const { data: teacherData, loading: teacherLoading } = useQuery(
    GET_TEACHER_PROFILE,
    {
      skip: !isInstructor,
    },
  );

  const profileImage = isStudent
    ? studentData?.studentProfile?.profileImage
    : isInstructor
      ? teacherData?.teacherProfile?.profileImage
      : undefined;

  useEffect(() => setIsImageLoading(Boolean(profileImage)), [profileImage]);

  const isLoading =
    (isStudent && studentLoading) || (isInstructor && teacherLoading);

  const currentMenuItem = (menuItems || [])
    .filter((item): item is MenuItemProps => !!item?.path)
    .find((item) => location?.pathname.startsWith(item.path));

  const pageTitle = currentMenuItem ? currentMenuItem?.text : "Dashboard";

  const handleProfileClose = () => {
    setProfileAnchorEl(null);
  };

  const renderAvatar = () => {
    const handleAvatarClick = (event: React.MouseEvent<HTMLElement>) => {
      setProfileAnchorEl(event.currentTarget);
    };

    return (
      <Box
        component="button"
        type="button"
        className="dsp-topbar__avatar-button"
        aria-label="Open profile menu"
        aria-controls={profileAnchorEl ? "profile-menu" : undefined}
        aria-haspopup="menu"
        aria-expanded={Boolean(profileAnchorEl)}
        sx={{
          position: "relative",
          width: 46,
          height: 46,
          p: 0.35,
          border: 0,
          borderRadius: "50%",
          cursor: "pointer",
          background: designTokens.gradient.primary,
        }}
        onClick={handleAvatarClick}
      >
        {(isLoading || (isImageLoading && !!profileImage)) && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 40,
              height: 40,
              borderRadius: "50%",
              bgcolor: "var(--ws-surface-muted, #e0e0e0)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            <CircularProgress size={20} />
          </Box>
        )}

        <Avatar
          src={profileImage || undefined}
          sx={{
            width: 40,
            height: 40,
            zIndex: isImageLoading ? 0 : 2,
            backgroundColor: designTokens.color.purpleSurface,
          }}
          imgProps={{
            onLoad: () => setIsImageLoading(false),
            onError: () => {
              setIsImageLoading(false);
            },
          }}
        >
          {[user?.firstName, user?.lastName]
            .map((name) => name?.[0])
            .join("")
            .toUpperCase() || "D"}
        </Avatar>
      </Box>
    );
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      className={`dsp-dashboard-topbar${isInstructorOverview ? " dsp-dashboard-topbar--instructor-overview" : ""}`}
      sx={{
        borderBottom: "1px solid rgba(231, 229, 228, 0.9)",
        backgroundColor: "rgba(255, 255, 255, 0.86)",
        color: "var(--ws-ink, #15171D)",
        backdropFilter: "blur(12px)",
        zIndex: (theme) => theme.zIndex.appBar,
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 64, sm: 72 }, px: { xs: 1.5, sm: 3 } }}>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ mr: 2, display: { sm: "none" } }}
        >
          <MenuIcon />
        </IconButton>

        <Box className="dsp-topbar__context">
          <Typography className="dsp-topbar__crumb">
            Drive Pilot / {user?.role || "Workspace"}
          </Typography>
          <Typography className="dsp-topbar__title">{pageTitle}</Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: 0.5, sm: 1.25 },
          }}
        >
          <NotificationBell />
          {renderAvatar()}
          <Menu
            id="profile-menu"
            anchorEl={profileAnchorEl}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            open={Boolean(profileAnchorEl)}
            onClose={handleProfileClose}
            TransitionProps={{
              onExited: () => {
                // Let the menu restore focus before the confirmation dialog opens.
                if (logoutRequested.current) {
                  logoutRequested.current = false;
                  onLogout?.();
                }
              },
            }}
          >
            <ListSubheader
              role="presentation"
              className="dsp-profile-menu__header"
              disableSticky
            >
              <Typography className="dsp-profile-menu__name">
                {user?.firstName || "Your profile"} {user?.lastName || ""}
              </Typography>
              <Typography className="dsp-profile-menu__role">
                {user?.role || "Workspace"}
              </Typography>
            </ListSubheader>
            {!isAdmin && (
              <MenuItem
                onClick={() => {
                  handleProfileClose();
                  navigate(
                    isStudent
                      ? "/student-dashboard/settings"
                      : "/teacher-dashboard/settings",
                  );
                }}
              >
                Profile settings
              </MenuItem>
            )}
            {isAdmin && (
              <MenuItem
                onClick={() => {
                  handleProfileClose();
                  navigate("/admin-dashboard/overview");
                }}
              >
                Your workspace
              </MenuItem>
            )}
            {onLogout && (
              <MenuItem
                onClick={() => {
                  logoutRequested.current = true;
                  handleProfileClose();
                }}
                sx={{ gap: 1 }}
              >
                <LogOut size={16} aria-hidden="true" /> Log out
              </MenuItem>
            )}
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
