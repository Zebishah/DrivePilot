// src/components/Logo.tsx
import type React from "react";
import BrandLogo from "./BrandLogo";

interface LogoProps {
  variant?: "default" | "white";
  size?: "small" | "medium" | "large";
}

const Logo: React.FC<LogoProps> = ({
  variant = "default",
  size = "medium",
}) => {
  return <BrandLogo size={size === "small" ? "sm" : size === "large" ? "lg" : "md"} theme={variant === "white" ? "dark" : "light"} to="/" />;
};

export default Logo;
