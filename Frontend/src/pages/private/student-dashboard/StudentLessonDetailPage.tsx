import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { Alert, Avatar, Box, Button, Chip, CircularProgress, Divider, Paper, Stack, TextField, Typography } from "@mui/material";
import { CalendarDays, Clock3, History, ReceiptText } from "lucide-react";
import { useParams } from "react-router-dom";
import { CANCEL_BOOKING_SLOT, GET_BOOKING_DETAIL, GET_BOOKING_TIMELINE, REQUEST_RESCHEDULE } from "../../../graphql/Queries/productCapabilities";

export default function StudentLessonDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { data, loading, error } = useQuery(GET_BOOKING_DETAIL, { variables: { bookingId }, skip: !bookingId });
  const { data: timelineData } = useQuery(GET_BOOKING_TIMELINE, { variables: { bookingId }, skip: !bookingId });
  const [cancelBooking, { loading: cancelling }] = useMutation(CANCEL_BOOKING_SLOT, { refetchQueries: bookingId ? [{ query: GET_BOOKING_DETAIL, variables: { bookingId } }, { query: GET_BOOKING_TIMELINE, variables: { bookingId } }] : [] });
  const [requestReschedule, { loading: requesting }] = useMutation(REQUEST_RESCHEDULE, { refetchQueries: bookingId ? [{ query: GET_BOOKING_DETAIL, variables: { bookingId } }, { query: GET_BOOKING_TIMELINE, variables: { bookingId } }] : [] });
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  if (loading) return <Box sx={{ p: 5, textAlign: "center" }}><CircularProgress /></Box>;
  if (error || !data?.getBookingDetail) return <Box sx={{ p: 4 }}><Alert severity="error">This lesson could not be loaded.</Alert></Box>;
  const booking = data.getBookingDetail;
  const instructor = booking.instructorId;
  const slot = booking.slots?.[0];
  const canChange = slot && ["booked", "confirmed"].includes(slot.status) && booking.status !== "cancelled";
  return <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1050, mx: "auto" }}>
    <Typography sx={{ color: "secondary.main", fontWeight: 800, letterSpacing: 1, fontSize: 12 }}>LESSON WORKSPACE</Typography><Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>Lesson details</Typography>
    <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, mb: 2 }}><Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} justifyContent="space-between"><Stack direction="row" spacing={2} alignItems="center"><Avatar src={instructor?.profileImage}>{instructor?.firstName?.[0]}</Avatar><Box><Typography variant="h6" fontWeight={800}>{instructor?.firstName} {instructor?.lastName}</Typography><Typography color="text.secondary">{instructor?.location || "Driving instructor"}</Typography></Box></Stack><Chip label={booking.status} color={booking.status === "completed" ? "success" : booking.status === "cancelled" ? "default" : "secondary"} /></Stack><Divider sx={{ my: 3 }} /><Stack direction={{ xs: "column", sm: "row" }} spacing={3}><Box><CalendarDays size={17} /><Typography>{slot?.date || "—"}</Typography></Box><Box><Clock3 size={17} /><Typography>{slot?.startTime} – {slot?.endTime}</Typography></Box><Box><ReceiptText size={17} /><Typography>CHF {Number(booking.finalAmount || 0).toFixed(2)}</Typography></Box></Stack>{canChange && <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 3 }}><Button variant="outlined" color="error" disabled={cancelling} onClick={() => bookingId && slot?._id && cancelBooking({ variables: { bookingId, slotId: slot._id } })}>{cancelling ? "Cancelling…" : "Cancel lesson"}</Button><Button variant="outlined" disabled={requesting} onClick={() => setShowReschedule((value) => !value)}>{slot?.rescheduleStatus === "pending" ? "Reschedule requested" : "Request reschedule"}</Button></Stack>}{showReschedule && canChange && <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2 }}><TextField type="date" label="New date" InputLabelProps={{ shrink: true }} value={newDate} onChange={(event) => setNewDate(event.target.value)} /><TextField type="time" label="Start" InputLabelProps={{ shrink: true }} value={newStartTime} onChange={(event) => setNewStartTime(event.target.value)} /><TextField type="time" label="End" InputLabelProps={{ shrink: true }} value={newEndTime} onChange={(event) => setNewEndTime(event.target.value)} /><Button variant="contained" disabled={requesting || !newDate || !newStartTime || !newEndTime} onClick={() => bookingId && slot?._id && requestReschedule({ variables: { input: { bookingId, slotId: slot._id, newDate, newStartTime, newEndTime } } })}>{requesting ? "Sending…" : "Send request"}</Button></Stack>}</Paper>
    <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}><Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}><History size={18} /><Typography variant="h6" fontWeight={800}>Booking history</Typography></Stack>{timelineData?.getBookingTimeline?.length ? timelineData.getBookingTimeline.map((event: { id: string; eventType: string; actorRole?: string; occurredAt: string; fromState?: string; toState?: string }) => <Box key={event.id} sx={{ display: "flex", gap: 2, py: 1.5, borderTop: "1px solid", borderColor: "divider" }}><Box sx={{ width: 9, height: 9, mt: 1, borderRadius: "50%", bgcolor: "secondary.main" }} /><Box><Typography fontWeight={700}>{event.eventType.replaceAll("_", " ")}</Typography><Typography variant="body2" color="text.secondary">{new Date(event.occurredAt).toLocaleString()} · {event.actorRole || "System"}{event.fromState || event.toState ? ` · ${event.fromState || "new"} → ${event.toState || "updated"}` : ""}</Typography></Box></Box>) : <Typography color="text.secondary">No lifecycle events have been recorded yet.</Typography>}</Paper>
  </Box>;
}
