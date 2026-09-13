const crypto = require("crypto");
const StripeWebhookEvent = require("../models/StripeWebhookEvent");
const { logger, classifyError } = require("../utils/logger");
const metrics = require("../utils/metrics");

const LEASE_MS = Number(process.env.STRIPE_WEBHOOK_LEASE_MS || 5 * 60 * 1000);
const MAX_ATTEMPTS = Number(process.env.STRIPE_WEBHOOK_MAX_ATTEMPTS || 8);
const MAX_BACKOFF_MS = Number(
  process.env.STRIPE_WEBHOOK_MAX_BACKOFF_MS || 60 * 60 * 1000,
);
const BATCH_SIZE = Number(process.env.STRIPE_WEBHOOK_BATCH_SIZE || 25);

function executionId(prefix = "stripe-webhook") {
  return `${prefix}-${crypto.randomUUID()}`;
}

function providerDetails(event) {
  const object = event?.data?.object || {};
  return {
    providerObjectType: object.object || event?.type?.split(".")[0],
    providerObjectId: object.id || event?.related_object?.id,
  };
}

async function receiveStripeWebhookEvent(event) {
  const details = providerDetails(event);
  const payload = event.toObject ? event.toObject() : event;
  try {
    const record = await StripeWebhookEvent.create({
      eventId: String(event.id),
      eventType: String(event.type),
      stripeAccountId: event.account || null,
      apiVersion: event.api_version || null,
      livemode: Boolean(event.livemode),
      createdAtProvider: event.created ? new Date(event.created * 1000) : null,
      providerObjectType: details.providerObjectType || null,
      providerObjectId: details.providerObjectId || null,
      payload,
      receivedAt: new Date(),
    });
    metrics.increment("webhook.received", 1, { eventType: event.type });
    logger.info("stripe_webhook_received", {
      webhookEventId: event.id,
      eventType: event.type,
      providerObjectId: details.providerObjectId,
    });
    return { record, duplicate: false };
  } catch (error) {
    if (error?.code !== 11000) throw error;
    const existing = await StripeWebhookEvent.findOne({ eventId: String(event.id) });
    if (!existing) throw error;
    metrics.increment("webhook.duplicate", 1, { eventType: event.type });
    logger.info("stripe_webhook_duplicate", {
      webhookEventId: event.id,
      eventType: event.type,
      providerObjectId: details.providerObjectId,
    });
    return { record: existing, duplicate: true };
  }
}

async function claimStripeWebhookEvent(record, owner = executionId(), leaseMs = LEASE_MS) {
  if (!record?._id) return null;
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + leaseMs);
  const claimed = await StripeWebhookEvent.findOneAndUpdate(
    {
      _id: record._id,
      $or: [
        { status: "RECEIVED" },
        {
          status: "RETRYABLE",
          $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }],
        },
        { status: "PROCESSING", $or: [{ leaseExpiresAt: null }, { leaseExpiresAt: { $lte: now } }] },
      ],
    },
    {
      $set: {
        status: "PROCESSING",
        leaseOwner: owner,
        leaseExpiresAt,
        lastAttemptAt: now,
        updatedAt: now,
      },
      $inc: { attemptCount: 1 },
    },
    { new: true },
  );
  return claimed;
}

function retryDelay(attemptCount) {
  const exponent = Math.max(0, Number(attemptCount || 1) - 1);
  return Math.min(MAX_BACKOFF_MS, 30 * 1000 * 2 ** exponent);
}

function safeError(error) {
  return {
    code: String(error?.code || error?.type || "PROCESSING_ERROR").slice(0, 120),
    message: String(error?.message || error || "Stripe webhook processing failed").slice(0, 1000),
  };
}

async function markStripeWebhookProcessed(record, owner) {
  return StripeWebhookEvent.findOneAndUpdate(
    { _id: record._id, status: "PROCESSING", leaseOwner: owner },
    {
      $set: {
        status: "PROCESSED",
        processedAt: new Date(),
        leaseOwner: null,
        leaseExpiresAt: null,
        nextAttemptAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    },
    { new: true },
  );
}

async function markStripeWebhookIgnored(record, owner, reason = "unsupported_event") {
  return StripeWebhookEvent.findOneAndUpdate(
    { _id: record._id, status: "PROCESSING", leaseOwner: owner },
    {
      $set: {
        status: "IGNORED",
        localStatus: reason,
        processedAt: new Date(),
        leaseOwner: null,
        leaseExpiresAt: null,
        nextAttemptAt: null,
      },
    },
    { new: true },
  );
}

async function markStripeWebhookRetryable(record, error, owner) {
  const normalized = safeError(error);
  const currentAttempt = Number(record.attemptCount || 1);
  const exhausted = currentAttempt >= MAX_ATTEMPTS;
  metrics.increment(exhausted ? "webhook.dead" : "webhook.retryable");
  logger.warn(exhausted ? "stripe_webhook_dead" : "stripe_webhook_retryable", {
    webhookEventId: record.eventId,
    eventType: record.eventType,
    providerObjectId: record.providerObjectId,
    attemptCount: currentAttempt,
    errorCategory: classifyError(error),
    error,
  });
  return StripeWebhookEvent.findOneAndUpdate(
    { _id: record._id, status: "PROCESSING", leaseOwner: owner },
    {
      $set: {
        status: exhausted ? "DEAD" : "RETRYABLE",
        nextAttemptAt: exhausted ? null : new Date(Date.now() + retryDelay(currentAttempt)),
        lastErrorCode: normalized.code,
        lastErrorMessage: normalized.message,
        leaseOwner: null,
        leaseExpiresAt: null,
      },
    },
    { new: true },
  );
}

async function listEligibleStripeWebhookEvents(limit = BATCH_SIZE) {
  const now = new Date();
  return StripeWebhookEvent.find({
    $or: [
      { status: "RECEIVED" },
      { status: "RETRYABLE", $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }] },
      { status: "PROCESSING", $or: [{ leaseExpiresAt: null }, { leaseExpiresAt: { $lte: now } }] },
    ],
  })
    .sort({ receivedAt: 1 })
    .limit(Math.max(1, Math.min(100, Number(limit) || BATCH_SIZE)));
}

async function getStripeWebhookDiagnostics() {
  return StripeWebhookEvent.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 }, oldest: { $min: "$receivedAt" } } },
    { $sort: { _id: 1 } },
  ]);
}

module.exports = {
  LEASE_MS,
  MAX_ATTEMPTS,
  BATCH_SIZE,
  executionId,
  receiveStripeWebhookEvent,
  claimStripeWebhookEvent,
  markStripeWebhookProcessed,
  markStripeWebhookIgnored,
  markStripeWebhookRetryable,
  listEligibleStripeWebhookEvents,
  getStripeWebhookDiagnostics,
};
