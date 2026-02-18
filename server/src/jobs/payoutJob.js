const StudentBooking = require("../models/studentBooking.model");
const {
  createTransferToInstructor,
  CENTIMES_PER_UNIT,
} = require("../services/stripeService");

async function runInstructorPayoutJob() {
  const now = new Date();
  const bookings = await StudentBooking.find({
    "slots.payoutStatus": "pending",
    "slots.payoutEligibleAt": { $lte: now },
    "slots.paymentStatus": "paid",
    "slots.instructorAmount": { $gt: 0 },
  })
    .populate("instructorId", "stripeAccount commission")
    .lean();

  let processed = 0;
  let errors = 0;

  for (const booking of bookings) {
    const instructor = booking.instructorId;
    if (!instructor?.stripeAccount?.accountId) {
      errors += 1;
      continue;
    }

    for (let i = 0; i < booking.slots.length; i++) {
      const slot = booking.slots[i];
      if (
        slot.payoutStatus !== "pending" ||
        !slot.payoutEligibleAt ||
        new Date(slot.payoutEligibleAt) > now ||
        !slot.instructorAmount
      ) {
        continue;
      }

      try {
        const amountCentimes = Math.round(
          Number(slot.instructorAmount) * CENTIMES_PER_UNIT,
        );
        const { transferId } = await createTransferToInstructor({
          amountCentimes,
          destinationAccountId: instructor.stripeAccount.accountId,
          metadata: {
            bookingId: String(booking._id),
            slotId: String(slot._id),
          },
        });

        await StudentBooking.updateOne(
          { _id: booking._id },
          {
            $set: {
              [`slots.${i}.payoutStatus`]: "completed",
              [`slots.${i}.payoutId`]: transferId,
              [`slots.${i}.payoutDate`]: new Date(),
              updatedAt: new Date(),
            },
          },
        );
        processed += 1;
      } catch (err) {
        console.error(
          `Payout failed for booking ${booking._id} slot ${slot._id}:`,
          err.message,
        );
        errors += 1;
      }
    }
  }

  if (processed > 0 || errors > 0) {
    console.log(
      `[PayoutJob] Processed ${processed} slot(s), ${errors} error(s)`,
    );
  }
  return { processed, errors };
}

module.exports = { runInstructorPayoutJob };
