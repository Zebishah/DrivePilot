const nodemailer = require("nodemailer");
const crypto = require("crypto");
const StudentBooking = require("../models/studentBooking.model");
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

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(timeStr) {
  const [h, m] = String(timeStr || "00:00").split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function buildReminderEmailHtml({
  studentName,
  instructorName,
  slots,
  resumeUrl,
  holdDurationPhrase,
}) {
  const slotsHtml = (slots || [])
    .map(
      (slot) => `
      <li style="margin-bottom: 8px;">
        <strong>${formatDate(slot.date)}</strong> - ${formatTime(slot.startTime)} to ${formatTime(slot.endTime)}
      </li>
    `,
    )
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e6e6e6; border-radius: 10px; overflow: hidden;">
      <div style="background: #5FC2D3; color: #fff; padding: 20px 24px;">
        <h2 style="margin: 0; font-size: 22px;">Complete your lesson checkout</h2>
      </div>
      <div style="padding: 24px; color: #222; line-height: 1.55;">
        <p style="margin-top: 0;">Hi ${studentName},</p>
        <p>You started a lesson booking with <strong>${instructorName}</strong>, but checkout was not completed yet.</p>
        <p>Your selected slot(s) are still reserved for a limited time. Complete payment now to secure this schedule.</p>
        <ul style="padding-left: 18px; margin: 14px 0;">
          ${slotsHtml}
        </ul>
        <p style="margin: 0 0 18px 0; color: #555;">
          If checkout is not completed within <strong>${holdDurationPhrase}</strong> from when you started this booking, your slot will be automatically released and this attempt will be cancelled.
        </p>
        <a href="${resumeUrl}" style="display: inline-block; background: #5FC2D3; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 7px; font-weight: 700;">
          Continue Checkout
        </a>
      </div>
      <div style="padding: 14px 24px; color: #777; font-size: 12px; border-top: 1px solid #f0f0f0;">
        Driving School Platform
      </div>
    </div>
  `;
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

    const transporter = nodemailer.createTransport({
      host: process.env.DOMAIN_HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.DOMAIN_MAIL,
        pass: process.env.DOMAIN_PASS,
      },
      connectionTimeout: 90_000,
      socketTimeout: 90_000,
    });

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
      const html = buildReminderEmailHtml({
        studentName,
        instructorName,
        slots: claimed.slots || [],
        resumeUrl,
        holdDurationPhrase,
      });

      try {
        await transporter.sendMail({
          from: `"Driving School Platform" <${process.env.DOMAIN_MAIL}>`,
          to: claimed.studentId.email,
          subject: "Finish your checkout to secure your lesson slot",
          html,
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
