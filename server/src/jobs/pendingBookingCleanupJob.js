const mongoose = require("mongoose");
const StudentBooking = require("../models/studentBooking.model");
const teacherAvailabilityModel = require("../models/teacherAvailability.model");
const {
  getPendingCleanupStaleMinutes,
} = require("../utils/pendingBookingHoldMinutes");
const JOB_CONFIG = require("../config/jobConfig");
const { retrieveCheckoutSession, retrievePaymentIntent } = require("../services/stripeService");

/** Abandoned pending: checkout started but payment/card never completed */
function isAbandonedPending(booking) {
  if (!booking || booking.status !== "pending") return false;
  if (booking.stripeCustomerId) return false;
  const slots = booking.slots || [];
  if (slots.some((s) => s && String(s.paymentStatus) === "paid")) return false;
  return true;
}

async function providerFlowIsComplete(booking) {
  const providerIds = [
    booking.checkoutSessionId ? { type: "checkout", id: booking.checkoutSessionId } : null,
    booking.stripePaymentIntentId ? { type: "payment", id: booking.stripePaymentIntentId } : null,
    ...(booking.slots || [])
      .filter((slot) => slot.paymentIntentId)
      .map((slot) => ({ type: "payment", id: slot.paymentIntentId })),
  ].filter(Boolean);
  for (const provider of providerIds) {
    try {
      const result = provider.type === "checkout"
        ? await retrieveCheckoutSession(provider.id)
        : await retrievePaymentIntent(provider.id);
      if (
        (provider.type === "checkout" && (result?.status === "complete" || result?.payment_status === "paid")) ||
        (provider.type === "payment" && result?.status === "succeeded")
      ) {
        return { complete: true, unavailable: false };
      }
    } catch (error) {
      return { complete: false, unavailable: true, error };
    }
  }
  return { complete: false, unavailable: false };
}

async function runPendingBookingCleanupJob() {
  const staleMinutes = getPendingCleanupStaleMinutes();
  console.log(
    `[PendingBookingCleanupJob] Tick at ${new Date().toISOString()} — staleThreshold=${staleMinutes}min`,
  );
  const cutoff = new Date(Date.now() - staleMinutes * 60 * 1000);
  const cursor = StudentBooking.find({
    status: "pending",
    createdAt: { $lt: cutoff },
    $or: [
      { stripeCustomerId: { $exists: false } },
      { stripeCustomerId: null },
      { stripeCustomerId: "" },
    ],
  })
    .populate("instructorId", "_id")
    .limit(JOB_CONFIG.cleanupBatchSize)
    .cursor();

  let cleaned = 0;
  let errors = 0;

  for await (const booking of cursor) {
    if (!isAbandonedPending(booking)) continue;
    const providerState = await providerFlowIsComplete(booking);
    if (providerState.unavailable) {
      errors += 1;
      console.warn("[PendingBookingCleanupJob] Provider state unavailable; skipping", {
        bookingId: String(booking._id),
      });
      continue;
    }
    if (providerState.complete) continue;

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      if (!isAbandonedPending(booking)) {
        await session.commitTransaction();
        continue;
      }
      // Mark booking and all slots as cancelled
      booking.status = "cancelled";
      booking.cancellationDate = new Date();
      for (const slot of booking.slots || []) {
        slot.status = "cancelled";
        slot.booked = false;
        slot.cancellationDate = new Date();
      }
      await booking.save({ session });

      const teacherId = booking.instructorId?._id ?? booking.instructorId;
      if (!teacherId) {
        await session.commitTransaction();
        cleaned += 1;
        session.endSession();
        continue;
      }

      for (const slot of booking.slots || []) {
        const teacherAvailability = await teacherAvailabilityModel
          .findOne({
            teacherId,
            date: new Date(slot.date),
          })
          .session(session);

        if (!teacherAvailability) continue;

        const slotId = slot._id.toString();
        teacherAvailability.slots = teacherAvailability.slots.filter(
          (s) => s.id !== slotId,
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
      cleaned += 1;
    } catch (err) {
      await session.abortTransaction();
      console.error(
        "[PendingBookingCleanupJob] Error cleaning booking",
        booking._id,
        err,
      );
      errors += 1;
    } finally {
      session.endSession();
    }
  }

  if (cleaned > 0 || errors > 0) {
    console.log(
      `[PendingBookingCleanupJob] Done: cleaned=${cleaned} errors=${errors}`,
    );
  }
  return { processed: cleaned, cleaned, errors };
}

module.exports = { runPendingBookingCleanupJob };
