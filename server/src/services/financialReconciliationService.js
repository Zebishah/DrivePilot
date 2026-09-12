const StudentBooking = require("../models/studentBooking.model");
const Transaction = require("../models/transaction.model");
const FinancialOperation = require("../models/FinancialOperation");
const {
  retrievePaymentIntent,
  retrieveCheckoutSession,
  retrieveRefund,
  retrieveTransferReversal,
  retrievePayout,
} = require("./stripeService");
const {
  claimOperationForReconciliation,
  getOperation,
  markProviderSuccess,
  markLocalSuccess,
  markCompleted,
  markRetryable,
  markManualReview,
  executionId,
} = require("./financialOperationService");
const { dispatchStripeWebhookEvent } = require("./stripeWebhookProcessor");
const { fromMinorUnits, toMinorUnits } = require("../utils/money");
const { logger, classifyError } = require("../utils/logger");
const metrics = require("../utils/metrics");

const BATCH_SIZE = Number(process.env.FINANCIAL_RECONCILIATION_BATCH_SIZE || 25);

function bookingHasSlot(booking, slotId) {
  return (booking?.slots || []).find((slot) => String(slot._id) === String(slotId));
}

async function reconcilePayout(operation, owner) {
  const booking = await StudentBooking.findById(operation.bookingId).populate(
    "instructorId",
    "stripeAccount",
  );
  const slot = bookingHasSlot(booking, operation.slotId);
  const accountId = booking?.instructorId?.stripeAccount?.accountId;
  if (!booking || !slot || !accountId || !operation.providerObjectId) {
    throw Object.assign(new Error("Payout cannot be safely correlated"), { code: "PAYOUT_MAPPING_AMBIGUOUS" });
  }
  const payout = await retrievePayout(operation.providerObjectId, accountId);
  if (!["paid", "succeeded"].includes(String(payout.status || "").toLowerCase())) {
    const normalizedStatus = String(payout.status || "").toLowerCase();
    throw Object.assign(new Error(`Payout provider status is ${payout.status}`), {
      code: ["pending", "in_transit"].includes(normalizedStatus)
        ? "PAYOUT_PENDING"
        : "PAYOUT_FAILED",
    });
  }
  const instructorAmountMinor = Number.isSafeInteger(slot.instructorAmountMinor)
    ? slot.instructorAmountMinor
    : toMinorUnits(slot.instructorAmount || 0);
  await StudentBooking.updateOne(
    { _id: booking._id, "slots._id": slot._id },
    { $set: { "slots.$.payoutStatus": "completed", "slots.$.payoutId": payout.id, "slots.$.payoutDate": new Date(), updatedAt: new Date() } },
  );
  await Transaction.findOneAndUpdate(
    { financialOperationId: operation.operationId, eventType: "PAYOUT_INSTRUCTOR_CREDIT" },
    {
      $setOnInsert: {
        type: "payout", role: "instructor", direction: "credit",
        amount: Number(fromMinorUnits(instructorAmountMinor)), amountMinor: instructorAmountMinor, currency: "CHF", status: "succeeded",
        bookingId: booking._id, slotId: slot._id, instructorId: booking.instructorId._id,
        stripePayoutId: payout.id, financialOperationId: operation.operationId,
        eventType: "PAYOUT_INSTRUCTOR_CREDIT", description: "Reconciled instructor payout", occurredAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const provider = await markProviderSuccess(operation, { providerObjectId: payout.id, providerStatus: payout.status, localStatus: "provider_reconciled" });
  const local = await markLocalSuccess(provider || operation, "slot_and_transaction_reconciled");
  if (local) await markCompleted(local);
}

async function reconcileOperation(operation, owner) {
  if (operation.operationType === "PAYOUT") return reconcilePayout(operation, owner);
  let providerObject;
  let eventType;
  if (["DIRECT_PAYMENT", "T48_PAYMENT"].includes(operation.operationType)) {
    providerObject = await retrievePaymentIntent(operation.providerObjectId);
    eventType = providerObject.status === "succeeded"
      ? "payment_intent.succeeded"
      : providerObject.status === "requires_action"
        ? "payment_intent.requires_action"
        : providerObject.status === "requires_payment_method" || providerObject.status === "canceled"
          ? "payment_intent.payment_failed"
          : null;
  } else if (operation.operationType === "CHECKOUT_SESSION") {
    providerObject = await retrieveCheckoutSession(operation.providerObjectId);
    eventType = providerObject.status === "complete" ? "checkout.session.completed" : null;
  } else if (operation.operationType === "REFUND") {
    providerObject = await retrieveRefund(operation.providerObjectId);
    eventType = providerObject.status === "succeeded" ? "refund.updated" : null;
  } else if (operation.operationType === "TRANSFER_REVERSAL") {
    const booking = await StudentBooking.findById(operation.bookingId).lean();
    const slot = bookingHasSlot(booking, operation.slotId);
    if (!slot?.transferId) throw Object.assign(new Error("Transfer reversal has no transfer mapping"), { code: "REVERSAL_MAPPING_AMBIGUOUS" });
    providerObject = await retrieveTransferReversal(slot.transferId, operation.providerObjectId);
    eventType = providerObject ? "transfer.reversed" : null;
  }
  if (!providerObject || !eventType) {
    const error = new Error(`Provider object is not in a repairable terminal state (${operation.operationType})`);
    error.code = "PROVIDER_NOT_TERMINAL";
    throw error;
  }
  await dispatchStripeWebhookEvent({
    id: `reconciliation_${operation.operationId}_${providerObject.id}`,
    type: eventType,
    account: null,
    data: { object: providerObject },
  });

  const refreshed = await getOperation(operation.operationId);
  if (refreshed?.status === "PROCESSING") {
    const provider = await markProviderSuccess(refreshed, {
      providerObjectId: providerObject.id,
      providerStatus: providerObject.status || eventType,
      localStatus: "provider_reconciled",
    });
    if (provider) {
      const local = await markLocalSuccess(provider, "provider_event_reconciled");
      if (local) await markCompleted(local);
    }
  }
}

async function runFinancialReconciliation({ batchSize = BATCH_SIZE } = {}) {
  const counters = { scanned: 0, repaired: 0, retryable: 0, manualReview: 0 };
  const operations = await FinancialOperation.find({
    operationType: { $in: ["DIRECT_PAYMENT", "T48_PAYMENT", "CHECKOUT_SESSION", "REFUND", "TRANSFER_REVERSAL", "PAYOUT"] },
    status: { $in: ["PENDING", "PROCESSING", "VERIFYING_PROVIDER", "PROVIDER_SUCCEEDED", "RETRYABLE"] },
    providerObjectId: { $type: "string" },
  }).sort({ updatedAt: 1 }).limit(Math.max(1, Math.min(100, Number(batchSize) || BATCH_SIZE)));
  for (const operation of operations) {
    counters.scanned += 1;
    const owner = executionId("reconcile");
    const claimed = await claimOperationForReconciliation(operation, owner);
    if (!claimed) continue;
    try {
      await reconcileOperation(claimed, owner);
      counters.repaired += 1;
      metrics.increment("reconciliation.repaired", 1, { operationType: operation.operationType });
    } catch (error) {
      if (["PAYOUT_MAPPING_AMBIGUOUS", "REVERSAL_MAPPING_AMBIGUOUS", "PAYOUT_FAILED"].includes(error?.code)) {
        await markManualReview(claimed, error, "reconciliation_manual_review");
        counters.manualReview += 1;
        metrics.increment("reconciliation.manual_review", 1, { operationType: operation.operationType });
      } else {
        await markRetryable(claimed, error);
        counters.retryable += 1;
        metrics.increment("reconciliation.failed", 1, { operationType: operation.operationType, errorCategory: classifyError(error) });
      }
    }
  }
  logger.info("financial_reconciliation_completed", { selected: operations.length, ...counters });
  return { selected: operations.length, ...counters };
}

module.exports = { runFinancialReconciliation, reconcileOperation };
