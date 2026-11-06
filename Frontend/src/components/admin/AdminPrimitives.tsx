/* eslint-disable react-refresh/only-export-components */
import type React from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, Inbox, Loader2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

export type AdminTone = "violet" | "cyan" | "green" | "amber" | "rose" | "slate";

export function AdminPage({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <main className={`dsp-admin-page ${className}`.trim()}>{children}</main>;
}

export function AdminPageHeader({
  title,
  description,
  action,
  eyebrow = "Admin workspace",
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="dsp-admin-page-header">
      <div>
        <span className="dsp-admin-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="dsp-admin-page-header__actions">{action}</div>}
    </header>
  );
}

export function AdminMetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "violet",
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  helper: string;
  icon: LucideIcon;
  tone?: AdminTone;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className={`dsp-admin-metric__icon dsp-admin-metric__icon--${tone}`} aria-hidden="true"><Icon size={21} strokeWidth={2.2} /></span>
      <span className="dsp-admin-metric__copy">
        <span className="dsp-admin-metric__label">{label}</span>
        <strong>{value}</strong>
        <small>{helper}</small>
      </span>
      {onClick && <ArrowUpRight size={17} aria-hidden="true" />}
    </>
  );
  return onClick ? <button type="button" className={`dsp-admin-metric dsp-admin-metric--${tone}`} onClick={onClick}>{content}</button> : <div className={`dsp-admin-metric dsp-admin-metric--${tone}`}>{content}</div>;
}

export function AdminSection({ title, description, action, children, className = "" }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`dsp-admin-section ${className}`.trim()}>
      <div className="dsp-admin-section__heading">
        <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function AdminAvatar({ name, src, size = "md" }: { name: string; src?: string | null; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "A";
  return <span className={`dsp-admin-avatar dsp-admin-avatar--${size}`}>{src ? <img src={src} alt={`${name} profile`} onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}<span aria-hidden={Boolean(src)}>{initials}</span></span>;
}

export function AdminButton({ children, variant = "primary", icon: Icon, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; icon?: LucideIcon }) {
  return <button {...props} className={`dsp-admin-button dsp-admin-button--${variant} ${props.className || ""}`.trim()}>{Icon && <Icon size={16} aria-hidden="true" />}{children}</button>;
}

export function AdminLinkButton({ to, children, variant = "secondary", icon: Icon }: { to: string; children: React.ReactNode; variant?: "primary" | "secondary" | "ghost"; icon?: LucideIcon }) {
  return <Link to={to} className={`dsp-admin-button dsp-admin-button--${variant}`}>{Icon && <Icon size={16} aria-hidden="true" />}{children}</Link>;
}

export function AdminState({ type, title, description, onRetry, action }: { type: "loading" | "empty" | "error"; title: string; description?: string; onRetry?: () => void; action?: React.ReactNode }) {
  if (type === "loading") return <div className="dsp-admin-state" role="status" aria-live="polite"><Loader2 className="dsp-admin-state__spinner" size={24} /><h3>{title}</h3>{description && <p>{description}</p>}</div>;
  if (type === "error") return <div className="dsp-admin-state dsp-admin-state--error" role="alert"><span className="dsp-admin-state__icon">!</span><h3>{title}</h3>{description && <p>{description}</p>}{onRetry && <AdminButton variant="secondary" icon={RefreshCw} onClick={onRetry}>Try again</AdminButton>}</div>;
  return <div className="dsp-admin-state"><span className="dsp-admin-state__icon"><Inbox size={23} /></span><h3>{title}</h3>{description && <p>{description}</p>}{action}</div>;
}

export function AdminStatus({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "success" | "warning" | "danger" | "info" | "neutral" }) {
  return <span className={`dsp-admin-status dsp-admin-status--${tone}`}>{children}</span>;
}

export function formatAdminDate(value?: string | number | null) {
  if (!value) return "—";
  const parsed = new Date(typeof value === "number" || /^\d+$/.test(String(value)) ? Number(value) : String(value));
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
