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

test("Connect webhook secret is required only for an enabled API Connect ingress", () => {
  const apiEnvironment = productionBase({
    RUN_API: "true",
    RUN_WORKER: "false",
    JWT_SECRET: "startup-probe-jwt-secret-32-characters",
    STRIPE_WEBHOOK_SECRET: "whsec_platform_probe",
    AWS_ACCESS_KEY_ID: "startup-probe-access-key",
    AWS_SECRET_ACCESS_KEY: "startup-probe-secret-key",
    AWS_REGION: "eu-central-1",
    BUCKET_NAME: "startup-probe-bucket",
    GOOGLE_CLIENT_ID: "configured-google-client-id",
    GOOGLE_CLIENT_SECRET: "configured-google-client-secret",
  });

  assert.doesNotThrow(() =>
    validateEnvironment({
      env: { ...apiEnvironment, STRIPE_CONNECT_WEBHOOK_ENABLED: "false" },
    }),
  );
  assert.throws(
    () =>
      validateEnvironment({
        env: { ...apiEnvironment, STRIPE_CONNECT_WEBHOOK_ENABLED: "true" },
      }),
    /Missing required environment variable: STRIPE_CONNECT_WEBHOOK_SECRET/,
  );
  assert.doesNotThrow(() =>
    validateEnvironment({
      env: {
        ...apiEnvironment,
        STRIPE_CONNECT_WEBHOOK_ENABLED: "true",
        STRIPE_CONNECT_WEBHOOK_SECRET: "whsec_connect_probe",
      },
    }),
  );
});

test("Resend production configuration requires Resend credentials", () => {
  assert.doesNotThrow(() => validateEnvironment({
    env: productionBase({
      RUN_API: "false",
      RUN_WORKER: "true",
      EMAIL_ENABLED: "true",
      EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "resend-test-key",
      EMAIL_FROM: "DSP Marketplace <sender@example.com>",
      EMAIL_MODE: "production",
    }),
  }));
  assert.throws(
    () => validateEnvironment({
      env: productionBase({
        RUN_API: "false",
        RUN_WORKER: "true",
        EMAIL_ENABLED: "true",
        EMAIL_PROVIDER: "resend",
        EMAIL_FROM: "DSP Marketplace <sender@example.com>",
        EMAIL_MODE: "production",
      }),
    }),
    /Missing required environment variable: RESEND_API_KEY/,
  );
  assert.throws(
    () => validateEnvironment({
      env: productionBase({ EMAIL_PROVIDER: "elasticemail" }),\n    }),\n    /EMAIL_PROVIDER must be resend/,
  );
});

test("Resend accepts the split sender configuration", () => {
  assert.doesNotThrow(() => validateEnvironment({
    env: productionBase({
      RUN_API: "false",
      RUN_WORKER: "true",
      EMAIL_ENABLED: "true",
      EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "resend-test-key",
      EMAIL_FROM_ADDRESS: "verified@example.com",
      EMAIL_FROM_NAME: "DSP Marketplace",
      EMAIL_MODE: "production",
    }),
  }));
});
