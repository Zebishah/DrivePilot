// src/components/Logo.tsx
import React from "react";
import { Box, Typography } from "@mui/material";
import { Link } from "react-router-dom";

interface LogoProps {
  variant?: "default" | "white";
  size?: "small" | "medium" | "large";
}

const Logo: React.FC<LogoProps> = ({
  variant = "default",
  size = "medium",
}) => {
  const getSize = () => {
    switch (size) {
      case "small":
        return { width: 120, height: 40 };
      case "large":
        return { width: 200, height: 70 };
      default:
        return { width: 160, height: 55 };
    }
  };

  const { width, height } = getSize();

  return (
    <Box
      component={Link}
      to="/"
      sx={{
        display: "flex",
        alignItems: "center",
        textDecoration: "none",
        width,
      }}
    >
      <Box
        component="img"
        src="/Website-new-logo.png"
        alt="Driving School Platform"
        sx={{
          objectFit: "contain",
          alignSelf: "flex-start",
        }}
      />
    </Box>
  );
};

export default Logo;
