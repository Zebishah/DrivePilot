import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
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
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Fragment, useState } from "react";
import type { MouseEvent } from "react";
import type { IconType } from "react-icons/lib";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store";
import { clearUnreadMessages } from "../../store/slices/chatSlice";

export interface MenuItem {
  text: string;
  icon: LucideIcon | IconType;
  path: string;
  badge?: number;
}

interface SidebarProps {
  drawerWidth: number;
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
  menuItems: MenuItem[];
  userName?: string;
  userAvatar?: string;
  roleLabel?: "Student" | "Instructor" | "Admin";
  onLogout?: () => void;
}

const MotionListItem = motion(ListItem);

export default function Sidebar({
  drawerWidth,
  mobileOpen,
  handleDrawerToggle,
  menuItems,
  userName = "John",
  userAvatar,
  roleLabel = "Student",
  onLogout,
}: SidebarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const router = useLocation();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const dispatch = useDispatch();
  const { unreadMessages } = useSelector((state: RootState) => state.chat);
  const isInstructor = roleLabel === "Instructor";

  const listItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.2,
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
  const groupLabels: Record<number, string> = roleLabel === "Student"
    ? { 0: "Workspace", 5: "Account" }
    : roleLabel === "Instructor"
      ? { 0: "Workspace", 4: "Manage" }
      : { 0: "Workspace" };

  const drawer = (
    <Box className={`dsp-sidebar__content dsp-sidebar__content--${roleLabel.toLowerCase()}`} sx={{ p: 2.25, minHeight: "100%" }}>
      <Box
        className="dsp-sidebar__brand"
        onClick={handleDrawerToggle}
        component={motion.div}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        role="button"
        tabIndex={0}
        aria-label="Close navigation"
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") handleDrawerToggle();
        }}
      >
        <img
          src="/Website-new-logo.png"
          alt="DSP Logo"
          style={{ height: 58, width: "auto" }}
        />
      </Box>

      <Box className="dsp-sidebar__identity">
        <Box className="dsp-sidebar__profile">
          <Avatar src={userAvatar || undefined} alt="" className="dsp-sidebar__avatar">
            {initials}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography className="dsp-sidebar__greeting">{userName}</Typography>
            <span className="dsp-sidebar__role-badge">{roleLabel}</span>
          </Box>
        </Box>
        <Typography className="dsp-sidebar__eyebrow">DSP Marketplace</Typography>
        <Typography className="dsp-sidebar__role">Your {roleLabel.toLowerCase()} workspace</Typography>
      </Box>

      <List className="dsp-sidebar__nav">
        {menuItems.map((item, index) => {
          const isLogout = item.text.toLowerCase() === "logout";
          const isActive = router.pathname.startsWith(item.path);
          const Icon = item.icon;
          const hasBadge = (item.badge && item.badge > 0) ||
            (item.text === "Messages" && unreadMessages > 0);

          return (
            <Fragment key={item.text}>
              {groupLabels[index] && (
                <Typography component="li" className="dsp-sidebar__group-label">
                  {groupLabels[index]}
                </Typography>
              )}
              <MotionListItem
                disablePadding
                custom={index}
                initial="hidden"
                animate="visible"
                variants={listItemVariants}
              >
              {isLogout ? (
                <ListItemButton
                  component={motion.div}
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogoutClick}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    minHeight: 44,
                    background: isActive && isInstructor ? "linear-gradient(90deg, rgba(124,58,237,.2), rgba(59,130,246,.12))" : isActive ? "rgba(255, 90, 54, 0.15)" : "transparent",
                    borderLeft: isActive ? `3px solid ${isInstructor ? "#8B5CF6" : "#FF5A36"}` : "3px solid transparent",
                    "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.06)" },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Icon
                      size={20}
                      color={isActive ? "#FF8A70" : "#AEB4C0"}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    sx={{ color: isActive ? "#FFFFFF" : "#C7CEDA", fontWeight: isActive ? 600 : 500 }}
                  />
                </ListItemButton>
              ) : (
                <Link
                  to={item.path}
                  style={{
                    textDecoration: "none",
                    width: "100%",
                    color: "inherit",
                  }}
                >
                  <ListItemButton
                    component={motion.div}
                    aria-current={isActive ? "page" : undefined}
                    whileHover={{ x: 5 }}
                    whileTap={{ scale: 0.98 }}
                    sx={{
                      borderRadius: 2,
                      mb: 0.5,
                      minHeight: 44,
                      background: isActive && isInstructor ? "linear-gradient(90deg, rgba(124,58,237,.2), rgba(59,130,246,.12))" : isActive ? "rgba(255, 90, 54, 0.15)" : "transparent",
                      borderLeft: isActive ? "3px solid" : "3px solid transparent",
                      borderColor: isActive ? (isInstructor ? "#8B5CF6" : "#FF5A36") : "transparent",
                      "&:hover": { background: isActive && isInstructor ? "linear-gradient(90deg, rgba(124,58,237,.28), rgba(59,130,246,.17))" : isActive ? "rgba(255, 90, 54, 0.22)" : "rgba(255, 255, 255, 0.06)" },
                      position: "relative",
                    }}
                    onClick={() => {
                      if (item.text === "Messages") {
                        dispatch(clearUnreadMessages());
                        localStorage.setItem("unreadMessages", "0");
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Icon
                        size={20}
                        color={isActive ? (isInstructor ? "#C4B5FD" : "#FF8A70") : "#AEB4C0"}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      sx={{
                        color: isActive ? "#FFFFFF" : "#C7CEDA",
                        fontWeight: isActive ? 600 : 500,
                      }}
                    />
                    {hasBadge && (
                      <Box
                        sx={{
                          position: "absolute",
                          right: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          bgcolor: "#FF5A36",
                          color: "white",
                          borderRadius: "50%",
                          minWidth: 18,
                          height: 18,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.7rem",
                          fontWeight: "bold",
                          px: 0.5,
                        }}
                      >
                        {item.badge ? item.badge : unreadMessages}
                      </Box>
                      )}
                  </ListItemButton>
                </Link>
              )}
              </MotionListItem>
            </Fragment>
          );
        })}
      </List>

      <Dialog
        open={logoutDialogOpen}
        onClose={handleCancelLogout}
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
      >
        <DialogTitle id="logout-dialog-title">Confirm Logout</DialogTitle>
        <DialogContent>
          <DialogContentText id="logout-dialog-description">
            Are you sure you want to log out of your account?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelLogout} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmLogout}
            color="primary"
            variant="contained"
            autoFocus
          >
            Logout
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      {isMobile ? (
        <Drawer
          variant="temporary"
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
              background: "#111216",
              color: "#FFFFFF",
              borderRight: "1px solid rgba(255, 255, 255, 0.08)",
            },
          }}
        >
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              background: "#111216",
              color: "#FFFFFF",
              borderRight: "1px solid rgba(255, 255, 255, 0.08)",
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
