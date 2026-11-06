import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import { CalendarDays, CheckCircle2, Clock3, MessageCircle } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GET_BOOKING_DETAIL } from "../../../graphql/Queries/productCapabilities";
import DashboardBackLink from "../../../components/dashboard/DashboardBackLink";
import { DashboardCard, DashboardPageHeader } from "../../../components/dashboard/OverviewWidgets";
import { EmptyState, ErrorState } from "../../../components/dashboard/DashboardStates";
import StatusBadge from "../../../components/dashboard/StatusBadge";

type StudentFeedbackItem = {
  _id: string;
  lessonId: string;
  bookingId?: string;
  instructorId: string;
  instructorName?: string;
  instructorProfileImage?: string;
  feedbackTags: string[];
  hoursRemaining: string;
  message: string;
  createdAt?: string;
};

type BookingSlot = {
  _id: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
};

type BookingDetail = {
  status?: string;
  instructorId?: { firstName?: string; lastName?: string; profileImage?: string };
  slots?: BookingSlot[];
};

const formatDate = (value?: string | null) => {
  if (!value) return "Date unavailable";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
};

const initialsFor = (name: string) =>
  name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "IN";

const displayTag = (tag: string) => tag.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (character) => character.toUpperCase());

const hoursLabel = (value?: string | null) => {
  const hours = String(value || "").trim();
  if (!hours) return "Not recorded";
  return /\bhrs?\b/i.test(hours) ? hours : `${hours} hrs`;
};

const statusTone = (status?: string): "success" | "warning" | "danger" | "info" | "neutral" => {
  switch (String(status || "").toLowerCase()) {
    case "completed": return "success";
    case "cancelled":
    case "refund": return "danger";
    case "booked":
    case "confirmed": return "info";
    case "pending": return "warning";
    default: return "neutral";
  }
};

function FeedbackDetailSkeleton() {
  return (
    <div className="dsp-feedback-detail-skeleton" role="status" aria-live="polite" aria-label="Loading instructor feedback">
      <span className="dsp-feedback-detail-skeleton__context" />
      <div className="dsp-feedback-detail-skeleton__grid"><span /><span /></div>
      <span className="dsp-feedback-detail-skeleton__focus" />
    </div>
  );
}

function InstructorAvatar({ name, image }: { name: string; image?: string | null }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageSource = String(image || "").trim();

  useEffect(() => setImageFailed(false), [imageSource]);

  return (
    <div className="dsp-feedback-detail__avatar" role="img" aria-label={`${name} avatar`}>
      {imageSource && !imageFailed ? (
        <img src={imageSource} alt={`${name} profile`} onError={() => setImageFailed(true)} />
      ) : <span aria-hidden="true">{initialsFor(name)}</span>}
    </div>
  );
}

const FeedbackDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { feedback?: StudentFeedbackItem; lessonNumber?: number } | undefined;
  const feedback = state?.feedback;
  const feedbackPath = "/student-dashboard/Feedback";
  const lessonNumber = state?.lessonNumber ?? 1;
  const bookingId = feedback?.bookingId || "";
  const { data: bookingData, loading: bookingLoading, error: bookingError, refetch } = useQuery(GET_BOOKING_DETAIL, {
    variables: { bookingId },
    skip: !bookingId,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  const booking = bookingData?.getBookingDetail as BookingDetail | undefined;
  const bookingInstructor = booking?.instructorId;
  const instructorName = feedback?.instructorName?.trim() || [bookingInstructor?.firstName, bookingInstructor?.lastName].filter(Boolean).join(" ").trim() || "Instructor";
  const slot = useMemo(() => booking?.slots?.find((candidate) => String(candidate._id) === String(feedback?.lessonId)) || booking?.slots?.[0], [booking?.slots, feedback?.lessonId]);
  const lessonStatus = slot?.status || booking?.status;
  const image = bookingInstructor?.profileImage || feedback?.instructorProfileImage;
  const hasBookingLoadingState = Boolean(feedback && bookingId && bookingLoading && !booking);
  const focusText = String(feedback?.message || "").trim();
  const feedbackDate = formatDateTime(feedback?.createdAt);

  if (!feedback) {
    return (
      <div className="dsp-student-page dsp-feedback-detail-page">
        <div className="dsp-student-page__content">
          <DashboardBackLink to={feedbackPath} label="Back to instructor feedback" />
          <DashboardPageHeader eyebrow="Lesson feedback" title="Instructor feedback" description="Review what you worked on and what to focus on next." />
          <DashboardCard className="dsp-feedback-detail-state">
            <EmptyState title="No instructor feedback yet" description="Your Instructor has not added feedback for this lesson." action={<Link to="/student-dashboard/book" className="dsp-student-secondary-button">Back to lessons</Link>} />
          </DashboardCard>
        </div>
      </div>
    );
  }

  if (bookingError && !booking) {
    return (
      <div className="dsp-student-page dsp-feedback-detail-page">
        <div className="dsp-student-page__content">
          <DashboardBackLink to={feedbackPath} label="Back to instructor feedback" />
          <DashboardPageHeader eyebrow="Lesson feedback" title="Instructor feedback" description="Review what you worked on and what to focus on next." />
          <DashboardCard className="dsp-feedback-detail-state">
            <ErrorState title="We couldn’t load this feedback" description="Refresh the lesson context and try again, or return to instructor feedback." />
            <div className="dsp-feedback-detail-state__actions"><button type="button" className="dsp-student-primary-button" onClick={() => void refetch()}>Try again</button><Link to={feedbackPath} className="dsp-student-secondary-button">Back to instructor feedback</Link></div>
          </DashboardCard>
        </div>
      </div>
    );
  }

  return (
    <div className="dsp-student-page dsp-feedback-detail-page">
      <div className="dsp-student-page__content">
        <DashboardBackLink to={feedbackPath} label="Back to instructor feedback" />
        <DashboardPageHeader eyebrow="Lesson feedback" title="Instructor feedback" description="Review what you worked on and what to focus on next." />
        {hasBookingLoadingState ? <FeedbackDetailSkeleton /> : (
          <>
            <DashboardCard className="dsp-feedback-detail__context-card">
              <div className="dsp-feedback-detail__context-main">
                <div className="dsp-feedback-detail__identity"><InstructorAvatar name={instructorName} image={image} /><div><span className="dsp-feedback-detail__eyebrow">Instructor</span><h2>{instructorName}</h2><p>Instructor</p></div></div>
                {lessonStatus && <StatusBadge tone={statusTone(lessonStatus)}><CheckCircle2 size={14} aria-hidden="true" /> {lessonStatus}</StatusBadge>}
              </div>
              <div className="dsp-feedback-detail__context-meta">
                <div><CalendarDays size={17} aria-hidden="true" /><span><small>Lesson</small><strong>Lesson {lessonNumber}</strong></span></div>
                <div><Clock3 size={17} aria-hidden="true" /><span><small>Date & time</small><strong>{slot?.date ? `${formatDate(slot.date)} · ${slot.startTime || ""}–${slot.endTime || ""}` : "Lesson time unavailable"}</strong></span></div>
                <button type="button" className="dsp-feedback-detail__message-button" onClick={() => navigate("/student-dashboard/chat")}><MessageCircle size={16} aria-hidden="true" /> Message instructor</button>
              </div>
            </DashboardCard>

            <div className="dsp-feedback-detail__summary-grid">
              <DashboardCard className="dsp-feedback-detail__skills-card"><span className="dsp-feedback-detail__eyebrow">Skills practiced</span><h2>What you worked on</h2>{feedback.feedbackTags?.length ? <div className="dsp-feedback-detail__tags" aria-label="Skills practiced">{feedback.feedbackTags.map((tag, index) => <span key={`${tag}-${index}`}>{displayTag(tag)}</span>)}</div> : <p className="dsp-feedback-detail__muted">No skills were recorded for this lesson.</p>}</DashboardCard>
              <DashboardCard className="dsp-feedback-detail__hours-card"><div className="dsp-feedback-detail__metric-icon" aria-hidden="true"><Clock3 size={20} /></div><span className="dsp-feedback-detail__eyebrow">Hours remaining</span><strong>{hoursLabel(feedback.hoursRemaining)}</strong><p>Estimated learning time remaining</p></DashboardCard>
            </div>

            <DashboardCard className="dsp-feedback-detail__focus-card"><span className="dsp-feedback-detail__eyebrow">Focus for next lesson</span><h2>Keep building from here</h2>{focusText ? <div className="dsp-feedback-detail__focus-copy" dangerouslySetInnerHTML={{ __html: focusText }} /> : <p className="dsp-feedback-detail__muted">No focus notes were added for this lesson.</p>}</DashboardCard>

            <footer className="dsp-feedback-detail__footer">{feedbackDate && <span>Feedback added: <strong>{feedbackDate}</strong></span>}<span>Instructor: <strong>{instructorName}</strong></span><span>Lesson: <strong>Lesson {lessonNumber}</strong></span></footer>
          </>
        )}
      </div>
    </div>
  );
};

export default FeedbackDetailsPage;
