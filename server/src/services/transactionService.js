const Transaction = require("../models/transaction.model");
const { createIdempotentTransaction } = require("./financialOperationService");

/**
 * Create a transaction document.
 * Minimal helper to keep logging consistent.
 * opts should contain: type, role, direction, amount, and any linkage/stripe fields.
 */
async function createTransaction(opts) {
  const payload = {
    ...opts,
  };
  if (!payload.occurredAt) {
    payload.occurredAt = new Date();
  }
  if (payload.financialOperationId && payload.eventType) {
    return createIdempotentTransaction(payload);
  }
  const providerId =
    payload.stripePaymentIntentId ||
    payload.stripeRefundId ||
    payload.stripePayoutId ||
    payload.stripeTransferId ||
    payload.stripeTransferReversalId;
  if (providerId) {
    payload.correlationKey = [
      providerId,
      payload.type,
      payload.role,
      payload.direction,
      payload.bookingId || "",
      payload.slotId || "",
    ].join("|");
    try {
      return await Transaction.findOneAndUpdate(
        { correlationKey: payload.correlationKey },
        { $setOnInsert: payload },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } catch (error) {
      if (error?.code === 11000) {
        return Transaction.findOne({ correlationKey: payload.correlationKey });
      }
      throw error;
    }
  }
  return Transaction.create(payload);
}

/**
 * Convenience helpers for common transaction types can be added later if needed.
 */

module.exports = {
  createTransaction,
};
