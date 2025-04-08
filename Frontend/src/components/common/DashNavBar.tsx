import type React from "react";
import {
  AppBar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import { ChevronDown, Globe, MenuIcon } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";

// Define the MenuItem type (same as in Sidebar)
interface MenuItem {
  text: string;
  icon: React.ElementType;
  path: string;
}

interface NavbarProps {
  handleDrawerToggle: () => void;
  menuItems: MenuItem[]; // Add menuItems as a prop
}

export default function Navbar({ handleDrawerToggle, menuItems }: NavbarProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const location = useLocation();

  // Find the menu item that matches the current route or its parent route
  const currentMenuItem = menuItems?.find((item) =>
    location.pathname.startsWith(item.path)
  );
  const pageTitle = currentMenuItem ? currentMenuItem.text : "Dashboard"; // Fallback title

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
        backgroundColor: "#FFFFFF",
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ mr: 2, display: { sm: "none" } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography
          variant="h6"
          component="div"
          sx={{ flexGrow: 1, color: "#000" }}
        >
          {pageTitle} {/* Dynamically set the header text */}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Globe size={20} />
          <Typography>English</Typography>
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
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            keepMounted
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={handleClose}>English</MenuItem>
            <MenuItem onClick={handleClose}>French</MenuItem>
            <MenuItem onClick={handleClose}>German</MenuItem>
            <MenuItem onClick={handleClose}>Italian</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
