import type React from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

interface DashboardBackLinkProps {
  to?: string;
  label?: string;
  onClick?: () => void;
  className?: string;
}

/** Compact detail-page navigation used across dashboard workflows. */
export default function DashboardBackLink({
  to,
  label = "Back",
  onClick,
  className = "",
}: DashboardBackLinkProps) {
  const navigate = useNavigate();
  const classes = `dsp-dashboard-back-link ${className}`.trim();
  const content = <><ArrowLeft size={16} aria-hidden="true" /><span>{label}</span></>;

  if (to) {
    return <Link to={to} className={classes}>{content}</Link>;
  }

  return (
    <button type="button" className={classes} onClick={onClick || (() => navigate(-1))}>
      {content}
    </button>
  );
}

export type { DashboardBackLinkProps };
