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
} = require("../services/stripeService");
const { Instructor, Admin } = require("../models/User");
const StudentBooking = require("../models/studentBooking.model");
const { createTransaction } = require("../services/transactionService");
const { getCommissionSplit } = require("../services/stripeService");

const router = express.Router();
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const processedEvents = new Set();
const MAX_PROCESSED_SIZE = 10000;

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

  if (processedEvents.has(event.id)) {
    return res.status(200).send("OK");
  }
  if (processedEvents.size >= MAX_PROCESSED_SIZE) {
    processedEvents.clear();
  }
  processedEvents.add(event.id);

  // Platform payment events (no Connect accountId)
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
