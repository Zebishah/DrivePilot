const Transaction = require("../models/transaction.model");

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
  return Transaction.create(payload);
}

/**
 * Convenience helpers for common transaction types can be added later if needed.
 */

module.exports = {
  createTransaction,
};

