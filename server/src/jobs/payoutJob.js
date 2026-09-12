const StudentBooking = require("../models/studentBooking.model");
const {
  createManualPayoutForInstructor,
  CENTIMES_PER_UNIT,
} = require("../services/stripeService");
const { createTransaction } = require("../services/transactionService");
const {
  getOrCreateOperation,
  claimOperation,
  markAttempt,
  markProviderSuccess,
  markLocalSuccess,
  markCompleted,
  markRetryable,
  markManualReview,
} = require("../services/financialOperationService");
const { retrievePayout } = require("../services/stripeService");

async function runInstructorPayoutJob() {
  const now = new Date();
  console.log(
    `[PayoutJob] Tick at ${now.toISOString()} — checking for slots eligible for instructor payout`,
  );
  const bookings = await StudentBooking.find({
    "slots.payoutStatus": { $in: ["pending", "processing"] },
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
        !["pending", "processing"].includes(slot.payoutStatus) ||
        !slot.payoutEligibleAt ||
        new Date(slot.payoutEligibleAt) > now ||
        !slot.instructorAmount
      ) {
        continue;
      }

      const payoutOperation = await getOrCreateOperation({
        operationType: "PAYOUT",
        aggregateType: "BOOKING_SLOT",
        aggregateId: `${String(booking._id)}:${String(slot._id)}`,
        bookingId: booking._id,
        slotId: slot._id,
        instructorId: instructor._id,
        currency: "CHF",
        requestedAmount: Number(slot.instructorAmount),
        idempotencyKey: `payout-${String(booking._id)}-${String(slot._id)}`,
        metadata: { bookingId: String(booking._id), slotId: String(slot._id) },
      });
      if (payoutOperation.status === "FAILED_MANUAL_REVIEW") {
        errors += 1;
        continue;
      }
      if (slot.payoutStatus === "processing" && !payoutOperation.providerObjectId) {
        await markManualReview(
          payoutOperation,
          new Error("Legacy payout was processing without a provider payout ID"),
          "legacy_processing_without_provider_id",
        );
        errors += 1;
        continue;
      }

      // Atomically claim this slot (pending -> processing) to prevent double payout when job runs concurrently
      const claimResult = slot.payoutStatus === "processing"
        ? { modifiedCount: 1 }
        : await StudentBooking.updateOne(
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
        let payoutId = payoutOperation.providerObjectId || slot.payoutId;
        if (payoutId) {
          const providerPayout = await retrievePayout(
            payoutId,
            instructor.stripeAccount.accountId,
          );
          payoutId = providerPayout.id;
          await markProviderSuccess(payoutOperation, {
            providerObjectId: payoutId,
            providerStatus: providerPayout.status,
            localStatus: "provider_succeeded",
          });
        } else {
          const claimedOperation = await claimOperation(payoutOperation);
          if (!claimedOperation) {
            errors += 1;
            continue;
          }
          await markAttempt(claimedOperation, claimedOperation.leaseOwner);
          const payoutResult = await createManualPayoutForInstructor({
            accountId: instructor.stripeAccount.accountId,
            amountCentimes,
            metadata: {
              bookingId: String(booking._id),
              slotId: String(slot._id),
              operationId: payoutOperation.operationId,
            },
            idempotencyKey: payoutOperation.idempotencyKey,
          });
          payoutId = payoutResult.payoutId;
          await markProviderSuccess(payoutOperation, {
            providerObjectId: payoutId,
            providerStatus: "pending",
            localStatus: "provider_succeeded",
          });
        }

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
          financialOperationId: payoutOperation.operationId,
          eventType: "PAYOUT_INSTRUCTOR_CREDIT",
          description: payoutDescription,
          occurredAt,
        });
        await markLocalSuccess(payoutOperation, "slot_and_transaction_applied");
        await markCompleted(payoutOperation);
        processed += 1;
      } catch (err) {
        await markRetryable(payoutOperation, err);
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
            financialOperationId: payoutOperation.operationId,
            eventType: "PAYOUT_INSTRUCTOR_CREDIT",
            description: `${payoutDescription} (test simulated)`,
            occurredAt,
          });
          await markProviderSuccess(payoutOperation, {
            providerObjectId: `test_skipped_insufficient_balance-${String(booking._id)}-${String(slot._id)}`,
            providerStatus: "simulated",
            localStatus: "provider_succeeded",
          });
          await markLocalSuccess(payoutOperation, "test_payout_simulated");
          await markCompleted(payoutOperation);
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
