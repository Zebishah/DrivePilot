import { useState } from "react";
import { Avatar, Button, Skeleton } from "@mui/material";
import {
  ArrowUpRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Edit3,
  Languages,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Settings2,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useQuery } from "@apollo/client";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { GET_STUDENT_PROFILE } from "../../../graphql/mutations/studentProfile";
import LessonBookingHistory from "./StudentBookings";
import { useAuth } from "../../../context/AuthContext";

type StudentProfile = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  description?: string | null;
  homeAddress?: string | null;
  zipCode?: string | null;
  fatherName?: string | null;
  dateOfBirth?: string | null;
  profileImage?: string | null;
  languagePreference?: string[] | null;
  documents?: Array<{ documentType?: string | null; documentUrl?: string | null }> | null;
};

type ProfileField = {
  label: string;
  value: string;
  icon: LucideIcon;
  missing?: boolean;
};

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
  [firstName, lastName]
    .filter(Boolean)
    .map((name) => name!.trim().charAt(0).toUpperCase())
    .join("") || "S";

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
    <div className="dsp-profile-skeleton-grid" aria-label="Loading profile">
      <section className="dsp-profile-card dsp-profile-card--identity">
        <Skeleton variant="circular" width={112} height={112} />
        <Skeleton variant="text" width="55%" height={34} />
        <Skeleton variant="text" width="38%" />
        <Skeleton variant="rounded" width="82%" height={58} />
      </section>
      <section className="dsp-profile-card dsp-profile-skeleton-details">
        <Skeleton variant="text" width="34%" height={34} />
        <div className="dsp-profile-skeleton-fields">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} variant="rounded" height={54} />)}
        </div>
      </section>
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

export default function StudentProfileSetting() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { loading, error, data, refetch } = useQuery(GET_STUDENT_PROFILE);
  const [avatarFailed, setAvatarFailed] = useState(false);

  if (location.pathname.includes("edit-profile")) return <Outlet />;

  if (loading) {
    return <main className="dsp-student-page dsp-student-profile-page"><ProfilePageHeader onEdit={() => undefined} loading /><ProfileCardSkeleton /></main>;
  }

  if (error || !data?.studentProfile) {
    return (
      <main className="dsp-student-page dsp-student-profile-page dsp-profile-error-state">
        <div className="dsp-profile-error-state__icon"><UserRound size={24} /></div>
        <h1>We couldn&apos;t load your profile.</h1>
        <p>Your profile details are temporarily unavailable. Please try again.</p>
        <Button className="dsp-gradient-button" variant="contained" onClick={() => void refetch()}>Try again</Button>
      </main>
    );
  }

  const studentData = data.studentProfile as StudentProfile;
  const firstName = studentData.firstName?.trim() || "";
  const lastName = studentData.lastName?.trim() || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Student";
  const languages = (studentData.languagePreference || []).filter(Boolean).join(", ");
  const introduction = studentData.description?.trim() || "";
  const documents = studentData.documents || [];

  const completion = (() => {
    const fields = [
      { label: "Full name", present: hasValue(firstName) && hasValue(lastName) },
      { label: "Location", present: hasValue(studentData.location) },
      { label: "Language preferences", present: hasValue(studentData.languagePreference) },
      { label: "Date of birth", present: hasValue(studentData.dateOfBirth) },
      { label: "Phone number", present: hasValue(studentData.phone) },
      { label: "Email address", present: hasValue(studentData.email) },
      { label: "Introduction", present: hasValue(studentData.description) },
      { label: "Profile photo", present: hasValue(studentData.profileImage) },
    ];
    const completed = fields.filter((field) => field.present).length;
    return { percent: Math.round((completed / fields.length) * 100), missing: fields.filter((field) => !field.present).map((field) => field.label) };
  })();

  const profileFields: ProfileField[] = [
    { label: "Full name", value: fullName, icon: UserRound, missing: !hasValue(firstName) || !hasValue(lastName) },
    { label: "Location", value: studentData.location || "", icon: MapPin, missing: !hasValue(studentData.location) },
    { label: "Language preferences", value: languages, icon: Languages, missing: !hasValue(studentData.languagePreference) },
    { label: "Date of birth", value: formatDate(studentData.dateOfBirth), icon: CalendarDays, missing: !hasValue(studentData.dateOfBirth) },
    { label: "Phone number", value: studentData.phone || "", icon: Phone, missing: !hasValue(studentData.phone) },
    { label: "Email address", value: studentData.email || "", icon: Mail, missing: !hasValue(studentData.email) },
    { label: "Father name", value: studentData.fatherName || "", icon: UserRound, missing: !hasValue(studentData.fatherName) },
  ];

  const handleEditProfile = () => navigate("/student-dashboard/settings/edit-profile");

  return (
    <main className="dsp-student-page dsp-student-profile-page">
      <ProfilePageHeader onEdit={handleEditProfile} />

      <div className="dsp-profile-layout">
        <section className="dsp-profile-card dsp-profile-card--identity">
          <div className="dsp-profile-identity__topline"><span className="dsp-profile-eyebrow">Your identity</span><span className={`dsp-profile-status ${completion.percent === 100 ? "is-complete" : ""}`}><CheckCircle2 size={14} />{completion.percent === 100 ? "Profile ready" : `${completion.percent}% complete`}</span></div>
          <div className="dsp-profile-avatar-ring">
            <Avatar
              src={avatarFailed ? undefined : studentData.profileImage || undefined}
              alt={fullName}
              onError={() => setAvatarFailed(true)}
              sx={{ width: 112, height: 112, fontSize: "2rem", fontWeight: 800, color: "var(--ws-primary-ink, #6D28D9)", bgcolor: "var(--ws-surface, #F3E8FF)" }}
            >
              {initialsFor(firstName, lastName)}
            </Avatar>
          </div>
          <h2>{fullName}</h2>
          <div className="dsp-profile-identity__location"><MapPin size={16} /><span>{studentData.location || "Location not added yet"}</span></div>
          <span className="dsp-profile-role">Student</span>
          <p className={`dsp-profile-introduction ${!introduction ? "is-muted" : ""}`}>{introduction || "No introduction added yet"}</p>
          <Link className="dsp-profile-inline-link" to="/student-dashboard/settings/edit-profile"><Edit3 size={14} />Edit profile</Link>
        </section>

        <section className="dsp-profile-card dsp-profile-card--details">
          <div className="dsp-profile-card__header"><div><span className="dsp-profile-eyebrow">Personal details</span><h2>Personal information</h2><p>Keep the details used for your lessons and communication current.</p></div><span className="dsp-profile-card__header-icon"><UserRound size={19} /></span></div>
          <div className="dsp-profile-fields">{profileFields.map((field) => <ProfileFieldItem key={field.label} {...field} />)}</div>
        </section>

        <section className="dsp-profile-card dsp-profile-card--completeness">
          <div className="dsp-profile-card__header"><div><span className="dsp-profile-eyebrow">Account readiness</span><h2>Profile completeness</h2></div><span className="dsp-profile-percentage">{completion.percent}%</span></div>
          <div className="dsp-profile-progress" role="progressbar" aria-label="Profile completion" aria-valuenow={completion.percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${completion.percent}%` }} /></div>
          <p className="dsp-profile-card__helper">Complete your profile to make bookings and communication smoother.</p>
          {completion.missing.length > 0 ? <div className="dsp-profile-missing"><strong>Still to add</strong><div>{completion.missing.slice(0, 4).map((item) => <span key={item}>{item}</span>)}</div>{completion.missing.length > 4 && <small>+{completion.missing.length - 4} more</small>}</div> : <div className="dsp-profile-ready"><CheckCircle2 size={17} />Your profile is complete.</div>}
        </section>

        <section className="dsp-profile-card dsp-profile-card--about">
          <div className="dsp-profile-card__header"><div><span className="dsp-profile-eyebrow">Your story</span><h2>About me</h2><p>A short introduction helps instructors get to know you.</p></div><span className="dsp-profile-card__header-icon dsp-profile-card__header-icon--pink"><Edit3 size={18} /></span></div>
          <p className={`dsp-profile-about-copy ${!introduction ? "is-muted" : ""}`}>{introduction || "Tell instructors a little about yourself, your goals, or what you want to learn."}</p>
          <Link className="dsp-profile-outline-link" to="/student-dashboard/settings/edit-profile">{introduction ? "Edit introduction" : "Add introduction"}<ArrowUpRight size={15} /></Link>
        </section>

        <section className="dsp-profile-card dsp-profile-card--summary">
          <div className="dsp-profile-card__header"><div><span className="dsp-profile-eyebrow">Account snapshot</span><h2>Your account</h2><p>A quick view of what is currently on your profile.</p></div><span className="dsp-profile-card__header-icon dsp-profile-card__header-icon--blue"><CreditCard size={18} /></span></div>
          <div className="dsp-profile-summary-grid"><div><span>Account type</span><strong>Student</strong></div><div><span>Documents</span><strong>{documents.length}</strong></div><div><span>Profile status</span><strong>{completion.percent === 100 ? "Ready" : "In progress"}</strong></div></div>
        </section>

        <section className="dsp-profile-card dsp-profile-card--actions">
          <div className="dsp-profile-card__header"><div><span className="dsp-profile-eyebrow">Keep moving</span><h2>Quick actions</h2><p>Jump back into the parts of your learning journey you use most.</p></div><span className="dsp-profile-card__header-icon dsp-profile-card__header-icon--green"><Settings2 size={18} /></span></div>
          <div className="dsp-profile-actions-grid">
            <QuickAction to="/student-dashboard/search" title="Find an instructor" description="Explore verified profiles" icon={Search} tone="is-violet" />
            <QuickAction to="/student-dashboard/book" title="Booked lessons" description="Review your schedule" icon={BookOpenCheck} tone="is-blue" />
            <QuickAction to="/student-dashboard/chat" title="Open messages" description="Talk with your instructor" icon={MessageCircle} tone="is-pink" />
            <QuickAction to="/student-dashboard/payment-history" title="Payment history" description="Review your payments" icon={CreditCard} tone="is-green" />
          </div>
        </section>
      </div>

      {user?.id && <LessonBookingHistory studentId={user.id} />}
    </main>
  );
}

function ProfilePageHeader({ onEdit, loading = false }: { onEdit: () => void; loading?: boolean }) {
  return (
    <header className="dsp-profile-page-header">
      <div><span className="dsp-profile-eyebrow">Student workspace</span><h1>Profile setting</h1><p>Keep your personal information current and ready for your next lesson.</p></div>
      <Button className="dsp-gradient-button" variant="contained" startIcon={<Edit3 size={17} />} onClick={onEdit} disabled={loading}>Edit profile</Button>
    </header>
  );
}
