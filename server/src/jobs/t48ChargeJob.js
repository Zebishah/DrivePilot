const StudentBooking = require("../models/studentBooking.model");
const {
  createPaymentIntentForBooking,
  retrievePaymentIntent,
} = require("../services/stripeService");
const { createTransaction } = require("../services/transactionService");
const { Admin, Instructor } = require("../models/User");
const { fromMinorUnits, getBookingMoneySnapshot } = require("../utils/money");
const { getSlotStartTimestampUtc } = require("../utils/slotTimezone");
const { sendStudentReminderEmail } = require("./t48PaymentReminderJob");
const { shouldSkipT48Charge } = require("../utils/checkoutPaymentGuard");
const {
  getOrCreateOperation,
  claimOperation,
  markAttempt,
  markProviderSuccess,
  markLocalSuccess,
  markCompleted,
  markRetryable,
} = require("../services/financialOperationService");
const JOB_CONFIG = require("../config/jobConfig");
const { logger, classifyError } = require("../utils/logger");

/** Max T-48 charge retries before marking slot payment_failed (0, 1, 2 = 3 attempts) */
const T48_MAX_RETRIES = 2;
const PAYMENT_REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

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

function buildReminderStartAndDeadline(now = new Date()) {
  const startedAt = now;
  const deadlineAt = new Date(startedAt.getTime() + PAYMENT_REMINDER_WINDOW_MS);
  return { startedAt, deadlineAt };
}

/**
 * Run T-48 charge job.
 * For each slot whose start time is within 48h and still pending_payment,
 * attempt to charge using the saved payment method on the booking.
 * Uses idempotency keys, conditional updates, and retry logic to avoid double charge and races.
 */
async function runT48ChargeJob(context = {}) {
  const now = new Date();
  const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

  logger.info("t48_charge_job_started", { jobName: "T48ChargeJob" });

  // Find bookings that have at least one pending_payment slot and a saved payment method
  const bookings = await StudentBooking.find({
    "slots.paymentStatus": "pending_payment",
    "paymentMethod.paymentMethodId": { $regex: /^pm_/ },
  })
    .populate("instructorId", "stripeAccount firstName lastName commission")
    .populate("studentId", "_id")
    .limit(JOB_CONFIG.t48BatchSize)
    .lean();

  if (!bookings.length) {
    logger.info("t48_charge_job_empty", { jobName: "T48ChargeJob" });
    return { selected: 0, processed: 0, requiresAction: 0, failed: 0 };
  }

  logger.info("t48_charge_candidates_selected", { jobName: "T48ChargeJob", selected: bookings.length });

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

    const bookingMoney = getBookingMoneySnapshot({
      booking,
      instructor,
      platformSettings: platformCommission,
    });

    for (let i = 0; i < booking.slots.length; i++) {
      const slot = booking.slots[i];
      if (shouldSkipT48Charge({ booking, slot })) continue;

      const slotStartUtcMs = getSlotStartTimestampUtc(
        slot.date,
        slot.startTime,
      );
      if (!Number.isFinite(slotStartUtcMs)) {
        logger.warn("t48_slot_time_invalid", { jobName: "T48ChargeJob", bookingId: booking._id, slotId: slot._id });
        continue;
      }
      const chargeTimeUtcMs = slotStartUtcMs - FORTY_EIGHT_HOURS_MS;
      if (chargeTimeUtcMs > now.getTime()) {
        const chargeTimeIso = new Date(chargeTimeUtcMs).toISOString();
        logger.info("t48_slot_not_due", { jobName: "T48ChargeJob", bookingId: booking._id, slotId: slot._id, chargeTime: chargeTimeIso });
        continue;
      }

      if (!booking.stripeCustomerId) {
        // Incomplete checkout (pending, card never saved) must stay abandoned
        // until the 24h checkout cleanup — do not treat it as a failed T-48 charge.
        if (String(booking.status || "").toLowerCase() === "pending") {
          logger.info("t48_pending_checkout_skipped", { jobName: "T48ChargeJob", bookingId: booking._id, slotId: slot._id });
          continue;
        }
        logger.warn("t48_customer_missing", { jobName: "T48ChargeJob", bookingId: booking._id, slotId: slot._id });
        const r = await StudentBooking.updateOne(
          slotStillPendingFilter(booking._id, slot._id),
          { $set: { "slots.$.paymentStatus": "payment_failed" } },
        );
        if (r.modifiedCount) failed += 1;
        continue;
      }

      logger.info("t48_payment_attempted", { jobName: "T48ChargeJob", bookingId: booking._id, slotId: slot._id, amountMinor: bookingMoney.slots[i].grossAmountMinor, currency: "CHF" });

      let paymentOperation = null;
      try {
        const slotMoney = bookingMoney.slots[i];
        const amountCentimes = slotMoney.grossAmountMinor;
        const instructorShareCentimes = slotMoney.instructorAmountMinor;
        const perSlotAmount = Number(fromMinorUnits(slotMoney.grossAmountMinor));
        const dspCommission = Number(fromMinorUnits(slotMoney.commissionAmountMinor));
        const instructorAmount = Number(fromMinorUnits(slotMoney.instructorAmountMinor));

        const idempotencyKey = `t48-${String(booking._id)}-${String(slot._id)}`;
        paymentOperation = await getOrCreateOperation({
          operationType: "T48_PAYMENT",
          aggregateType: "BOOKING_SLOT",
          aggregateId: `${String(booking._id)}:${String(slot._id)}`,
          bookingId: booking._id,
          slotId: slot._id,
          studentId: booking.studentId,
          instructorId: instructor._id,
          currency: "CHF",
          requestedAmount: perSlotAmount,
          requestedAmountMinor: slotMoney.grossAmountMinor,
          idempotencyKey,
          metadata: {
            bookingId: String(booking._id),
            slotId: String(slot._id),
          },
        });

        let paymentResult;
        if (paymentOperation.providerObjectId) {
          const existingPi = await retrievePaymentIntent(
            paymentOperation.providerObjectId,
          );
          paymentResult = {
            paymentIntentId: existingPi.id,
            status: existingPi.status,
            clientSecret: existingPi.client_secret,
            requiresAction: existingPi.status === "requires_action",
          };
        } else {
          const claimedOperation = await claimOperation(paymentOperation);
          if (!claimedOperation) {
            throw new Error("T-48 payment operation is already processing");
          }
          await markAttempt(claimedOperation, claimedOperation.leaseOwner);
          paymentOperation = claimedOperation;
          paymentResult = await createPaymentIntentForBooking({
            amountCentimes,
            paymentMethodId: booking.paymentMethod.paymentMethodId,
            customerId: booking.stripeCustomerId || undefined,
            metadata: {
              bookingId: String(booking._id),
              slotId: String(slot._id),
              studentId: String(booking.studentId),
              instructorId: String(instructor._id),
              operationId: paymentOperation.operationId,
            },
            confirm: true,
            offSession: true,
            transferData: {
              destinationAccountId: instructor.stripeAccount.accountId,
              amountCentimes: instructorShareCentimes,
            },
            idempotencyKey: paymentOperation.idempotencyKey,
          });
          await markProviderSuccess(paymentOperation, {
            providerObjectId: paymentResult.paymentIntentId,
            providerStatus: paymentResult.status,
            localStatus: paymentResult.requiresAction
              ? "requires_action"
              : "provider_succeeded",
          });
        }

        if (paymentResult.requiresAction) {
          const { startedAt, deadlineAt } = buildReminderStartAndDeadline(
            new Date(),
          );
          logger.info("t48_payment_requires_action", { jobName: "T48ChargeJob", bookingId: booking._id, slotId: slot._id, providerObjectId: paymentResult.paymentIntentId });
          const r = await StudentBooking.updateOne(
            slotStillPendingFilter(booking._id, slot._id),
            {
              $set: {
                "slots.$.paymentStatus": "requires_action",
                "slots.$.paymentIntentId": paymentResult.paymentIntentId,
                "slots.$.paymentReminderStartedAt": startedAt,
                "slots.$.paymentReminderDeadlineAt": deadlineAt,
                "slots.$.paymentReminder1SentAt": startedAt,
              },
            },
          );
          if (r.modifiedCount) {
            await markLocalSuccess(paymentOperation, "requires_action");
            requiresAction += 1;
            await sendStudentReminderEmail(booking._id, slot._id, 1, context);
          }
          continue;
        }

        if (paymentResult.status !== "succeeded") {
          const { startedAt, deadlineAt } = buildReminderStartAndDeadline(
            new Date(),
          );
          const r = await StudentBooking.updateOne(
            slotStillPendingFilter(booking._id, slot._id),
            {
              $set: {
                "slots.$.paymentStatus": "payment_failed",
                "slots.$.paymentReminderStartedAt": startedAt,
                "slots.$.paymentReminderDeadlineAt": deadlineAt,
                "slots.$.paymentReminder1SentAt": startedAt,
              },
            },
          );
          if (r.modifiedCount) {
            logger.warn("t48_payment_failed", { jobName: "T48ChargeJob", bookingId: booking._id, slotId: slot._id, providerStatus: paymentResult.status });
            failed += 1;
            await sendStudentReminderEmail(booking._id, slot._id, 1, context);
          }
          await markRetryable(
            paymentOperation,
            new Error(`Stripe returned ${paymentResult.status}`),
          );
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
              "slots.$.grossAmountMinor": slotMoney.grossAmountMinor,
              "slots.$.commissionAmountMinor": slotMoney.commissionAmountMinor,
              "slots.$.instructorAmountMinor": slotMoney.instructorAmountMinor,
              "slots.$.payoutStatus": "not_applicable",
            },
          },
        );

        if (updateResult.modifiedCount === 0) {
          logger.info("t48_payment_claim_lost", { jobName: "T48ChargeJob", bookingId: booking._id, slotId: slot._id });
          continue;
        }

        logger.info("t48_payment_applied", { jobName: "T48ChargeJob", bookingId: booking._id, slotId: slot._id, providerObjectId: paymentResult.paymentIntentId, amountMinor: slotMoney.grossAmountMinor });

        // Create transactions only when we actually claimed the slot (no double ledger)
        await createTransaction({
          type: "payment",
          role: "student",
          direction: "debit",
          amount: perSlotAmount,
          amountMinor: slotMoney.grossAmountMinor,
          currency: "CHF",
          status: "succeeded",
          bookingId: booking._id,
          slotId: slot._id,
          studentId: booking.studentId,
          stripePaymentIntentId: paymentResult.paymentIntentId,
          financialOperationId: paymentOperation.operationId,
          eventType: "T48_PAYMENT_STUDENT_DEBIT",
          description: "Lesson payment (T-48 charge)",
          occurredAt,
        });

        await createTransaction({
          type: "payment",
          role: "platform",
          direction: "credit",
          amount: perSlotAmount,
          amountMinor: slotMoney.grossAmountMinor,
          currency: "CHF",
          status: "succeeded",
          bookingId: booking._id,
          slotId: slot._id,
          studentId: booking.studentId,
          instructorId: instructor._id,
          stripePaymentIntentId: paymentResult.paymentIntentId,
          financialOperationId: paymentOperation.operationId,
          eventType: "T48_PAYMENT_PLATFORM_GROSS",
          description: "Platform gross receipt for lesson (T-48)",
          occurredAt,
        });

        if (instructorAmount != null) {
          await createTransaction({
            type: "payment",
            role: "instructor",
            direction: "credit",
            amount: instructorAmount,
            amountMinor: slotMoney.instructorAmountMinor,
            currency: "CHF",
            status: "succeeded",
            bookingId: booking._id,
            slotId: slot._id,
            instructorId: instructor._id,
            studentId: booking.studentId,
            stripePaymentIntentId: paymentResult.paymentIntentId,
            financialOperationId: paymentOperation.operationId,
            eventType: "T48_PAYMENT_INSTRUCTOR_SHARE",
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
            amountMinor: slotMoney.commissionAmountMinor,
            currency: "CHF",
            status: "succeeded",
            bookingId: booking._id,
            slotId: slot._id,
            studentId: booking.studentId,
            financialOperationId: paymentOperation.operationId,
            eventType: "T48_PAYMENT_COMMISSION",
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
        await markLocalSuccess(paymentOperation, "slot_and_transactions_applied");
        await markCompleted(paymentOperation);
      } catch (err) {
        logger.error("t48_payment_error", { jobName: "T48ChargeJob", bookingId: booking._id, slotId: slot._id, error: err, errorCategory: classifyError(err) });
        if (paymentOperation) await markRetryable(paymentOperation, err);

        // "This transaction requires authentication" = 3DS needed; show Complete payment immediately (no retries)
        const requiresAuth =
          err.message &&
          String(err.message).toLowerCase().includes("requires authentication");
        const paymentIntentId =
          err.payment_intent?.id ||
          (typeof err.payment_intent === "string"
            ? err.payment_intent
            : null) ||
          err.raw?.payment_intent?.id ||
          (typeof err.raw?.payment_intent === "string"
            ? err.raw.payment_intent
            : null);

        if (requiresAuth) {
          const { startedAt, deadlineAt } = buildReminderStartAndDeadline(
            new Date(),
          );
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
            "slots.$.paymentReminderStartedAt": startedAt,
            "slots.$.paymentReminderDeadlineAt": deadlineAt,
            "slots.$.paymentReminder1SentAt": startedAt,
          };
          if (piIdToUse) updateFields["slots.$.paymentIntentId"] = piIdToUse;
          const r = await StudentBooking.updateOne(
            slotStillPendingFilter(booking._id, slot._id),
            { $set: updateFields },
          );
          if (r.modifiedCount) {
            await markProviderSuccess(paymentOperation, {
              providerObjectId: piIdToUse,
              providerStatus: "requires_action",
              localStatus: "requires_action",
            });
            await markLocalSuccess(paymentOperation, "requires_action");
            logger.info("t48_payment_requires_action", { jobName: "T48ChargeJob", bookingId: booking._id, slotId: slot._id, providerObjectId: piIdToUse });
            requiresAction += 1;
            await sendStudentReminderEmail(booking._id, slot._id, 1);
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
            logger.info("t48_payment_retry_scheduled", { jobName: "T48ChargeJob", bookingId: booking._id, slotId: slot._id, retry: retryCount + 1, maxRetries: T48_MAX_RETRIES + 1 });
          }
        } else {
          const { startedAt, deadlineAt } = buildReminderStartAndDeadline(
            new Date(),
          );
          const failResult = await StudentBooking.updateOne(
            slotStillPendingFilter(booking._id, slot._id),
            {
              $set: {
                "slots.$.paymentStatus": "payment_failed",
                "slots.$.paymentReminderStartedAt": startedAt,
                "slots.$.paymentReminderDeadlineAt": deadlineAt,
                "slots.$.paymentReminder1SentAt": startedAt,
              },
            },
          );
          if (failResult.modifiedCount) {
            logger.warn("t48_payment_max_retries", { jobName: "T48ChargeJob", bookingId: booking._id, slotId: slot._id });
            failed += 1;
            await sendStudentReminderEmail(booking._id, slot._id, 1);
          }
        }
      }
    }
  }

  logger.info("t48_charge_job_completed", { jobName: "T48ChargeJob", processed, requiresAction, failed });

  return { selected: bookings.length, processed, requiresAction, failed };
}

module.exports = { runT48ChargeJob };
