const crypto = require("crypto");
const FinancialOperation = require("../models/FinancialOperation");
const Transaction = require("../models/transaction.model");
const { toMinorUnits, fromMinorUnits } = require("../utils/money");
const { logger, classifyError } = require("../utils/logger");
const metrics = require("../utils/metrics");

const LEASE_MS = 5 * 60 * 1000;

function currentOperationQuery(operation, allowedStatuses) {
  const query = {
    _id: operation._id,
    status: { $in: allowedStatuses },
  };
  if (operation.leaseOwner) query.leaseOwner = operation.leaseOwner;
  return query;
}

function operationMetricPrefix(operationType) {
  if (operationType === "PAYOUT") return "payout";
  if (operationType === "REFUND") return "refund";
  if (["DIRECT_PAYMENT", "T48_PAYMENT"].includes(operationType)) return "payment";
  return "financial_operation";
}

async function updateOperation(operation, targetStatus, allowedStatuses, update) {
  const updated = await FinancialOperation.findOneAndUpdate(
    currentOperationQuery(operation, allowedStatuses),
    update,
    { new: true },
  );
  if (updated) {
    Object.assign(operation, {
      status: updated.status,
      leaseOwner: updated.leaseOwner,
      leaseExpiresAt: updated.leaseExpiresAt,
    });
    metrics.increment("financial_operation.transition", 1, {
      operationType: operation.operationType,
      status: targetStatus,
    });
    const metricPrefix = operationMetricPrefix(operation.operationType);
    if (targetStatus === "PROVIDER_SUCCEEDED") metrics.increment(`${metricPrefix}.succeeded`);
    if (targetStatus === "RETRYABLE") metrics.increment(`${metricPrefix}.failed`);
    logger.info("financial_operation_transition", {
      operationId: operation.operationId,
      operationType: operation.operationType,
      bookingId: operation.bookingId,
      slotId: operation.slotId,
      providerObjectId: updated.providerObjectId,
      status: targetStatus,
    });
    return updated;
  }

  // A repeated transition to the same state is idempotent. Every other
  // transition is rejected without regressing the persisted state.
  const current = await FinancialOperation.findOne({ _id: operation._id });
  if (current?.status === targetStatus) return current;
  return null;
}

function executionId(prefix = "financial") {
  return `${prefix}-${crypto.randomUUID()}`;
}

function operationId() {
  return crypto.randomUUID();
}

async function getOrCreateOperation(input) {
  if (!input?.idempotencyKey) throw new Error("Financial operation key is required");
  const existing = await FinancialOperation.findOne({
    idempotencyKey: String(input.idempotencyKey),
  });
  if (existing) return existing;

  const payload = {
    operationId: input.operationId || operationId(),
    operationType: input.operationType,
    aggregateType: input.aggregateType,
    aggregateId: String(input.aggregateId),
    bookingId: input.bookingId,
    slotId: input.slotId != null ? String(input.slotId) : undefined,
    studentId: input.studentId,
    instructorId: input.instructorId,
    currency: String(input.currency || "CHF").toUpperCase(),
    requestedAmountMinor:
      input.requestedAmountMinor != null
        ? input.requestedAmountMinor
        : input.requestedAmount != null
          ? toMinorUnits(input.requestedAmount, input.currency || "CHF")
          : undefined,
    requestedAmount:
      input.requestedAmount != null
        ? input.requestedAmount
        : input.requestedAmountMinor != null
          ? Number(fromMinorUnits(input.requestedAmountMinor, input.currency || "CHF"))
          : undefined,
    provider: input.provider || "stripe",
    idempotencyKey: String(input.idempotencyKey),
    metadata: input.metadata || {},
  };
  try {
    const created = await FinancialOperation.create(payload);
    metrics.increment("financial_operation.attempted", 1, { operationType: payload.operationType });
    logger.info("financial_operation_created", {
      operationId: created.operationId,
      operationType: created.operationType,
      bookingId: created.bookingId,
      slotId: created.slotId,
      status: created.status,
    });
    return created;
  } catch (error) {
    if (error?.code === 11000) {
      const raced = await FinancialOperation.findOne({
        idempotencyKey: String(input.idempotencyKey),
      });
      if (raced) return raced;
    }
    throw error;
  }
}

async function getOperation(operationIdValue) {
  return FinancialOperation.findOne({ operationId: String(operationIdValue) });
}

async function getOperationByProviderObjectId(providerObjectId) {
  if (!providerObjectId) return null;
  return FinancialOperation.findOne({ providerObjectId: String(providerObjectId) });
}

async function getLatestOperation(query) {
  return FinancialOperation.findOne(query).sort({ createdAt: -1 });
}

async function claimOperation(operation, owner = executionId(), leaseMs = LEASE_MS) {
  if (!operation) return null;
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + leaseMs);
  const claimed = await FinancialOperation.findOneAndUpdate(
    {
      _id: operation._id,
      $or: [
        { status: { $in: ["PENDING", "VERIFYING_PROVIDER"] } },
        {
          status: "RETRYABLE",
          $or: [
            { nextAttemptAt: null },
            { nextAttemptAt: { $lte: now } },
          ],
        },
        { status: "PROCESSING", leaseExpiresAt: { $lte: now } },
      ],
    },
    {
      $set: {
        status: "PROCESSING",
        leaseOwner: owner,
        leaseExpiresAt,
        updatedAt: now,
      },
    },
    { new: true },
  );
  if (claimed) {
    Object.assign(operation, {
      status: claimed.status,
      leaseOwner: claimed.leaseOwner,
      leaseExpiresAt: claimed.leaseExpiresAt,
    });
  }
  return claimed;
}

async function claimOperationForReconciliation(
  operation,
  owner = executionId("reconcile"),
  leaseMs = LEASE_MS,
) {
  if (!operation) return null;
  const now = new Date();
  const claimed = await FinancialOperation.findOneAndUpdate(
    {
      _id: operation._id,
      $or: [
        { status: "PROVIDER_SUCCEEDED" },
        {
          status: "RETRYABLE",
          $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }],
        },
        { status: "PROCESSING", leaseExpiresAt: { $lte: now } },
      ],
    },
    {
      $set: {
        status: "PROCESSING",
        leaseOwner: owner,
        leaseExpiresAt: new Date(now.getTime() + leaseMs),
        lastAttemptAt: now,
        updatedAt: now,
      },
      $inc: { attemptCount: 1 },
    },
    { new: true },
  );
  return claimed;
}

async function markAttempt(operation, owner) {
  return FinancialOperation.findOneAndUpdate(
    {
      _id: operation._id,
      status: "PROCESSING",
      ...(owner ? { leaseOwner: owner } : {}),
    },
    {
      $inc: { attemptCount: 1 },
      $set: { lastAttemptAt: new Date() },
    },
    { new: true },
  );
}

async function markProviderSuccess(operation, data = {}) {
  return updateOperation(
    operation,
    "PROVIDER_SUCCEEDED",
    ["PENDING", "PROCESSING", "VERIFYING_PROVIDER", "RETRYABLE", "PROVIDER_SUCCEEDED"],
    {
      $set: {
        status: "PROVIDER_SUCCEEDED",
        providerStatus: data.providerStatus,
        providerObjectId: data.providerObjectId,
        secondaryProviderObjectId: data.secondaryProviderObjectId,
        localStatus: data.localStatus,
        leaseOwner: null,
        leaseExpiresAt: null,
        nextAttemptAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        updatedAt: new Date(),
      },
    },
  );
}

async function markLocalSuccess(operation, localStatus = "applied") {
  return updateOperation(
    operation,
    "LOCAL_APPLIED",
    ["PROVIDER_SUCCEEDED", "LOCAL_APPLIED"],
    {
      $set: {
        status: "LOCAL_APPLIED",
        localStatus,
        leaseOwner: null,
        leaseExpiresAt: null,
        nextAttemptAt: null,
        updatedAt: new Date(),
      },
    },
  );
}

async function markCompleted(operation, localStatus = "completed") {
  return updateOperation(
    operation,
    "COMPLETED",
    ["LOCAL_APPLIED", "COMPLETED"],
    {
      $set: {
        status: "COMPLETED",
        localStatus,
        completedAt: new Date(),
        leaseOwner: null,
        leaseExpiresAt: null,
        nextAttemptAt: null,
        updatedAt: new Date(),
      },
    },
  );
}

async function markRetryable(operation, error, nextAttemptAt) {
  metrics.increment("financial_operation.retryable", 1, { operationType: operation?.operationType, errorCategory: classifyError(error) });
  const metricPrefix = operationMetricPrefix(operation?.operationType);
  if (error?.code === "REQUIRES_ACTION") metrics.increment(`${metricPrefix}.requires_action`);
  return updateOperation(
    operation,
    "RETRYABLE",
    ["PENDING", "PROCESSING", "VERIFYING_PROVIDER", "PROVIDER_SUCCEEDED", "RETRYABLE"],
    {
      $set: {
        status: "RETRYABLE",
        nextAttemptAt: nextAttemptAt || new Date(Date.now() + 5 * 60 * 1000),
        leaseOwner: null,
        leaseExpiresAt: null,
        lastErrorCode: error?.code ? String(error.code) : "UNKNOWN",
        lastErrorMessage: String(error?.message || error || "Financial operation failed").slice(0, 1000),
        updatedAt: new Date(),
      },
    },
  );
}

async function markManualReview(operation, error, localStatus = "manual_review") {
  metrics.increment("financial_operation.manual_review", 1, { operationType: operation?.operationType, errorCategory: classifyError(error) });
  metrics.increment(`${operationMetricPrefix(operation?.operationType)}.manual_review`);
  return updateOperation(
    operation,
    "FAILED_MANUAL_REVIEW",
    [
      "PENDING",
      "PROCESSING",
      "VERIFYING_PROVIDER",
      "PROVIDER_SUCCEEDED",
      "RETRYABLE",
      "FAILED_MANUAL_REVIEW",
    ],
    {
      $set: {
        status: "FAILED_MANUAL_REVIEW",
        localStatus,
        leaseOwner: null,
        leaseExpiresAt: null,
        nextAttemptAt: null,
        lastErrorCode: error?.code ? String(error.code) : "MANUAL_REVIEW",
        lastErrorMessage: String(error?.message || error || "Manual review required").slice(0, 1000),
        updatedAt: new Date(),
      },
    },
  );
}

async function attachBooking(operation, bookingId) {
  return FinancialOperation.findOneAndUpdate(
    { _id: operation._id },
    { $set: { bookingId, updatedAt: new Date() } },
    { new: true },
  );
}

async function createIdempotentTransaction(payload) {
  const { financialOperationId, eventType, ...transactionPayload } = payload;
  if (!financialOperationId || !eventType) {
    return Transaction.create(transactionPayload);
  }
  return Transaction.findOneAndUpdate(
    { financialOperationId: String(financialOperationId), eventType: String(eventType) },
    {
      $setOnInsert: {
        ...transactionPayload,
        financialOperationId: String(financialOperationId),
        eventType: String(eventType),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

module.exports = {
  LEASE_MS,
  executionId,
  getOrCreateOperation,
  getOperation,
  getOperationByProviderObjectId,
  getLatestOperation,
  claimOperation,
  claimOperationForReconciliation,
  markAttempt,
  markProviderSuccess,
  markLocalSuccess,
  markCompleted,
  markRetryable,
  markManualReview,
  attachBooking,
  createIdempotentTransaction,
};
