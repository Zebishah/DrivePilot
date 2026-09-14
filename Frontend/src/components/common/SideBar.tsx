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
  badge?: number;
}

interface SidebarProps {
  drawerWidth: number;
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
  menuItems: MenuItem[];
  userName?: string;
  roleLabel?: "Student" | "Instructor";
  onLogout?: () => void;
}

const MotionListItem = motion(ListItem);

export default function Sidebar({
  drawerWidth,
  mobileOpen,
  handleDrawerToggle,
  menuItems,
  userName = "John",
  roleLabel = "Student",
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
    <Box className="dsp-sidebar__content" sx={{ p: 2.25, minHeight: "100%" }}>
      <Box
        sx={{
          mb: 1.5,
          display: "flex",
          justifyContent: "flex-start",
          width: "fit-content",
          px: 1,
          py: 0.75,
          borderRadius: 2.5,
          backgroundColor: "#F7F4EF",
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
          style={{ height: 58, width: "auto" }}
        />
      </Box>

      <Box className="dsp-sidebar__identity">
        <Typography className="dsp-sidebar__eyebrow">DSP Marketplace</Typography>
        <Typography className="dsp-sidebar__greeting">Welcome, {userName}</Typography>
        <Typography className="dsp-sidebar__role">{roleLabel} workspace</Typography>
      </Box>

      <List className="dsp-sidebar__nav">
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
                    borderRadius: 2,
                    mb: 0.5,
                    minHeight: 44,
                    backgroundColor: isActive ? "rgba(242, 139, 109, 0.16)" : "transparent",
                    borderLeft: isActive ? "3px solid #F28B6D" : "3px solid transparent",
                    "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.06)" },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Icon
                      size={20}
                      color={isActive ? "#F28B6D" : "#AEB7C7"}
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
                      backgroundColor: isActive ? "rgba(242, 139, 109, 0.16)" : "transparent",
                      borderLeft: isActive ? "3px solid" : "3px solid transparent",
                      borderColor: isActive ? "#F28B6D" : "transparent",
                      "&:hover": { backgroundColor: isActive ? "rgba(242, 139, 109, 0.22)" : "rgba(255, 255, 255, 0.06)" },
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
                        color={isActive ? "#F28B6D" : "#AEB7C7"}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      sx={{
                        color: isActive ? "#FFFFFF" : "#C7CEDA",
                        fontWeight: isActive ? 600 : 500,
                      }}
                    />
                    {((item.badge && item.badge > 0) ||
                      (item.text === "Messages" && unreadMessages > 0)) && (
                      <Box
                        sx={{
                          position: "absolute",
                          right: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          bgcolor: "#F28B6D",
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
              background: "#171923",
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
              background: "#171923",
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
