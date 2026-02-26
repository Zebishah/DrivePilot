const StudentBooking = require("../models/studentBooking.model");
const {
  createPaymentIntentForBooking,
  retrievePaymentIntent,
  CENTIMES_PER_UNIT,
} = require("../services/stripeService");
const { createTransaction } = require("../services/transactionService");
const { Admin, Instructor } = require("../models/User");
const { getCommissionSplit } = require("../services/stripeService");
const { notifyBookingParties } = require("../utils/SendOtpEmail");

/** Max T-48 charge retries before marking slot payment_failed (0, 1, 2 = 3 attempts) */
const T48_MAX_RETRIES = 2;

/** Query to match a specific slot that is still pending_payment (prevents race / double-process) */
function slotStillPendingFilter(bookingId, slotId) {
  return {
    _id: bookingId,
    slots: {
      $elemMatch: {
        _id: slotId,
        paymentStatus: "pending_payment",
      },
    },
  };
}

/**
 * Run T-48 charge job.
 * For each slot whose start time is within 48h and still pending_payment,
 * attempt to charge using the saved payment method on the booking.
 * Uses idempotency keys, conditional updates, and retry logic to avoid double charge and races.
 */
async function runT48ChargeJob() {
  const now = new Date();
  const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

  console.log(
    `[T48ChargeJob] Tick at ${now.toISOString()} — checking for slots due for T-48 charge`,
  );

  // Find bookings that have at least one pending_payment slot and a saved payment method
  const bookings = await StudentBooking.find({
    "slots.paymentStatus": "pending_payment",
    "paymentMethod.paymentMethodId": { $exists: true, $ne: null },
  })
    .populate("instructorId", "stripeAccount commission firstName lastName")
    .populate("studentId", "_id")
    .lean();

  if (!bookings.length) {
    console.log(
      "[T48ChargeJob] No bookings with pending_payment slots and saved payment method.",
    );
    return { processed: 0, requiresAction: 0, failed: 0 };
  }

  console.log(
    `[T48ChargeJob] Found ${bookings.length} booking(s) with pending_payment slots. Scanning each slot for T-48 window...`,
  );

  const admin = await Admin.findOne().lean();
  const platformCommission = admin?.platformCommission || {};

  let processed = 0;
  let requiresAction = 0;
  let failed = 0;

  for (const booking of bookings) {
    const instructor = booking.instructorId;
    if (!instructor?.stripeAccount?.accountId) {
      continue;
    }

    const totalAmount = Number(booking.finalAmount || booking.totalAmount || 0);
    const numSlots = booking.slots.length || 1;
    const perSlotAmount = numSlots > 0 ? totalAmount / numSlots : 0;

    for (let i = 0; i < booking.slots.length; i++) {
      const slot = booking.slots[i];
      if (slot.paymentStatus !== "pending_payment") continue;

      const slotStart = new Date(`${slot.date}T${slot.startTime}`);
      const chargeTime = new Date(slotStart.getTime() - FORTY_EIGHT_HOURS_MS);
      if (chargeTime > now) {
        console.log(
          `[T48ChargeJob] Slot ${slot._id} (${slot.date} ${slot.startTime}): not yet in T-48 window (chargeTime ${chargeTime.toISOString()} > now). Skipping.`,
        );
        continue;
      }

      if (!booking.stripeCustomerId) {
        console.warn(
          `[T48ChargeJob] Booking ${booking._id} has no stripeCustomerId; cannot charge off-session. Marking slot ${slot._id} as payment_failed. (Student should re-book with current flow so card is saved to a customer.)`,
        );
        const r = await StudentBooking.updateOne(
          slotStillPendingFilter(booking._id, slot._id),
          { $set: { "slots.$.paymentStatus": "payment_failed" } },
        );
        if (r.modifiedCount) failed += 1;
        continue;
      }

      console.log(
        `[T48ChargeJob] Charging slot ${slot._id} for booking ${booking._id} — lesson ${slot.date} ${slot.startTime}, amount CHF ${perSlotAmount.toFixed(2)}`,
      );

      try {
        const { dspCommission, instructorAmount } = getCommissionSplit(
          perSlotAmount,
          instructor,
          platformCommission,
        );

        const amountCentimes = Math.round(perSlotAmount * CENTIMES_PER_UNIT);
        const instructorShareCentimes = Math.round(
          Number(instructorAmount) * CENTIMES_PER_UNIT,
        );

        const idempotencyKey = `t48-${String(booking._id)}-${String(slot._id)}`;

        const paymentResult = await createPaymentIntentForBooking({
          amountCentimes,
          paymentMethodId: booking.paymentMethod.paymentMethodId,
          customerId: booking.stripeCustomerId || undefined,
          metadata: {
            bookingId: String(booking._id),
            slotId: String(slot._id),
            studentId: String(booking.studentId),
            instructorId: String(instructor._id),
          },
          confirm: true,
          offSession: true,
          transferData: {
            destinationAccountId: instructor.stripeAccount.accountId,
            amountCentimes: instructorShareCentimes,
          },
          idempotencyKey,
        });

        if (paymentResult.requiresAction) {
          console.log(
            `[T48ChargeJob] Slot ${slot._id}: requires_action (3DS). Marked slot; student must complete payment.`,
          );
          const r = await StudentBooking.updateOne(
            slotStillPendingFilter(booking._id, slot._id),
            {
              $set: {
                "slots.$.paymentStatus": "requires_action",
                "slots.$.paymentIntentId": paymentResult.paymentIntentId,
              },
            },
          );
          if (r.modifiedCount) {
            requiresAction += 1;
            // Send email to student/instructor/admin so they know action is required
            try {
              const fullBooking = await StudentBooking.findById(booking._id)
                .populate(
                  "instructorId",
                  "_id firstName lastName email phone description profileImage address",
                )
                .populate(
                  "studentId",
                  "_id firstName lastName email phone profileImage homeAddress",
                );
              if (fullBooking) {
                await notifyBookingParties(
                  JSON.parse(JSON.stringify(fullBooking)),
                  "payment_requires_action",
                );
              }
            } catch (emailErr) {
              console.error(
                "[T48ChargeJob] Failed to send payment_requires_action email:",
                emailErr,
              );
            }
          }
          continue;
        }

        if (paymentResult.status !== "succeeded") {
          const r = await StudentBooking.updateOne(
            slotStillPendingFilter(booking._id, slot._id),
            {
              $set: {
                "slots.$.paymentStatus": "payment_failed",
              },
            },
          );
          if (r.modifiedCount) {
            console.log(
              `[T48ChargeJob] Slot ${slot._id}: payment status "${paymentResult.status}" — marked payment_failed.`,
            );
            failed += 1;
          }
          continue;
        }

        const occurredAt = new Date();

        // Conditional update: only set paid if slot is still pending_payment (prevents double-process / race)
        const updateResult = await StudentBooking.updateOne(
          slotStillPendingFilter(booking._id, slot._id),
          {
            $set: {
              "slots.$.paymentStatus": "paid",
              "slots.$.paymentIntentId": paymentResult.paymentIntentId,
              "slots.$.chargedAt": occurredAt,
              "slots.$.chargeAmount": perSlotAmount,
              "slots.$.dspCommission": dspCommission,
              "slots.$.instructorAmount": instructorAmount,
              "slots.$.payoutStatus": "not_applicable",
            },
          },
        );

        if (updateResult.modifiedCount === 0) {
          console.log(
            `[T48ChargeJob] Slot ${slot._id}: already updated by another process; skipping transactions.`,
          );
          continue;
        }

        console.log(
          `[T48ChargeJob] Slot ${slot._id}: payment succeeded. Updated slot + created transactions.`,
        );

        // Create transactions only when we actually claimed the slot (no double ledger)
        await createTransaction({
          type: "payment",
          role: "student",
          direction: "debit",
          amount: perSlotAmount,
          currency: "CHF",
          status: "succeeded",
          bookingId: booking._id,
          slotId: slot._id,
          studentId: booking.studentId,
          stripePaymentIntentId: paymentResult.paymentIntentId,
          description: "Lesson payment (T-48 charge)",
          occurredAt,
        });

        await createTransaction({
          type: "payment",
          role: "platform",
          direction: "credit",
          amount: perSlotAmount,
          currency: "CHF",
          status: "succeeded",
          bookingId: booking._id,
          slotId: slot._id,
          studentId: booking.studentId,
          instructorId: instructor._id,
          stripePaymentIntentId: paymentResult.paymentIntentId,
          description: "Platform gross receipt for lesson (T-48)",
          occurredAt,
        });

        if (instructorAmount != null) {
          await createTransaction({
            type: "payment",
            role: "instructor",
            direction: "credit",
            amount: instructorAmount,
            currency: "CHF",
            status: "succeeded",
            bookingId: booking._id,
            slotId: slot._id,
            instructorId: instructor._id,
            studentId: booking.studentId,
            stripePaymentIntentId: paymentResult.paymentIntentId,
            description: "Instructor share for lesson (T-48)",
            occurredAt,
          });
        }

        if (dspCommission != null) {
          await createTransaction({
            type: "payment",
            role: "platform",
            direction: "credit",
            amount: dspCommission,
            currency: "CHF",
            status: "succeeded",
            bookingId: booking._id,
            slotId: slot._id,
            studentId: booking.studentId,
            description: "Platform commission for lesson (T-48)",
            occurredAt,
          });
        }

        processed += 1;

        // When all slots are paid, keep booking consistent (status confirmed, last PI for refund reference)
        const updated = await StudentBooking.findById(booking._id).lean();
        const allPaid =
          updated?.slots?.length &&
          updated.slots.every((s) => s.paymentStatus === "paid");
        if (allPaid) {
          await StudentBooking.updateOne(
            { _id: booking._id },
            {
              $set: {
                status: "confirmed",
                stripePaymentIntentId: paymentResult.paymentIntentId,
                updatedAt: new Date(),
              },
            },
          );
        }
      } catch (err) {
        console.error(
          `[T48ChargeJob] Failed for booking ${booking._id} slot ${slot._id}:`,
          err.message,
        );

        // "This transaction requires authentication" = 3DS needed; show Complete payment immediately (no retries)
        const requiresAuth =
          err.message &&
          String(err.message).toLowerCase().includes("requires authentication");
        const paymentIntentId =
          err.payment_intent?.id ||
          (typeof err.payment_intent === "string" ? err.payment_intent : null) ||
          err.raw?.payment_intent?.id ||
          (typeof err.raw?.payment_intent === "string"
            ? err.raw.payment_intent
            : null);

        if (requiresAuth) {
          let piIdToUse = paymentIntentId;
          if (paymentIntentId) {
            try {
              const pi = await retrievePaymentIntent(paymentIntentId);
              if (pi && pi.status !== "requires_action") piIdToUse = null;
            } catch (_) {
              piIdToUse = null;
            }
          }
          const updateFields = {
            "slots.$.paymentStatus": "requires_action",
          };
          if (piIdToUse) updateFields["slots.$.paymentIntentId"] = piIdToUse;
          const r = await StudentBooking.updateOne(
            slotStillPendingFilter(booking._id, slot._id),
            { $set: updateFields },
          );
          if (r.modifiedCount) {
            console.log(
              `[T48ChargeJob] Slot ${slot._id}: requires_action (3DS). Marked slot; student must complete payment.`,
            );
            requiresAction += 1;
            try {
              const fullBooking = await StudentBooking.findById(booking._id)
                .populate(
                  "instructorId",
                  "_id firstName lastName email phone description profileImage address",
                )
                .populate(
                  "studentId",
                  "_id firstName lastName email phone profileImage homeAddress",
                );
              if (fullBooking) {
                await notifyBookingParties(
                  JSON.parse(JSON.stringify(fullBooking)),
                  "payment_requires_action",
                );
              }
            } catch (emailErr) {
              console.error(
                "[T48ChargeJob] Failed to send payment_requires_action email:",
                emailErr,
              );
            }
          }
          continue;
        }

        const retryCount = slot.paymentRetryCount ?? 0;
        if (retryCount < T48_MAX_RETRIES) {
          const retryResult = await StudentBooking.updateOne(
            slotStillPendingFilter(booking._id, slot._id),
            {
              $set: {
                "slots.$.paymentRetryCount": retryCount + 1,
              },
            },
          );
          if (retryResult.modifiedCount) {
            console.log(
              `[T48ChargeJob] Slot ${slot._id}: retry ${retryCount + 1}/${T48_MAX_RETRIES + 1}; will retry next run.`,
            );
          }
        } else {
          const failResult = await StudentBooking.updateOne(
            slotStillPendingFilter(booking._id, slot._id),
            {
              $set: {
                "slots.$.paymentStatus": "payment_failed",
              },
            },
          );
          if (failResult.modifiedCount) {
            console.log(
              `[T48ChargeJob] Slot ${slot._id}: max retries reached; marked payment_failed.`,
            );
            failed += 1;
          }
        }
      }
    }
  }

  console.log(
    `[T48ChargeJob] Done. charged=${processed}, requires_action=${requiresAction}, failed=${failed}`,
  );

  return { processed, requiresAction, failed };
}

module.exports = { runT48ChargeJob };
