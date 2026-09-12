const {
  executionId,
  listEligibleStripeWebhookEvents,
  claimStripeWebhookEvent,
  markStripeWebhookProcessed,
  markStripeWebhookIgnored,
  markStripeWebhookRetryable,
} = require("./stripeWebhookEventService");

let eventHandler = null;
function setStripeWebhookEventHandler(handler) {
  eventHandler = handler;
}

async function dispatchStripeWebhookEvent(event, eventRecord = null) {
  if (typeof eventHandler !== "function") {
    const error = new Error("Stripe webhook event handler is not registered");
    error.code = "HANDLER_NOT_REGISTERED";
    throw error;
  }
  return eventHandler(event, eventRecord);
}

function isIgnoredError(error) {
  return error?.code === "STRIPE_WEBHOOK_IGNORED";
}

async function processStripeWebhookEventRecord(record, owner = executionId()) {
  const claimed = await claimStripeWebhookEvent(record, owner);
  if (!claimed) return { status: "SKIPPED" };
  if (typeof eventHandler !== "function") {
    const error = new Error("Stripe webhook event handler is not registered");
    error.code = "HANDLER_NOT_REGISTERED";
    await markStripeWebhookRetryable(claimed, error, owner);
    return { status: "RETRYABLE" };
  }
  try {
    const result = await eventHandler(claimed.payload, claimed);
    if (result?.ignored) {
      await markStripeWebhookIgnored(claimed, owner, result.reason);
      return { status: "IGNORED" };
    }
    await markStripeWebhookProcessed(claimed, owner);
    return { status: "PROCESSED" };
  } catch (error) {
    if (isIgnoredError(error)) {
      await markStripeWebhookIgnored(claimed, owner, error.message);
      return { status: "IGNORED" };
    }
    const updated = await markStripeWebhookRetryable(claimed, error, owner);
    return { status: updated?.status || "RETRYABLE", error };
  }
}

async function runStripeWebhookProcessorJob({ batchSize } = {}) {
  const counters = { claimed: 0, processed: 0, retryable: 0, dead: 0, ignored: 0, skipped: 0 };
  const records = await listEligibleStripeWebhookEvents(batchSize);
  for (const record of records) {
    const result = await processStripeWebhookEventRecord(record);
    if (result.status === "SKIPPED") counters.skipped += 1;
    else {
      counters.claimed += 1;
      if (result.status === "PROCESSED") counters.processed += 1;
      if (result.status === "RETRYABLE") counters.retryable += 1;
      if (result.status === "DEAD") counters.dead += 1;
      if (result.status === "IGNORED") counters.ignored += 1;
    }
  }
  console.log("[StripeWebhookProcessor] completed", { selected: records.length, ...counters });
  return { selected: records.length, ...counters };
}

module.exports = {
  setStripeWebhookEventHandler,
  dispatchStripeWebhookEvent,
  processStripeWebhookEventRecord,
  runStripeWebhookProcessorJob,
};
