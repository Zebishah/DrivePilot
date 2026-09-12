const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

test("provider transaction correlation deduplicates retries without collapsing distinct effects", async () => {
  const records = new Map();
  const fakeTransactionModel = {
    findOneAndUpdate: async (query, update) => {
      if (!records.has(query.correlationKey)) {
        records.set(query.correlationKey, {
          ...update.$setOnInsert,
          _id: `tx-${records.size + 1}`,
        });
      }
      return records.get(query.correlationKey);
    },
    findOne: async (query) => records.get(query.correlationKey) || null,
    create: async (payload) => ({ ...payload, _id: `tx-${records.size + 1}` }),
  };

  const originalLoad = Module._load;
  Module._load = function mockedLoad(request, parent, isMain) {
    if (request.endsWith("/models/transaction.model")) return fakeTransactionModel;
    if (request.endsWith("/services/financialOperationService")) {
      return { createIdempotentTransaction: async () => ({}) };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const { createTransaction } = require("./transactionService");
    const base = {
      type: "payment",
      role: "platform",
      direction: "credit",
      amount: 50,
      bookingId: "booking-1",
      slotId: "slot-1",
      stripePaymentIntentId: "pi-1",
    };
    const first = await createTransaction(base);
    const retry = await createTransaction({ ...base, amount: 999 });
    const differentSlot = await createTransaction({ ...base, slotId: "slot-2" });
    const differentProvider = await createTransaction({
      ...base,
      stripePaymentIntentId: "pi-2",
    });

    assert.equal(first._id, retry._id);
    assert.equal(records.size, 3);
    assert.notEqual(first._id, differentSlot._id);
    assert.notEqual(first._id, differentProvider._id);
  } finally {
    Module._load = originalLoad;
  }
});
