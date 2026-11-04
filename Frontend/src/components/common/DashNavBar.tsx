import React, { useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import { ChevronDown, MenuIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useQuery } from "@apollo/client";
import { GET_STUDENT_PROFILE } from "../../graphql/mutations/studentProfile";
import { GET_TEACHER_PROFILE } from "../../graphql/mutations/profile";
import { designTokens } from "../../themes/tokens";
import NotificationBell from "../dashboard/NotificationBell";

// Flag components
import { US, FR, DE, IT } from "country-flag-icons/react/3x2";

interface MenuItemProps {
  text: string;
  icon: React.ElementType;
  path: string;
}

interface Language {
  code: string;
  label: string;
  Flag: React.ElementType;
}

const LANGUAGES: Language[] = [
  { code: "en", label: "English", Flag: US },
  { code: "fr", label: "French", Flag: FR },
  { code: "de", label: "German", Flag: DE },
  { code: "it", label: "Italian", Flag: IT },
];

interface NavbarProps {
  handleDrawerToggle: () => void;
  menuItems: MenuItemProps[];
}

export default function Navbar({ handleDrawerToggle, menuItems }: NavbarProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(
    LANGUAGES[0]
  );

  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isImageLoading, setIsImageLoading] = useState(true);

  const isStudent = user?.role === "Student";
  const isInstructor = user?.role === "Instructor";
  const isAdmin = user?.role === "Admin";
  const isInstructorOverview = isInstructor && location.pathname === "/teacher-dashboard/overview";

  const { data: studentData, loading: studentLoading } = useQuery(
    GET_STUDENT_PROFILE,
    {
      skip: !isStudent,
    }
  );
  const { data: teacherData, loading: teacherLoading } = useQuery(
    GET_TEACHER_PROFILE,
    {
      skip: !isInstructor,
    }
  );

  const profileImage = isAdmin
    ? "/admin-avatar.jpg"
    : isStudent
      ? studentData?.studentProfile?.profileImage
      : isInstructor
        ? teacherData?.teacherProfile?.profileImage
        : "/default-avatar.jpg";

  const isLoading =
    (isStudent && studentLoading) || (isInstructor && teacherLoading);

  const currentMenuItem = (menuItems || [])
    .filter((item): item is MenuItemProps => !!item?.path)
    .find((item) => location?.pathname.startsWith(item.path));

  const pageTitle = currentMenuItem ? currentMenuItem?.text : "Dashboard";

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event?.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClose = () => {
    setProfileAnchorEl(null);
  };

  const handleLanguageChange = (language: Language) => {
    setSelectedLanguage(language);
    setAnchorEl(null);
    // Add actual i18n language change logic here
  };
  const renderAvatar = () => {
    const handleAvatarClick = (event: React.MouseEvent<HTMLElement>) => {
      if (isStudent || isInstructor) {
        setProfileAnchorEl(event.currentTarget);
        return;
      }
      switch (user?.role) {
        case "Admin":
          navigate("/admin-dashboard/overview");
          break;
        case "Student":
          navigate("/student-dashboard/overview");
          break;
        case "Instructor":
          navigate("/teacher-dashboard/overview");
          break;
        default:
          // Optional fallback
          navigate("/");
      }
    };

    return (
      <Box
        component="button"
        type="button"
        className="dsp-topbar__avatar-button"
        aria-label="Open profile menu"
        aria-controls={profileAnchorEl ? "profile-menu" : undefined}
        aria-haspopup="true"
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
          src={profileImage || "/default-avatar.jpg"}
          sx={{ width: 40, height: 40, zIndex: isImageLoading ? 0 : 2, backgroundColor: designTokens.color.purpleSurface }}
          imgProps={{
            onLoad: () => setIsImageLoading(false),
            onError: () => {
              setIsImageLoading(false);
            },
          }}
        />
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
          <Typography className="dsp-topbar__crumb">DSP / {user?.role || "Workspace"}</Typography>
          <Typography className="dsp-topbar__title">{pageTitle}</Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1.25 } }}>
          <selectedLanguage.Flag
            title={selectedLanguage.label}
            style={{ width: 24, height: 16 }}
          />
          <Typography sx={{ display: { xs: "none", md: "block" }, fontSize: "0.82rem", fontWeight: 600, color: "var(--ws-info, #526071)" }}>
            {selectedLanguage.label}
          </Typography>

          <IconButton
            size="small"
            aria-label="language"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
          >
            <ChevronDown size={20} />
          </IconButton>

          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            keepMounted
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            {LANGUAGES.map((lang) => (
              <MenuItem
                key={lang.code}
                selected={lang.code === selectedLanguage.code}
                onClick={() => handleLanguageChange(lang)}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <lang.Flag
                    title={lang.label}
                    style={{ width: 24, height: 16 }}
                  />
                  {lang.label}
                </Box>
              </MenuItem>
            ))}
          </Menu>

          <NotificationBell />
          {renderAvatar()}
          <Menu
            id="profile-menu"
            anchorEl={profileAnchorEl}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            open={Boolean(profileAnchorEl)}
            onClose={handleProfileClose}
          >
            <Box className="dsp-profile-menu__header">
              <Typography className="dsp-profile-menu__name">
                {user?.firstName || "Your profile"} {user?.lastName || ""}
              </Typography>
              <Typography className="dsp-profile-menu__role">
                {user?.role || "Workspace"}
              </Typography>
            </Box>
            <MenuItem
              onClick={() => {
                handleProfileClose();
                navigate(isStudent ? "/student-dashboard/settings" : "/teacher-dashboard/settings");
              }}
            >
              Profile settings
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
