const test = require("node:test");
const assert = require("node:assert/strict");
const { createOutboxService, MAX_PAYLOAD_BYTES } = require("./outboxService");

function createFakeModel() {
  const records = new Map();
  const calls = { findOne: [], saves: [] };

  class FakeEvent {
    constructor(data) {
      Object.assign(this, data);
      this._id = `event-${records.size + 1}`;
    }

    async save(options) {
      calls.saves.push(options);
      if (records.has(this.dedupeKey)) {
        const error = new Error("duplicate");
        error.code = 11000;
        throw error;
      }
      records.set(this.dedupeKey, this);
      return this;
    }
  }

  FakeEvent.findOne = (query) => {
    calls.findOne.push(query);
    let sessionValue;
    const queryObject = {
      session(value) {
        sessionValue = value;
        return queryObject;
      },
      then(resolve, reject) {
        return Promise.resolve([...records.values()].find((record) => record.dedupeKey === query.dedupeKey)).then(resolve, reject);
      },
      get sessionValue() {
        return sessionValue;
      },
    };
    return queryObject;
  };

  return { model: FakeEvent, records, calls };
}

test("outbox enqueue is deterministic and deduplicates repeated delivery requests", async () => {
  const fake = createFakeModel();
  const service = createOutboxService({ model: fake.model });
  const input = {
    eventType: "booking_created",
    aggregateType: "BOOKING",
    aggregateId: "booking-1",
    dedupeKey: "booking-created:booking-1:student@example.com",
    to: "Student@Example.com",
    template: "booking",
    data: { recipientName: "Student" },
  };

  const first = await service.enqueueEmailEvent(input);
  const second = await service.enqueueEmailEvent(input);

  assert.equal(first._id, second._id);
  assert.equal(fake.records.size, 1);
  assert.deepEqual(first.payload.to, ["student@example.com"]);
  assert.equal(first.metadata.provider, "resend");
  assert.equal(first.status, "PENDING");
});

test("outbox passes Mongo session to lookup and save", async () => {
  const fake = createFakeModel();
  const service = createOutboxService({ model: fake.model });
  const session = { id: "transaction-1" };
  const event = await service.enqueueOutboxEvent({
    eventType: "contact_form_submitted",
    aggregateType: "CONTACT",
    aggregateId: "contact-1",
    dedupeKey: "contact-1",
    payload: { channel: "email" },
    session,
  });

  assert.equal(event.aggregateId, "contact-1");
  assert.equal(fake.calls.saves[0].session, session);
});

test("outbox rejects sensitive and oversized payloads", async () => {
  const service = createOutboxService({ model: createFakeModel().model });

  await assert.rejects(
    service.enqueueEmailEvent({
      eventType: "unsafe",
      aggregateType: "TEST",
      aggregateId: "1",
      dedupeKey: "unsafe-1",
      to: "user@example.com",
      template: "custom",
      data: { password: "should-not-persist" },
    }),
    (error) => error.code === "OUTBOX_SENSITIVE_PAYLOAD",
  );

  await assert.rejects(
    service.enqueueOutboxEvent({
      eventType: "large",
      aggregateType: "TEST",
      aggregateId: "1",
      dedupeKey: "large-1",
      payload: { value: "x".repeat(MAX_PAYLOAD_BYTES) },
    }),
    (error) => error.code === "OUTBOX_PAYLOAD_TOO_LARGE",
  );
});
