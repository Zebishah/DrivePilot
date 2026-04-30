const nodemailer = require("nodemailer");
const StudentBooking = require("../models/studentBooking.model");

const FRONTEND_BASE = (
  process.env.FRONTEND_URL ||
  process.env.Frontend_URL ||
  "http://localhost:5173"
).replace(/\/$/, "");

// Reminder is sent after this many minutes from booking creation.
const REMINDER_AFTER_MINUTES =
  parseInt(process.env.ABANDONED_REMINDER_AFTER_MINUTES || "10", 10) || 10;
// Do not send reminders for bookings that are already too close to auto-cancel cleanup.
const CLEANUP_STALE_MINUTES =
  parseInt(process.env.ABANDONED_CLEANUP_STALE_MINUTES || "30", 10) || 30;

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
  holdUntilMinutes,
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
          Reservations are held for about ${holdUntilMinutes} minutes from booking start before being automatically released.
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

async function runAbandonedCheckoutReminderJob() {
  const now = new Date();
  const minAgeCutoff = new Date(now.getTime() - REMINDER_AFTER_MINUTES * 60 * 1000);
  const maxAgeCutoff = new Date(now.getTime() - CLEANUP_STALE_MINUTES * 60 * 1000);

  try {
    console.log(
      `[AbandonedCheckoutReminderJob] Tick at ${now.toISOString()} — reminderAfter=${REMINDER_AFTER_MINUTES}min, cleanupStale=${CLEANUP_STALE_MINUTES}min`,
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
    })
      .populate("studentId", "firstName lastName email")
      .populate("instructorId", "firstName lastName")
      .lean();

    if (!candidates.length) {
      console.log("[AbandonedCheckoutReminderJob] No pending incomplete checkouts eligible for reminder.");
      return;
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
      const ageMinutes = Math.floor(
        (now.getTime() - new Date(booking.createdAt).getTime()) / (60 * 1000),
      );

      const studentName =
        `${booking.studentId.firstName || ""} ${booking.studentId.lastName || ""}`.trim() ||
        "Student";
      const instructorName =
        `${booking.instructorId?.firstName || ""} ${booking.instructorId?.lastName || ""}`.trim() ||
        "your instructor";

      const resumeUrl = `${FRONTEND_BASE}/student-dashboard/book`;
      const html = buildReminderEmailHtml({
        studentName,
        instructorName,
        slots: booking.slots || [],
        resumeUrl,
        holdUntilMinutes: CLEANUP_STALE_MINUTES,
      });

      try {
        await transporter.sendMail({
          from: `"Driving School Platform" <${process.env.DOMAIN_MAIL}>`,
          to: booking.studentId.email,
          subject: "Finish your checkout to secure your lesson slot",
          html,
        });

        await StudentBooking.updateOne(
          { _id: booking._id, abandonedCheckoutReminderSentAt: { $exists: false } },
          { $set: { abandonedCheckoutReminderSentAt: new Date() } },
        );
        sent += 1;
        console.log(
          `[AbandonedCheckoutReminderJob] Sent reminder for booking ${booking._id} (age=${ageMinutes}min) to ${booking.studentId.email}`,
        );
      } catch (err) {
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
  } catch (err) {
    console.error("[AbandonedCheckoutReminderJob] Job error:", err);
  }
}

module.exports = { runAbandonedCheckoutReminderJob };
