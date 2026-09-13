const crypto = require("crypto");
const OutboxEvent = require("../models/OutboxEvent");
const User = require("../models/User").User;
const Otp = require("../models/User").Otp;
const SignupToken = require("../models/SignupLink");
const { emailProvider } = require("./emailProvider");
const { renderEmailTemplate } = require("./emailTemplates");
const metrics = require("../utils/metrics");
const { logger, classifyError } = require("../utils/logger");

const DEFAULT_LEASE_MS = Math.max(Number(process.env.OUTBOX_EMAIL_LEASE_MS) || 10 * 60 * 1000, 1000);
const DEFAULT_MAX_ATTEMPTS = Math.max(Number(process.env.OUTBOX_EMAIL_MAX_ATTEMPTS) || 8, 1);
const MAX_BACKOFF_MS = Math.max(Number(process.env.OUTBOX_EMAIL_MAX_BACKOFF_MS) || 60 * 60 * 1000, 1000);

function retryableError(error) {
  if (typeof error?.retryable === "boolean") return error.retryable;
  const status = Number(error?.status || error?.statusCode || 0);
  return status === 429 || status >= 500 || ["ETIMEDOUT", "ECONNRESET", "EMAIL_TIMEOUT", "EMAIL_NETWORK_ERROR"].includes(error?.code);
}

function backoffMs(attempt) {
  return Math.min(MAX_BACKOFF_MS, 1000 * 2 ** Math.min(Math.max(attempt - 1, 0), 10));
}

async function resolveReferences(event) {
  const payload = event.payload || {};
  const data = { ...(payload.data || {}) };
  const references = payload.references || {};

  if (references.otpId) {
    const otp = await Otp.findById(references.otpId).lean();
    if (!otp || new Date(otp.expiresAt) <= new Date()) {
      throw Object.assign(new Error("OTP is missing or expired"), { code: "OTP_EXPIRED", retryable: false });
    }
    data.otp = otp.otp;
    data.type = otp.type;
  }
  if (references.signupTokenId) {
    const signup = await SignupToken.findById(references.signupTokenId).lean();
    if (!signup?.signupLink) {
      throw Object.assign(new Error("Signup link is missing"), { code: "SIGNUP_LINK_MISSING", retryable: false });
    }
    data.signupLink = signup.signupLink;
  }
  if (references.passwordResetUserId) {
    const user = await User.findById(references.passwordResetUserId).select("resetToken resetTokenExpiry").lean();
    if (!user?.resetToken || !user.resetTokenExpiry || new Date(user.resetTokenExpiry) <= new Date()) {
      throw Object.assign(new Error("Password reset token is missing or expired"), { code: "RESET_TOKEN_EXPIRED", retryable: false });
    }
    const frontendBase = (process.env.FRONTEND_URL || process.env.Frontend_URL || "http://localhost:5173").replace(/\/$/, "");
    data.resetUrl = `${frontendBase}/auth/reset-password/${encodeURIComponent(user.resetToken)}`;
  }
  return data;
}

function claimFilter(now) {
  return {
    $or: [
      {
        status: { $in: ["PENDING", "RETRYABLE"] },
        availableAt: { $lte: now },
        $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $exists: false } }, { nextAttemptAt: { $lte: now } }],
      },
      { status: "PROCESSING", leaseExpiresAt: { $lte: now } },
    ],
  };
}

async function claimOutboxEvent({ leaseOwner, leaseMs = DEFAULT_LEASE_MS }) {
  const now = new Date();
  return OutboxEvent.findOneAndUpdate(
    claimFilter(now),
    {
      $set: {
        status: "PROCESSING",
        leaseOwner,
        leaseExpiresAt: new Date(now.getTime() + leaseMs),
        processingStartedAt: now,
        lastErrorCode: null,
        lastErrorMessage: null,
      },
      $inc: { attemptCount: 1 },
    },
    { new: true, sort: { availableAt: 1, createdAt: 1 } },
  ).lean();
}

async function markDelivered(event, leaseOwner, result) {
  try {
    return await OutboxEvent.updateOne(
      { _id: event._id, status: "PROCESSING", leaseOwner },
      {
        $set: {
          status: "DELIVERED",
          deliveredAt: new Date(),
          provider: result.provider || "elasticemail",
          providerMessageId: result.providerMessageId || null,
          leaseOwner: null,
          leaseExpiresAt: null,
        },
      },
    );
  } catch (error) {
    // The provider may already have accepted the message. Keep the event
    // retryable so a later lease can reconcile the local state; exactly-once
    // delivery cannot be guaranteed without provider-side idempotency.
    error.code = error.code || "OUTBOX_DELIVERY_STATE_UNCERTAIN";
    error.retryable = true;
    throw error;
  }
}

async function markFailure(event, leaseOwner, error) {
  const attempt = Number(event.attemptCount || 1);
  const shouldRetry = retryableError(error) && attempt < (event.maxAttempts || DEFAULT_MAX_ATTEMPTS);
  const nextAttemptAt = new Date(Date.now() + backoffMs(attempt));
  return OutboxEvent.updateOne(
    { _id: event._id, status: "PROCESSING", leaseOwner },
    {
      $set: {
        status: shouldRetry ? "RETRYABLE" : "DEAD",
        nextAttemptAt: shouldRetry ? nextAttemptAt : null,
        failedAt: shouldRetry ? null : new Date(),
        lastErrorCode: String(error?.code || classifyError(error) || "EMAIL_FAILED").slice(0, 120),
        lastErrorMessage: String(error?.message || error || "Email delivery failed").slice(0, 1000),
        leaseOwner: null,
        leaseExpiresAt: null,
      },
    },
  );
}

async function deliverEvent(event, { provider = emailProvider } = {}) {
  const payload = event.payload || {};
  const data = await resolveReferences(event);
  const message = renderEmailTemplate(payload.template, data);
  const from = process.env.EMAIL_FROM || "";
  logger.info("email_send_attempt", { eventId: event.eventId, eventType: event.eventType, attempt: event.attemptCount });
  return provider.send({ to: payload.to, from, subject: message.subject, html: message.html, text: message.text, metadata: event.metadata });
}

async function runOutboxEmailJob(context = {}) {
  const provider = context.provider || emailProvider;
  if (!provider.isEnabled()) return { selected: 0, processed: 0, skipped: true, reason: "EMAIL_DISABLED" };
  const batchSize = Math.min(Math.max(Number(context.batchSize || process.env.OUTBOX_EMAIL_BATCH_SIZE || 25), 1), 100);
  let processed = 0;
  let delivered = 0;
  let retryable = 0;
  let dead = 0;
  for (let index = 0; index < batchSize; index += 1) {
    const leaseOwner = context.leaseOwner || `outbox-email-${crypto.randomUUID()}`;
    const event = await claimOutboxEvent({ leaseOwner, leaseMs: context.leaseMs });
    if (!event) break;
    processed += 1;
    const startedAt = Date.now();
    try {
      metrics.increment("email_attempted", 1, { eventType: event.eventType });
      const result = await deliverEvent(event, { provider });
      const updated = await markDelivered(event, leaseOwner, result);
      metrics.observe("outbox_processing_duration", Date.now() - startedAt, { eventType: event.eventType });
      if (!updated.modifiedCount) {
        logger.warn("outbox_delivery_state_conflict", { eventId: event.eventId, eventType: event.eventType });
      } else {
        delivered += 1;
        metrics.increment("outbox_delivered", 1, { eventType: event.eventType });
        metrics.increment("email_sent", 1, { eventType: event.eventType });
        logger.info("outbox_delivered", { eventId: event.eventId, eventType: event.eventType, providerMessageId: result.providerMessageId || null, durationMs: Date.now() - startedAt });
      }
    } catch (error) {
      const willRetry = retryableError(error) && Number(event.attemptCount || 1) < (event.maxAttempts || DEFAULT_MAX_ATTEMPTS);
      await markFailure(event, leaseOwner, error);
      metrics.observe("outbox_processing_duration", Date.now() - startedAt, { eventType: event.eventType });
      metrics.increment(willRetry ? "outbox_retry" : "outbox_dead", 1, { eventType: event.eventType });
      metrics.increment("email_failed", 1, { eventType: event.eventType });
      if (willRetry) retryable += 1; else dead += 1;
      logger[willRetry ? "warn" : "error"](willRetry ? "outbox_retry" : "outbox_dead", { eventId: event.eventId, eventType: event.eventType, attempt: event.attemptCount, code: error?.code || "EMAIL_FAILED", error, durationMs: Date.now() - startedAt });
    }
  }
  return { selected: processed, processed, delivered, retryable, dead };
}

async function getOutboxDiagnostics() {
  const [counts, oldest] = await Promise.all([
    OutboxEvent.aggregate([{ $group: { _id: { status: "$status", eventType: "$eventType" }, count: { $sum: 1 } } }]),
    OutboxEvent.findOne({ status: { $in: ["PENDING", "RETRYABLE"] } }).sort({ createdAt: 1 }).select("createdAt").lean(),
  ]);
  return { counts, oldestPendingAgeMs: oldest ? Date.now() - new Date(oldest.createdAt).getTime() : 0 };
}

module.exports = { DEFAULT_LEASE_MS, claimOutboxEvent, deliverEvent, getOutboxDiagnostics, markDelivered, markFailure, runOutboxEmailJob };
