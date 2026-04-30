const mongoose = require("mongoose");
const StudentBooking = require("../models/studentBooking.model");
const teacherAvailabilityModel = require("../models/teacherAvailability.model");

/** Abandoned pending: checkout started but payment/card never completed */
function isAbandonedPending(booking) {
  if (!booking || booking.status !== "pending") return false;
  if (booking.stripeCustomerId) return false;
  const slots = booking.slots || [];
  if (slots.some((s) => s && String(s.paymentStatus) === "paid")) return false;
  return true;
}

const STALE_MINUTES =
  parseInt(process.env.PENDING_CLEANUP_STALE_MINUTES || String(24 * 60), 10) ||
  24 * 60;

async function runPendingBookingCleanupJob() {
  console.log(
    `[PendingBookingCleanupJob] Tick at ${new Date().toISOString()} — staleThreshold=${STALE_MINUTES}min`,
  );
  const cutoff = new Date(Date.now() - STALE_MINUTES * 60 * 1000);
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
    .cursor();

  let cleaned = 0;
  let errors = 0;

  for await (const booking of cursor) {
    if (!isAbandonedPending(booking)) continue;

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
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
}

module.exports = { runPendingBookingCleanupJob };
