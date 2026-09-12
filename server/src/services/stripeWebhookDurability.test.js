const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

function withMocks(mocks, callback) {
  const originalLoad = Module._load;
  Module._load = function mockedLoad(request, parent, isMain) {
    const match = Object.entries(mocks).find(([suffix]) => request.endsWith(suffix));
    return match ? match[1] : originalLoad.call(this, request, parent, isMain);
  };
  return Promise.resolve()
    .then(callback)
    .finally(() => {
      Module._load = originalLoad;
    });
}

test("webhook receipt is durable-first and duplicate-safe", async () => {
  let createCalls = 0;
  const records = new Map();
  const fakeModel = {
    create: async (payload) => {
      createCalls += 1;
      if (records.has(payload.eventId)) {
        const error = new Error("duplicate");
        error.code = 11000;
        throw error;
      }
      const record = { ...payload, _id: payload.eventId };
      records.set(payload.eventId, record);
      return record;
    },
    findOne: async ({ eventId }) => records.get(eventId) || null,
  };

  await withMocks({ "/models/StripeWebhookEvent": fakeModel }, async () => {
    delete require.cache[require.resolve("./stripeWebhookEventService")];
    const service = require("./stripeWebhookEventService");
    const event = {
      id: "evt_test_1",
      type: "payment_intent.succeeded",
      account: "acct_test",
      created: 1700000000,
      data: { object: { object: "payment_intent", id: "pi_test_1" } },
    };
    const first = await service.receiveStripeWebhookEvent(event);
    const second = await service.receiveStripeWebhookEvent(event);
    assert.equal(first.duplicate, false);
    assert.equal(second.duplicate, true);
    assert.equal(createCalls, 2);
    assert.equal(second.record.eventId, "evt_test_1");
  });
});

test("webhook processor claims work once and records retry/dead outcomes", async () => {
  const calls = [];
  const fakeEventService = {
    executionId: () => "worker-test",
    listEligibleStripeWebhookEvents: async () => [
      { _id: "event-1", payload: { id: "evt-1", type: "account.updated" } },
    ],
    claimStripeWebhookEvent: async (record, owner) => {
      calls.push(["claim", record._id, owner]);
      return { ...record, status: "PROCESSING", attemptCount: 1 };
    },
    markStripeWebhookProcessed: async () => calls.push(["processed"]),
    markStripeWebhookIgnored: async () => calls.push(["ignored"]),
    markStripeWebhookRetryable: async () => {
      calls.push(["retryable"]);
      return { status: "DEAD" };
    },
  };

  await withMocks({ "stripeWebhookEventService": fakeEventService }, async () => {
    delete require.cache[require.resolve("./stripeWebhookProcessor")];
    const processor = require("./stripeWebhookProcessor");
    processor.setStripeWebhookEventHandler(async () => {
      throw Object.assign(new Error("provider unavailable"), { code: "ETIMEDOUT" });
    });
    const result = await processor.runStripeWebhookProcessorJob({ batchSize: 1 });
    assert.equal(result.claimed, 1);
    assert.equal(result.dead, 1);
    assert.deepEqual(calls.map((call) => call[0]), ["claim", "retryable"]);
  });
});

test("financial reconciliation retrieves provider state and dispatches a repair event", async () => {
  const dispatched = [];
  const transitions = [];
  const operation = {
    _id: "operation-db-id",
    operationId: "operation-1",
    operationType: "T48_PAYMENT",
    providerObjectId: "pi_reconcile_1",
    status: "PROVIDER_SUCCEEDED",
  };
  const fakeFinancialOperationModel = {
    find: () => ({ sort: () => ({ limit: async () => [operation] }) }),
  };
  const fakeReconciliationFinancialService = {
    claimOperationForReconciliation: async (value) => ({ ...value, status: "PROCESSING" }),
    getOperation: async () => ({ ...operation, status: "PROCESSING" }),
    markProviderSuccess: async (value) => {
      transitions.push("provider");
      return { ...value, status: "PROVIDER_SUCCEEDED" };
    },
    markLocalSuccess: async (value) => {
      transitions.push("local");
      return { ...value, status: "LOCAL_APPLIED" };
    },
    markCompleted: async () => transitions.push("completed"),
    markRetryable: async () => transitions.push("retryable"),
    markManualReview: async () => transitions.push("manual"),
    executionId: () => "reconcile-test",
  };
  const fakeStripeService = {
    retrievePaymentIntent: async () => ({ id: "pi_reconcile_1", status: "succeeded" }),
    retrieveCheckoutSession: async () => null,
    retrieveRefund: async () => null,
    retrieveTransferReversal: async () => null,
    retrievePayout: async () => null,
  };
  const fakeProcessor = {
    dispatchStripeWebhookEvent: async (event) => dispatched.push(event),
  };

  await withMocks(
    {
      "studentBooking.model": {},
      "transaction.model": {},
      FinancialOperation: fakeFinancialOperationModel,
      stripeService: fakeStripeService,
      financialOperationService: fakeReconciliationFinancialService,
      stripeWebhookProcessor: fakeProcessor,
    },
    async () => {
      delete require.cache[require.resolve("./financialReconciliationService")];
      const service = require("./financialReconciliationService");
      await service.reconcileOperation(operation, "reconcile-test");
      assert.equal(dispatched[0].type, "payment_intent.succeeded");
      assert.equal(dispatched[0].data.object.id, "pi_reconcile_1");
      assert.deepEqual(transitions, ["provider", "local", "completed"]);
    },
  );
});
