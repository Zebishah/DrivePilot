/**
 * Stripe webhook endpoint. Must receive raw body for signature verification.
 * Mount with: app.use('/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookRoutes);
 */
const express = require("express");
const {
  stripe,
  retrieveAccount,
  accountToStripeSnapshot,
} = require("../services/stripeService");
const { Instructor } = require("../models/User");
const StudentBooking = require("../models/studentBooking.model");

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
  if (event.type === "payment_intent.succeeded") {
    const pi = event.data?.object;
    if (pi?.id) {
      try {
        const existing = await StudentBooking.findOne({
          stripePaymentIntentId: pi.id,
        }).lean();
        if (existing) {
          // Already saved by createBooking; nothing to do
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
