import { useMemo } from "react";
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, CreditCard, MessageCircle, Settings2, UsersRound } from "lucide-react";
import { gql, useQuery } from "@apollo/client";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { InstructorAnalytics, StudentBookingNew } from "../../../types/InstructorAnalytics";
import { GET_INSTRUCTOR_TRANSACTION_STATS } from "../../../graphql/Queries/transactionQueries";
import PageHero from "../../dashboard/PageHero";
import { ErrorState } from "../../dashboard/DashboardStates";
import {
  ActivityItem,
  DashboardStatCard,
  OverviewEmpty,
  OverviewSection,
  QuickActionCard,
} from "../../dashboard/OverviewWidgets";
import { formatCHF } from "../../../utils/money";

const GET_INSTRUCTOR_ANALYTICS = gql`
  query GetInstructorAnalytics($instructorId: ID!) {
    getInstructorAnalytics(instructorId: $instructorId) {
      totalStudents
      activeBookings
      totalEarnings
      totalLessonsGiven
      lastLessonDate
      averageLessonsPerStudent
      cancellationRate
      attendanceRate
      lastBooking {
        _id
        status
        createdAt
        studentId { _id firstName lastName email profileImage }
        instructorId { firstName lastName email }
        slots { date startTime endTime status }
        studentTotalLessons
        studentLocation
      }
      recentBookings {
        _id
        status
        createdAt
        updatedAt
        studentId { _id firstName lastName email profileImage }
        instructorId { firstName lastName email }
        slots { date startTime endTime status }
        studentTotalLessons
        studentLocation
        studentJoiningDate
        lastAttendanceDate
      }
      instructor { firstName lastName email address }
    }
  }
`;

function formatDate(value?: string) {
  if (!value) return "Date to be confirmed";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(date);
}

function formatTime(value?: string) {
  if (!value) return "Time to be confirmed";
  const [hours, minutes] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes || 0), 0, 0);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit" }).format(date);
}

function bookingTimestamp(booking: StudentBookingNew) {
  const slot = booking.slots?.[0];
  return `${slot?.date || "9999-12-31"}T${slot?.startTime || "23:59"}`;
}

function isUpcomingBooking(booking: StudentBookingNew) {
  const slot = booking.slots?.[0];
  if (!slot || String(slot.status || "").toLowerCase().includes("cancel")) return false;
  return new Date(bookingTimestamp(booking)).valueOf() >= Date.now();
}

function isToday(value?: string) {
  if (!value) return false;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return value.slice(0, 10) === todayKey;
}

function statusTone(status?: string): "success" | "warning" | "danger" | "info" | "neutral" {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("complete")) return "success";
  if (normalized.includes("cancel") || normalized.includes("refund")) return "danger";
  if (normalized.includes("pending") || normalized.includes("requested")) return "warning";
  if (normalized.includes("confirm") || normalized.includes("book")) return "info";
  return "neutral";
}

function getInitials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] || "S"}${lastName?.[0] || ""}`.toUpperCase();
}

function InstructorOverviewSkeleton() {
  return (
    <div className="dsp-instructor-overview__loading" role="status" aria-live="polite" aria-label="Loading instructor overview">
      <span className="dsp-instructor-overview__skeleton dsp-instructor-overview__skeleton--hero" />
      <div className="dsp-instructor-overview__skeleton-grid">
        {[1, 2, 3, 4].map((item) => <span className="dsp-instructor-overview__skeleton dsp-instructor-overview__skeleton--stat" key={item} />)}
      </div>
      <div className="dsp-instructor-overview__skeleton-grid dsp-instructor-overview__skeleton-grid--wide">
        <span className="dsp-instructor-overview__skeleton dsp-instructor-overview__skeleton--panel" />
        <span className="dsp-instructor-overview__skeleton dsp-instructor-overview__skeleton--panel" />
      </div>
    </div>
  );
}

export const InstructorAnalyticsDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery(GET_INSTRUCTOR_ANALYTICS, {
    variables: { instructorId: user?.id },
    skip: !user?.id,
    fetchPolicy: "network-only",
  });
  const { data: transactionStatsData, loading: transactionLoading, error: transactionError } = useQuery(GET_INSTRUCTOR_TRANSACTION_STATS, {
    skip: !user?.id,
    fetchPolicy: "network-only",
  });

  const analytics = data?.getInstructorAnalytics as InstructorAnalytics | undefined;
  const recentBookings = useMemo(
    () => (analytics?.recentBookings ?? []) as StudentBookingNew[],
    [analytics?.recentBookings],
  );
  const upcomingBookings = useMemo(
    () => recentBookings.filter(isUpcomingBooking).sort((a, b) => bookingTimestamp(a).localeCompare(bookingTimestamp(b))),
    [recentBookings],
  );
  const nextBooking = upcomingBookings[0];
  const totalReceived = transactionStatsData?.getInstructorTransactionStats?.totalReceived;
  const todayCount = upcomingBookings.filter((booking) => isToday(booking.slots?.[0]?.date)).length;

  if (loading) return <InstructorOverviewSkeleton />;
  if (error || !analytics) {
    return (
      <div className="dsp-instructor-overview__error-wrap">
        <ErrorState title="Your teaching dashboard is unavailable" description="We couldn’t load your latest teaching activity. Please try again shortly." />
        <button type="button" className="dsp-instructor-overview__retry" onClick={() => refetch()}>Try again</button>
      </div>
    );
  }

  return (
    <div className="dsp-overview-page dsp-instructor-overview">
      <PageHero
        eyebrow="Instructor workspace"
        title={`Good morning${user?.firstName ? `, ${user.firstName}` : ""}`}
        description={`${new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date())} · ${todayCount} lesson${todayCount === 1 ? "" : "s"} today`}
        icon={UsersRound}
        accent="navy"
        visual={
          <div className="dsp-page-hero__visual dsp-instructor-overview__next-panel">
            <span className="dsp-page-hero__visual-label">Next lesson</span>
            {nextBooking?.slots?.[0] ? (
              <>
                <strong>{formatTime(nextBooking.slots[0].startTime)} · {nextBooking.studentId?.firstName || "Student"}</strong>
                <span>{formatDate(nextBooking.slots[0].date)} · {nextBooking.studentLocation || "Location not provided"}</span>
                <div className="dsp-page-hero__visual-meta"><CalendarDays size={14} /> {nextBooking.slots[0].status || nextBooking.status || "Booked"}</div>
              </>
            ) : (
              <>
                <strong>No upcoming lesson</strong>
                <span>Your next confirmed booking will appear here.</span>
                <div className="dsp-page-hero__visual-meta"><CalendarDays size={14} /> Keep your availability current</div>
              </>
            )}
          </div>
        }
        action={
          <div className="dsp-page-hero__actions">
            <Link to="/teacher-dashboard/bookingManagement" className="dsp-overview__hero-action">Manage bookings<ArrowRight size={16} /></Link>
            <Link to="/teacher-dashboard/my-students" className="dsp-overview__hero-action dsp-overview__hero-action--quiet">View students</Link>
          </div>
        }
      />

      <main className="dsp-overview-page__content">
        <div className="dsp-overview__stats-grid" aria-label="Teaching summary">
          <DashboardStatCard label="Active students" value={analytics.totalStudents} helper="Students in your record" icon={UsersRound} tone="purple" onClick={() => navigate("/teacher-dashboard/my-students")} />
          <DashboardStatCard label="Upcoming bookings" value={analytics.activeBookings} helper={`${todayCount} today`} icon={CalendarDays} tone="blue" onClick={() => navigate("/teacher-dashboard/bookingManagement", { state: { focus: "upcoming" } })} />
          <DashboardStatCard label="Lessons given" value={analytics.totalLessonsGiven ?? "—"} helper="Completed lessons" icon={BookOpen} tone="lime" onClick={() => navigate("/teacher-dashboard/bookingManagement")} />
          <DashboardStatCard label="Total received" value={transactionLoading ? "—" : totalReceived !== undefined ? formatCHF(totalReceived) : "Unavailable"} helper={transactionError ? "Payment data unavailable" : "Recorded instructor payments"} icon={CreditCard} tone="pink" onClick={() => navigate("/teacher-dashboard/transaction-history")} />
        </div>

        <div className="dsp-overview__primary-grid">
          <OverviewSection title="Upcoming schedule" description="Your next lessons, sorted by start time." action={<Link to="/teacher-dashboard/bookingManagement" className="dsp-overview__section-link">View all<ArrowRight size={15} /></Link>}>
            {upcomingBookings.length ? (
              <div className="dsp-overview__activity-list">
                {upcomingBookings.slice(0, 5).map((booking) => {
                  const slot = booking.slots?.[0];
                  if (!slot) return null;
                  const studentName = `${booking.studentId?.firstName || "Student"} ${booking.studentId?.lastName || ""}`.trim();
                  return <ActivityItem key={`${booking._id}-${slot.date}-${slot.startTime}`} title={studentName} detail={`${formatTime(slot.startTime)}–${formatTime(slot.endTime)} · ${booking.studentLocation || "Location not provided"}`} meta={formatDate(slot.date)} status={slot.status || booking.status || "Booked"} statusTone={statusTone(slot.status || booking.status)} avatar={booking.studentId?.profileImage} tone="blue" />;
                })}
              </div>
            ) : (
              <OverviewEmpty title="No upcoming lesson" description="Upcoming lessons will appear here when students book from your available schedule." to="/teacher-dashboard/bookingManagement" actionLabel="Manage availability" />
            )}
          </OverviewSection>

          <OverviewSection title="Attention & readiness" description="Useful signals from your account.">
            {!user?.isProfileComplete ? (
              <div className="dsp-overview__attention-card">
                <span className="dsp-overview__attention-mark">!</span>
                <div><strong>Complete your instructor profile</strong><p>Add the remaining details so students can confidently discover and book you.</p><Link to="/teacher-dashboard/settings" className="dsp-overview__action-link">Open profile<ArrowRight size={16} /></Link></div>
              </div>
            ) : (
              <div className="dsp-overview__ready-card"><span className="dsp-overview__ready-mark"><CheckCircle2 size={15} /></span><div><strong>Your profile is complete</strong><p>Keep your availability and bookings current so students know when you’re ready.</p></div></div>
            )}
            <div className="dsp-overview__metric-row"><span>Attendance rate</span><strong>{`${Math.round(analytics.attendanceRate)}%`}</strong></div>
            <div className="dsp-overview__metric-row"><span>Cancellation rate</span><strong>{`${Math.round(analytics.cancellationRate)}%`}</strong></div>
          </OverviewSection>
        </div>

        <div className="dsp-overview__secondary-grid">
          <OverviewSection title="Student snapshot" description="Students represented in your latest active records." action={<Link to="/teacher-dashboard/my-students" className="dsp-overview__section-link">View students<ArrowRight size={15} /></Link>}>
            {recentBookings.length ? (
              <div className="dsp-overview__student-list">
                {recentBookings.slice(0, 4).map((booking) => (
                  <Link to="/teacher-dashboard/my-students" className="dsp-overview__student-row" key={`${booking._id}-student`}>
                    <span className="dsp-overview__student-avatar">
                      {booking.studentId?.profileImage ? <img src={booking.studentId.profileImage} alt="" /> : getInitials(booking.studentId?.firstName, booking.studentId?.lastName)}
                    </span>
                    <span><strong>{booking.studentId?.firstName} {booking.studentId?.lastName}</strong><small>{booking.studentTotalLessons ?? 0} recorded lessons{booking.studentLocation ? ` · ${booking.studentLocation}` : ""}</small></span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            ) : <OverviewEmpty title="No student snapshot yet" description="Students will appear here after your first booking activity." />}
          </OverviewSection>

          <OverviewSection title="Recent teaching activity" description="The latest active lesson record for each student.">
            {recentBookings.length ? (
              <div className="dsp-overview__activity-list">
                {recentBookings.slice(0, 4).map((booking) => {
                  const slot = booking.slots?.[0];
                  if (!slot) return null;
                  const studentName = `${booking.studentId?.firstName || "Student"} ${booking.studentId?.lastName || ""}`.trim();
                  const activityStatus = slot.status || booking.status || "Booked";
                  return <ActivityItem key={`activity-${booking._id}`} title={`${activityStatus} · ${studentName}`} detail={`${formatDate(slot.date)} · ${formatTime(slot.startTime)}${booking.lastAttendanceDate ? " · attendance recorded" : ""}`} meta={formatDate(booking.updatedAt || booking.createdAt)} status={activityStatus} statusTone={statusTone(activityStatus)} tone={String(activityStatus).toLowerCase().includes("complete") ? "lime" : "pink"} />;
                })}
              </div>
            ) : <OverviewEmpty title="No recent activity" description="Booking and lesson activity will appear here as your teaching record grows." />}
          </OverviewSection>
        </div>

        <OverviewSection title="Quick actions" description="Move quickly to the tools you use most.">
          <div className="dsp-overview__quick-grid">
            <QuickActionCard to="/teacher-dashboard/bookingManagement" label="Manage bookings" description="Review upcoming lessons" icon={CalendarDays} tone="purple" />
            <QuickActionCard to="/teacher-dashboard/my-students" label="View students" description="Open student progress" icon={UsersRound} tone="blue" />
            <QuickActionCard to="/teacher-dashboard/chat" label="Open messages" description="Stay connected with students" icon={MessageCircle} tone="pink" />
            <QuickActionCard to="/teacher-dashboard/settings" label="Update profile" description="Keep your teaching details current" icon={Settings2} tone="lime" />
          </div>
        </OverviewSection>
      </main>
    </div>
  );
};
