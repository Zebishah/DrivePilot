const OutboxEvent = require("../models/OutboxEvent");
const { logger } = require("../utils/logger");

async function replayDeadOutboxEvent(eventId, actor = "manual") {
  if (!eventId) throw new Error("eventId is required");
  const event = await OutboxEvent.findOneAndUpdate(
    { eventId, status: "DEAD" },
    {
      $set: { status: "RETRYABLE", availableAt: new Date(), nextAttemptAt: null, failedAt: null, leaseOwner: null, leaseExpiresAt: null },
      $unset: { lastErrorCode: "", lastErrorMessage: "" },
      $inc: { replayCount: 1 },
    },
    { new: true },
  );
  if (!event) throw new Error("Dead outbox event not found");
  logger.warn("outbox_replayed", { eventId, eventType: event.eventType, actor });
  return event;
}

module.exports = { replayDeadOutboxEvent };
