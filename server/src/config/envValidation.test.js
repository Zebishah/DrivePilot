const test = require("node:test");
const assert = require("node:assert/strict");
const { validateEnvironment } = require("./envValidation");

function productionBase(overrides = {}) {
  return {
    NODE_ENV: "production",
    MONGODB_URI: "mongodb://example.invalid/dsp",
    FRONTEND_URL: "https://frontend.example.invalid",
    SLOT_TIMEZONE: "Europe/Zurich",
    STRIPE_SECRET_KEY: "sk_test_example",
    EMAIL_ENABLED: "false",
    AI_ENABLED: "false",
    ...overrides,
  };
}

test("API validation requires API-only credentials", () => {
  assert.throws(
    () => validateEnvironment({ env: productionBase({ RUN_API: "true", RUN_WORKER: "false" }) }),
    /Missing required environment variable: JWT_SECRET/,
  );
});

test("worker validation does not require OAuth, S3, or Gemini credentials", () => {
  const result = validateEnvironment({
    env: productionBase({ RUN_API: "false", RUN_WORKER: "true" }),
  });
  assert.equal(result.runApi, false);
  assert.equal(result.runWorker, true);
});

test("production rejects fixture AI and live Stripe keys", () => {
  assert.throws(
    () => validateEnvironment({
      env: productionBase({
        RUN_API: "false",
        RUN_WORKER: "true",
        AI_ENABLED: "true",
        AI_MODE: "fixture",
      }),
    }),
    /AI_MODE=fixture/,
  );

  assert.throws(
    () => validateEnvironment({
      env: productionBase({
        RUN_API: "false",
        RUN_WORKER: "true",
        STRIPE_SECRET_KEY: "sk_live_example",
      }),
    }),
    /Stripe test-mode secret key/,
  );
});
