const BookingEvent = require("../models/BookingEvent");
const { createNotification } = require("./notificationService");

const preferenceForEvent = {
  booking_created: "bookingUpdates",
  booking_confirmed: "bookingUpdates",
  booking_cancelled: "bookingUpdates",
  reschedule_requested: "bookingUpdates",
  reschedule_accepted: "bookingUpdates",
  reschedule_rejected: "bookingUpdates",
  lesson_completed: "bookingUpdates",
  lesson_no_show: "bookingUpdates",
  payment_completed: "paymentUpdates",
  refund_issued: "paymentUpdates",
  lesson_reminder: "lessonReminders",
  lesson_completion_reminder: "lessonReminders",
  feedback_received: "feedbackNotifications",
  review_received: "reviews",
  document_status: "documentStatus",
};

const copy = {
  booking_created: ["New booking", "A lesson booking has been created."],
  booking_confirmed: ["Booking confirmed", "Your lesson booking is confirmed."],
  booking_cancelled: ["Booking cancelled", "A lesson booking has been cancelled."],
  reschedule_requested: ["Reschedule requested", "A new time has been requested for a lesson."],
  reschedule_accepted: ["Reschedule accepted", "The requested lesson time has been accepted."],
  reschedule_rejected: ["Reschedule declined", "The requested lesson time was declined."],
  lesson_completed: ["Lesson completed", "A lesson has been marked completed."],
  lesson_no_show: ["Lesson marked no-show", "A lesson was marked as a no-show."],
  payment_completed: ["Payment completed", "Your lesson payment was completed."],
  refund_issued: ["Refund updated", "A refund was issued for a lesson."],
  lesson_reminder: ["Lesson reminder", "Your lesson starts soon."],
  lesson_completion_reminder: ["Lesson follow-up", "Your completed lesson is ready for review."],
  feedback_received: ["Feedback received", "New instructor feedback is available."],
  review_received: ["New review", "A student submitted a review."],
  document_status: ["Document status updated", "Your document status has changed."],
};

function idOf(value) {
  return value?._id?.toString?.() || value?.toString?.() || null;
}

async function recordBookingEvent({
  booking,
  eventType,
  actorId = null,
  actorRole = "System",
  slotId = null,
  fromState = null,
  toState = null,
  metadata = {},
  session,
}) {
  const bookingId = idOf(booking?._id || booking);
  if (!bookingId || !eventType) return null;
  // Booking mutations must remain usable in isolated unit tests and during a
  // short database reconnect window; the event is supplementary to the
  // already-committed booking state in those cases.
  if (BookingEvent.db?.readyState === 0) return null;
  const dedupeKey = `booking:${bookingId}:${slotId || "booking"}:${eventType}:${toState || ""}:${metadata.newDate || ""}:${metadata.newStartTime || ""}`;
  const event = new BookingEvent({
    bookingId,
    slotId: slotId ? String(slotId) : undefined,
    eventType,
    actorId: actorId || undefined,
    actorRole,
    fromState: fromState || undefined,
    toState: toState || undefined,
    metadata,
    dedupeKey,
  });
  try {
    await event.save(session ? { session } : undefined);
  } catch (error) {
    if (error?.code !== 11000) throw error;
    const existingQuery = BookingEvent.findOne({ dedupeKey });
    if (session) existingQuery.session(session);
    return existingQuery;
  }

  const recipients = [idOf(booking.studentId), idOf(booking.instructorId)].filter(Boolean);
  
  const [title, defaultBody] = copy[eventType] || ["Booking update", "There is an update to a lesson booking."];
  for (const recipientId of recipients) {
    await createNotification({
      recipientUserId: recipientId,
      type: eventType,
      title,
      body: metadata.body || defaultBody,
      entityType: "booking",
      entityId: bookingId,
      dedupeKey: `${event._id}:${recipientId}`,
      metadata: { slotId: slotId ? String(slotId) : null },
      preferenceKey: preferenceForEvent[eventType],
      session,
    });
  }
  return event;
}

module.exports = { recordBookingEvent, preferenceForEvent };
