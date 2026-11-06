const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

function createFakeOutboxModel(initial = []) {
  const records = new Map(initial.map((record) => [record.eventId, { ...record }]));
  let failDeliveryUpdate = false;

  const clone = (value) => (value ? { ...value, payload: value.payload && { ...value.payload } } : value);
  const due = (record, now) => {
    const nextAttemptReady = !record.nextAttemptAt || new Date(record.nextAttemptAt) <= now;
    return ["PENDING", "RETRYABLE"].includes(record.status) && record.availableAt <= now && nextAttemptReady;
  };
  const matchesClaim = (record, query, now) =>
    due(record, now) ||
    (record.status === "PROCESSING" && record.leaseExpiresAt && new Date(record.leaseExpiresAt) <= now);

  const model = {
    records,
    setFailDeliveryUpdate(value) {
      failDeliveryUpdate = value;
    },
    findOneAndUpdate: (query, update) => {
      const now = new Date();
      const record = [...records.values()]
        .filter((candidate) => matchesClaim(candidate, query, now))
        .sort((a, b) => new Date(a.availableAt) - new Date(b.availableAt))[0];
      if (!record) return { lean: async () => null };
      Object.assign(record, update.$set || {});
      for (const [key, value] of Object.entries(update.$inc || {})) record[key] = (record[key] || 0) + value;
      const result = clone(record);
      return { lean: async () => result };
    },
    updateOne: async (_query, update) => {
      if (failDeliveryUpdate) {
        failDeliveryUpdate = false;
        throw new Error("local delivery update failed");
      }
      const record = [...records.values()][0];
      if (!record) return { modifiedCount: 0 };
      Object.assign(record, update.$set || {});
      return { modifiedCount: 1 };
    },
  };
  return model;
}

function event(overrides = {}) {
  return {
    _id: overrides._id || "db-event-1",
    eventId: overrides.eventId || "event-1",
    eventType: "booking_created",
    status: "PENDING",
    availableAt: new Date(Date.now() - 1),
    attemptCount: 0,
    maxAttempts: 3,
    payload: { to: ["student@example.com"], template: "welcome", data: { name: "Student" } },
    ...overrides,
  };
}

function loadWorker(outboxModel) {
  const originalLoad = Module._load;
  Module._load = function mockedLoad(request, parent, isMain) {
    if (request.endsWith("/models/OutboxEvent")) return outboxModel;
    if (request.endsWith("/models/User")) return { User: { findById: () => ({ select: () => ({ lean: async () => null }) }) }, Otp: {} };
    if (request.endsWith("/models/SignupLink")) return { findById: () => ({ lean: async () => null }) };
    return originalLoad.call(this, request, parent, isMain);
  };
  delete require.cache[require.resolve("./outboxEmailWorker")];
  const worker = require("./outboxEmailWorker");
  Module._load = originalLoad;
  return worker;
}

function provider({ send, enabled = true } = {}) {
  return { isEnabled: () => enabled, send: send || (async () => ({ provider: "elasticemail", providerMessageId: "msg-1" })) };
}

test("one worker claims and delivers an event while a concurrent worker gets no event", async () => {
  const model = createFakeOutboxModel([event()]);
  const worker = loadWorker(model);
  let sends = 0;
  const emailProvider = provider({ send: async () => { sends += 1; return { provider: "elasticemail", providerMessageId: "msg-1" }; } });

  const results = await Promise.all([
    worker.runOutboxEmailJob({ provider: emailProvider, batchSize: 1, leaseOwner: "worker-1" }),
    worker.runOutboxEmailJob({ provider: emailProvider, batchSize: 1, leaseOwner: "worker-2" }),
  ]);

  assert.equal(sends, 1);
  assert.equal(results.filter((result) => result.delivered === 1).length, 1);
  assert.equal(model.records.get("event-1").status, "DELIVERED");
});

test("stale processing leases are reclaimed and retryable errors are bounded", async () => {
  const model = createFakeOutboxModel([event({ status: "PROCESSING", leaseExpiresAt: new Date(Date.now() - 1000), maxAttempts: 2 })]);
  const worker = loadWorker(model);
  const retryError = Object.assign(new Error("rate limited"), { code: "ELASTICEMAIL_429", retryable: true });
  const result = await worker.runOutboxEmailJob({ provider: provider({ send: async () => { throw retryError; } }), batchSize: 1, leaseOwner: "worker-retry" });
  assert.equal(result.retryable, 1);
  assert.equal(model.records.get("event-1").status, "RETRYABLE");
  assert.equal(model.records.get("event-1").attemptCount, 1);
});

test("permanent errors dead-letter and max attempts stop retries", async () => {
  const permanentModel = createFakeOutboxModel([event()]);
  const permanentWorker = loadWorker(permanentModel);
  const permanentError = Object.assign(new Error("invalid recipient"), { code: "EMAIL_RECIPIENT_INVALID", retryable: false });
  const permanentResult = await permanentWorker.runOutboxEmailJob({ provider: provider({ send: async () => { throw permanentError; } }), batchSize: 1 });
  assert.equal(permanentResult.dead, 1);
  assert.equal(permanentModel.records.get("event-1").status, "DEAD");

  const maxModel = createFakeOutboxModel([event({ maxAttempts: 1 })]);
  const maxWorker = loadWorker(maxModel);
  const retryError = Object.assign(new Error("temporary"), { code: "EMAIL_TIMEOUT", retryable: true });
  const maxResult = await maxWorker.runOutboxEmailJob({ provider: provider({ send: async () => { throw retryError; } }), batchSize: 1 });
  assert.equal(maxResult.dead, 1);
  assert.equal(maxModel.records.get("event-1").status, "DEAD");
});

test("provider acceptance followed by a local update failure leaves a retryable event", async () => {
  const model = createFakeOutboxModel([event()]);
  model.setFailDeliveryUpdate(true);
  const worker = loadWorker(model);
  const result = await worker.runOutboxEmailJob({ provider: provider(), batchSize: 1 });
  assert.equal(result.retryable, 1);
  assert.equal(model.records.get("event-1").status, "RETRYABLE");
});

test("disabled email leaves events pending", async () => {
  const model = createFakeOutboxModel([event()]);
  const worker = loadWorker(model);
  const result = await worker.runOutboxEmailJob({ provider: provider({ enabled: false }), batchSize: 1 });
  assert.equal(result.skipped, true);
  assert.equal(model.records.get("event-1").status, "PENDING");
});
