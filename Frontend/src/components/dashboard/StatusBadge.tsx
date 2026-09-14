import type React from "react";

type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

interface StatusBadgeProps {
  children: React.ReactNode;
  tone?: StatusTone;
}

export default function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return <span className={`dsp-status-badge dsp-status-badge--${tone}`}>{children}</span>;
}
