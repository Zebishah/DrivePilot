const FinancialOperation = require("../models/FinancialOperation");
const StripeWebhookEvent = require("../models/StripeWebhookEvent");
const JobExecution = require("../models/JobExecution");
const RefundRequest = require("../models/refundRequest.model");

function safeId(value) {
  return value == null ? null : String(value);
}

function safeOperation(operation) {
  return {
    operationId: safeId(operation.operationId),
    operationType: operation.operationType,
    status: operation.status,
    bookingId: safeId(operation.bookingId || operation.aggregateId),
    slotId: safeId(operation.slotId),
    providerObjectId: safeId(operation.providerObjectId),
    attemptCount: operation.attemptCount,
    lastErrorCode: operation.lastErrorCode,
    updatedAt: operation.updatedAt,
  };
}

async function getFinancialDiagnostics({ limit = 50 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const now = new Date();
  const [manualReview, deadWebhooks, retryableOperations, staleJobs, processingRefunds] = await Promise.all([
    FinancialOperation.find({ status: "FAILED_MANUAL_REVIEW" }).sort({ updatedAt: 1 }).limit(safeLimit).lean(),
    StripeWebhookEvent.find({ status: "DEAD" }).sort({ receivedAt: 1 }).limit(safeLimit).lean(),
    FinancialOperation.find({ status: { $in: ["RETRYABLE", "PROCESSING"] } }).sort({ updatedAt: 1 }).limit(safeLimit).lean(),
    JobExecution.find({ $or: [{ status: "FAILED" }, { status: "RUNNING", leaseExpiresAt: { $lte: now } }] }).sort({ updatedAt: 1 }).limit(safeLimit).lean(),
    RefundRequest.find({ status: "processing" }).sort({ updatedAt: 1 }).limit(safeLimit).lean(),
  ]);

  return {
    manualReviewOperations: manualReview.map(safeOperation),
    retryableOperations: retryableOperations.map(safeOperation),
    deadWebhooks: deadWebhooks.map((event) => ({
      eventId: safeId(event.eventId),
      eventType: event.eventType,
      providerObjectId: safeId(event.providerObjectId),
      attemptCount: event.attemptCount,
      lastErrorCode: event.lastErrorCode,
      receivedAt: event.receivedAt,
    })),
    staleJobs: staleJobs.map((job) => ({
      jobName: job.jobName,
      runId: safeId(job.runId),
      status: job.status,
      leaseOwner: safeId(job.leaseOwner),
      leaseExpiresAt: job.leaseExpiresAt,
      lastError: job.lastError,
    })),
    processingRefunds: processingRefunds.map((refund) => ({
      refundRequestId: safeId(refund._id),
      bookingId: safeId(refund.bookingId),
      slotId: safeId(refund.slotId),
      amountMinor: refund.amountMinor,
      status: refund.status,
      updatedAt: refund.updatedAt,
    })),
  };
}

module.exports = { getFinancialDiagnostics };
