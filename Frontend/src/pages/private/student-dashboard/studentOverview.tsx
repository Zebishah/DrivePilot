import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, CalendarDays, CreditCard, MessageCircle, Search, Settings2, UsersRound } from "lucide-react";
import { useQuery } from "@apollo/client";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { Feedback, SlotLesson } from "../../../types/StudentDashboard";
import {
  GET_STUDENT_DASHBOARD_STATS,
  GET_STUDENT_FEEDBACKS,
  GET_STUDENT_LESSONS,
} from "../../../graphql/Queries/StudentDashboard";
import { GET_STUDENT_TRANSACTION_STATS } from "../../../graphql/Queries/transactionQueries";
import { FeedbackModal } from "../../../components/StudentComponents/StudentDashboard/FeedBackModal";
import PageHero from "../../../components/dashboard/PageHero";
import { ErrorState, LoadingState } from "../../../components/dashboard/DashboardStates";
import {
  ActivityItem,
  DashboardStatCard,
  NextLessonCard,
  OverviewEmpty,
  OverviewSection,
  QuickActionCard,
} from "../../../components/dashboard/OverviewWidgets";
import { formatCHF } from "../../../utils/money";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(date);
}

function formatFeedbackDate(value: string) {
  const numericValue = Number(value);
  const date = Number.isFinite(numericValue) && numericValue > 0
    ? new Date(numericValue)
    : new Date(value);
  return Number.isNaN(date.valueOf()) ? "Recently" : formatDate(date.toISOString());
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

function lessonTimestamp(lesson: SlotLesson) {
  return `${lesson.date}T${lesson.startTime || "00:00"}`;
}

export default function StudentOverview() {
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const studentId = user?.id || "";

  const { data: statsData, loading: statsLoading, error: statsError } = useQuery(GET_STUDENT_DASHBOARD_STATS, {
    variables: { studentId },
    skip: !studentId,
    fetchPolicy: "network-only",
  });
  const { data: lessonsData, loading: lessonsLoading, error: lessonsError } = useQuery(GET_STUDENT_LESSONS, {
    variables: { studentId },
    skip: !studentId,
    fetchPolicy: "network-only",
  });
  const { data: feedbacksData, loading: feedbacksLoading, error: feedbacksError } = useQuery(GET_STUDENT_FEEDBACKS, {
    variables: { studentId },
    skip: !studentId,
    fetchPolicy: "network-only",
  });
  const { data: transactionData } = useQuery(GET_STUDENT_TRANSACTION_STATS, {
    skip: !studentId,
    fetchPolicy: "network-only",
  });

  const stats = statsData?.getStudentDashboardStats;
  const lessonRecords = lessonsData?.getStudentLesson;
  const lessons = useMemo(() => (lessonRecords || []) as SlotLesson[], [lessonRecords]);
  const feedbacks = (feedbacksData?.getStudentFeedbacks || []) as Feedback[];
  const upcomingLessons = useMemo(
    () => lessons.filter((lesson) => !lesson.isCompleted).sort((a, b) => lessonTimestamp(a).localeCompare(lessonTimestamp(b))),
    [lessons],
  );
  const nextLesson = upcomingLessons[0];
  const recentLessons = lessons
    .slice()
    .sort((a, b) => lessonTimestamp(b).localeCompare(lessonTimestamp(a)))
    .slice(0, 4);
  const totalSpent = transactionData?.getStudentTransactionStats?.totalSpent;
  const remainingHours = stats?.remainingHours ?? "0";

  if (statsError) {
    return <ErrorState title="Your learning dashboard is unavailable" description="We couldn’t load your latest learning summary. Please try again shortly." />;
  }

  return (
    <div className="dsp-overview-page">
      <PageHero
        eyebrow="Student workspace"
        title={`Good to see you, ${user?.firstName || "there"}.`}
        description="Keep your next lesson in sight, follow your progress, and stay ready for the road ahead."
        icon={BookOpen}
        accent="coral"
        visual={
          <div className="dsp-page-hero__visual">
            <span className="dsp-page-hero__visual-label">Next on your road</span>
            <strong>{nextLesson ? nextLesson.instructorName || "Driving lesson" : "Your next lesson"}</strong>
            <span>{nextLesson ? `${formatDate(nextLesson.date)} · ${formatTime(nextLesson.startTime)}` : "Choose an instructor to get started"}</span>
            <div className="dsp-page-hero__visual-meta"><CalendarDays size={14} /> {stats?.currentBookings ?? 0} upcoming</div>
          </div>
        }
        action={
          <div className="dsp-page-hero__actions">
            <Link to="/student-dashboard/search" className="dsp-overview__hero-action">Find an instructor<ArrowRight size={16} /></Link>
            <Link to="/student-dashboard/book" className="dsp-overview__hero-action dsp-overview__hero-action--quiet">View lessons</Link>
          </div>
        }
      />

      <main className="dsp-overview-page__content">
        <div className="dsp-overview__stats-grid" aria-label="Learning summary">
          {statsLoading ? (
            <LoadingState label="Loading your learning summary…" />
          ) : (
            <>
              <DashboardStatCard label="Upcoming lessons" value={stats?.currentBookings ?? 0} helper="Scheduled ahead" icon={CalendarDays} tone="coral" onClick={() => navigate("/student-dashboard/book", { state: { tab: "upcoming" } })} />
              <DashboardStatCard label="Completed lessons" value={stats?.totalLessons ?? 0} helper="Lessons completed" icon={BookOpen} tone="green" onClick={() => navigate("/student-dashboard/book", { state: { tab: "history" } })} />
              <DashboardStatCard label="Instructors" value={stats?.totalInstructors ?? 0} helper="People you’ve learned with" icon={UsersRound} tone="amber" onClick={() => navigate("/student-dashboard/Feedback")} />
              <DashboardStatCard label="Hours remaining" value={`${remainingHours} hrs`} helper="Latest instructor estimate" icon={ArrowRight} tone="navy" />
              {totalSpent !== undefined && <DashboardStatCard label="Total spent" value={formatCHF(totalSpent)} helper="Recorded payments" icon={CreditCard} tone="coral" onClick={() => navigate("/student-dashboard/payment-history")} />}
            </>
          )}
        </div>

        <div className="dsp-overview__primary-grid">
          <OverviewSection title="Next lesson" description="Your closest scheduled driving session.">
            {lessonsError ? (
              <div className="dsp-overview__inline-error">Lessons could not be loaded right now.</div>
            ) : lessonsLoading ? (
              <LoadingState label="Finding your next lesson…" />
            ) : nextLesson ? (
              <NextLessonCard
                personLabel="Instructor"
                personName={nextLesson.instructorName || "Instructor"}
                date={formatDate(nextLesson.date)}
                time={`Switzerland ${formatTime(nextLesson.startTime)}–${formatTime(nextLesson.endTime)}`}
                duration="Lesson time is shown in Switzerland time"
                status={nextLesson.slotStatus || "Upcoming"}
                statusTone="info"
                actionTo="/student-dashboard/book"
                actionLabel="View lessons"
              />
            ) : (
              <OverviewEmpty title="Your next lesson starts here" description="Find an instructor and book your first lesson when you’re ready." to="/student-dashboard/search" actionLabel="Find an instructor" />
            )}
          </OverviewSection>

          <OverviewSection title="Learning progress" description="A clear view of the information your instructors have recorded.">
            <div className="dsp-overview__progress-card">
              <div className="dsp-overview__progress-ring" aria-hidden="true"><BookOpen size={24} /></div>
              <div>
                <span className="dsp-overview__kicker">Current learning record</span>
                <strong>{stats?.totalLessons ?? 0} completed lessons</strong>
                <p>{remainingHours} hours remaining according to your latest progress update.</p>
              </div>
            </div>
            <div className="dsp-overview__progress-footer">
              <span>Recent lesson status</span>
              <strong>{recentLessons[0]?.isCompleted ? "Completed" : recentLessons[0] ? "Upcoming" : "No lessons yet"}</strong>
            </div>
          </OverviewSection>
        </div>

        <div className="dsp-overview__secondary-grid">
          <OverviewSection title="Recent activity" description="The latest lessons and instructor notes on your account.">
            {lessonsLoading || feedbacksLoading ? (
              <LoadingState label="Loading recent activity…" />
            ) : lessonsError && feedbacksError ? (
              <div className="dsp-overview__inline-error">Recent activity could not be loaded.</div>
            ) : recentLessons.length || feedbacks.length ? (
              <div className="dsp-overview__activity-list">
                {recentLessons.slice(0, 2).map((lesson) => (
                  <ActivityItem key={lesson.lessonId} title={lesson.isCompleted ? "Lesson completed" : "Lesson scheduled"} detail={`${lesson.instructorName || "Instructor"} · ${formatDate(lesson.date)}`} meta={formatTime(lesson.startTime)} tone={lesson.isCompleted ? "green" : "coral"} />
                ))}
                {feedbacks.slice(0, 2).map((feedback) => (
                  <button type="button" className="dsp-overview__activity-button" key={feedback._id} onClick={() => setSelectedFeedback(feedback)}>
                    <ActivityItem title="Instructor note added" detail={feedback.message || "Open the latest instructor feedback"} meta={formatFeedbackDate(feedback.createdAt)} tone="amber" />
                  </button>
                ))}
              </div>
            ) : (
              <OverviewEmpty title="No activity yet" description="Your lessons and instructor notes will appear here as you use DSP." />
            )}
            {feedbacksError && <p className="dsp-overview__muted-note">Instructor notes are temporarily unavailable.</p>}
          </OverviewSection>

          <OverviewSection title="Keep moving" description="Useful shortcuts for your next step.">
            <div className="dsp-overview__quick-grid">
              <QuickActionCard to="/student-dashboard/search" label="Find an instructor" description="Explore nearby instructors" icon={Search} tone="coral" />
              <QuickActionCard to="/student-dashboard/book" label="View bookings" description="Check your lesson schedule" icon={CalendarDays} tone="amber" />
              <QuickActionCard to="/student-dashboard/chat" label="Open messages" description="Stay in touch with instructors" icon={MessageCircle} tone="navy" />
              <QuickActionCard to="/student-dashboard/settings" label="Update profile" description="Keep your details current" icon={Settings2} tone="green" />
            </div>
          </OverviewSection>
        </div>

        {!lessonsLoading && !lessons.length && !lessonsError && (
          <div className="dsp-overview__onboarding-strip">
            <div><span className="dsp-overview__kicker">Ready when you are</span><h2>Build your driving routine with DSP.</h2><p>Choose an instructor, book a time that works for you, and keep every lesson in one place.</p></div>
            <Link to="/student-dashboard/search" className="dsp-overview__action-link">Start exploring<ArrowRight size={16} /></Link>
          </div>
        )}
      </main>

      {selectedFeedback && <FeedbackModal feedback={selectedFeedback} isOpen={Boolean(selectedFeedback)} onClose={() => setSelectedFeedback(null)} />}
    </div>
  );
}
