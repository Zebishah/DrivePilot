import type React from "react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="dsp-state dsp-state--empty">
      <div className="dsp-state__icon" aria-hidden="true"><Inbox size={24} /></div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className="dsp-state__action">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading your workspace…" }: { label?: string }) {
  return (
    <div className="dsp-state dsp-state--loading" role="status" aria-live="polite">
      <Loader2 className="dsp-state__spinner" size={24} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ title = "We couldn’t load this section", description }: { title?: string; description?: string }) {
  return (
    <div className="dsp-state dsp-state--error" role="alert">
      <div className="dsp-state__icon" aria-hidden="true"><AlertTriangle size={24} /></div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  );
}
