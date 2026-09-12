const crypto = require("crypto");
const StudentBooking = require("../models/studentBooking.model");
const JOB_CONFIG = require("../config/jobConfig");
const { enqueueEmailEvent } = require("../services/outboxService");

const FRONTEND_BASE = (
  process.env.FRONTEND_URL ||
  process.env.Frontend_URL ||
  "http://localhost:5173"
).replace(/\/$/, "");

/** Max reminders sent per job run; prevents hitting email provider hourly quota when backlog is large */
const MAX_REMINDERS_PER_RUN =
  parseInt(process.env.LESSON_REMINDER_BATCH_SIZE || "5", 10) || 5;

function buildSlotEndDate(slot) {
  const [hours, minutes] = slot.endTime.split(":").map(Number);
  const d = new Date(slot.date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

async function runLessonEndReminderJob(context = {}) {
  const now = new Date();
  const leaseOwner = context.leaseOwner || `lesson-end-reminder-${crypto.randomUUID()}`;
  const claimUntil = new Date(now.getTime() + JOB_CONFIG.emailClaimMs);
  console.log(
    `[LessonEndReminder] Tick at ${now.toISOString()} — checking for lessons that just ended`,
  );

  try {
    const bookings = await StudentBooking.find({
      "slots.booked": true,
      "slots.status": "booked",
      "slots.lessonEndReminderSent": { $ne: true },
    })
      .populate("instructorId", "firstName lastName email")
      .populate("studentId", "firstName lastName")
      .limit(JOB_CONFIG.reminderBatchSize)
      .lean();

    if (!bookings.length) {
      console.log("[LessonEndReminder] No pending reminders found.");
      return { selected: 0, processed: 0, sent: 0, errors: 0 };
    }

    // Collect all eligible slots and sort by end date DESC (most recently ended first)
    // so instructors get reminders for just-ended lessons promptly, not stuck behind old backlog
    const eligibleSlots = [];
    for (const booking of bookings) {
      const instructor = booking.instructorId;
      const student = booking.studentId;
      if (!instructor?.email) continue;

      for (const slot of booking.slots) {
        if (
          !slot.booked ||
          slot.status !== "booked" ||
          slot.lessonEndReminderSent
        )
          continue;
        const slotEnd = buildSlotEndDate(slot);
        if (slotEnd > now) continue;

        eligibleSlots.push({
          booking,
          slot,
          slotEnd,
          instructor,
          student,
        });
      }
    }
    eligibleSlots.sort((a, b) => b.slotEnd.getTime() - a.slotEnd.getTime());

    let sent = 0;
    let errors = 0;

    for (const booking of bookings) {
      const instructor = booking.instructorId;
      const student = booking.studentId;

      if (!instructor?.email) {
        continue;
      }

      const instructorName =
        `${instructor.firstName || ""} ${instructor.lastName || ""}`.trim() ||
        "Instructor";
      const studentName =
        `${student?.firstName || ""} ${student?.lastName || ""}`.trim() ||
        "Student";

      for (let i = 0; i < booking.slots.length; i++) {
        const slot = booking.slots[i];

        if (
          !slot.booked ||
          slot.status !== "booked" ||
          slot.lessonEndReminderSent
        ) {
          continue;
        }

        const slotEnd = buildSlotEndDate(slot);
        if (slotEnd > now) {
          continue;
        }

        const dashboardUrl = `${FRONTEND_BASE}/teacher-dashboard/overview`;

        try {
          const claim = await StudentBooking.updateOne(
            {
              _id: booking._id,
              slots: {
                $elemMatch: {
                  _id: slot._id,
                  booked: true,
                  status: "booked",
                  lessonEndReminderSent: { $ne: true },
                  $or: [
                    { lessonEndReminderClaimedUntil: { $exists: false } },
                    { lessonEndReminderClaimedUntil: null },
                    { lessonEndReminderClaimedUntil: { $lte: now } },
                  ],
                },
              },
            },
            {
              $set: {
                "slots.$.lessonEndReminderClaimedAt": now,
                "slots.$.lessonEndReminderClaimedUntil": claimUntil,
                "slots.$.lessonEndReminderClaimOwner": leaseOwner,
              },
              $inc: { "slots.$.lessonEndReminderAttemptCount": 1 },
            },
          );
          if (!claim.modifiedCount) continue;
          await enqueueEmailEvent({
            eventType: "lesson_completion_reminder",
            aggregateType: "BOOKING_SLOT",
            aggregateId: `${booking._id}:${slot._id}`,
            dedupeKey: `lesson-completion-reminder:${booking._id}:${slot._id}`,
            to: instructor.email,
            template: "reminder",
            data: {
              recipientName: instructorName,
              recipientRole: "instructor",
              studentName,
              status: "awaiting lesson confirmation",
              slots: [{ date: slot.date, startTime: slot.startTime, endTime: slot.endTime }],
              actionUrl: dashboardUrl,
            },
          });

          await StudentBooking.updateOne(
            { _id: booking._id, "slots._id": slot._id, "slots.lessonEndReminderClaimOwner": leaseOwner },
            {
              $set: { "slots.$.lessonEndReminderSent": true },
              $unset: { "slots.$.lessonEndReminderClaimedAt": "", "slots.$.lessonEndReminderClaimedUntil": "", "slots.$.lessonEndReminderClaimOwner": "" },
            },
          );

          sent++;
          console.log(
            `[LessonEndReminder] Email sent to ${instructor.email} for slot ${slot._id} (${slot.date} ${slot.startTime}-${slot.endTime})`,
          );
          if (sent >= MAX_REMINDERS_PER_RUN) break;
        } catch (emailErr) {
          await StudentBooking.updateOne(
            { _id: booking._id, "slots._id": slot._id, "slots.lessonEndReminderClaimOwner": leaseOwner },
            { $unset: { "slots.$.lessonEndReminderClaimedAt": "", "slots.$.lessonEndReminderClaimedUntil": "", "slots.$.lessonEndReminderClaimOwner": "" } },
          ).catch(() => {});
          errors++;
          console.error(
            `[LessonEndReminder] Failed to send email for slot ${slot._id}:`,
            emailErr.message,
          );
        }
      }
      if (sent >= MAX_REMINDERS_PER_RUN) break;
    }

    if (sent > 0 || errors > 0) {
      console.log(
        `[LessonEndReminder] Done — sent: ${sent}, errors: ${errors} (max ${MAX_REMINDERS_PER_RUN} per run to respect email quota)`,
      );
    }
    return { selected: bookings.length, processed: sent, sent, errors };
  } catch (err) {
    console.error("[LessonEndReminder] Job error:", err);
    throw err;
  }
}

module.exports = { runLessonEndReminderJob };
