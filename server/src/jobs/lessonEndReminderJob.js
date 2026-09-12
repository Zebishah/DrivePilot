const nodemailer = require("nodemailer");
const crypto = require("crypto");
const StudentBooking = require("../models/studentBooking.model");
const JOB_CONFIG = require("../config/jobConfig");

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

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildEmailHtml({
  instructorName,
  studentName,
  lessonDate,
  startTime,
  endTime,
  dashboardUrl,
}) {
  return `
  <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.05); overflow: hidden;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #4a6ee0 0%, #3b5bdb 100%); padding: 30px 40px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 22px; font-weight: 600; margin: 0;">Driving School Platform</h1>
    </div>

    <!-- Body -->
    <div style="padding: 35px 40px; color: #333333; line-height: 1.6;">
      <h2 style="color: #4a6ee0; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">
        Lesson Status Confirmation Required
      </h2>

      <p style="font-size: 16px; margin: 0 0 20px 0;">
        Hi <strong>${instructorName}</strong>,
      </p>

      <p style="font-size: 15px; margin: 0 0 25px 0;">
        Your lesson has ended and requires your confirmation. Please mark it as
        <strong>Completed</strong> or <strong>Missed</strong>.
      </p>

      <!-- Lesson Details Card -->
      <div style="background-color: #f7f9fc; border-radius: 8px; padding: 20px 24px; margin: 0 0 25px 0; border-left: 4px solid #4a6ee0;">
        <h3 style="color: #4a6ee0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 15px 0;">
          Lesson Details
        </h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #666; width: 130px;">Student</td>
            <td style="padding: 6px 0; font-size: 14px; color: #333; font-weight: 600;">${studentName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #666;">Date</td>
            <td style="padding: 6px 0; font-size: 14px; color: #333; font-weight: 600;">${lessonDate}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #666;">Time Slot</td>
            <td style="padding: 6px 0; font-size: 14px; color: #333; font-weight: 600;">${startTime} – ${endTime}</td>
          </tr>
        </table>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #4a6ee0 0%, #3b5bdb 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 36px; border-radius: 6px; letter-spacing: 0.3px;">
          Go to Dashboard
        </a>
      </div>

      <p style="font-size: 13px; color: #999; margin: 20px 0 0 0; text-align: center;">
        Please confirm the lesson status as soon as possible so that payment processing can proceed.
      </p>
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid #eaeaea; padding: 20px 40px; text-align: center; background-color: #fafafa;">
      <p style="color: #999; font-size: 13px; margin: 0 0 5px 0;">
        &copy; ${new Date().getFullYear()} Driving School Platform. All rights reserved.
      </p>
      <p style="color: #999; font-size: 12px; margin: 0;">
        If you have any questions, please contact our support team.
      </p>
    </div>
  </div>`;
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

        const html = buildEmailHtml({
          instructorName,
          studentName,
          lessonDate: formatDate(slot.date),
          startTime: slot.startTime,
          endTime: slot.endTime,
          dashboardUrl,
        });

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
          await transporter.sendMail({
            from: `"Driving School Platform" <${process.env.DOMAIN_MAIL}>`,
            to: instructor.email,
            subject: `Action Required: Confirm lesson status with ${studentName}`,
            html,
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
