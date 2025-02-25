import type React from "react"
import { AppBar, Box, IconButton, Menu, MenuItem, Toolbar, Typography } from "@mui/material"
import { ChevronDown, Globe, MenuIcon } from "lucide-react"
import { useState } from "react"

interface NavbarProps {
    handleDrawerToggle: () => void
}

export default function Navbar({ handleDrawerToggle }: NavbarProps) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

    const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
    }

    return (
        <AppBar position="static" elevation={0} sx={{ borderBottom: "1px solid rgba(0, 0, 0, 0.12)", backgroundColor: "#FFFFFF" }}>
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
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Overview
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
    )
}

