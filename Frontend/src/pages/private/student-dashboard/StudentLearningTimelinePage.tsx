import { useQuery } from "@apollo/client";
import { Alert, Box, CircularProgress, Paper, Typography } from "@mui/material";
import {
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  History,
  MessageCircle,
  RotateCcw,
  Star,
  XCircle,
} from "lucide-react";
import { gql } from "@apollo/client";

const GET_STUDENT_LEARNING_TIMELINE = gql`
  query GetStudentLearningTimeline($limit: Int) {
    getStudentLearningTimeline(limit: $limit) {
      id bookingId eventType title actorRole fromState toState slotDate startTime endTime occurredAt
    }
  }
`;

type TimelineItem = {
  id: string;
  bookingId: string;
  title: string;
  eventType: string;
  actorRole?: string | null;
  fromState?: string | null;
  toState?: string | null;
  slotDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  occurredAt: string;
};

type TimelinePresentation = {
  tone: "violet" | "cyan" | "green" | "amber" | "coral" | "pink";
  label: string;
  Icon: typeof CalendarCheck2;
};

const presentationFor = (event: TimelineItem): TimelinePresentation => {
  const presentations: Record<string, TimelinePresentation> = {
    booking_created: { tone: "violet", label: "Booking created", Icon: CalendarClock },
    booking_confirmed: { tone: "cyan", label: "Booking confirmed", Icon: CalendarCheck2 },
    payment_completed: { tone: "green", label: "Payment completed", Icon: CreditCard },
    lesson_completed: { tone: "green", label: "Lesson completed", Icon: CheckCircle2 },
    lesson_no_show: { tone: "coral", label: "Lesson marked as no-show", Icon: XCircle },
    reschedule_requested: { tone: "amber", label: "Reschedule requested", Icon: RotateCcw },
    reschedule_accepted: { tone: "green", label: "Reschedule accepted", Icon: CheckCircle2 },
    reschedule_rejected: { tone: "coral", label: "Reschedule declined", Icon: XCircle },
    booking_cancelled: { tone: "coral", label: "Booking cancelled", Icon: XCircle },
    refund_issued: { tone: "amber", label: "Refund issued", Icon: CreditCard },
    feedback_received: { tone: "cyan", label: "Instructor feedback received", Icon: MessageCircle },
    review_submitted: { tone: "pink", label: "Review submitted", Icon: Star },
  };
  const eventType = event.eventType.toLowerCase();
  return presentations[eventType] || { tone: "violet", label: event.title, Icon: History };
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export default function StudentLearningTimelinePage() {
  const { data, loading, error } = useQuery(GET_STUDENT_LEARNING_TIMELINE, {
    variables: { limit: 80 },
    fetchPolicy: "cache-and-network",
  });
  const events = (data?.getStudentLearningTimeline || []) as TimelineItem[];

  return (
    <Box className="dsp-learning-timeline-page" sx={{ p: { xs: 2, md: 4 }, maxWidth: 980, mx: "auto" }}>
      <Typography sx={{ color: "secondary.main", fontWeight: 800, letterSpacing: 1, fontSize: 12 }}>
        LEARNING RECORD
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 750, mb: 1 }}>Learning timeline</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Follow the real booking and lesson milestones recorded by your instructors and Drive Pilot.
      </Typography>
      <Paper className="dsp-learning-timeline" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
        {loading && !data ? <Box sx={{ py: 8, textAlign: "center" }}><CircularProgress /></Box> : error ? (
          <Alert severity="error">Your learning timeline could not be loaded.</Alert>
        ) : events.length === 0 ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <Box className="dsp-learning-timeline__empty-icon" sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
              <History size={32} />
            </Box>
            <Typography variant="h6" sx={{ mt: 1 }}>Your timeline is waiting for its first lesson</Typography>
            <Typography color="text.secondary">Booking and completion milestones will appear here automatically.</Typography>
          </Box>
        ) : (
          <div className="dsp-learning-timeline__events">
            {events.map((event) => {
              const presentation = presentationFor(event);
              const Icon = presentation.Icon;
              return (
                <article className={`dsp-learning-timeline__event is-${presentation.tone}`} key={event.id}>
                  <div className="dsp-learning-timeline__node" aria-hidden="true"><Icon size={18} /></div>
                  <div className="dsp-learning-timeline__event-body">
                    <div className="dsp-learning-timeline__event-heading">
                      <div>
                        <span className="dsp-learning-timeline__event-label">{presentation.label}</span>
                        <Typography component="h2">{event.title}</Typography>
                      </div>
                      <time dateTime={event.occurredAt}>{formatDateTime(event.occurredAt)}</time>
                    </div>
                    <div className="dsp-learning-timeline__meta">
                      <span>{event.actorRole || "System"}</span>
                      {(event.fromState || event.toState) && <span>{event.fromState || "New"} → {event.toState || "Updated"}</span>}
                    </div>
                    {(event.slotDate || event.startTime) && (
                      <p>Lesson: {event.slotDate || "Date unavailable"}{event.startTime ? ` · ${event.startTime}–${event.endTime || "—"}` : ""}</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Paper>
    </Box>
  );
}
