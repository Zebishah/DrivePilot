import { useQuery } from "@apollo/client";
import { Alert, Box, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { CalendarCheck2, History } from "lucide-react";
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

export default function StudentLearningTimelinePage() {
  const { data, loading, error } = useQuery(GET_STUDENT_LEARNING_TIMELINE, {
    variables: { limit: 80 },
    fetchPolicy: "cache-and-network",
  });
  const events = (data?.getStudentLearningTimeline || []) as TimelineItem[];

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 980, mx: "auto" }}>
      <Typography sx={{ color: "secondary.main", fontWeight: 800, letterSpacing: 1, fontSize: 12 }}>
        LEARNING RECORD
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 750, mb: 1 }}>Learning timeline</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Follow the real booking and lesson milestones recorded by your instructors and DSP.
      </Typography>
      <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
        {loading && !data ? <Box sx={{ py: 8, textAlign: "center" }}><CircularProgress /></Box> : error ? (
          <Alert severity="error">Your learning timeline could not be loaded.</Alert>
        ) : events.length === 0 ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <Box sx={{ display: "flex", justifyContent: "center", color: "#7C3AED", mb: 1.5 }}>
              <History size={32} />
            </Box>
            <Typography variant="h6" sx={{ mt: 1 }}>Your timeline is waiting for its first lesson</Typography>
            <Typography color="text.secondary">Booking and completion milestones will appear here automatically.</Typography>
          </Box>
        ) : (
          <Stack spacing={0}>
            {events.map((event) => (
              <Box key={event.id} sx={{ display: "flex", gap: 2, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
                <Box sx={{ width: 38, height: 38, flex: "0 0 auto", borderRadius: 2, display: "grid", placeItems: "center", color: "secondary.main", bgcolor: "secondary.light" }}>
                  <CalendarCheck2 size={18} />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 700, textTransform: "capitalize" }}>{event.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(event.occurredAt).toLocaleString()} · {event.actorRole || "System"}
                    {event.fromState || event.toState ? ` · ${event.fromState || "new"} → ${event.toState || "updated"}` : ""}
                  </Typography>
                  {(event.slotDate || event.startTime) && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Lesson: {event.slotDate || "—"}{event.startTime ? ` · ${event.startTime}–${event.endTime || "—"}` : ""}</Typography>}
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
