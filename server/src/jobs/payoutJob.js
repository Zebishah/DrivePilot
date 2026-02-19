const StudentBooking = require("../models/studentBooking.model");
const {
  createManualPayoutForInstructor,
  CENTIMES_PER_UNIT,
} = require("../services/stripeService");
const { createTransaction } = require("../services/transactionService");

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
        const { payoutId } = await createManualPayoutForInstructor({
          accountId: instructor.stripeAccount.accountId,
          amountCentimes,
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
              [`slots.${i}.payoutId`]: payoutId,
              [`slots.${i}.payoutDate`]: new Date(),
              updatedAt: new Date(),
            },
          },
        );
        const occurredAt = new Date();
        await createTransaction({
          type: "payout",
          role: "instructor",
          direction: "credit",
          amount: Number(slot.instructorAmount),
          currency: "CHF",
          status: "succeeded",
          bookingId: booking._id,
          slotId: slot._id,
          instructorId: instructor._id,
          stripePayoutId: payoutId,
          description: "Payout to bank for completed lesson",
          occurredAt,
        });
        processed += 1;
      } catch (err) {
        const isInsufficientFunds =
          err.message &&
          (err.message.includes("insufficient funds") ||
            err.message.includes("balance is too low"));
        if (isInsufficientFunds && process.env.NODE_ENV !== "production") {
          await StudentBooking.updateOne(
            { _id: booking._id },
            {
              $set: {
                [`slots.${i}.payoutStatus`]: "completed",
                [`slots.${i}.payoutId`]: "test_skipped_insufficient_balance",
                [`slots.${i}.payoutDate`]: new Date(),
                updatedAt: new Date(),
              },
            },
          );
          const occurredAt = new Date();
          await createTransaction({
            type: "payout",
            role: "instructor",
            direction: "credit",
            amount: Number(slot.instructorAmount),
            currency: "CHF",
            status: "succeeded",
            bookingId: booking._id,
            slotId: slot._id,
            instructorId: instructor._id,
            stripePayoutId: "test_skipped_insufficient_balance",
            description: "Payout to bank for completed lesson (test simulated)",
            occurredAt,
          });
          console.log(
            `[PayoutJob] Test mode: simulated payout for booking ${booking._id} slot ${slot._id}`,
          );
          processed += 1;
        } else {
          console.error(
            `Payout failed for booking ${booking._id} slot ${slot._id}:`,
            err.message,
          );
          errors += 1;
        }
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
