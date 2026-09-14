import { useMemo } from "react";
import { ArrowRight, BookOpen, CalendarDays, CreditCard, MessageCircle, Settings2, UsersRound } from "lucide-react";
import { gql, useQuery } from "@apollo/client";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { InstructorAnalytics, StudentBookingNew } from "../../../types/InstructorAnalytics";
import { GET_INSTRUCTOR_TRANSACTION_STATS } from "../../../graphql/Queries/transactionQueries";
import PageHero from "../../dashboard/PageHero";
import { ErrorState, LoadingState } from "../../dashboard/DashboardStates";
import {
  ActivityItem,
  DashboardStatCard,
  NextLessonCard,
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

function formatDuration(start?: string, end?: string) {
  if (!start || !end) return undefined;
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const minutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
  if (!Number.isFinite(minutes) || minutes <= 0) return undefined;
  return `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""} lesson`;
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

export const InstructorAnalyticsDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(GET_INSTRUCTOR_ANALYTICS, {
    variables: { instructorId: user?.id },
    skip: !user?.id,
    fetchPolicy: "network-only",
  });
  const { data: transactionStatsData, loading: transactionLoading } = useQuery(GET_INSTRUCTOR_TRANSACTION_STATS, {
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

  if (loading) return <LoadingState label="Loading your teaching workspace…" />;
  if (error) return <ErrorState title="Your teaching dashboard is unavailable" description="We couldn’t load your latest teaching activity. Please try again shortly." />;

  return (
    <div className="dsp-overview-page">
      <PageHero
        eyebrow="Instructor workspace"
        title={`Ready for today’s lessons${user?.firstName ? `, ${user.firstName}` : ""}?`}
        description="Stay ahead of your schedule, students, and teaching activity from one focused workspace."
        icon={UsersRound}
        accent="amber"
        action={<Link to="/teacher-dashboard/bookingManagement" className="dsp-overview__hero-action">Manage bookings<ArrowRight size={16} /></Link>}
      />

      <main className="dsp-overview-page__content">
        <div className="dsp-overview__stats-grid" aria-label="Teaching summary">
          <DashboardStatCard label="Active students" value={analytics?.totalStudents ?? 0} helper="Students in your record" icon={UsersRound} tone="coral" onClick={() => navigate("/teacher-dashboard/my-students")} />
          <DashboardStatCard label="Upcoming bookings" value={analytics?.activeBookings ?? 0} helper="Future lessons scheduled" icon={CalendarDays} tone="amber" onClick={() => navigate("/teacher-dashboard/bookingManagement", { state: { focus: "upcoming" } })} />
          <DashboardStatCard label="Lessons given" value={analytics?.totalLessonsGiven ?? 0} helper="Completed lessons" icon={BookOpen} tone="green" onClick={() => navigate("/teacher-dashboard/bookingManagement")} />
          {!transactionLoading && totalReceived !== undefined && <DashboardStatCard label="Total received" value={formatCHF(totalReceived)} helper="Recorded instructor payments" icon={CreditCard} tone="navy" onClick={() => navigate("/teacher-dashboard/transaction-history")} />}
        </div>

        <div className="dsp-overview__primary-grid">
          <OverviewSection title="Next lesson" description="The closest booking in your current teaching schedule.">
            {nextBooking?.slots?.[0] ? (
              <NextLessonCard
                personLabel="Student"
                personName={`${nextBooking.studentId?.firstName || "Student"} ${nextBooking.studentId?.lastName || ""}`.trim()}
                date={formatDate(nextBooking.slots[0].date)}
                time={`Switzerland ${formatTime(nextBooking.slots[0].startTime)}–${formatTime(nextBooking.slots[0].endTime)}`}
                duration={formatDuration(nextBooking.slots[0].startTime, nextBooking.slots[0].endTime) || "Lesson time is shown in Switzerland time"}
                status={nextBooking.slots[0].status || nextBooking.status || "Booked"}
                statusTone="info"
                actionTo="/teacher-dashboard/bookingManagement"
                actionLabel="View schedule"
                image={nextBooking.studentId?.profileImage}
              />
            ) : (
              <OverviewEmpty title="No next lesson in view" description="Upcoming lessons will appear here when students book from your available schedule." to="/teacher-dashboard/bookingManagement" actionLabel="Open bookings" />
            )}
          </OverviewSection>

          <OverviewSection title="Attention & readiness" description="Signals from your account that may need a next step.">
            {!user?.isProfileComplete ? (
              <div className="dsp-overview__attention-card">
                <span className="dsp-overview__attention-mark">!</span>
                <div><strong>Complete your instructor profile</strong><p>Add the remaining details so students can confidently discover and book you.</p></div>
                <Link to="/teacher-dashboard/settings" className="dsp-overview__action-link">Open profile<ArrowRight size={16} /></Link>
              </div>
            ) : (
              <div className="dsp-overview__ready-card"><span className="dsp-overview__ready-mark">✓</span><div><strong>Your profile is complete</strong><p>Keep your availability and bookings current so students know when you’re ready.</p></div></div>
            )}
            <div className="dsp-overview__metric-row"><span>Attendance rate</span><strong>{analytics?.attendanceRate !== undefined ? `${Math.round(analytics.attendanceRate)}%` : "Not available"}</strong></div>
            <div className="dsp-overview__metric-row"><span>Cancellation rate</span><strong>{analytics?.cancellationRate !== undefined ? `${Math.round(analytics.cancellationRate)}%` : "Not available"}</strong></div>
          </OverviewSection>
        </div>

        <div className="dsp-overview__secondary-grid">
          <OverviewSection title="Teaching schedule" description="A compact view of your latest booking activity.">
            {recentBookings.length ? (
              <div className="dsp-overview__activity-list">
                {recentBookings.slice(0, 5).map((booking) => {
                  const slot = booking.slots?.[0];
                  const studentName = `${booking.studentId?.firstName || "Student"} ${booking.studentId?.lastName || ""}`.trim();
                  return slot ? <ActivityItem key={booking._id} title={studentName} detail={`${formatDate(slot.date)} · Switzerland ${formatTime(slot.startTime)}`} meta={slot.status || booking.status || "Booked"} tone={isUpcomingBooking(booking) ? "coral" : "green"} /> : null;
                })}
              </div>
            ) : (
              <OverviewEmpty title="Your schedule is clear" description="Booking activity will appear here as students reserve lessons with you." to="/teacher-dashboard/bookingManagement" actionLabel="Manage availability" />
            )}
          </OverviewSection>

          <OverviewSection title="Student snapshot" description="Students represented in your recent teaching activity.">
            {recentBookings.length ? (
              <div className="dsp-overview__student-list">
                {recentBookings.slice(0, 3).map((booking) => (
                  <Link to="/teacher-dashboard/my-students" className="dsp-overview__student-row" key={`${booking._id}-student`}>
                    <span className="dsp-overview__student-avatar">{booking.studentId?.firstName?.[0]}{booking.studentId?.lastName?.[0]}</span>
                    <span><strong>{booking.studentId?.firstName} {booking.studentId?.lastName}</strong><small>{booking.studentTotalLessons ?? 0} recorded lessons{booking.studentLocation ? ` · ${booking.studentLocation}` : ""}</small></span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            ) : <OverviewEmpty title="No student snapshot yet" description="Students will appear here after your first booking activity." />}
          </OverviewSection>
        </div>

        <OverviewSection title="Your shortcuts" description="Move quickly to the tools you use most.">
          <div className="dsp-overview__quick-grid">
            <QuickActionCard to="/teacher-dashboard/bookingManagement" label="Manage bookings" description="Review upcoming lessons" icon={CalendarDays} tone="coral" />
            <QuickActionCard to="/teacher-dashboard/my-students" label="View students" description="Open student progress" icon={UsersRound} tone="amber" />
            <QuickActionCard to="/teacher-dashboard/chat" label="Open messages" description="Stay connected with students" icon={MessageCircle} tone="navy" />
            <QuickActionCard to="/teacher-dashboard/settings" label="Update profile" description="Keep your teaching details current" icon={Settings2} tone="green" />
          </div>
        </OverviewSection>
      </main>
    </div>
  );
};
