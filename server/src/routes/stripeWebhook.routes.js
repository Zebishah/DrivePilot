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
const { getCommissionSplit } = require("../services/stripeService");
const { notifyBookingParties } = require("../utils/SendOtpEmail");

const router = express.Router();
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const processedEvents = new Set();
const MAX_PROCESSED_SIZE = 10000;
const CENTIMES_PER_UNIT = 100;

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
    amount: refundAmount,
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
  const refundAmount = Number(reversalObject?.amount || 0) / CENTIMES_PER_UNIT;
  const refundedAt = toRefundTimestamp(reversalObject?.created);
  const reversalId = String(reversalObject?.id || "");

  const alreadyRefunded =
    String(slot.status || "").toLowerCase() === "refund" ||
    String(slot.paymentStatus || "").toLowerCase() === "refunded";
  if (!alreadyRefunded) {
    slot.status = "refund";
    slot.paymentStatus = "refunded";
    slot.refundedAt = refundedAt;
    if (refundAmount > 0) slot.refundAmount = refundAmount;
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
      amount: refundAmount || Number(slot.instructorAmount || 0),
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
  const refundAmount = Number(refundObject.amount || 0) / CENTIMES_PER_UNIT;
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
    slot.refundAmount = refundAmount;
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
  if (!session || session.mode !== "setup") return;
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
  console.log(
    "[Stripe Webhook] Deferred booking completed: saved stripeCustomerId for booking",
    bookingId,
  );
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

  if (processedEvents.has(event.id)) {
    return res.status(200).send("OK");
  }
  if (processedEvents.size >= MAX_PROCESSED_SIZE) {
    processedEvents.clear();
  }
  processedEvents.add(event.id);

  // Platform payment events (no Connect accountId)
  if (event.type === "transfer.reversed") {
    const reversal = event.data?.object;
    try {
      await syncManualRefundFromTransferReversal(reversal, event.account || null);
    } catch (e) {
      console.error("transfer.reversed handler:", e?.message || e);
    }
    return res.status(200).send("OK");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data?.object;
    if (session?.id) {
      try {
        await handleCheckoutSessionCompleted(session.id);
      } catch (e) {
        console.error(
          "[Stripe Webhook] checkout.session.completed handler:",
          e?.message || e,
        );
      }
    }
    return res.status(200).send("OK");
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data?.object;
    if (pi?.id) {
      try {
        // Legacy flow: booking-level PaymentIntent
        const existingLegacy = await StudentBooking.findOne({
          stripePaymentIntentId: pi.id,
        }).lean();
        if (existingLegacy) {
          return res.status(200).send("OK");
        }
        // T-48 per-slot flow: find slot by paymentIntentId, set paid, create transactions (idempotent)
        const booking = await StudentBooking.findOne({
          "slots.paymentIntentId": pi.id,
        })
          .populate("instructorId", "stripeAccount commission")
          .populate("studentId", "_id");
        if (booking) {
          const transferId = await getTransferIdFromPaymentIntent(pi.id).catch(
            () => null,
          );
          const slot = booking.slots.find(
            (s) => s.paymentIntentId && String(s.paymentIntentId) === pi.id,
          );
          if (slot && slot.paymentStatus !== "paid") {
            const admin = await Admin.findOne().lean();
            const platformCommission = admin?.platformCommission || {};
            const perSlotAmount =
              (Number(booking.finalAmount || booking.totalAmount) || 0) /
              (booking.slots?.length || 1);
            const { dspCommission, instructorAmount } = getCommissionSplit(
              perSlotAmount,
              booking.instructorId,
              platformCommission,
            );
            const occurredAt = new Date();
            slot.paymentStatus = "paid";
            slot.chargedAt = occurredAt;
            slot.chargeAmount = perSlotAmount;
            slot.dspCommission = dspCommission;
            slot.instructorAmount = instructorAmount;
            slot.payoutStatus = "not_applicable";
            if (transferId) slot.transferId = transferId;
            await booking.save();

            await createTransaction({
              type: "payment",
              role: "student",
              direction: "debit",
              amount: perSlotAmount,
              currency: "CHF",
              status: "succeeded",
              bookingId: booking._id,
              slotId: slot._id,
              studentId: booking.studentId?._id ?? booking.studentId,
              stripePaymentIntentId: pi.id,
              description: "Lesson payment (T-48 3DS completed)",
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
              studentId: booking.studentId?._id ?? booking.studentId,
              stripePaymentIntentId: pi.id,
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
                instructorId: booking.instructorId?._id ?? booking.instructorId,
                studentId: booking.studentId?._id ?? booking.studentId,
                stripePaymentIntentId: pi.id,
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
                bookingId: booking._id,
                slotId: slot._id,
                studentId: booking.studentId?._id ?? booking.studentId,
                description: "Platform commission for lesson (T-48)",
                occurredAt,
              });
            }
            const allPaid =
              booking.slots.length &&
              booking.slots.every((s) => s.paymentStatus === "paid");
            if (allPaid) {
              await StudentBooking.updateOne(
                { _id: booking._id },
                {
                  $set: {
                    status: "confirmed",
                    stripePaymentIntentId: pi.id,
                    updatedAt: new Date(),
                  },
                },
              );
            }
            console.log(
              "[Stripe Webhook] payment_intent.succeeded: updated slot to paid for booking",
              booking._id,
              "slot",
              slot._id,
            );
          }
        }
      } catch (e) {
        console.error("payment_intent.succeeded handler:", e.message);
      }
    }
    return res.status(200).send("OK");
  }

  if (event.type === "charge.refunded") {
    const charge = event.data?.object;
    const refunds = charge?.refunds?.data || [];
    console.log(
      "[Stripe Webhook][Debug charge.refunded]",
      JSON.stringify(
        {
          eventId: event.id,
          account: event.account || null,
          chargeId: charge?.id || null,
          paymentIntent: charge?.payment_intent || null,
          amount: charge?.amount ?? null,
          amountRefunded: charge?.amount_refunded ?? null,
          refundsCount: refunds.length,
          refundIds: refunds.map((r) => r?.id).filter(Boolean),
        },
        null,
        2,
      ),
    );
    try {
      for (const refund of refunds) {
        console.log(
          "[Stripe Webhook][Debug charge.refunded refund-item]",
          JSON.stringify(
            {
              eventId: event.id,
              account: event.account || null,
              refundId: refund?.id || null,
              refundObjectType: refund?.object || null,
              refundStatus: refund?.status || null,
              refundPaymentIntent: refund?.payment_intent || null,
              refundCharge: refund?.charge || null,
              refundAmount: refund?.amount ?? null,
              metadata: refund?.metadata || null,
            },
            null,
            2,
          ),
        );
        await syncManualRefundFromStripe({
          ...refund,
          payment_intent: charge?.payment_intent,
        }, event.account || null);
      }
    } catch (e) {
      console.error("charge.refunded handler:", e?.message || e);
    }
    return res.status(200).send("OK");
  }

  if (event.type === "charge.succeeded" && event.account) {
    const charge = event.data?.object;
    try {
      await handleConnectChargeSucceeded(charge, event.account);
    } catch (e) {
      console.error("charge.succeeded connect handler:", e?.message || e);
    }
    return res.status(200).send("OK");
  }

  if (event.type === "refund.updated" || event.type === "refund.created") {
    const refund = event.data?.object;
    console.log(
      `[Stripe Webhook][Debug ${event.type}]`,
      JSON.stringify(
        {
          eventId: event.id,
          account: event.account || null,
          refundId: refund?.id || null,
          refundObjectType: refund?.object || null,
          status: refund?.status || null,
          paymentIntent: refund?.payment_intent || null,
          charge: refund?.charge || null,
          amount: refund?.amount ?? null,
          currency: refund?.currency || null,
          reason: refund?.reason || null,
          metadata: refund?.metadata || null,
        },
        null,
        2,
      ),
    );
    // Sync only when Stripe marks the refund as succeeded.
    // `charge.refunded` above still covers successful manual refunds too.
    if (refund?.status === "succeeded") {
      try {
        await syncManualRefundFromStripe(refund, event.account || null);
      } catch (e) {
        console.error(`${event.type} handler:`, e?.message || e);
      }
    }
    return res.status(200).send("OK");
  }

  const accountId = getAccountIdFromEvent(event);
  if (!accountId) return res.status(200).send("OK");

  try {
    switch (event.type) {
      case "account.updated":
        await handleAccountUpdated(accountId);
        break;
      case "account.application.deauthorized":
        await handleAccountDeauthorized(accountId);
        break;
      case "charge.dispute.created":
        if (accountId) await handleDisputeCreated(accountId);
        break;
      case "charge.dispute.closed":
        if (accountId) await handleDisputeClosed(accountId);
        break;
      case "payout.failed":
        await handlePayoutFailed(accountId);
        break;
      case "payout.paid":
        await handlePayoutPaid(accountId);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
  }
  res.status(200).send("OK");
});

module.exports = router;
