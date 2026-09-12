const crypto = require("crypto");
const StudentBooking = require("../models/studentBooking.model");
const { enqueueEmailEvent } = require("../services/outboxService");
const {
  getPendingCleanupStaleMinutes,
  describeHoldDurationMinutes,
} = require("../utils/pendingBookingHoldMinutes");
const JOB_CONFIG = require("../config/jobConfig");

const FRONTEND_BASE = (
  process.env.FRONTEND_URL ||
  process.env.Frontend_URL ||
  "http://localhost:5173"
).replace(/\/$/, "");

// First reminder: not before this many minutes after booking creation (avoid instant mail).
const REMINDER_AFTER_MINUTES =
  parseInt(process.env.ABANDONED_REMINDER_AFTER_MINUTES || "10", 10) || 10;

/** Abandoned pending: checkout started but payment/card was never completed */
function isAbandonedPending(booking) {
  if (!booking || booking.status !== "pending") return false;
  if (booking.stripeCustomerId) return false;
  const slots = booking.slots || [];
  if (slots.some((s) => s && String(s.paymentStatus) === "paid")) return false;
  return true;
}

async function runAbandonedCheckoutReminderJob(context = {}) {
  const now = new Date();
  const leaseOwner = context.leaseOwner || `abandoned-reminder-${crypto.randomUUID()}`;
  const claimUntil = new Date(now.getTime() + JOB_CONFIG.emailClaimMs);
  const holdStaleMinutes = getPendingCleanupStaleMinutes();
  const minAgeCutoff = new Date(now.getTime() - REMINDER_AFTER_MINUTES * 60 * 1000);
  // Still inside the hold window (same cutoff as pendingBookingCleanupJob uses for release).
  const maxAgeCutoff = new Date(now.getTime() - holdStaleMinutes * 60 * 1000);
  const holdDurationPhrase = describeHoldDurationMinutes(holdStaleMinutes);

  try {
    console.log(
      `[AbandonedCheckoutReminderJob] Tick at ${now.toISOString()} — reminderAfter=${REMINDER_AFTER_MINUTES}min, holdUntilCleanup=${holdStaleMinutes}min`,
    );

    const candidates = await StudentBooking.find({
      status: "pending",
      createdAt: { $lte: minAgeCutoff, $gt: maxAgeCutoff },
      abandonedCheckoutReminderSentAt: { $exists: false },
      $or: [
        { stripeCustomerId: { $exists: false } },
        { stripeCustomerId: null },
        { stripeCustomerId: "" },
      ],
      $and: [
        {
          $or: [
            { abandonedCheckoutReminderClaimedUntil: { $exists: false } },
            { abandonedCheckoutReminderClaimedUntil: null },
            { abandonedCheckoutReminderClaimedUntil: { $lte: now } },
          ],
        },
      ],
    })
      .populate("studentId", "firstName lastName email")
      .populate("instructorId", "firstName lastName")
      .limit(JOB_CONFIG.reminderBatchSize)
      .lean();

    if (!candidates.length) {
      console.log("[AbandonedCheckoutReminderJob] No pending incomplete checkouts eligible for reminder.");
      return { selected: 0, processed: 0, sent: 0, errors: 0 };
    }

    let sent = 0;
    let errors = 0;

    for (const booking of candidates) {
      if (!isAbandonedPending(booking)) continue;
      if (!booking.studentId?.email) continue;
      const claimed = await StudentBooking.findOneAndUpdate(
        {
          _id: booking._id,
          status: "pending",
          abandonedCheckoutReminderSentAt: { $exists: false },
          $or: [
            { abandonedCheckoutReminderClaimedUntil: { $exists: false } },
            { abandonedCheckoutReminderClaimedUntil: null },
            { abandonedCheckoutReminderClaimedUntil: { $lte: now } },
          ],
        },
        {
          $set: {
            abandonedCheckoutReminderClaimedAt: now,
            abandonedCheckoutReminderClaimedUntil: claimUntil,
            abandonedCheckoutReminderClaimOwner: leaseOwner,
          },
          $inc: { abandonedCheckoutReminderAttemptCount: 1 },
        },
        { new: true },
      ).lean();
      if (!claimed) continue;
      const ageMinutes = Math.floor(
        (now.getTime() - new Date(claimed.createdAt).getTime()) / (60 * 1000),
      );

      const studentName =
        `${claimed.studentId.firstName || ""} ${claimed.studentId.lastName || ""}`.trim() ||
        "Student";
      const instructorName =
        `${claimed.instructorId?.firstName || ""} ${claimed.instructorId?.lastName || ""}`.trim() ||
        "your instructor";

      const resumeUrl = `${FRONTEND_BASE}/student-dashboard/book`;
      try {
        await enqueueEmailEvent({
          eventType: "abandoned_checkout_reminder",
          aggregateType: "BOOKING",
          aggregateId: claimed._id,
          dedupeKey: `abandoned-checkout:${claimed._id}`,
          to: claimed.studentId.email,
          template: "reminder",
          data: {
            recipientName: studentName,
            recipientRole: "student",
            instructorName,
            status: "awaiting checkout",
            slots: (claimed.slots || []).map((slot) => ({ date: slot.date, startTime: slot.startTime, endTime: slot.endTime })),
            actionUrl: resumeUrl,
            reason: `Complete checkout within ${holdDurationPhrase} to keep the reservation.`,
          },
        });

        await StudentBooking.updateOne(
          { _id: claimed._id, abandonedCheckoutReminderSentAt: { $exists: false }, abandonedCheckoutReminderClaimOwner: leaseOwner },
          {
            $set: { abandonedCheckoutReminderSentAt: new Date() },
            $unset: { abandonedCheckoutReminderClaimedAt: "", abandonedCheckoutReminderClaimedUntil: "", abandonedCheckoutReminderClaimOwner: "" },
          },
        );
        sent += 1;
        console.log(
          `[AbandonedCheckoutReminderJob] Sent reminder for booking ${booking._id} (age=${ageMinutes}min) to ${booking.studentId.email}`,
        );
      } catch (err) {
        await StudentBooking.updateOne(
          { _id: claimed._id, abandonedCheckoutReminderClaimOwner: leaseOwner },
          { $unset: { abandonedCheckoutReminderClaimedAt: "", abandonedCheckoutReminderClaimedUntil: "", abandonedCheckoutReminderClaimOwner: "" } },
        ).catch(() => {});
        errors += 1;
        console.error(
          `[AbandonedCheckoutReminderJob] Failed for booking ${booking._id}:`,
          err.message,
        );
      }
    }

    if (sent > 0 || errors > 0) {
      console.log(
        `[AbandonedCheckoutReminderJob] Done — sent=${sent} errors=${errors}`,
      );
    }
    return { selected: candidates.length, processed: sent, sent, errors };
  } catch (err) {
    console.error("[AbandonedCheckoutReminderJob] Job error:", err);
    throw err;
  }
}

module.exports = { runAbandonedCheckoutReminderJob };
