import type React from "react";
import { Box, Typography } from "@mui/material";
import type { LucideIcon } from "lucide-react";

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  visual?: React.ReactNode;
  accent?: "coral" | "amber" | "navy";
}

export default function PageHero({
  eyebrow,
  title,
  description,
  icon: Icon,
  action,
  visual,
  accent = "coral",
}: PageHeroProps) {
  return (
    <Box className={`dsp-page-hero dsp-page-hero--${accent}`}>
      <Box className="dsp-page-hero__content">
        {eyebrow && <Typography className="dsp-page-hero__eyebrow">{eyebrow}</Typography>}
        <Typography component="h1" className="dsp-page-hero__title">
          {title}
        </Typography>
        {description && <Typography className="dsp-page-hero__description">{description}</Typography>}
      </Box>
      <Box className="dsp-page-hero__aside">
        {Icon && (
          <Box className="dsp-page-hero__icon" aria-hidden="true">
            <Icon size={24} />
          </Box>
        )}
        {visual}
        {action}
      </Box>
    </Box>
  );
}
