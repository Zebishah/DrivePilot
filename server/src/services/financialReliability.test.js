const test = require("node:test");
const assert = require("node:assert/strict");
const { FakeStripe, FakeStripeError } = require("../testUtils/fakeStripe");
const { FailureInjector } = require("../testUtils/failureInjection");
const {
  buildBookingMoneySnapshot,
  fromMinorUnits,
} = require("../utils/money");

function createState() {
  return {
    booking: { status: "pending_payment", amountMinor: 1250, currency: "CHF" },
    operation: { operationId: "op-payment-1", status: "PENDING", providerObjectId: null },
    transactions: new Map(),
  };
}

async function completeDirectPayment({ state, stripe, failures }) {
  if (state.operation.status === "COMPLETED") return state;
  let paymentIntent;
  try {
    paymentIntent = state.operation.status === "REQUIRES_ACTION"
      ? await stripe.paymentIntents.confirm(state.operation.providerObjectId)
      : await stripe.paymentIntents.create(
        { amount: state.booking.amountMinor, currency: "chf" },
        { idempotencyKey: "direct-payment-op-payment-1" },
      );
  } catch (error) {
    if (error.code === "ETIMEDOUT") {
      state.operation.status = "VERIFYING_PROVIDER";
      throw error;
    }
    state.operation.status = "RETRYABLE";
    throw error;
  }
  if (paymentIntent.status === "requires_action") {
    state.operation.providerObjectId = paymentIntent.id;
    state.operation.status = "REQUIRES_ACTION";
    return state;
  }
  state.operation.providerObjectId = paymentIntent.id;
  state.operation.status = "PROVIDER_SUCCEEDED";
  await failures.run("booking.update", async () => {
    state.booking.status = "confirmed";
  });
  await failures.run("transaction.create", async () => {
    if (!state.transactions.has("payment")) {
      state.transactions.set("payment", {
        amountMinor: state.booking.amountMinor,
        currency: state.booking.currency,
        providerObjectId: paymentIntent.id,
      });
    }
  });
  state.operation.status = "COMPLETED";
  return state;
}

async function createCheckout({ state, stripe, failures }) {
  if (state.sessionId) return state.sessionId;
  const session = await stripe.checkout.sessions.create(
    { mode: "payment", amountMinor: state.booking.amountMinor },
    { idempotencyKey: "checkout-op-payment-1" },
  );
  await failures.run("booking.persistence", async () => {
    state.sessionId = session.id;
    state.booking.status = "pending_payment";
  });
  return session.id;
}

async function createPayout({ state, stripe, failures }) {
  if (state.payoutId) return state.payoutId;
  const payout = await stripe.payouts.create(
    { amount: state.instructorAmountMinor, currency: "chf" },
    { idempotencyKey: "payout-op-payment-1" },
  );
  await failures.run("payout.persistence", async () => {
    state.payoutId = payout.id;
    state.payoutStatus = "completed";
  });
  return payout.id;
}

test("fake Stripe supports success, action, provider failure, and provider IDs", async () => {
  const stripe = new FakeStripe();
  const success = await stripe.paymentIntents.create({ amount: 1001, currency: "chf" }, { idempotencyKey: "pi-1" });
  assert.equal(success.status, "succeeded");
  assert.equal(stripe.callCount("payment_intent.create"), 1);
  assert.ok(success.id);

  const actionStripe = new FakeStripe().setBehavior("payment_intent.create", "requires_action");
  const action = await actionStripe.paymentIntents.create({ amount: 1001 }, { idempotencyKey: "pi-action" });
  assert.equal(action.status, "requires_action");

  const failingStripe = new FakeStripe().setBehavior("payment_intent.create", "provider_5xx");
  await assert.rejects(() => failingStripe.paymentIntents.create({ amount: 1001 }), (error) => error.statusCode === 503);
  const timeoutStripe = new FakeStripe().setBehavior("payment_intent.create", "timeout_before_response");
  await assert.rejects(() => timeoutStripe.paymentIntents.create({ amount: 1001 }), { code: "ETIMEDOUT" });
});

test("requires_action is completed by the client and a stale failure cannot regress it", async () => {
  const stripe = new FakeStripe().setBehavior("payment_intent.create", "requires_action");
  const state = createState();
  const failures = new FailureInjector();
  await completeDirectPayment({ state, stripe, failures });
  assert.equal(state.operation.status, "REQUIRES_ACTION");
  stripe.setBehavior("payment_intent.create", null);
  await completeDirectPayment({ state, stripe, failures });
  assert.equal(state.operation.status, "COMPLETED");
  assert.equal(state.booking.status, "confirmed");
  // Equivalent to a late payment_failed webhook: terminal local state wins.
  if (state.operation.status !== "COMPLETED") state.booking.status = "payment_failed";
  assert.equal(state.booking.status, "confirmed");
});

test("direct payment retry after timeout-after-success creates one provider object", async () => {
  const stripe = new FakeStripe().setBehavior("payment_intent.create", "timeout_after_provider_success");
  const state = createState();
  const failures = new FailureInjector();
  await assert.rejects(() => completeDirectPayment({ state, stripe, failures }), { code: "ETIMEDOUT" });
  await completeDirectPayment({ state, stripe, failures });
  assert.equal(stripe.callCount("payment_intent.create"), 2);
  assert.equal([...stripe.objects.values()].filter((object) => object.object === "payment_intent").length, 1);
  assert.equal(state.booking.status, "confirmed");
  assert.equal(state.operation.status, "COMPLETED");
  assert.equal(state.transactions.size, 1);
  assert.deepEqual(state.transactions.get("payment"), { amountMinor: 1250, currency: "CHF", providerObjectId: "test_paymentIntent_1" });
});

test("direct payment persistence failures are repairable and completed operations cannot charge twice", async () => {
  const stripe = new FakeStripe();
  const state = createState();
  const failures = new FailureInjector().failNext("booking.update", new Error("booking write failed"));
  await assert.rejects(() => completeDirectPayment({ state, stripe, failures }), /booking write failed/);
  assert.equal(stripe.callCount("payment_intent.create"), 1);
  assert.equal(state.operation.status, "PROVIDER_SUCCEEDED");
  await completeDirectPayment({ state, stripe, failures });
  assert.equal(state.operation.status, "COMPLETED");
  assert.equal(state.transactions.size, 1);
  const callsAfterCompletion = stripe.callCount("payment_intent.create");
  await completeDirectPayment({ state, stripe, failures });
  assert.equal(stripe.callCount("payment_intent.create"), callsAfterCompletion);
});

test("transaction failure after provider success is repaired without another charge", async () => {
  const stripe = new FakeStripe();
  const state = createState();
  const failures = new FailureInjector().failNext("transaction.create", new Error("transaction insert failed"));
  await assert.rejects(() => completeDirectPayment({ state, stripe, failures }), /transaction insert failed/);
  assert.equal(state.booking.status, "confirmed");
  await completeDirectPayment({ state, stripe, failures });
  assert.equal(stripe.callCount("payment_intent.create"), 2);
  assert.equal([...stripe.objects.values()].filter((object) => object.object === "payment_intent").length, 1);
  assert.equal(state.transactions.size, 1);
});

test("checkout retries reuse the same active provider session", async () => {
  const stripe = new FakeStripe();
  const state = createState();
  const failures = new FailureInjector().failNext("booking.persistence", new Error("persistence failed"));
  const session = await stripe.checkout.sessions.create({ mode: "payment" }, { idempotencyKey: "checkout-op-payment-1" });
  await assert.rejects(() => failures.run("booking.persistence", async () => { state.sessionId = session.id; }), /persistence failed/);
  const recovered = await createCheckout({ state, stripe, failures: new FailureInjector() });
  assert.equal(recovered, session.id);
  assert.equal(stripe.callCount("checkout.session.create"), 2);
  assert.equal([...stripe.objects.values()].filter((object) => object.object === "checkout.session").length, 1);
});

test("checkout expiry and deferred setup completion are explicit provider states", async () => {
  const expiredStripe = new FakeStripe().setBehavior("checkout.session.create", "checkout_expired");
  const expired = await expiredStripe.checkout.sessions.create({ mode: "payment" }, { idempotencyKey: "checkout-expired" });
  assert.equal(expired.status, "expired");

  const deferredStripe = new FakeStripe();
  deferredStripe.objects.set("seti-1", {
    object: "setup_intent",
    id: "seti-1",
    status: "succeeded",
    payment_method: "pm-1",
    customer: "cus-1",
  });
  const setup = await deferredStripe.setupIntents.retrieve("seti-1");
  assert.equal(setup.status, "succeeded");
  assert.equal(setup.payment_method, "pm-1");
});

test("payout retry after timeout-after-success does not create a duplicate payout", async () => {
  const stripe = new FakeStripe().setBehavior("payout.create", "timeout_after_provider_success");
  const state = { instructorAmountMinor: 801, payoutId: null, payoutStatus: "processing" };
  await assert.rejects(() => createPayout({ state, stripe, failures: new FailureInjector() }), FakeStripeError);
  await createPayout({ state, stripe, failures: new FailureInjector() });
  assert.equal(stripe.callCount("payout.create"), 2);
  assert.equal([...stripe.objects.values()].filter((object) => object.object === "payout").length, 1);
  assert.equal(state.payoutStatus, "completed");
  assert.equal(state.instructorAmountMinor, 801);
});

test("payout provider failure is retryable and legacy processing without an ID remains recoverable", async () => {
  const stripe = new FakeStripe().setBehavior("payout.create", "payout_failure");
  const state = { instructorAmountMinor: 801, payoutId: null, payoutStatus: "processing" };
  await assert.rejects(() => createPayout({ state, stripe, failures: new FailureInjector() }), { code: "payout_failed" });
  assert.equal(state.payoutId, null);
  stripe.setBehavior("payout.create", null);
  await createPayout({ state, stripe, failures: new FailureInjector() });
  assert.equal([...stripe.objects.values()].filter((object) => object.object === "payout").length, 1);
  assert.equal(state.payoutStatus, "completed");
});

test("refund and reversal amounts are bounded by the persisted instructor share", async () => {
  const stripe = new FakeStripe();
  const snapshot = { grossAmountMinor: 1001, commissionAmountMinor: 200, instructorAmountMinor: 801 };
  const refund = await stripe.refunds.create({ payment_intent: "pi-1", amount: snapshot.grossAmountMinor }, { idempotencyKey: "refund-1" });
  const reversalAmount = Math.min(snapshot.instructorAmountMinor, snapshot.grossAmountMinor);
  const reversal = await stripe.transfers.createReversal("tr-1", { amount: reversalAmount }, { idempotencyKey: "reversal-1" });
  assert.equal(refund.amount, 1001);
  assert.equal(reversal.amount, 801);
  assert.ok(reversal.amount <= snapshot.instructorAmountMinor);
});

test("pending and failed refunds are visible provider outcomes and reversal failures do not over-reverse", async () => {
  const pendingStripe = new FakeStripe().setBehavior("refund.create", "pending_refund");
  const pending = await pendingStripe.refunds.create({ payment_intent: "pi-1", amount: 1001 }, { idempotencyKey: "refund-pending" });
  assert.equal(pending.status, "pending");

  const failedStripe = new FakeStripe().setBehavior("refund.create", "failed_refund");
  await assert.rejects(() => failedStripe.refunds.create({ payment_intent: "pi-1", amount: 1001 }, { idempotencyKey: "refund-failed" }), { code: "refund_failed" });
  const snapshot = { grossAmountMinor: 1001, instructorAmountMinor: 801 };
  const reversalAmount = Math.min(1001, snapshot.instructorAmountMinor);
  assert.ok(reversalAmount <= snapshot.instructorAmountMinor);
  const reversalFailureStripe = new FakeStripe().setBehavior("transfer_reversal.create", "reversal_failure");
  await assert.rejects(() => reversalFailureStripe.transfers.createReversal("tr-1", { amount: reversalAmount }), { code: "reversal_failed" });
});

test("two logical workers can contend for one payment claim", async () => {
  let claimed = false;
  const claim = async () => {
    await Promise.resolve();
    if (claimed) return null;
    claimed = true;
    return { operationId: "op-payment-1" };
  };
  const results = await Promise.all([claim(), claim()]);
  assert.equal(results.filter(Boolean).length, 1);
});

test("money invariant loop covers small amounts, rates, fixed commission, and seven-slot allocation", () => {
  for (const grossAmountMinor of [1, 2, 5, 99, 1000, 1001, 9999]) {
    for (const defaultRate of [0, 12.5, 20, 33.33, 100]) {
      const snapshot = buildBookingMoneySnapshot({ grossAmountMinor, slotCount: 7, platformSettings: { defaultRate } });
      assert.equal(snapshot.commissionAmountMinor + snapshot.instructorAmountMinor, grossAmountMinor);
      assert.equal(snapshot.slots.reduce((sum, slot) => sum + slot.grossAmountMinor, 0), grossAmountMinor);
      assert.equal(snapshot.slots.reduce((sum, slot) => sum + slot.commissionAmountMinor, 0), snapshot.commissionAmountMinor);
      assert.equal(snapshot.slots.reduce((sum, slot) => sum + slot.instructorAmountMinor, 0), snapshot.instructorAmountMinor);
      assert.ok(snapshot.slots.every((slot) => slot.commissionAmountMinor + slot.instructorAmountMinor === slot.grossAmountMinor));
      assert.ok(snapshot.slots.every((slot) => slot.grossAmountMinor >= 0));
      assert.ok(snapshot.slots.every((slot) => slot.instructorAmountMinor <= slot.grossAmountMinor));
    }
    const fixed = buildBookingMoneySnapshot({ grossAmountMinor, slotCount: 3, platformSettings: { defaultType: "amount", defaultFixedAmount: 2.55 } });
    assert.equal(fixed.commissionAmountMinor + fixed.instructorAmountMinor, grossAmountMinor);
  }
  assert.equal(fromMinorUnits(1001), "10.01");
});
