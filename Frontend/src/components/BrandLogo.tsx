import type React from "react";
import { Link } from "react-router-dom";

export interface BrandLogoProps {
  variant?: "full" | "mark";
  size?: "sm" | "md" | "lg";
  theme?: "light" | "dark";
  to?: string;
  className?: string;
  "aria-label"?: string;
}

const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = "full",
  size = "md",
  theme = "light",
  to,
  className = "",
  "aria-label": ariaLabel = "Drive Pilot",
}) => {
  const content = (
    <span className={`dsp-brand dsp-brand--${variant} dsp-brand--${size} dsp-brand--${theme} ${className}`.trim()}>
      <svg className="dsp-brand__mark" viewBox="0 0 48 48" role="img" aria-hidden="true">
        <rect x="2" y="2" width="44" height="44" rx="14" className="dsp-brand__mark-surface" />
        <path d="M12 32h15c5 0 9-4 9-9V13" className="dsp-brand__route" />
        <path d="M15 32V18h13" className="dsp-brand__route dsp-brand__route--secondary" />
        <circle cx="36" cy="13" r="4" className="dsp-brand__waypoint" />
      </svg>
      {variant === "full" && <span className="dsp-brand__wordmark">Drive Pilot</span>}
    </span>
  );

  if (!to) return content;

  return <Link className="dsp-brand__link" to={to} aria-label={ariaLabel}>{content}</Link>;
};

export default BrandLogo;
