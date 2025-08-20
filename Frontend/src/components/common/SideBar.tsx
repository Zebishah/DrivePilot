import {
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
import { useState } from "react";
import type { IconType } from "react-icons/lib";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store";
import { clearUnreadMessages } from "../../store/slices/chatSlice";

export interface MenuItem {
  text: string;
  icon: LucideIcon | IconType;
  path: string;
}

interface SidebarProps {
  drawerWidth: number;
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
  menuItems: MenuItem[];
  userName?: string;
  onLogout?: () => void;
}

const MotionListItem = motion(ListItem);

export default function Sidebar({
  drawerWidth,
  mobileOpen,
  handleDrawerToggle,
  menuItems,
  userName = "John",
  onLogout,
}: SidebarProps) {
  const theme = useTheme();
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
        delay: i * 0.05,
        duration: 0.2,
      },
    }),
  };

  const handleLogoutClick = (e: React.MouseEvent) => {
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

  const drawer = (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          mb: 1,
          display: "flex",
          justifyContent: "flex-start",
          cursor: "pointer",
        }}
        onClick={handleDrawerToggle}
        component={motion.div}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <img
          src="/Website-new-logo.png"
          alt="DSP Logo"
          style={{ height: 72 }}
        />
      </Box>

      <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
        Welcome, {userName}
      </Typography>

      <List>
        {menuItems.map((item, index) => {
          const isLogout = item.text.toLowerCase() === "logout";
          const isActive = router.pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <MotionListItem
              key={item.text}
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
                    borderRadius: 1,
                    mb: 0.5,
                    backgroundColor: isActive
                      ? "rgba(0, 0, 0, 0.08)"
                      : "transparent",
                    "&:hover": {
                      backgroundColor: isActive
                        ? "rgba(0, 0, 0, 0.12)"
                        : "rgba(0, 0, 0, 0.04)",
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Icon
                      size={20}
                      color={isActive ? theme.palette.primary.main : undefined}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    sx={{
                      color: isActive ? theme.palette.primary.main : undefined,
                      fontWeight: isActive ? 500 : 400,
                    }}
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
                    whileHover={{ x: 5 }}
                    whileTap={{ scale: 0.98 }}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      backgroundColor: isActive
                        ? "rgba(0, 0, 0, 0.08)"
                        : "transparent",
                      "&:hover": {
                        backgroundColor: isActive
                          ? "rgba(0, 0, 0, 0.12)"
                          : "rgba(0, 0, 0, 0.04)",
                      },
                      position: "relative",
                    }}
                    onClick={() => {
                      if (item.text === "Messages") {
                        dispatch(clearUnreadMessages());
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Icon
                        size={20}
                        color={
                          isActive ? theme.palette.primary.main : undefined
                        }
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      sx={{
                        color: isActive
                          ? theme.palette.primary.main
                          : undefined,
                        fontWeight: isActive ? 500 : 400,
                      }}
                    />
                    {item.text === "Messages" && unreadMessages && (
                      <Box
                        sx={{
                          position: "absolute",
                          right: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 10,
                          height: 10,
                          bgcolor: "red",
                          borderRadius: "50%",
                        }}
                      />
                    )}
                  </ListItemButton>
                </Link>
              )}
            </MotionListItem>
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
              borderRight: "1px solid rgba(0, 0, 0, 0.12)",
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
