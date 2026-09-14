import type React from "react";
import { ArrowUpRight, CalendarDays, Clock3, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";

type WidgetTone = "coral" | "amber" | "green" | "navy";

const toneClass = (tone: WidgetTone) => `dsp-overview__tone dsp-overview__tone--${tone}`;

export function DashboardStatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "coral",
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  helper?: string;
  icon: LucideIcon;
  tone?: WidgetTone;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className={`dsp-overview__stat-icon ${toneClass(tone)}`} aria-hidden="true">
        <Icon size={20} />
      </span>
      <span className="dsp-overview__stat-copy">
        <span className="dsp-overview__stat-label">{label}</span>
        <strong className="dsp-overview__stat-value">{value}</strong>
        {helper && <span className="dsp-overview__stat-helper">{helper}</span>}
      </span>
      {onClick && <ArrowUpRight className="dsp-overview__stat-arrow" size={18} aria-hidden="true" />}
    </>
  );

  return onClick ? (
    <button type="button" className={`dsp-overview__stat dsp-overview__stat--${tone} dsp-overview__stat--interactive`} onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className={`dsp-overview__stat dsp-overview__stat--${tone}`}>{content}</div>
  );
}

export function QuickActionCard({
  to,
  label,
  description,
  icon: Icon,
  tone = "coral",
}: {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tone?: WidgetTone;
}) {
  return (
    <Link to={to} className={`dsp-overview__quick-action dsp-overview__quick-action--${tone}`}>
      <span className={`dsp-overview__quick-icon ${toneClass(tone)}`} aria-hidden="true">
        <Icon size={18} />
      </span>
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <ArrowUpRight size={16} aria-hidden="true" />
    </Link>
  );
}

export function OverviewSection({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`dsp-overview__section ${className}`.trim()}>
      <div className="dsp-overview__section-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function NextLessonCard({
  personLabel,
  personName,
  date,
  time,
  secondaryTime,
  duration,
  status,
  statusTone = "info",
  actionTo,
  actionLabel = "View details",
  image,
}: {
  personLabel: string;
  personName: string;
  date: string;
  time: string;
  secondaryTime?: string;
  duration?: string;
  status?: string;
  statusTone?: "success" | "warning" | "danger" | "info" | "neutral";
  actionTo: string;
  actionLabel?: string;
  image?: string;
}) {
  const initials = personName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="dsp-overview__next-lesson">
      <div className="dsp-overview__next-main">
        <div className="dsp-overview__next-avatar">
          {image ? <img src={image} alt="" /> : <span>{initials}</span>}
        </div>
        <div className="dsp-overview__next-person">
          <span className="dsp-overview__kicker">{personLabel}</span>
          <h3>{personName}</h3>
          {status && <StatusBadge tone={statusTone}>{status}</StatusBadge>}
        </div>
      </div>
      <div className="dsp-overview__next-details">
        <div><CalendarDays size={17} aria-hidden="true" /><span>{date}</span></div>
        <div><Clock3 size={17} aria-hidden="true" /><span>{time}{secondaryTime && ` · ${secondaryTime}`}</span></div>
        {duration && <small>{duration}</small>}
      </div>
      <Link to={actionTo} className="dsp-overview__action-link">{actionLabel}<ArrowUpRight size={16} /></Link>
    </div>
  );
}

export function ActivityItem({
  title,
  detail,
  meta,
  tone = "navy",
  avatar,
  status,
}: {
  title: string;
  detail: string;
  meta: string;
  tone?: WidgetTone;
  avatar?: string;
  status?: string;
}) {
  const initials = title
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="dsp-overview__activity-item">
      <span className={avatar ? "dsp-overview__activity-avatar" : `dsp-overview__activity-avatar dsp-overview__activity-avatar--${tone}`} aria-hidden={avatar ? undefined : true}>
        {avatar ? <img src={avatar} alt="" /> : initials}
      </span>
      <div><strong>{title}</strong><span>{detail}</span></div>
      <span className="dsp-overview__activity-meta">
        {status && <StatusBadge tone={tone === "green" ? "success" : "info"}>{status}</StatusBadge>}
        <time>{meta}</time>
      </span>
    </div>
  );
}

export function OverviewEmpty({
  title,
  description,
  to,
  actionLabel,
}: {
  title: string;
  description: string;
  to?: string;
  actionLabel?: string;
}) {
  return (
    <div className="dsp-overview__empty">
      <span className="dsp-overview__empty-icon" aria-hidden="true"><UserRound size={24} /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {to && actionLabel && <Link to={to} className="dsp-overview__action-link">{actionLabel}<ArrowUpRight size={16} /></Link>}
    </div>
  );
}
