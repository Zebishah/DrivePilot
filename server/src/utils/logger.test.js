const test = require("node:test");
const assert = require("node:assert/strict");
const { createLogger, classifyError, sanitize } = require("./logger");

test("structured logger removes secrets and preserves safe correlation fields", () => {
  const original = console.log;
  let output = "";
  console.log = (line) => { output = line; };
  try {
    createLogger({ requestId: "req-1" }).info("payment_test", {
      operationId: "op-1",
      bookingId: "booking-1",
      stripeSecretKey: "sk_live_should_not_log",
      clientSecret: "pi_secret_should_not_log",
      cardNumber: "4242424242424242",
      error: Object.assign(new Error("provider timeout"), { code: "ETIMEDOUT" }),
    });
  } finally {
    console.log = original;
  }
  const record = JSON.parse(output);
  assert.equal(record.requestId, "req-1");
  assert.equal(record.operationId, "op-1");
  assert.equal(record.stripeSecretKey, undefined);
  assert.equal(record.clientSecret, undefined);
  assert.equal(record.cardNumber, undefined);
  assert.deepEqual(record.error, { code: "ETIMEDOUT", message: "provider timeout" });
});

test("error classification and sanitization are bounded", () => {
  assert.equal(classifyError(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })), "PROVIDER_RETRYABLE");
  assert.equal(classifyError(Object.assign(new Error("manual"), { code: "PAYOUT_MAPPING_AMBIGUOUS" })), "FINANCIAL_MANUAL_REVIEW");
  assert.equal(sanitize({ webhookPayload: { card: "secret" }, safe: "ok" }).safe, "ok");
  assert.equal(sanitize({ value: "x".repeat(2000) }).value.length, 1000);
});
