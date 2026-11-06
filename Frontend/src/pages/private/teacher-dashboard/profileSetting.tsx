import { useState } from "react";
import { Avatar, Button, Skeleton } from "@mui/material";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Edit3,
  FileText,
  Languages,
  Mail,
  MapPin,
  Phone,
  Settings2,
  Star,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useQuery } from "@apollo/client";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { GET_TEACHER_PROFILE } from "../../../graphql/mutations/profile";

type TeacherProfile = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  experience?: string | null;
  description?: string | null;
  profileImage?: string | null;
  dateOfBirth?: string | null;
  languagePreference?: string[] | null;
  reviewRating?: number | null;
  reviewsCount?: number | null;
  documents?: Array<{ status?: string | null }> | null;
  isActive?: boolean | null;
};

type ProfileField = { label: string; value: string; icon: LucideIcon; missing?: boolean };

const hasValue = (value: unknown) => {
  if (Array.isArray(value)) return value.some((item) => Boolean(String(item || "").trim()));
  return Boolean(String(value || "").trim());
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};

const initialsFor = (firstName?: string | null, lastName?: string | null) =>
  [firstName, lastName].filter(Boolean).map((name) => name!.trim().charAt(0).toUpperCase()).join("") || "I";

function MissingValue() {
  return <span className="dsp-profile-value dsp-profile-value--missing">Not added yet</span>;
}

function ProfileFieldItem({ label, value, icon: Icon, missing }: ProfileField) {
  return (
    <div className="dsp-profile-field">
      <div className="dsp-profile-field__label"><Icon size={15} strokeWidth={2} /><span>{label}</span></div>
      {missing ? <MissingValue /> : <span className="dsp-profile-value">{value}</span>}
    </div>
  );
}

function ProfileCardSkeleton() {
  return (
    <div className="dsp-profile-skeleton-grid" aria-label="Loading instructor profile">
      <section className="dsp-profile-card dsp-profile-card--identity"><Skeleton variant="circular" width={112} height={112} /><Skeleton variant="text" width="58%" height={34} /><Skeleton variant="text" width="40%" /><Skeleton variant="rounded" width="82%" height={58} /></section>
      <section className="dsp-profile-card dsp-profile-skeleton-details"><Skeleton variant="text" width="35%" height={34} /><div className="dsp-profile-skeleton-fields">{Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} variant="rounded" height={54} />)}</div></section>
      <section className="dsp-profile-card"><Skeleton variant="text" width="42%" height={30} /><Skeleton variant="rounded" height={92} /></section>
      <section className="dsp-profile-card"><Skeleton variant="text" width="35%" height={30} /><Skeleton variant="rounded" height={92} /></section>
    </div>
  );
}

function QuickAction({ to, title, description, icon: Icon, tone }: { to: string; title: string; description: string; icon: LucideIcon; tone: string }) {
  return (
    <Link className="dsp-profile-action" to={to}>
      <span className={`dsp-profile-action__icon ${tone}`}><Icon size={18} strokeWidth={2} /></span>
      <span className="dsp-profile-action__copy"><strong>{title}</strong><small>{description}</small></span>
      <ArrowUpRight size={16} aria-hidden="true" />
    </Link>
  );
}

export default function ProfileSetting() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error, data, refetch } = useQuery(GET_TEACHER_PROFILE);
  const [avatarFailed, setAvatarFailed] = useState(false);

  if (location.pathname.includes("edit-profile")) return <Outlet />;

  if (loading) {
    return <main className="dsp-instructor-page dsp-instructor-profile-setting-page"><ProfilePageHeader onEdit={() => undefined} loading /><ProfileCardSkeleton /></main>;
  }

  if (error || !data?.teacherProfile) {
    return (
      <main className="dsp-instructor-page dsp-instructor-profile-setting-page dsp-profile-error-state">
        <div className="dsp-profile-error-state__icon"><UserRound size={24} /></div>
        <h1>We couldn&apos;t load your profile.</h1>
        <p>Your instructor details are temporarily unavailable. Please try again.</p>
        <Button className="dsp-gradient-button" variant="contained" onClick={() => void refetch()}>Try again</Button>
      </main>
    );
  }

  const teacherData = data.teacherProfile as TeacherProfile;
  const firstName = teacherData.firstName?.trim() || "";
  const lastName = teacherData.lastName?.trim() || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Instructor";
  const languages = (teacherData.languagePreference || []).filter(Boolean).join(", ");
  const introduction = teacherData.description?.trim() || "";
  const documents = teacherData.documents || [];
  const rating = Number(teacherData.reviewRating || 0);
  const reviews = Number(teacherData.reviewsCount || 0);
  const documentStatuses = documents.map((document) => String(document.status || "").toLowerCase()).filter(Boolean);
  const documentReadiness = documents.length === 0
    ? "Not added"
    : documentStatuses.length === documents.length && documentStatuses.every((status) => ["approved", "verified", "accepted"].includes(status))
      ? "Approved"
      : documentStatuses.length > 0
        ? "In review"
        : "Uploaded";

  const completion = (() => {
    const fields = [
      { label: "Full name", present: hasValue(firstName) && hasValue(lastName) },
      { label: "Location", present: hasValue(teacherData.location) },
      { label: "Language preferences", present: hasValue(teacherData.languagePreference) },
      { label: "Date of birth", present: hasValue(teacherData.dateOfBirth) },
      { label: "Phone number", present: hasValue(teacherData.phone) },
      { label: "Email address", present: hasValue(teacherData.email) },
      { label: "Introduction", present: hasValue(teacherData.description) },
      { label: "Experience", present: hasValue(teacherData.experience) },
      { label: "Profile photo", present: hasValue(teacherData.profileImage) },
    ];
    const completed = fields.filter((field) => field.present).length;
    return { percent: Math.round((completed / fields.length) * 100), missing: fields.filter((field) => !field.present).map((field) => field.label) };
  })();

  const personalFields: ProfileField[] = [
    { label: "Full name", value: fullName, icon: UserRound, missing: !hasValue(firstName) || !hasValue(lastName) },
    { label: "Location", value: teacherData.location || "", icon: MapPin, missing: !hasValue(teacherData.location) },
    { label: "Language preferences", value: languages, icon: Languages, missing: !hasValue(teacherData.languagePreference) },
    { label: "Date of birth", value: formatDate(teacherData.dateOfBirth), icon: CalendarDays, missing: !hasValue(teacherData.dateOfBirth) },
    { label: "Phone number", value: teacherData.phone || "", icon: Phone, missing: !hasValue(teacherData.phone) },
    { label: "Email address", value: teacherData.email || "", icon: Mail, missing: !hasValue(teacherData.email) },
  ];
  const professionalFields: ProfileField[] = [{ label: "Experience", value: teacherData.experience || "", icon: Star, missing: !hasValue(teacherData.experience) }];
  const handleEditProfile = () => navigate("/teacher-dashboard/settings/edit-profile");

  return (
    <main className="dsp-instructor-page dsp-instructor-profile-setting-page">
      <ProfilePageHeader onEdit={handleEditProfile} />

      <div className="dsp-profile-layout">
        <section className="dsp-profile-card dsp-profile-card--identity">
          <div className="dsp-profile-identity__topline"><span className="dsp-profile-eyebrow">Instructor identity</span><span className={`dsp-profile-status ${completion.percent === 100 ? "is-complete" : ""}`}><CheckCircle2 size={14} />{completion.percent === 100 ? "Profile ready" : `${completion.percent}% complete`}</span></div>
          <div className="dsp-profile-avatar-ring"><Avatar src={avatarFailed ? undefined : teacherData.profileImage || undefined} alt={fullName} onError={() => setAvatarFailed(true)} sx={{ width: 112, height: 112, fontSize: "2rem", fontWeight: 800, color: "var(--ws-primary-ink, #6D28D9)", bgcolor: "var(--ws-surface, #F3E8FF)" }}>{initialsFor(firstName, lastName)}</Avatar></div>
          <h2>{fullName}</h2>
          <div className="dsp-profile-identity__location"><MapPin size={16} /><span>{teacherData.location || "Location not added yet"}</span></div>
          <span className="dsp-profile-role">Instructor</span>
          <div className="dsp-profile-rating">{reviews > 0 ? <><Star size={15} fill="currentColor" />{rating.toFixed(1)} · {reviews} review{reviews === 1 ? "" : "s"}</> : <><Star size={15} />No reviews yet</>}</div>
          <p className={`dsp-profile-introduction ${!introduction ? "is-muted" : ""}`}>{introduction || "No introduction added yet"}</p>
          <Link className="dsp-profile-inline-link" to="/teacher-dashboard/settings/edit-profile"><Edit3 size={14} />Edit profile</Link>
        </section>

        <section className="dsp-profile-card dsp-profile-card--details">
          <div className="dsp-profile-card__header"><div><span className="dsp-profile-eyebrow">Personal & professional</span><h2>Profile information</h2><p>Keep the details students see before they book a lesson.</p></div><span className="dsp-profile-card__header-icon"><UserRound size={19} /></span></div>
          <div className="dsp-profile-info-group"><h3>Personal information</h3><div className="dsp-profile-fields">{personalFields.map((field) => <ProfileFieldItem key={field.label} {...field} />)}</div></div>
          <div className="dsp-profile-info-group dsp-profile-info-group--professional"><h3>Professional information</h3><div className="dsp-profile-fields">{professionalFields.map((field) => <ProfileFieldItem key={field.label} {...field} />)}</div></div>
        </section>

        <section className="dsp-profile-card dsp-profile-card--completeness">
          <div className="dsp-profile-card__header"><div><span className="dsp-profile-eyebrow">Instructor readiness</span><h2>Profile completeness</h2></div><span className="dsp-profile-percentage">{completion.percent}%</span></div>
          <div className="dsp-profile-progress" role="progressbar" aria-label="Profile completion" aria-valuenow={completion.percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${completion.percent}%` }} /></div>
          <p className="dsp-profile-card__helper">Complete your profile so students can understand your teaching offer with confidence.</p>
          {completion.missing.length > 0 ? <div className="dsp-profile-missing"><strong>Still to add</strong><div>{completion.missing.slice(0, 4).map((item) => <span key={item}>{item}</span>)}</div>{completion.missing.length > 4 && <small>+{completion.missing.length - 4} more</small>}</div> : <div className="dsp-profile-ready"><CheckCircle2 size={17} />Your profile is complete.</div>}
          <div className="dsp-instructor-readiness"><div><span>Documents</span><strong>{documentReadiness}</strong></div><div><span>Account</span><strong>{teacherData.isActive == null ? "Not available" : teacherData.isActive ? "Active" : "Inactive"}</strong></div></div>
        </section>

        <section className="dsp-profile-card dsp-profile-card--about">
          <div className="dsp-profile-card__header"><div><span className="dsp-profile-eyebrow">Your teaching story</span><h2>About me</h2><p>Give students a clear sense of your experience and teaching style.</p></div><span className="dsp-profile-card__header-icon dsp-profile-card__header-icon--pink"><Edit3 size={18} /></span></div>
          <p className={`dsp-profile-about-copy ${!introduction ? "is-muted" : ""}`}>{introduction || "No introduction added yet."}</p>
          <Link className="dsp-profile-outline-link" to="/teacher-dashboard/settings/edit-profile">{introduction ? "Edit introduction" : "Add introduction"}<ArrowUpRight size={15} /></Link>
        </section>

        <section className="dsp-profile-card dsp-profile-card--summary">
          <div className="dsp-profile-card__header"><div><span className="dsp-profile-eyebrow">Contact & preferences</span><h2>Stay connected</h2><p>Keep the details students use to understand and contact you current.</p></div><span className="dsp-profile-card__header-icon dsp-profile-card__header-icon--blue"><Mail size={18} /></span></div>
          <div className="dsp-profile-summary-grid"><div><span>Phone</span><strong>{teacherData.phone || "Not added yet"}</strong></div><div><span>Email</span><strong>{teacherData.email || "Not added yet"}</strong></div><div><span>Languages</span><strong>{languages || "Not added yet"}</strong></div></div>
        </section>

        <section className="dsp-profile-card dsp-profile-card--actions">
          <div className="dsp-profile-card__header"><div><span className="dsp-profile-eyebrow">Manage your workspace</span><h2>Quick actions</h2><p>Jump directly to the tools that keep your teaching profile ready.</p></div><span className="dsp-profile-card__header-icon dsp-profile-card__header-icon--green"><Settings2 size={18} /></span></div>
          <div className="dsp-profile-actions-grid">
            <QuickAction to="/teacher-dashboard/settings/edit-profile" title="Edit profile" description="Update your public details" icon={Edit3} tone="is-violet" />
            <QuickAction to="/teacher-dashboard/availability" title="Manage availability" description="Keep your calendar current" icon={CalendarDays} tone="is-blue" />
            <QuickAction to="/teacher-dashboard/documents" title="Manage documents" description="Review profile requirements" icon={FileText} tone="is-pink" />
            <QuickAction to="/teacher-dashboard/tariff-management" title="Manage tariffs" description="Set lesson prices and packages" icon={CreditCard} tone="is-green" />
          </div>
        </section>
      </div>
    </main>
  );
}

function ProfilePageHeader({ onEdit, loading = false }: { onEdit: () => void; loading?: boolean }) {
  return (
    <header className="dsp-profile-page-header"><div><span className="dsp-profile-eyebrow">Instructor workspace</span><h1>Profile setting</h1><p>Keep your teaching profile current and ready for your next student.</p></div><Button className="dsp-gradient-button" variant="contained" startIcon={<Edit3 size={17} />} onClick={onEdit} disabled={loading}>Edit profile</Button></header>
  );
}
