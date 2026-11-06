const crypto = require("crypto");
const OutboxEvent = require("../models/OutboxEvent");
const metrics = require("../utils/metrics");
const { logger } = require("../utils/logger");

const MAX_PAYLOAD_BYTES = 64 * 1024;

function safeString(value, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

function assertEventInput({ eventType, aggregateType, aggregateId, dedupeKey }) {
  for (const [name, value] of Object.entries({ eventType, aggregateType, aggregateId, dedupeKey })) {
    if (!safeString(value)) {
      throw Object.assign(new Error(`${name} is required`), { code: "OUTBOX_INPUT_INVALID" });
    }
  }
}

function assertSafeData(value, path = "data", depth = 0) {
  if (depth > 5) throw Object.assign(new Error(`${path} is too deeply nested`), { code: "OUTBOX_PAYLOAD_INVALID" });
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafeData(item, `${path}[${index}]`, depth + 1));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (/(password|secret|authorization|cookie|card|payment.?method|jwt|otp$|token$)/i.test(key)) {
      throw Object.assign(new Error(`${path}.${key} is not allowed in an outbox payload`), { code: "OUTBOX_SENSITIVE_PAYLOAD" });
    }
    assertSafeData(child, `${path}.${key}`, depth + 1);
  }
}

function createOutboxService({ model = OutboxEvent } = {}) {
  async function enqueueOutboxEvent({
    eventId = crypto.randomUUID(),
    eventType,
    aggregateType,
    aggregateId,
    dedupeKey,
    payload = {},
    metadata = {},
    maxAttempts = 8,
    session,
  }) {
    assertEventInput({ eventType, aggregateType, aggregateId, dedupeKey });
    const serialized = JSON.stringify(payload);
    if (Buffer.byteLength(serialized, "utf8") > MAX_PAYLOAD_BYTES) {
      throw Object.assign(new Error("Outbox payload exceeds the 64 KB limit"), { code: "OUTBOX_PAYLOAD_TOO_LARGE" });
    }

    const query = model.findOne({ dedupeKey });
    if (session && query.session) query.session(session);
    const existing = await query;
    if (existing) {
      metrics.increment("outbox_deduplicated", 1, { eventType });
      return existing;
    }

    const event = new model({
      eventId: safeString(eventId, 100),
      eventType: safeString(eventType),
      aggregateType: safeString(aggregateType),
      aggregateId: safeString(aggregateId),
      dedupeKey: safeString(dedupeKey, 300),
      payload,
      metadata,
      maxAttempts: Math.min(Math.max(Number(maxAttempts) || 8, 1), 20),
      status: "PENDING",
      availableAt: new Date(),
    });

    try {
      await event.save(session ? { session } : undefined);
      metrics.increment("outbox_enqueued", 1, { eventType });
      logger.info("outbox_enqueued", {
        eventId: event.eventId,
        eventType: event.eventType,
        dedupeKey: event.dedupeKey,
        aggregateId: event.aggregateId,
      });
      return event;
    } catch (error) {
      if (error?.code === 11000) {
        const duplicateQuery = model.findOne({ dedupeKey });
        if (session && duplicateQuery.session) duplicateQuery.session(session);
        const duplicate = await duplicateQuery;
        if (duplicate) return duplicate;
      }
      throw error;
    }
  }

  async function enqueueEmailEvent({
    eventType,
    aggregateType = "NOTIFICATION",
    aggregateId,
    dedupeKey,
    to,
    template,
    data = {},
    metadata = {},
    references = {},
    session,
  }) {
    const recipients = (Array.isArray(to) ? to : [to])
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean);
    if (!recipients.length) {
      throw Object.assign(new Error("At least one email recipient is required"), { code: "EMAIL_RECIPIENT_INVALID" });
    }
    if (!template) {
      throw Object.assign(new Error("Email template is required"), { code: "EMAIL_TEMPLATE_INVALID" });
    }
    assertSafeData(data);
    return enqueueOutboxEvent({
      eventType,
      aggregateType,
      aggregateId: aggregateId || dedupeKey,
      dedupeKey,
      payload: { channel: "email", to: recipients, template, data, references },
      metadata: { ...metadata, provider: "elasticemail" },
      session,
    });
  }

  return { enqueueOutboxEvent, enqueueEmailEvent };
}

const outbox = createOutboxService();
module.exports = { MAX_PAYLOAD_BYTES, createOutboxService, enqueueOutboxEvent: outbox.enqueueOutboxEvent, enqueueEmailEvent: outbox.enqueueEmailEvent };
