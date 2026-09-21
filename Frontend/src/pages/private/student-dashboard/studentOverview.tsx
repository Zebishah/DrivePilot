import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, CheckCircle2, Clock3, CreditCard, MessageCircle, Search, Settings2, Star, UsersRound } from "lucide-react";
import { useQuery } from "@apollo/client";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { Feedback, SlotLesson } from "../../../types/StudentDashboard";
import { GET_STUDENT_DASHBOARD_STATS, GET_STUDENT_FEEDBACKS, GET_STUDENT_LESSONS } from "../../../graphql/Queries/StudentDashboard";
import { GET_STUDENT_TRANSACTION_STATS } from "../../../graphql/Queries/transactionQueries";
import { FeedbackModal } from "../../../components/StudentComponents/StudentDashboard/FeedBackModal";
import { ErrorState, LoadingState } from "../../../components/dashboard/DashboardStates";
import { DashboardStatCard } from "../../../components/dashboard/OverviewWidgets";
import { formatCHF } from "../../../utils/money";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(date);
}
function formatTime(value?: string) {
  if (!value) return "Time to be confirmed";
  const [hours, minutes] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes || 0), 0, 0);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit" }).format(date);
}
function lessonTimestamp(lesson: SlotLesson) { return `${lesson.date}T${lesson.startTime || "00:00"}`; }
function initials(name: string) { return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function activityDate(value: string) {
  const numericValue = Number(value);
  const date = Number.isFinite(numericValue) && numericValue > 0 ? new Date(numericValue) : new Date(value);
  return Number.isNaN(date.valueOf()) ? "Recently" : formatDate(date.toISOString());
}

export default function StudentOverview() {
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const studentId = user?.id || "";
  const { data: statsData, loading: statsLoading, error: statsError } = useQuery(GET_STUDENT_DASHBOARD_STATS, { variables: { studentId }, skip: !studentId, fetchPolicy: "network-only" });
  const { data: lessonsData, loading: lessonsLoading, error: lessonsError } = useQuery(GET_STUDENT_LESSONS, { variables: { studentId }, skip: !studentId, fetchPolicy: "network-only" });
  const { data: feedbacksData, loading: feedbacksLoading, error: feedbacksError } = useQuery(GET_STUDENT_FEEDBACKS, { variables: { studentId }, skip: !studentId, fetchPolicy: "network-only" });
  const { data: transactionData } = useQuery(GET_STUDENT_TRANSACTION_STATS, { skip: !studentId, fetchPolicy: "network-only" });
  const stats = statsData?.getStudentDashboardStats;
  const lessons = useMemo(() => (lessonsData?.getStudentLesson || []) as SlotLesson[], [lessonsData]);
  const feedbacks = (feedbacksData?.getStudentFeedbacks || []) as Feedback[];
  const upcomingLessons = useMemo(() => lessons.filter((lesson) => !lesson.isCompleted).sort((a, b) => lessonTimestamp(a).localeCompare(lessonTimestamp(b))), [lessons]);
  const recentLessons = useMemo(() => lessons.slice().sort((a, b) => lessonTimestamp(b).localeCompare(lessonTimestamp(a))).slice(0, 3), [lessons]);
  const nextLesson = upcomingLessons[0];
  const totalSpent = transactionData?.getStudentTransactionStats?.totalSpent;
  const completedLessons = stats?.totalLessons ?? 0;
  const remainingHours = stats?.remainingHours ?? "0";

  if (statsError) return <div className="dsp-student-overview"><ErrorState title="Your learning dashboard is unavailable" description="We couldn’t load your latest learning summary. Please try again shortly." /></div>;

  return (
    <div className="dsp-student-overview">
      <main className="dsp-student-overview__content">
        <section className="dsp-student-overview__hero" aria-label="Student learning summary">
          <div className="dsp-student-overview__welcome">
            <span className="dsp-student-overview__eyebrow">Student workspace</span>
            <div className="dsp-student-overview__welcome-icon"><BookOpen size={20} /></div>
            <h1>{`Good ${new Date().getHours() < 12 ? "morning" : "afternoon"}, ${user?.firstName || "there"}`}</h1>
            <p>Keep your learning journey moving with a clear view of your lessons, progress, and next steps.</p>
            <div className="dsp-student-overview__hero-facts"><span><strong>{stats?.currentBookings ?? 0}</strong> lessons ahead</span><span><strong>{completedLessons}</strong> completed</span></div>
            <div className="dsp-student-overview__hero-actions"><Link to="/student-dashboard/search" className="dsp-student-overview__primary-action">Find an instructor <ArrowRight size={16} /></Link><Link to="/student-dashboard/book" className="dsp-student-overview__secondary-action">View lessons</Link></div>
          </div>
          <div className="dsp-student-overview__next-hero">
            <div className="dsp-student-overview__next-hero-top"><span>Next lesson</span><CalendarDays size={18} /></div>
            {nextLesson ? <><div className="dsp-student-overview__next-person"><span>{initials(nextLesson.instructorName || "Instructor")}</span><div><strong>{nextLesson.instructorName || "Instructor"}</strong><small>Instructor</small></div></div><div className="dsp-student-overview__next-date"><strong>{formatDate(nextLesson.date)}</strong><span><Clock3 size={14} /> {formatTime(nextLesson.startTime)} – {formatTime(nextLesson.endTime)}</span></div><div className="dsp-student-overview__next-footer"><span className="dsp-student-overview__status">{nextLesson.slotStatus || "Booked"}</span><Link to="/student-dashboard/book">View booking <ArrowUpRight size={15} /></Link></div></> : <div className="dsp-student-overview__next-empty"><span><CalendarDays size={22} /></span><strong>No upcoming lesson</strong><p>Choose an instructor to plan your next step.</p><Link to="/student-dashboard/search">Find an instructor <ArrowRight size={15} /></Link></div>}
          </div>
        </section>

        <section className="dsp-student-overview__kpis" aria-label="Learning summary">
          {statsLoading ? <LoadingState label="Loading your learning summary…" /> : <><DashboardStatCard label="Upcoming lessons" value={stats?.currentBookings ?? 0} helper="Scheduled ahead" icon={CalendarDays} tone="coral" onClick={() => navigate("/student-dashboard/book")} /><DashboardStatCard label="Completed lessons" value={completedLessons} helper="Completed so far" icon={CheckCircle2} tone="green" onClick={() => navigate("/student-dashboard/book")} /><DashboardStatCard label="Instructors" value={stats?.totalInstructors ?? 0} helper="People you learned with" icon={UsersRound} tone="amber" onClick={() => navigate("/student-dashboard/Feedback")} /><DashboardStatCard label="Hours remaining" value={`${remainingHours} hrs`} helper="Latest estimate" icon={Clock3} tone="blue" />{totalSpent !== undefined && <DashboardStatCard label="Total spent" value={formatCHF(totalSpent)} helper="Recorded payments" icon={CreditCard} tone="purple" onClick={() => navigate("/student-dashboard/payment-history")} />}</>}
        </section>

        <section className="dsp-student-overview__main-grid">
          <article className="dsp-student-overview__panel dsp-student-overview__progress-panel"><div className="dsp-student-overview__panel-heading"><div><span className="dsp-student-overview__eyebrow">Learning record</span><h2>Learning progress</h2><p>Everything your instructors have recorded so far.</p></div><Link to="/student-dashboard/reviews">View progress <ArrowUpRight size={15} /></Link></div><div className="dsp-student-overview__progress-body"><div className="dsp-student-overview__progress-ring" aria-label={`${completedLessons} completed lessons`}><strong>{completedLessons}</strong><span>lessons<br />completed</span></div><div className="dsp-student-overview__progress-details"><div><span>Completed lessons</span><strong>{completedLessons}</strong></div><div><span>Hours remaining</span><strong>{remainingHours} hrs</strong></div><div><span>Latest status</span><strong>{recentLessons[0]?.isCompleted ? "Completed" : recentLessons[0] ? "Upcoming" : "No record yet"}</strong></div></div></div><div className="dsp-student-overview__progress-note"><BookOpen size={15} /> Progress updates appear as your completed lessons are recorded.</div></article>
          <article className="dsp-student-overview__panel dsp-student-overview__schedule-panel"><div className="dsp-student-overview__panel-heading"><div><span className="dsp-student-overview__eyebrow">Your schedule</span><h2>Upcoming lessons</h2></div><Link to="/student-dashboard/book">View all <ArrowUpRight size={15} /></Link></div>{lessonsError ? <div className="dsp-student-overview__inline-error">Lessons could not be loaded right now.</div> : lessonsLoading ? <LoadingState label="Finding upcoming lessons…" /> : upcomingLessons.length ? <div className="dsp-student-overview__schedule-list">{upcomingLessons.slice(0, 3).map((lesson) => <Link to="/student-dashboard/book" className="dsp-student-overview__schedule-item" key={lesson.lessonId}><span className="dsp-student-overview__schedule-date">{new Date(lesson.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span><span className="dsp-student-overview__schedule-line" /><span className="dsp-student-overview__schedule-copy"><strong>{lesson.instructorName || "Instructor"}</strong><small>{formatTime(lesson.startTime)} – {formatTime(lesson.endTime)} · Switzerland</small></span><ArrowUpRight size={15} /></Link>)}</div> : <div className="dsp-student-overview__compact-empty"><CalendarDays size={20} /><strong>No upcoming lesson</strong><span>Your confirmed bookings will appear here.</span></div>}</article>
        </section>

        <section className="dsp-student-overview__bottom-grid">
          <article className="dsp-student-overview__panel"><div className="dsp-student-overview__panel-heading"><div><span className="dsp-student-overview__eyebrow">Account activity</span><h2>Recent activity</h2><p>Recent lessons and instructor notes.</p></div></div>{lessonsLoading || feedbacksLoading ? <LoadingState label="Loading activity…" /> : lessonsError && feedbacksError ? <div className="dsp-student-overview__inline-error">Recent activity could not be loaded.</div> : recentLessons.length || feedbacks.length ? <div className="dsp-student-overview__activity-list">{recentLessons.slice(0, 2).map((lesson) => <div className="dsp-student-overview__activity" key={lesson.lessonId}><span className={`dsp-student-overview__activity-icon ${lesson.isCompleted ? "is-green" : "is-coral"}`}><BookOpen size={15} /></span><span className="dsp-student-overview__activity-connector" /><div><strong>{lesson.isCompleted ? "Lesson completed" : "Lesson scheduled"}</strong><small>{lesson.instructorName || "Instructor"} · {formatDate(lesson.date)} · {formatTime(lesson.startTime)}</small></div></div>)}{feedbacks.slice(0, 2).map((feedback) => <button type="button" className="dsp-student-overview__activity dsp-student-overview__activity-button" key={feedback._id} onClick={() => setSelectedFeedback(feedback)}><span className="dsp-student-overview__activity-icon is-amber"><Star size={15} /></span><div><strong>Instructor feedback received</strong><small>{activityDate(feedback.createdAt)} · {feedback.message?.replace(/<[^>]+>/g, "").slice(0, 70) || "Open feedback details"}</small></div><ArrowUpRight size={15} /></button>)}</div> : <div className="dsp-student-overview__compact-empty"><BookOpen size={20} /><strong>No activity yet</strong><span>Lessons and feedback will appear here.</span></div>}</article>
          <article className="dsp-student-overview__panel"><div className="dsp-student-overview__panel-heading"><div><span className="dsp-student-overview__eyebrow">Shortcuts</span><h2>Quick actions</h2><p>Pick up where you left off.</p></div></div><div className="dsp-student-overview__actions-grid"><Link to="/student-dashboard/search"><span className="is-coral"><Search size={17} /></span><strong>Find instructor</strong><small>Search nearby instructors</small><ArrowUpRight size={15} /></Link><Link to="/student-dashboard/book"><span className="is-amber"><CalendarDays size={17} /></span><strong>View bookings</strong><small>See upcoming lessons</small><ArrowUpRight size={15} /></Link><Link to="/student-dashboard/chat"><span className="is-blue"><MessageCircle size={17} /></span><strong>Open messages</strong><small>Talk with your instructor</small><ArrowUpRight size={15} /></Link><Link to="/student-dashboard/settings"><span className="is-green"><Settings2 size={17} /></span><strong>Update profile</strong><small>Keep details current</small><ArrowUpRight size={15} /></Link></div></article>
        </section>
      </main>
      {selectedFeedback && <FeedbackModal feedback={selectedFeedback} isOpen={Boolean(selectedFeedback)} onClose={() => setSelectedFeedback(null)} />}
    </div>
  );
}
