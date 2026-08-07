const mongoose = require("mongoose");
const StudentBooking = require("../models/studentBooking.model");
const teacherAvailabilityModel = require("../models/teacherAvailability.model");
const { sendBookingEmail } = require("../utils/SendOtpEmail");
const { shouldAutoCancelUnpaidSlot, shouldCancelUnpaidPastLesson } = require("../utils/checkoutPaymentGuard");
const { getSlotEndTimestampUtc } = require("../utils/slotTimezone");

const GRACE_WINDOW_MS = 24 * 60 * 60 * 1000;
const SECOND_REMINDER_AFTER_MS = 12 * 60 * 60 * 1000;
const THIRD_REMINDER_AFTER_MS = 18 * 60 * 60 * 1000;

function buildReminderMilestones(baseDate) {
  const baseMs = new Date(baseDate).getTime();
  return {
    secondReminderAt: new Date(baseMs + SECOND_REMINDER_AFTER_MS),
    thirdReminderAt: new Date(baseMs + THIRD_REMINDER_AFTER_MS),
    deadlineAt: new Date(baseMs + GRACE_WINDOW_MS),
  };
}

/**
 * Only auto-cancel when we know the real 24h payment window start.
 * Never invent "lesson time - 48h" — that cancels same-day / late 3DS immediately.
 */
function resolveT48PaymentWindow(slot) {
  const startedAt =
    slot.paymentReminderStartedAt ||
    slot.paymentReminder1SentAt ||
    slot.chargedAt ||
    null;
  if (!startedAt) return null;
  const started = new Date(startedAt);
  if (Number.isNaN(started.getTime())) return null;
  const milestones = buildReminderMilestones(started);
  const deadlineAt = slot.paymentReminderDeadlineAt
    ? new Date(slot.paymentReminderDeadlineAt)
    : milestones.deadlineAt;
  if (Number.isNaN(deadlineAt.getTime())) return null;
  return { startedAt: started, deadlineAt, milestones };
}

async function sendStudentReminderEmail(bookingId, slotId, reminderNumber) {
  const booking = await StudentBooking.findById(bookingId)
    .populate(
      "instructorId",
      "_id firstName lastName email phone description profileImage address",
    )
    .populate(
      "studentId",
      "_id firstName lastName email phone profileImage homeAddress",
    );

  if (!booking?.studentId?.email) return false;

  const slot = booking.slots.id(slotId);
  if (!slot) return false;
  if (!["requires_action", "payment_failed"].includes(slot.paymentStatus)) {
    return false;
  }

  const recipients = [
    {
      email: booking.studentId.email,
      role: "student",
      name:
        `${booking.studentId.firstName || ""} ${booking.studentId.lastName || ""}`.trim() ||
        "Student",
    },
  ];

  await sendBookingEmail(
    recipients,
    {
      id: booking._id,
      status: booking.status,
      slots: [slot],
      totalAmount: booking.totalAmount,
      finalAmount: booking.finalAmount,
      studentAddress: booking.studentId?.homeAddress,
      instructorAddress: booking.instructorId?.address,
      student: booking.studentId,
      instructor: booking.instructorId,
    },
    slot.paymentStatus === "requires_action"
      ? "payment_requires_action"
      : "payment_failed",
  );

  const now = new Date();
  const setFields = {};
  if (reminderNumber === 1) {
    const milestones = buildReminderMilestones(now);
    setFields["slots.$.paymentReminderStartedAt"] = now;
    setFields["slots.$.paymentReminderDeadlineAt"] = milestones.deadlineAt;
    setFields["slots.$.paymentReminder1SentAt"] = now;
  } else if (reminderNumber === 2) {
    setFields["slots.$.paymentReminder2SentAt"] = now;
  } else if (reminderNumber === 3) {
    setFields["slots.$.paymentReminder3SentAt"] = now;
  } else {
    return false;
  }

  await StudentBooking.updateOne(
    {
      _id: booking._id,
      slots: {
        $elemMatch: {
          _id: slot._id,
          paymentStatus: { $in: ["requires_action", "payment_failed"] },
        },
      },
    },
    { $set: setFields },
  );

  return true;
}

async function cancelSlotAndReleaseAvailability(bookingId, slotId) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const booking = await StudentBooking.findById(bookingId)
      .populate("instructorId", "_id firstName lastName email phone")
      .populate("studentId", "_id firstName lastName email phone")
      .session(session);

    if (!booking) {
      await session.abortTransaction();
      return false;
    }

    const slot = booking.slots.id(slotId);
    if (!slot) {
      await session.abortTransaction();
      return false;
    }

    if (slot.status === "cancelled" || slot.booked === false) {
      await session.commitTransaction();
      return false;
    }

    if (slot.paymentStatus === "paid") {
      await session.commitTransaction();
      return false;
    }

    slot.status = "cancelled";
    slot.booked = false;
    slot.cancellationDate = new Date();
    slot.cancelledBy = "admin";

    const allSlotsCancelled = booking.slots.every((s) => s.status === "cancelled");
    if (allSlotsCancelled) {
      booking.status = "cancelled";
      booking.cancellationDate = new Date();
    } else {
      booking.status = "semi_cancelled";
    }

    await booking.save({ session });

    const teacherAvailability = await teacherAvailabilityModel
      .findOne({
        teacherId: booking.instructorId._id,
        date: new Date(slot.date),
      })
      .session(session);

    if (teacherAvailability) {
      const slotIdString = String(slotId);
      teacherAvailability.slots = teacherAvailability.slots.filter(
        (s) => s.id !== slotIdString,
      );

      const existingAvailable = teacherAvailability.availableSlots.find(
        (s) =>
          s.date === slot.date &&
          s.startTime === slot.startTime &&
          s.endTime === slot.endTime,
      );

      if (existingAvailable) {
        existingAvailable.booked = false;
        existingAvailable.status = "available";
      } else {
        teacherAvailability.availableSlots.push({
          id: new mongoose.Types.ObjectId().toString(),
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          booked: false,
          status: "available",
        });
      }

      const hasAvailable = teacherAvailability.availableSlots.some(
        (s) => s.booked === false,
      );
      teacherAvailability.status = hasAvailable ? "available" : "booked";
      await teacherAvailability.save({ session });
    }

    await session.commitTransaction();
    return true;
  } catch (err) {
    await session.abortTransaction();
    console.error(
      `[T48PaymentReminderJob] Failed cancellation for booking ${bookingId} slot ${slotId}:`,
      err,
    );
    return false;
  } finally {
    session.endSession();
  }
}

async function runT48PaymentReminderJob() {
  const now = new Date();
  console.log(`[T48PaymentReminderJob] Tick at ${now.toISOString()}`);

  const bookings = await StudentBooking.find({
    status: { $in: ["pending", "confirmed", "semi_cancelled"] },
    slots: {
      $elemMatch: {
        status: { $ne: "cancelled" },
        paymentStatus: {
          $in: ["requires_action", "payment_failed", "pending_payment"],
        },
      },
    },
  })
    .select("_id status slots paymentMethod stripeCustomerId")
    .lean();

  let secondSent = 0;
  let thirdSent = 0;
  let cancelled = 0;

  for (const booking of bookings) {
    for (const slot of booking.slots || []) {
      if (slot.status === "cancelled" || slot.booked === false) continue;
      if (
        !["requires_action", "payment_failed", "pending_payment"].includes(
          slot.paymentStatus,
        )
      ) {
        continue;
      }

      const window = resolveT48PaymentWindow(slot);
      if (
        window &&
        ["requires_action", "payment_failed"].includes(slot.paymentStatus)
      ) {
        const { milestones } = window;

        if (!slot.paymentReminder2SentAt && now >= milestones.secondReminderAt) {
          const sent = await sendStudentReminderEmail(booking._id, slot._id, 2);
          if (sent) secondSent += 1;
        }

        if (!slot.paymentReminder3SentAt && now >= milestones.thirdReminderAt) {
          const sent = await sendStudentReminderEmail(booking._id, slot._id, 3);
          if (sent) thirdSent += 1;
        }
      }

      const slotEndMs = getSlotEndTimestampUtc(slot.date, slot.endTime);
      const shouldCancel =
        shouldAutoCancelUnpaidSlot({ booking, slot, now }) ||
        shouldCancelUnpaidPastLesson({ booking, slot, slotEndMs, now });

      if (shouldCancel) {
        const wasCancelled = await cancelSlotAndReleaseAvailability(
          booking._id,
          slot._id,
        );
        if (wasCancelled) cancelled += 1;
      }
    }
  }

  console.log(
    `[T48PaymentReminderJob] Done — reminder2=${secondSent}, reminder3=${thirdSent}, autoCancelled=${cancelled}`,
  );

  return { secondSent, thirdSent, cancelled };
}

module.exports = {
  runT48PaymentReminderJob,
  sendStudentReminderEmail,
  buildReminderMilestones,
  resolveT48PaymentWindow,
};
