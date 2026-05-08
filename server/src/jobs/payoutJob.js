const StudentBooking = require("../models/studentBooking.model");
const {
  createManualPayoutForInstructor,
  CENTIMES_PER_UNIT,
} = require("../services/stripeService");
const { createTransaction } = require("../services/transactionService");

async function runInstructorPayoutJob() {
  const now = new Date();
  console.log(
    `[PayoutJob] Tick at ${now.toISOString()} — checking for slots eligible for instructor payout`,
  );
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

      // Atomically claim this slot (pending -> processing) to prevent double payout when job runs concurrently
      const claimResult = await StudentBooking.updateOne(
        {
          _id: booking._id,
          "slots._id": slot._id,
          "slots.payoutStatus": "pending",
          "slots.payoutEligibleAt": { $lte: now },
        },
        {
          $set: {
            "slots.$.payoutStatus": "processing",
            updatedAt: new Date(),
          },
        },
      );
      if (claimResult.modifiedCount === 0) {
        continue; // Another process claimed it or already paid out
      }

      try {
        const normalizedLessonStatus = String(slot.status || "").toLowerCase();
        const isMissedLesson = normalizedLessonStatus === "missed";
        const payoutDescription = isMissedLesson
          ? "Payout to bank for missed lesson"
          : "Payout to bank for completed lesson";
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
          { _id: booking._id, "slots._id": slot._id },
          {
            $set: {
              "slots.$.payoutStatus": "completed",
              "slots.$.payoutId": payoutId,
              "slots.$.payoutDate": new Date(),
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
          description: payoutDescription,
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
            { _id: booking._id, "slots._id": slot._id },
            {
              $set: {
                "slots.$.payoutStatus": "completed",
                "slots.$.payoutId": "test_skipped_insufficient_balance",
                "slots.$.payoutDate": new Date(),
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
            description: `${payoutDescription} (test simulated)`,
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
          // Reset to pending so a future run can retry
          await StudentBooking.updateOne(
            { _id: booking._id, "slots._id": slot._id },
            {
              $set: {
                "slots.$.payoutStatus": "pending",
                updatedAt: new Date(),
              },
            },
          ).catch(() => {});
          errors += 1;
        }
      }
    }
  }

  console.log(`[PayoutJob] Done. processed=${processed}, errors=${errors}`);
  return { processed, errors };
}

module.exports = { runInstructorPayoutJob };
