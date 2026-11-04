import {
  Avatar,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Fragment, useState } from "react";
import type { MouseEvent } from "react";
import type { IconType } from "react-icons/lib";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store";
import { clearUnreadMessages } from "../../store/slices/chatSlice";
import { AdminButton } from "../admin/AdminPrimitives";
import { AdminModal } from "../admin/AdminModal";
import BrandLogo from "../BrandLogo";

export interface MenuItem {
  text: string;
  icon: LucideIcon | IconType;
  path: string;
  badge?: number;
  section?: string;
}

export interface SidebarSection {
  label: string;
  items: MenuItem[];
}

function defaultSections(
  roleLabel: "Student" | "Instructor" | "Admin",
  menuItems: MenuItem[],
): SidebarSection[] {
  const items = menuItems.filter(
    (item) => item.text.toLowerCase() !== "logout",
  );
  const sectionLabels = Array.from(
    new Set(
      items
        .map((item) => item.section)
        .filter((section): section is string => Boolean(section)),
    ),
  );
  if (sectionLabels.length > 0) {
    return sectionLabels.map((label) => ({
      label,
      items: items.filter((item) => item.section === label),
    }));
  }
  if (roleLabel === "Instructor")
    return [
      { label: "Workspace", items: items.slice(0, 4) },
      { label: "Manage", items: items.slice(4) },
    ];
  if (roleLabel === "Student")
    return [
      { label: "Workspace", items: items.slice(0, 5) },
      { label: "Account", items: items.slice(5) },
    ];
  return [{ label: "Workspace", items }];
}

interface SidebarProps {
  drawerWidth: number;
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
  menuItems: MenuItem[];
  sections?: SidebarSection[];
  userName?: string;
  userAvatar?: string;
  userIsDemo?: boolean;
  roleLabel?: "Student" | "Instructor" | "Admin";
  overviewMode?: boolean;
  onLogout?: () => void;
}

const MotionListItem = motion(ListItem);

export default function Sidebar({
  drawerWidth,
  mobileOpen,
  handleDrawerToggle,
  menuItems,
  sections,
  userName = "John",
  userAvatar,
  userIsDemo = false,
  roleLabel = "Student",
  overviewMode = false,
  onLogout,
}: SidebarProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const router = useLocation();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const dispatch = useDispatch();
  const { unreadMessages } = useSelector((state: RootState) => state.chat);

  const listItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: reducedMotion ? 0 : Math.min(i * 0.02, 0.12),
        duration: reducedMotion ? 0 : 0.18,
      },
    }),
  };

  const handleLogoutClick = (e: MouseEvent) => {
    e.preventDefault();
    setLogoutDialogOpen(true);
  };

  const handleConfirmLogout = () => {
    setLogoutDialogOpen(false);
    if (onLogout) {
      onLogout();
    }
  };

  const handleCancelLogout = () => {
    setLogoutDialogOpen(false);
  };

  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const sidebarSections = sections ?? defaultSections(roleLabel, menuItems);
  const logoutItem = menuItems.find(
    (item) => item.text.toLowerCase() === "logout",
  );

  const drawer = (
    <Box
      className={`dsp-sidebar__content dsp-sidebar__content--${roleLabel.toLowerCase()}${overviewMode ? " dsp-sidebar__content--overview" : ""}`}
      sx={{ p: 2.25, minHeight: "100%" }}
    >
      <Box
        className="dsp-sidebar__brand"
        onClick={isMobile ? handleDrawerToggle : undefined}
        component={motion.div}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        role={isMobile ? "button" : undefined}
        tabIndex={isMobile ? 0 : undefined}
        aria-label={isMobile ? "Close navigation" : undefined}
        onKeyDown={
          isMobile
            ? (event) => {
                if (event.key === "Enter" || event.key === " ")
                  handleDrawerToggle();
              }
            : undefined
        }
      >
        <BrandLogo size="md" to="/" aria-label="DSP Marketplace home" />
      </Box>

      <Box className="dsp-sidebar__identity">
        <Box className="dsp-sidebar__profile">
          <Avatar
            src={userAvatar || undefined}
            alt=""
            className="dsp-sidebar__avatar"
          >
            {initials}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography className="dsp-sidebar__greeting">
              {userName}
            </Typography>
            <span className="dsp-sidebar__role-badge">
              <span className="dsp-sidebar__status-dot" aria-hidden="true" />
              {roleLabel}
            </span>
            {userIsDemo ? (
              <span className="dsp-sidebar__demo-badge">Recruiter Demo</span>
            ) : null}
          </Box>
        </Box>
        <Typography className="dsp-sidebar__eyebrow">
          {roleLabel} workspace
        </Typography>
      </Box>

      <Box className="dsp-sidebar__nav-scroll">
        <List className="dsp-sidebar__nav">
          {sidebarSections.map((section, sectionIndex) => (
            <Fragment key={section.label}>
              <Typography component="li" className="dsp-sidebar__group-label">
                {section.label}
              </Typography>
              {section.items.map((item, itemIndex) => {
                const isActive = router.pathname.startsWith(item.path);
                const Icon = item.icon;
                const hasBadge =
                  (item.badge && item.badge > 0) ||
                  (item.text === "Messages" && unreadMessages > 0);
                const animationIndex = sectionIndex * 10 + itemIndex;
                return (
                  <MotionListItem
                    disablePadding
                    custom={animationIndex}
                    initial={false}
                    animate="visible"
                    variants={listItemVariants}
                    key={item.text}
                  >
                    <Link
                      to={item.path}
                      className="dsp-sidebar__link"
                      onClick={() => {
                        if (item.text === "Messages") {
                          dispatch(clearUnreadMessages());
                          localStorage.setItem("unreadMessages", "0");
                        }
                        if (isMobile && mobileOpen) handleDrawerToggle();
                      }}
                    >
                      <ListItemButton
                        component={motion.div}
                        aria-current={isActive ? "page" : undefined}
                        whileHover={reducedMotion ? undefined : { x: 2 }}
                        whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                        className="dsp-sidebar__item"
                        sx={{
                          borderRadius: 2,
                          mb: 0.5,
                          minHeight: 44,
                          position: "relative",
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 34 }}>
                          <Icon size={19} />
                        </ListItemIcon>
                        <ListItemText primary={item.text} />
                        {hasBadge && (
                          <Box className="dsp-sidebar__badge">
                            {item.badge || unreadMessages}
                          </Box>
                        )}
                      </ListItemButton>
                    </Link>
                  </MotionListItem>
                );
              })}
            </Fragment>
          ))}
        </List>
      </Box>

      {logoutItem && (
        <List className="dsp-sidebar__logout">
          <MotionListItem disablePadding>
            <ListItemButton
              className="dsp-sidebar__logout-button"
              onClick={handleLogoutClick}
              aria-label="Log out"
            >
              <ListItemIcon sx={{ minWidth: 34 }}>
                <logoutItem.icon size={19} />
              </ListItemIcon>
              <ListItemText primary={logoutItem.text} />
            </ListItemButton>
          </MotionListItem>
        </List>
      )}

      <AdminModal
        open={logoutDialogOpen}
        onClose={handleCancelLogout}
        title="Confirm logout"
        subtitle="You can sign back in whenever you need to return."
        size="sm"
        footer={
          <>
            <AdminButton variant="secondary" onClick={handleCancelLogout}>
              Cancel
            </AdminButton>
            <AdminButton variant="danger" onClick={handleConfirmLogout}>
              Logout
            </AdminButton>
          </>
        }
      >
        <p className="dsp-admin-confirmation-copy">
          Are you sure you want to log out of your account?
        </p>
      </AdminModal>
    </Box>
  );

  return (
    <Box
      component="nav"
      aria-label={`${roleLabel} navigation`}
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      {isMobile ? (
        <Drawer
          variant="temporary"
          className={`dsp-sidebar-drawer${overviewMode ? " dsp-overview-drawer" : ""}`}
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              background: "var(--ws-surface, #FFFFFF)",
              color: "var(--ws-ink, #111827)",
              borderRight: "1px solid var(--ws-border, #E2E8F0)",
            },
          }}
        >
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          className={`dsp-sidebar-drawer${overviewMode ? " dsp-overview-drawer" : ""}`}
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              background: "var(--ws-surface, #FFFFFF)",
              color: "var(--ws-ink, #111827)",
              borderRight: "1px solid var(--ws-border, #E2E8F0)",
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      )}
    </Box>
  );
}
