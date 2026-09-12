class FakeStripeError extends Error {
  constructor(message, code = "STRIPE_TEST_ERROR", statusCode = 500) {
    super(message);
    this.name = "FakeStripeError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function behaviorError(behavior) {
  if (behavior === "timeout_before_response") return new FakeStripeError("Stripe request timed out", "ETIMEDOUT");
  if (behavior === "provider_5xx") return new FakeStripeError("Stripe provider unavailable", "STRIPE_5XX", 503);
  if (behavior === "failed_payment") return new FakeStripeError("Payment failed", "card_declined", 402);
  if (behavior === "failed_refund") return new FakeStripeError("Refund failed", "refund_failed", 402);
  if (behavior === "payout_failure") return new FakeStripeError("Payout failed", "payout_failed", 402);
  if (behavior === "reversal_failure") return new FakeStripeError("Reversal failed", "reversal_failed", 402);
  return null;
}

class FakeStripe {
  constructor() {
    this.behaviors = new Map();
    this.calls = [];
    this.objects = new Map();
    this.idempotentResults = new Map();
    this.sequences = { paymentIntent: 0, checkout: 0, refund: 0, transfer: 0, reversal: 0, payout: 0, setupIntent: 0 };

    this.paymentIntents = {
      create: (params, options) => this._create("payment_intent.create", "paymentIntent", params, options, (id) => ({ object: "payment_intent", id, ...params, status: "succeeded", client_secret: `${id}_secret_test` })),
      confirm: (id) => this._confirmPaymentIntent(id),
      retrieve: async (id) => this._retrieve(id),
    };
    this.checkout = { sessions: {
      create: (params, options) => this._create("checkout.session.create", "checkout", params, options, (id) => ({ object: "checkout.session", id, ...params, status: "complete" })),
      retrieve: async (id) => this._retrieve(id),
    } };
    this.refunds = {
      create: (params, options) => this._create("refund.create", "refund", params, options, (id) => ({ object: "refund", id, ...params, status: "succeeded" })),
      retrieve: async (id) => this._retrieve(id),
    };
    this.transfers = {
      create: (params, options) => this._create("transfer.create", "transfer", params, options, (id) => ({ object: "transfer", id, ...params, status: "paid" })),
      retrieve: async (id) => this._retrieve(id),
      createReversal: (transferId, params, options) => this._create("transfer_reversal.create", "reversal", { transfer: transferId, ...params }, options, (id) => ({ object: "transfer_reversal", id, transfer: transferId, ...params, status: "succeeded" })),
      retrieveReversal: async (_transferId, id) => this._retrieve(id),
      listReversals: async (transferId) => ({ data: [...this.objects.values()].filter((item) => item.object === "transfer_reversal" && item.transfer === transferId) }),
    };
    this.payouts = {
      create: (params, options) => this._create("payout.create", "payout", params, options, (id) => ({ object: "payout", id, ...params, status: "paid" })),
      retrieve: async (id) => this._retrieve(id),
    };
    this.setupIntents = { retrieve: async (id) => this._retrieve(id) };
    this.customers = { create: (params) => this._create("customer.create", "customer", params, null, (id) => ({ object: "customer", id, ...params })) };
    this.paymentMethods = { retrieve: async (id) => this._retrieve(id) };
  }

  setBehavior(operation, behavior) { this.behaviors.set(operation, behavior); return this; }

  callCount(operation) { return this.calls.filter((call) => call.operation === operation).length; }

  _nextId(type) { this.sequences[type] += 1; return `test_${type}_${this.sequences[type]}`; }

  _create(operation, type, params, options, factory) {
    const idempotencyKey = options?.idempotencyKey;
    this.calls.push({ operation, params: { ...params }, idempotencyKey });
    if (idempotencyKey && this.idempotentResults.has(`${operation}:${idempotencyKey}`)) return Promise.resolve(this.idempotentResults.get(`${operation}:${idempotencyKey}`));
    const behavior = this.behaviors.get(operation);
    const providerError = behaviorError(behavior);
    if (behavior === "timeout_before_response" || providerError) return Promise.reject(providerError);
    const object = factory(this._nextId(type));
    this.objects.set(object.id, object);
    if (idempotencyKey) this.idempotentResults.set(`${operation}:${idempotencyKey}`, object);
    if (behavior === "timeout_after_provider_success") return Promise.reject(new FakeStripeError("Timeout after provider success", "ETIMEDOUT"));
    if (behavior === "requires_action" && operation === "payment_intent.create") object.status = "requires_action";
    if (behavior === "pending_refund" && operation === "refund.create") object.status = "pending";
    if (behavior === "payout_pending" && operation === "payout.create") object.status = "pending";
    if (behavior === "checkout_expired" && operation === "checkout.session.create") object.status = "expired";
    return Promise.resolve(object);
  }

  async _confirmPaymentIntent(id) {
    this.calls.push({ operation: "payment_intent.confirm", params: { id } });
    const object = this.objects.get(id);
    if (!object) throw new FakeStripeError("PaymentIntent not found", "resource_missing", 404);
    const behavior = this.behaviors.get("payment_intent.confirm");
    if (behavior === "requires_action") object.status = "requires_action";
    else if (behavior === "failed_payment") throw behaviorError(behavior);
    else object.status = "succeeded";
    return object;
  }

  async _retrieve(id) {
    const object = this.objects.get(id);
    if (!object) throw new FakeStripeError("Provider object not found", "resource_missing", 404);
    return object;
  }
}

module.exports = { FakeStripe, FakeStripeError };
