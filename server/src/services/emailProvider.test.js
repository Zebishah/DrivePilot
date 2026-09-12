const test = require("node:test");
const assert = require("node:assert/strict");
const { EmailProviderError, createResendProvider } = require("./emailProvider");

function response(status, body = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

function env(overrides = {}) {
  return {
    EMAIL_ENABLED: "true",
    EMAIL_MODE: "test",
    EMAIL_TEST_RECIPIENT: "test-owner@example.com",
    RESEND_API_KEY: "re_test_key",
    EMAIL_REQUEST_TIMEOUT_MS: "1000",
    ...overrides,
  };
}

test("Resend test mode routes delivery to the configured test recipient", async () => {
  const calls = [];
  const provider = createResendProvider({
    env: env(),
    fetchImpl: async (url, options) => {
      calls.push({ url, options, body: JSON.parse(options.body) });
      return response(200, { id: "resend-123" });
    },
  });

  const result = await provider.send({
    to: "real-recipient@example.com",
    from: "DSP <onboarding@resend.dev>",
    subject: "Test",
    html: "<p>Hello</p>",
    text: "Hello",
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  assert.deepEqual(calls[0].body.to, ["test-owner@example.com"]);
  assert.equal(calls[0].body.subject, "Test");
  assert.equal(result.providerMessageId, "resend-123");
  assert.deepEqual(result.intendedRecipients, ["real-recipient@example.com"]);
});

test("disabled email does not call the provider", async () => {
  let calls = 0;
  const provider = createResendProvider({
    env: env({ EMAIL_ENABLED: "false" }),
    fetchImpl: async () => {
      calls += 1;
      return response(200);
    },
  });

  assert.deepEqual(
    await provider.send({ to: "user@example.com", subject: "Ignored", html: "<p />", text: "Ignored" }),
    { skipped: true, reason: "EMAIL_DISABLED" },
  );
  assert.equal(calls, 0);
});

test("provider classifies rate limits and server errors as retryable", async () => {
  for (const status of [429, 500, 503]) {
    const provider = createResendProvider({
      env: env(),
      fetchImpl: async () => response(status),
    });
    await assert.rejects(
      provider.send({ to: "user@example.com", from: "DSP <noreply@example.com>", subject: "Test", html: "<p />", text: "Test" }),
      (error) => error instanceof EmailProviderError && error.retryable === true && error.status === status,
    );
  }
});

test("provider classifies client errors and missing configuration as permanent", async () => {
  const provider = createResendProvider({
    env: env(),
    fetchImpl: async () => response(400),
  });
  await assert.rejects(
    provider.send({ to: "user@example.com", from: "DSP <noreply@example.com>", subject: "Test", html: "<p />", text: "Test" }),
    (error) => error.code === "RESEND_400" && error.retryable === false,
  );

  for (const overrides of [{ RESEND_API_KEY: "" }, { EMAIL_TEST_RECIPIENT: "" }]) {
    const missingConfigProvider = createResendProvider({ env: env(overrides), fetchImpl: async () => response(200) });
    await assert.rejects(
      missingConfigProvider.send({ to: "user@example.com", from: "DSP <noreply@example.com>", subject: "Test", html: "<p />", text: "Test" }),
      (error) => error instanceof EmailProviderError && error.retryable === false,
    );
  }
});
