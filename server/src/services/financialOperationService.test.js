const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

test("financial operations are idempotent and only one live lease can claim work", async () => {
  const operations = new Map();
  const transactions = new Map();

  const clone = (value) => (value ? { ...value } : value);
  const matches = (doc, query) => {
    if (query._id && String(doc._id) !== String(query._id)) return false;
    if (query.operationId && doc.operationId !== query.operationId) return false;
    if (query.idempotencyKey && doc.idempotencyKey !== query.idempotencyKey) return false;
    if (query.status && doc.status !== query.status) return false;
    if (query.$or) {
      return query.$or.some((branch) => {
        if (branch.status?.$in) return branch.status.$in.includes(doc.status);
        if (branch.status === "PROCESSING") {
          return (
            doc.status === "PROCESSING" &&
            doc.leaseExpiresAt &&
            new Date(doc.leaseExpiresAt) <= new Date()
          );
        }
        return false;
      });
    }
    return true;
  };

  const fakeOperationModel = {
    findOne: async (query) =>
      clone([...operations.values()].find((item) => matches(item, query))),
    create: async (payload) => {
      const record = { ...payload, _id: `db-${operations.size + 1}`, status: payload.status || "PENDING", attemptCount: payload.attemptCount || 0 };
      operations.set(record.operationId, record);
      return clone(record);
    },
    findOneAndUpdate: async (query, update) => {
      const record = [...operations.values()].find((item) => matches(item, query));
      if (!record) return null;
      Object.assign(record, update.$set || {});
      if (update.$inc) {
        for (const [key, value] of Object.entries(update.$inc)) record[key] = (record[key] || 0) + value;
      }
      return clone(record);
    },
  };

  const fakeTransactionModel = {
    findOneAndUpdate: async (query, update) => {
      const key = query.financialOperationId + ":" + query.eventType;
      if (!transactions.has(key)) {
        transactions.set(key, { ...update.$setOnInsert, _id: `tx-${transactions.size + 1}` });
      }
      return clone(transactions.get(key));
    },
  };

  const originalLoad = Module._load;
  Module._load = function mockedLoad(request, parent, isMain) {
    if (request.endsWith("/models/FinancialOperation")) return fakeOperationModel;
    if (request.endsWith("/models/transaction.model")) return fakeTransactionModel;
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const service = require("./financialOperationService");
    const first = await service.getOrCreateOperation({
      operationType: "T48_PAYMENT",
      aggregateType: "BOOKING_SLOT",
      aggregateId: "booking:slot",
      idempotencyKey: "t48-booking-slot",
    });
    const second = await service.getOrCreateOperation({
      operationType: "T48_PAYMENT",
      aggregateType: "BOOKING_SLOT",
      aggregateId: "booking:slot",
      idempotencyKey: "t48-booking-slot",
    });
    assert.equal(first.operationId, second.operationId);

    const claimOne = await service.claimOperation(first, "worker-one", 60_000);
    const claimTwo = await service.claimOperation(first, "worker-two", 60_000);
    assert.equal(claimOne.leaseOwner, "worker-one");
    assert.equal(claimTwo, null);

    await service.markAttempt(claimOne, "worker-one");
    await service.markProviderSuccess(claimOne, {
      providerObjectId: "pi_t48",
      providerStatus: "succeeded",
    });
    await service.markLocalSuccess(claimOne, "slot_applied");
    const completed = await service.markCompleted(claimOne);
    assert.equal(completed.status, "COMPLETED");

    const txOne = await service.createIdempotentTransaction({
      financialOperationId: completed.operationId,
      eventType: "T48_PAYMENT_STUDENT_DEBIT",
      type: "payment",
      role: "student",
      direction: "debit",
      amount: 10,
    });
    const txTwo = await service.createIdempotentTransaction({
      financialOperationId: completed.operationId,
      eventType: "T48_PAYMENT_STUDENT_DEBIT",
      type: "payment",
      role: "student",
      direction: "debit",
      amount: 10,
    });
    assert.equal(txOne._id, txTwo._id);
    assert.equal(transactions.size, 1);
  } finally {
    Module._load = originalLoad;
  }
});
