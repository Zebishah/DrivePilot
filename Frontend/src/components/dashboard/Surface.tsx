import type React from "react";
import { Box } from "@mui/material";

interface SurfaceProps {
  children: React.ReactNode;
  className?: string;
  accent?: "coral" | "amber" | "neutral";
}

export function Surface({ children, className = "", accent = "neutral" }: SurfaceProps) {
  return (
    <Box className={`dsp-surface dsp-surface--${accent} ${className}`.trim()}>
      {children}
    </Box>
  );
}

export function PageSection({ children, className = "" }: Omit<SurfaceProps, "accent">) {
  return <section className={`dsp-page-section ${className}`.trim()}>{children}</section>;
}
