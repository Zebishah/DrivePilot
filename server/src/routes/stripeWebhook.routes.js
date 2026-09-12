/**
 * Stripe webhook endpoint. Must receive raw body for signature verification.
 * Mount with: app.use('/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookRoutes);
 */
const express = require("express");
const {
  stripe,
  retrieveAccount,
  accountToStripeSnapshot,
  retrieveCheckoutSession,
  retrieveSetupIntent,
  retrievePaymentMethod,
  getTransferIdFromPaymentIntent,
} = require("../services/stripeService");
const { Instructor, Admin } = require("../models/User");
const StudentBooking = require("../models/studentBooking.model");
const Transaction = require("../models/transaction.model");
const { createTransaction } = require("../services/transactionService");
const {
  getOperationByProviderObjectId,
  getOperation,
  markProviderSuccess,
  markLocalSuccess,
  markCompleted,
  markRetryable,
} = require("../services/financialOperationService");
const { fromMinorUnits, getBookingMoneySnapshot } = require("../utils/money");
const { toMinorUnits } = require("../utils/money");
const { notifyBookingParties } = require("../utils/SendOtpEmail");
const {
  finalizePaidCheckoutBooking,
} = require("../services/finalizePaidCheckoutBooking");

const router = express.Router();
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const {
  receiveStripeWebhookEvent,
} = require("../services/stripeWebhookEventService");

async function syncFinancialOperationFromWebhook(event) {
  const providerObjectId = event.data?.object?.id;
  if (!providerObjectId) return null;
  const providerObject = event.data?.object;
  const isSuccessfulEvent =
    event.type === "payment_intent.succeeded" ||
    event.type === "checkout.session.completed" ||
    event.type === "transfer.reversed" ||
    event.type === "payout.created" ||
    event.type === "payout.paid" ||
    ((event.type === "refund.created" || event.type === "refund.updated") &&
      providerObject?.status === "succeeded");
  if (!isSuccessfulEvent) return null;
  const operation =
    (await getOperationByProviderObjectId(providerObjectId)) ||
    (event.data?.object?.metadata?.operationId
      ? await getOperation(event.data.object.metadata.operationId)
      : null);
  if (!operation || operation.status === "COMPLETED") return operation;
  return markProviderSuccess(operation, {
    providerObjectId,
    providerStatus: event.data?.object?.status || event.type,
    localStatus: "webhook_received",
  });
}

function getAccountIdFromEvent(event) {
  if (event.account) return event.account;
  const obj = event.data?.object;
  if (!obj) return null;
  if (event.type.startsWith("account.")) return obj.id;
  if (obj.account) return obj.account;
  return null;
}

async function handleAccountUpdated(accountId) {
  const instructor = await Instructor.findOne({
    "stripeAccount.accountId": accountId,
  });
  if (!instructor) return;
  const account = await retrieveAccount(accountId);
  const { stripeAccountUpdate, onboardingStatus, isActive } =
    accountToStripeSnapshot(account);
  await Instructor.findByIdAndUpdate(instructor._id, {
    $set: {
      ...stripeAccountUpdate,
      onboardingStatus,
      isActive,
      "stripeFinancialStatus.lastWebhookSync": new Date(),
    },
  });
}

async function handleAccountDeauthorized(accountId) {
  await Instructor.findOneAndUpdate(
    { "stripeAccount.accountId": accountId },
    {
      $set: {
        "stripeAccount.isDeleted": true,
        onboardingStatus: "disabled",
        isActive: false,
        "stripeFinancialStatus.lastWebhookSync": new Date(),
      },
    },
  );
}

async function handleDisputeCreated(accountId) {
  await Instructor.findOneAndUpdate(
    { "stripeAccount.accountId": accountId },
    {
      $set: {
        "stripeFinancialStatus.hasDisputes": true,
        "stripeFinancialStatus.lastWebhookSync": new Date(),
      },
    },
  );
}

async function handleDisputeClosed(accountId) {
  const instructor = await Instructor.findOne({
    "stripeAccount.accountId": accountId,
  });
  if (!instructor) return;
  try {
    await Instructor.findByIdAndUpdate(instructor._id, {
      $set: {
        "stripeFinancialStatus.lastWebhookSync": new Date(),
      },
    });
  } catch (err) {
    console.error("handleDisputeClosed error:", err);
  }
}

async function handlePayoutFailed(accountId) {
  await Instructor.findOneAndUpdate(
    { "stripeAccount.accountId": accountId },
    {
      $set: {
        "stripeFinancialStatus.payoutsBlocked": true,
        "stripeFinancialStatus.lastWebhookSync": new Date(),
      },
    },
  );
}

async function handlePayoutPaid(accountId) {
  await Instructor.findOneAndUpdate(
    { "stripeAccount.accountId": accountId },
    {
      $set: { "stripeFinancialStatus.lastWebhookSync": new Date() },
    },
  );
}

function toRefundTimestamp(value) {
  if (value == null) return new Date();
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return new Date(numeric * 1000);
  }
  const asDate = new Date(value);
  if (!Number.isNaN(asDate.getTime())) return asDate;
  return new Date();
}

function amountMatchesSlot(slotLike, refundAmount, tolerance = 0.01) {
  const chargeAmount = Number(slotLike?.chargeAmount);
  const instructorAmount = Number(slotLike?.instructorAmount);
  const chargeMatch =
    Number.isFinite(chargeAmount) &&
    Math.abs(chargeAmount - refundAmount) <= tolerance;
  const instructorMatch =
    Number.isFinite(instructorAmount) &&
    Math.abs(instructorAmount - refundAmount) <= tolerance;
  return chargeMatch || instructorMatch;
}

async function recordBookingLevelRefundIfMissing({
  booking,
  refundId,
  refundAmount,
  refundAmountMinor = toMinorUnits(refundAmount),
  refundDate,
  paymentIntentId,
  reason,
}) {
  const existingRefundTx = await Transaction.findOne({
    stripeRefundId: refundId,
    bookingId: booking._id,
    type: "refund",
  }).lean();
  if (existingRefundTx) return;
  await createTransaction({
    type: "refund",
    role: "student",
    direction: "credit",
    amount: Number(fromMinorUnits(refundAmountMinor)),
    amountMinor: refundAmountMinor,
    currency: "CHF",
    status: "succeeded",
    bookingId: booking._id,
    studentId: booking.studentId?._id ?? booking.studentId,
    instructorId: booking.instructorId?._id ?? booking.instructorId,
    stripePaymentIntentId: paymentIntentId || undefined,
    stripeRefundId: refundId,
    description: `Refund synced from Stripe manual refund (${reason})`,
    occurredAt: refundDate,
  });
  console.log(
    "[Stripe Webhook] Refund recorded without slot mapping:",
    `booking=${booking._id}`,
    `refund=${refundId || "(no-refund-id)"}`,
    `reason=${reason}`,
  );
}

async function handleConnectChargeSucceeded(charge, connectedAccountId) {
  if (!connectedAccountId || !charge?.id) return;
  const chargeId = String(charge.id);
  const transferId = charge?.source_transfer || charge?.transfer || null;
  const paymentIntentId =
    typeof charge?.payment_intent === "string"
      ? charge.payment_intent
      : charge?.payment_intent?.id;

  let booking = null;
  let slot = null;

  if (transferId) {
    booking = await StudentBooking.findOne({
      "slots.transferId": String(transferId),
    });
    if (booking) {
      slot = (booking.slots || []).find(
        (s) => String(s.transferId || "") === String(transferId),
      );
    }
  }

  if (!booking && paymentIntentId) {
    booking = await StudentBooking.findOne({
      "slots.paymentIntentId": String(paymentIntentId),
    });
    if (booking) {
      slot = (booking.slots || []).find(
        (s) => String(s.paymentIntentId || "") === String(paymentIntentId),
      );
    }
  }

  if (!booking || !slot) return;

  let changed = false;
  if (!slot.connectChargeId) {
    slot.connectChargeId = chargeId;
    changed = true;
  }
  if (!slot.transferId && transferId) {
    slot.transferId = String(transferId);
    changed = true;
  }
  if (changed) {
    booking.updatedAt = new Date();
    await booking.save();
    console.log(
      "[Stripe Webhook] Connected charge mapped to slot:",
      `booking=${booking._id}`,
      `slot=${slot._id}`,
      `connectChargeId=${chargeId}`,
      transferId ? `transferId=${transferId}` : "",
    );
  }
}

async function syncManualRefundFromTransferReversal(
  reversalObject,
  connectedAccountId = null,
) {
  const transferId =
    typeof reversalObject?.transfer === "string"
      ? reversalObject.transfer
      : reversalObject?.transfer?.id;
  if (!transferId) return false;

  const booking = await StudentBooking.findOne({
    "slots.transferId": String(transferId),
  })
    .populate("instructorId", "_id firstName lastName email")
    .populate("studentId", "_id firstName lastName email");
  if (!booking) {
    console.warn(
      "[Stripe Webhook] transfer.reversed: no booking for transferId",
      transferId,
      connectedAccountId ? `(account ${connectedAccountId})` : "",
    );
    return false;
  }

  const matchedSlots = (booking.slots || []).filter(
    (s) => String(s.transferId || "") === String(transferId),
  );
  if (matchedSlots.length !== 1) {
    console.warn(
      "[Stripe Webhook] transfer.reversed: ambiguous slot mapping",
      `transferId=${transferId}`,
      `booking=${booking._id}`,
      `matchedSlots=${matchedSlots.length}`,
    );
    return false;
  }

  const slot = matchedSlots[0];
  const refundAmountMinor = Number(reversalObject?.amount || 0);
  const refundAmount = fromMinorUnits(refundAmountMinor);
  const refundedAt = toRefundTimestamp(reversalObject?.created);
  const reversalId = String(reversalObject?.id || "");

  const alreadyRefunded =
    String(slot.status || "").toLowerCase() === "refund" ||
    String(slot.paymentStatus || "").toLowerCase() === "refunded";
  if (!alreadyRefunded) {
    slot.status = "refund";
    slot.paymentStatus = "refunded";
    slot.refundedAt = refundedAt;
    if (refundAmountMinor > 0) {
      slot.refundAmount = Number(refundAmount);
      slot.refundAmountMinor = refundAmountMinor;
    }
    if (!slot.cancellationDate) slot.cancellationDate = refundedAt.toISOString();
    booking.updatedAt = new Date();
    await booking.save();
  }

  const existingRefundTx = await Transaction.findOne({
    stripeTransferReversalId: reversalId,
    bookingId: booking._id,
    slotId: slot._id,
    type: "refund",
  }).lean();
  if (!existingRefundTx) {
    await createTransaction({
      type: "refund",
      role: "student",
      direction: "credit",
      amount: refundAmountMinor > 0
        ? Number(refundAmount)
        : Number(fromMinorUnits(slot.instructorAmountMinor || toMinorUnits(slot.instructorAmount || 0))),
      amountMinor: refundAmountMinor > 0
        ? refundAmountMinor
        : slot.instructorAmountMinor || toMinorUnits(slot.instructorAmount || 0),
      currency: "CHF",
      status: "succeeded",
      bookingId: booking._id,
      slotId: slot._id,
      studentId: booking.studentId?._id ?? booking.studentId,
      instructorId: booking.instructorId?._id ?? booking.instructorId,
      stripeTransferId: String(transferId),
      stripeTransferReversalId: reversalId,
      description: "Refund synced from Stripe transfer.reversed",
      occurredAt: refundedAt,
    });
  }

  console.log(
    "[Stripe Webhook] Refund synced via transfer.reversed:",
    `booking=${booking._id}`,
    `slot=${slot._id}`,
    `transferId=${transferId}`,
    `reversalId=${reversalId || "(none)"}`,
  );

  try {
    await notifyBookingParties(booking, "booking_refunded");
  } catch (mailErr) {
    console.error(
      "[Stripe Webhook] Failed to send refund notification emails (transfer.reversed):",
      mailErr,
    );
  }

  return true;
}

async function syncManualRefundFromStripe(refundObject, connectedAccountId = null) {
  const refundDate = toRefundTimestamp(refundObject.created);
  const refundAmountMinor = Number(refundObject.amount || 0);
  const refundAmount = fromMinorUnits(refundAmountMinor);
  const refundId = String(refundObject.id || "");
  const chargeId =
    typeof refundObject?.charge === "string"
      ? refundObject.charge
      : refundObject?.charge?.id;
  let paymentIntentId =
    typeof refundObject?.payment_intent === "string"
      ? refundObject.payment_intent
      : refundObject?.payment_intent?.id;
  let paymentIntentSource = paymentIntentId ? "refund.payment_intent" : "unresolved";
  if (!paymentIntentId && refundObject?.charge) {
    try {
      const charge = await stripe.charges.retrieve(
        String(refundObject.charge),
        connectedAccountId ? { stripeAccount: connectedAccountId } : undefined,
      );
      paymentIntentId =
        typeof charge?.payment_intent === "string"
          ? charge.payment_intent
          : charge?.payment_intent?.id;
      if (paymentIntentId) paymentIntentSource = "charge.payment_intent";
    } catch (err) {
      console.error(
        "[Stripe Webhook] Unable to resolve payment_intent from charge:",
        err?.message || err,
      );
    }
  }
  let booking = null;
  let slotCandidates = [];

  // 1) strict exact match by connected-account charge/payment id (`py_...`)
  if (chargeId) {
    booking = await StudentBooking.findOne({ "slots.connectChargeId": chargeId })
      .populate("instructorId", "_id firstName lastName email")
      .populate("studentId", "_id firstName lastName email");
    if (booking) {
      slotCandidates = (booking.slots || []).filter(
        (s) => String(s.connectChargeId || "") === String(chargeId),
      );
    }
  }

  // 2) exact match by payment intent (`pi_...`)
  if (!booking && paymentIntentId) {
    booking = await StudentBooking.findOne({
      $or: [
        { stripePaymentIntentId: paymentIntentId },
        { "slots.paymentIntentId": paymentIntentId },
      ],
    })
      .populate("instructorId", "_id firstName lastName email")
      .populate("studentId", "_id firstName lastName email");
    if (booking) {
      slotCandidates = (booking.slots || []).filter(
        (s) => String(s.paymentIntentId || "") === String(paymentIntentId),
      );
    }
  }

  if (!booking) {
    console.log(
      "[Stripe Webhook] Refund mapping trace:",
      `refund=${refundId || "(unknown)"}`,
      `chargeId=${chargeId || "(none)"}`,
      `paymentIntentId=${paymentIntentId || "(none)"}`,
      `source=${paymentIntentSource}`,
      connectedAccountId ? `account=${connectedAccountId}` : "",
    );
    console.warn(
      "[Stripe Webhook] Refund sync skipped: no exact mapping by chargeId/paymentIntentId",
      refundObject?.id || "(unknown refund)",
      connectedAccountId ? `(account ${connectedAccountId})` : "",
    );
    return;
  }

  const activeCandidates = slotCandidates.filter(
    (s) =>
      String(s.status || "").toLowerCase() !== "refund" &&
      String(s.paymentStatus || "").toLowerCase() !== "refunded",
  );
  let slot = null;
  if (activeCandidates.length === 1) {
    slot = activeCandidates[0];
  } else if (activeCandidates.length === 0 && slotCandidates.length === 1) {
    // idempotent re-delivery on already-refunded slot
    slot = slotCandidates[0];
  } else {
    await recordBookingLevelRefundIfMissing({
      booking,
      refundId,
      refundAmount,
      refundAmountMinor,
      refundDate,
      paymentIntentId,
      reason: "slot mapping ambiguous",
    });
    return;
  }

  const alreadyRefunded =
    String(slot.status || "").toLowerCase() === "refund" ||
    String(slot.paymentStatus || "").toLowerCase() === "refunded";
  if (!alreadyRefunded) {
    slot.status = "refund";
    slot.paymentStatus = "refunded";
    slot.refundedAt = refundDate;
    slot.refundAmount = Number(refundAmount);
    slot.refundAmountMinor = refundAmountMinor;
    if (!slot.cancellationDate) {
      slot.cancellationDate = refundDate.toISOString();
    }
    booking.updatedAt = new Date();
    await booking.save();
  }

  const existingRefundTx = await Transaction.findOne({
    stripeRefundId: refundId,
    bookingId: booking._id,
    slotId: slot._id,
    type: "refund",
  }).lean();
  if (!existingRefundTx) {
    await createTransaction({
      type: "refund",
      role: "student",
      direction: "credit",
      amount: refundAmount,
      amountMinor: refundAmountMinor,
      currency: "CHF",
      status: "succeeded",
      bookingId: booking._id,
      slotId: slot._id,
      studentId: booking.studentId?._id ?? booking.studentId,
      instructorId: booking.instructorId?._id ?? booking.instructorId,
      stripePaymentIntentId: paymentIntentId,
      stripeRefundId: refundId,
      description: "Refund synced from Stripe manual refund",
      occurredAt: refundDate,
    });
  }
  console.log(
    "[Stripe Webhook] Refund synced successfully:",
    `booking=${booking._id}`,
    `slot=${slot._id}`,
    `paymentIntentId=${paymentIntentId || "(none)"}`,
    `source=${paymentIntentSource}`,
    `refund=${refundId || "(no-refund-id)"}`,
  );

  try {
    await notifyBookingParties(booking, "booking_refunded");
  } catch (mailErr) {
    console.error(
      "[Stripe Webhook] Failed to send refund notification emails:",
      mailErr,
    );
  }
}

/**
 * When a deferred (setup) Checkout Session completes, save stripeCustomerId and payment
 * method on the booking so T-48 can charge. Runs even if the user never hits the
 * frontend success URL (e.g. closed tab, wrong redirect). Idempotent: safe if
 * completeDeferredBookingFromCheckout already ran.
 */
async function handleCheckoutSessionCompleted(sessionId) {
  const session = await retrieveCheckoutSession(sessionId);
  if (!session) return;
  const checkoutOperation =
    (await getOperationByProviderObjectId(session.id)) ||
    (session.metadata?.operationId
      ? await getOperation(session.metadata.operationId)
      : null);
  if (session.mode === "payment") {
    if (session.payment_status !== "paid") return;
    const paymentIntent = session.payment_intent;
    const bookingId =
      session.metadata?.bookingId || paymentIntent?.metadata?.bookingId;
    const piId =
      typeof paymentIntent === "object" && paymentIntent?.id
        ? paymentIntent.id
        : paymentIntent;
    if (!bookingId || !piId) return;
    await finalizePaidCheckoutBooking({
      bookingId,
      paymentIntentId: piId,
    });
    if (checkoutOperation) {
      const local = await markLocalSuccess(checkoutOperation, "booking_finalized");
      if (local) await markCompleted(local);
    }
    console.log(
      "[Stripe Webhook] Payment checkout completed: confirmed booking",
      bookingId,
    );
    return;
  }
  if (session.mode !== "setup") return;
  const setupIntent = session.setup_intent;
  if (
    !setupIntent ||
    typeof setupIntent === "string" ||
    setupIntent.status !== "succeeded"
  )
    return;
  const bookingId = session.metadata?.bookingId;
  if (!bookingId) return;

  const booking = await StudentBooking.findById(bookingId);
  if (!booking || booking.status !== "pending") return;

  const paymentMethodId =
    typeof setupIntent.payment_method === "string"
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id;
  if (!paymentMethodId) return;

  let stripeCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id || null;
  if (!stripeCustomerId && setupIntent.customer) {
    stripeCustomerId =
      typeof setupIntent.customer === "string"
        ? setupIntent.customer
        : setupIntent.customer?.id || null;
  }
  if (!stripeCustomerId && paymentMethodId) {
    try {
      const pm = await retrievePaymentMethod(paymentMethodId);
      if (pm?.customer) {
        stripeCustomerId =
          typeof pm.customer === "string"
            ? pm.customer
            : pm.customer?.id || null;
      }
    } catch (_) {}
  }
  if (!stripeCustomerId && setupIntent.id) {
    try {
      const si = await retrieveSetupIntent(setupIntent.id);
      if (si?.customer) {
        stripeCustomerId =
          typeof si.customer === "string"
            ? si.customer
            : si.customer?.id || null;
      }
    } catch (_) {}
  }
  if (!stripeCustomerId) return;

  booking.status = "confirmed";
  booking.stripeCustomerId = stripeCustomerId;
  booking.paymentMethod = {
    ...(booking.paymentMethod || { type: "card" }),
    paymentMethodId,
    setupIntentId: setupIntent.id,
  };
  booking.slots.forEach((slot) => {
    if (!slot.paymentStatus || slot.paymentStatus === "pending_payment") {
      slot.paymentStatus = "pending_payment";
      slot.payoutStatus = slot.payoutStatus || "not_applicable";
    }
  });
  await booking.save();
  if (checkoutOperation) {
    const provider = await markProviderSuccess(checkoutOperation, {
      providerObjectId: session.id,
      providerStatus: session.status,
      localStatus: "payment_method_saved",
    });
    const local = await markLocalSuccess(provider || checkoutOperation, "payment_method_saved");
    if (local) await markCompleted(local);
  }
  console.log(
    "[Stripe Webhook] Deferred booking completed: saved stripeCustomerId for booking",
    bookingId,
  );
}

async function findOperationForProviderEvent(providerObject, metadata = {}) {
  if (!providerObject?.id && !metadata?.operationId) return null;
  return (
    (providerObject?.id
      ? await getOperationByProviderObjectId(providerObject.id)
      : null) ||
    (metadata?.operationId ? await getOperation(metadata.operationId) : null)
  );
}

async function handlePaymentIntentStatus(paymentIntent, eventType) {
  if (!paymentIntent?.id) return;
  const operation = await findOperationForProviderEvent(
    paymentIntent,
    paymentIntent.metadata,
  );
  const booking = await StudentBooking.findOne({
    $or: [
      { stripePaymentIntentId: paymentIntent.id },
      { "slots.paymentIntentId": paymentIntent.id },
      ...(paymentIntent.metadata?.bookingId
        ? [{ _id: paymentIntent.metadata.bookingId }]
        : []),
    ],
  });
  if (booking) {
    const targetSlotId = paymentIntent.metadata?.slotId;
    const slots = (booking.slots || []).filter(
      (slot) =>
        (!targetSlotId || String(slot._id) === String(targetSlotId)) &&
        (!slot.paymentIntentId || String(slot.paymentIntentId) === String(paymentIntent.id)),
    );
    const status = eventType === "payment_intent.requires_action" ? "requires_action" : "payment_failed";
    let changed = false;
    for (const slot of slots) {
      if (["paid", "refunded"].includes(String(slot.paymentStatus || "").toLowerCase())) continue;
      if (slot.paymentStatus !== status) {
        slot.paymentStatus = status;
        changed = true;
      }
    }
    if (changed) {
      booking.updatedAt = new Date();
      await booking.save();
    }
  }
  if (operation) {
    const error = new Error(`Stripe reported ${eventType}`);
    error.code = eventType === "payment_intent.requires_action" ? "REQUIRES_ACTION" : "PAYMENT_FAILED";
    await markRetryable(operation, error);
  }
}

async function handleSetupIntentSucceeded(setupIntent) {
  if (!setupIntent?.id) return;
  const operation = await findOperationForProviderEvent(
    setupIntent,
    setupIntent.metadata,
  );
  const bookingId = setupIntent.metadata?.bookingId || operation?.bookingId;
  if (!bookingId) return;
  const booking = await StudentBooking.findById(bookingId);
  if (!booking || ["cancelled", "semi_cancelled"].includes(String(booking.status).toLowerCase())) return;
  const paymentMethodId =
    typeof setupIntent.payment_method === "string"
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id;
  const customerId =
    typeof setupIntent.customer === "string"
      ? setupIntent.customer
      : setupIntent.customer?.id;
  if (!paymentMethodId) return;
  booking.status = booking.status === "pending" ? "confirmed" : booking.status;
  if (customerId) booking.stripeCustomerId = customerId;
  booking.paymentMethod = {
    ...(booking.paymentMethod || { type: "card" }),
    paymentMethodId,
    setupIntentId: setupIntent.id,
  };
  for (const slot of booking.slots || []) {
    if (!slot.paymentStatus) slot.paymentStatus = "pending_payment";
    if (!slot.payoutStatus) slot.payoutStatus = "not_applicable";
  }
  await booking.save();
  if (operation) {
    const providerSuccess = await markProviderSuccess(operation, {
      providerObjectId: setupIntent.id,
      providerStatus: setupIntent.status,
      localStatus: "setup_method_saved",
    });
    if (providerSuccess) {
      const local = await markLocalSuccess(providerSuccess, "setup_method_saved");
      if (local) await markCompleted(local);
    }
  }
}

async function processStripeWebhookEvent(event, eventRecord = null) {
  if (!event || !event.id || !event.type) {
    const error = new Error("Invalid Stripe webhook event payload");
    error.code = "INVALID_WEBHOOK_EVENT";
    throw error;
  }
  console.log("[Stripe Webhook] Processing event:", event.type, event.id);

  await syncFinancialOperationFromWebhook(event);

  // Platform payment events (no Connect accountId)
  if (event.type === "transfer.reversed") {
    const reversal = event.data?.object;
    await syncManualRefundFromTransferReversal(reversal, event.account || null);
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data?.object;
    if (session?.id) await handleCheckoutSessionCompleted(session.id);
    return;
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data?.object;
    if (pi?.id) {
      const paymentOperation = await findOperationForProviderEvent(
        pi,
        pi.metadata,
      );
      // Legacy flow: booking-level PaymentIntent
      const existingLegacy = await StudentBooking.findOne({
        stripePaymentIntentId: pi.id,
      }).lean();
      if (!existingLegacy) {
        // T-48 per-slot flow: find slot by paymentIntentId, set paid, create transactions (idempotent)
        const booking = await StudentBooking.findOne({
          "slots.paymentIntentId": pi.id,
        })
          .populate("instructorId", "stripeAccount commission")
          .populate("studentId", "_id");
        if (!booking && pi.metadata?.bookingId && !pi.metadata?.slotId) {
          await finalizePaidCheckoutBooking({
            bookingId: pi.metadata.bookingId,
            paymentIntentId: pi.id,
          });
          if (paymentOperation) {
            const local = await markLocalSuccess(paymentOperation, "booking_finalized");
            if (local) await markCompleted(local);
          }
        }
        if (booking) {
          const transferId = await getTransferIdFromPaymentIntent(pi.id);
          const slot = booking.slots.find(
            (s) => s.paymentIntentId && String(s.paymentIntentId) === pi.id,
          );
          if (slot) {
            const admin = await Admin.findOne().lean();
            const platformCommission = admin?.platformCommission || {};
            const bookingMoney = getBookingMoneySnapshot({
              booking,
              instructor: booking.instructorId,
              platformSettings: platformCommission,
            });
            const slotIndex = booking.slots.findIndex(
              (candidate) => String(candidate._id) === String(slot._id),
            );
            const slotMoney = bookingMoney.slots[slotIndex];
            if (!slotMoney) throw new Error("Missing financial snapshot for webhook payment");
            const perSlotAmount = Number(fromMinorUnits(slotMoney.grossAmountMinor));
            const dspCommission = Number(fromMinorUnits(slotMoney.commissionAmountMinor));
            const instructorAmount = Number(fromMinorUnits(slotMoney.instructorAmountMinor));
            const occurredAt = new Date();
            if (slot.paymentStatus !== "paid") {
              slot.paymentStatus = "paid";
              slot.chargedAt = occurredAt;
              slot.chargeAmount = perSlotAmount;
              slot.dspCommission = dspCommission;
              slot.instructorAmount = instructorAmount;
              slot.grossAmountMinor = slotMoney.grossAmountMinor;
              slot.commissionAmountMinor = slotMoney.commissionAmountMinor;
              slot.instructorAmountMinor = slotMoney.instructorAmountMinor;
              slot.payoutStatus = "not_applicable";
              if (transferId) slot.transferId = transferId;
              await booking.save();
            }

            const transactionPayload = {
              bookingId: booking._id,
              slotId: slot._id,
              studentId: booking.studentId?._id ?? booking.studentId,
              stripePaymentIntentId: pi.id,
              financialOperationId: paymentOperation?.operationId,
            };
            await createTransaction({
              type: "payment", role: "student", direction: "debit",
              amount: perSlotAmount, currency: "CHF", status: "succeeded",
              amountMinor: slotMoney.grossAmountMinor,
              ...transactionPayload, eventType: "T48_PAYMENT_STUDENT_DEBIT",
              description: "Lesson payment (T-48 3DS completed)", occurredAt,
            });
            await createTransaction({
              type: "payment", role: "platform", direction: "credit",
              amount: perSlotAmount, currency: "CHF", status: "succeeded",
              amountMinor: slotMoney.grossAmountMinor,
              ...transactionPayload, eventType: "T48_PAYMENT_PLATFORM_GROSS",
              description: "Platform gross receipt for lesson (T-48)", occurredAt,
            });
            if (instructorAmount != null) {
              await createTransaction({
                type: "payment", role: "instructor", direction: "credit",
                amount: instructorAmount, currency: "CHF", status: "succeeded",
                amountMinor: slotMoney.instructorAmountMinor,
                ...transactionPayload,
                instructorId: booking.instructorId?._id ?? booking.instructorId,
                eventType: "T48_PAYMENT_INSTRUCTOR_SHARE",
                description: "Instructor share for lesson (T-48)", occurredAt,
              });
            }
            if (dspCommission != null) {
              await createTransaction({
                type: "payment", role: "platform", direction: "credit",
                amount: dspCommission, currency: "CHF", status: "succeeded",
                amountMinor: slotMoney.commissionAmountMinor,
                ...transactionPayload, eventType: "T48_PAYMENT_COMMISSION",
                description: "Platform commission for lesson (T-48)", occurredAt,
              });
            }
            const allPaid = booking.slots.length && booking.slots.every((s) => s.paymentStatus === "paid");
            if (allPaid) {
              await StudentBooking.updateOne(
                { _id: booking._id },
                { $set: { status: "confirmed", stripePaymentIntentId: pi.id, updatedAt: new Date() } },
              );
            }
            console.log("[Stripe Webhook] T48 payment applied", {
              eventId: event.id, paymentIntentId: pi.id,
              bookingId: String(booking._id), slotId: String(slot._id),
            });
            if (paymentOperation) {
              await markLocalSuccess(paymentOperation, "slot_and_transactions_applied");
              await markCompleted(paymentOperation);
            }
          }
        }
      }
    }
    return;
  }

  if (event.type === "payment_intent.payment_failed" || event.type === "payment_intent.requires_action") {
    await handlePaymentIntentStatus(event.data?.object, event.type);
    return;
  }

  if (event.type === "setup_intent.succeeded") {
    await handleSetupIntentSucceeded(event.data?.object);
    return;
  }

  if (event.type === "charge.refunded") {
    const charge = event.data?.object;
    const refunds = charge?.refunds?.data || [];
    for (const refund of refunds) {
      await syncManualRefundFromStripe(
        { ...refund, payment_intent: charge?.payment_intent },
        event.account || null,
      );
    }
    return;
  }

  if (event.type === "charge.succeeded" && event.account) {
    await handleConnectChargeSucceeded(event.data?.object, event.account);
    return;
  }

  if (event.type === "refund.updated" || event.type === "refund.created") {
    const refund = event.data?.object;
    if (refund?.status === "succeeded") {
      await syncManualRefundFromStripe(refund, event.account || null);
    }
    return;
  }

  const accountId = getAccountIdFromEvent(event);
  if (!accountId) return { ignored: true, reason: "unsupported_event" };

  switch (event.type) {
    case "account.updated":
      await handleAccountUpdated(accountId);
      break;
    case "account.application.deauthorized":
      await handleAccountDeauthorized(accountId);
      break;
    case "charge.dispute.created":
      await handleDisputeCreated(accountId);
      break;
    case "charge.dispute.closed":
      await handleDisputeClosed(accountId);
      break;
    case "payout.failed":
      await handlePayoutFailed(accountId);
      break;
    case "payout.paid":
      await handlePayoutPaid(accountId);
      break;
    default:
      return { ignored: true, reason: "unsupported_event" };
  }
}

router.post("/", async (req, res) => {
  if (!WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return res.status(500).send("Webhook secret not configured");
  }
  const sig = req.headers["stripe-signature"];
  if (!sig) {
    return res.status(400).send("Missing stripe-signature");
  }
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  console.log("[Stripe Webhook] Received event:", event.type, event.id);
  try {
    const { duplicate } = await receiveStripeWebhookEvent(event);
    if (duplicate) {
      console.log("[Stripe Webhook] Duplicate durable receipt", { eventId: event.id });
    }
    return res.status(200).send("OK");
  } catch (error) {
    console.error("[Stripe Webhook] Durable receipt failed", {
      eventId: event.id,
      code: error?.code || "RECEIPT_FAILED",
    });
    return res.status(503).send("Webhook receipt unavailable");
  }

});

router.processStripeWebhookEvent = processStripeWebhookEvent;
module.exports = router;
