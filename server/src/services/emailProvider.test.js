const test = require("node:test");
const assert = require("node:assert/strict");
const { EmailProviderError, createResendEmailProvider, createEmailProvider, parseEmailAddress, resolveConfiguredFrom } = require("./emailProvider");

function response(status, body = {}) {
  return { ok: status >= 200 && status < 300, status, async json() { return body; } };
}

function env(overrides = {}) {
  return {
    EMAIL_PROVIDER: "resend",
    EMAIL_ENABLED: "true",
    EMAIL_MODE: "test",
    EMAIL_TEST_RECIPIENT: "test-owner@example.com",
    RESEND_API_KEY: "re_test_dummy_key",
    EMAIL_REQUEST_TIMEOUT_MS: "1000",
    ...overrides,
  };
}

function message(overrides = {}) {
  return {
    to: "real-recipient@example.com",
    from: "Drive Pilot <sender@example.com>",
    subject: "Test",
    html: "<p>Hello</p>",
    text: "Hello",
    ...overrides,
  };
}

test("Resend test mode maps the transactional payload, sender, and stable event id", async () => {
  const calls = [];
  const provider = createResendEmailProvider({
    env: env(),
    fetchImpl: async (url, options) => {
      calls.push({ url, options, body: JSON.parse(options.body) });
      return response(200, { id: "resend-123" });
    },
  });
  const result = await provider.send(message({
    replyTo: "Support <support@example.com>",
    metadata: { outboxEventId: "event-123" },
  }));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers.Authorization, "Bearer re_test_dummy_key");
  assert.equal(calls[0].options.headers["Idempotency-Key"], "drive-pilot-email/event-123");
  assert.deepEqual(calls[0].body.to, ["test-owner@example.com"]);
  assert.equal(calls[0].body.from, "Drive Pilot <sender@example.com>");
  assert.deepEqual(calls[0].body.reply_to, ["Support <support@example.com>"]);
  assert.equal(calls[0].body.subject, "Test");
  assert.equal(calls[0].body.html, "<p>Hello</p>");
  assert.equal(calls[0].body.text, "Hello");
  assert.equal(result.provider, "resend");
  assert.equal(result.providerMessageId, "resend-123");
  assert.deepEqual(result.intendedRecipients, ["real-recipient@example.com"]);
});

test("sender variables use Drive Pilot display name and legacy fallback", () => {
  assert.equal(resolveConfiguredFrom({ EMAIL_FROM_ADDRESS: "verified@example.com", EMAIL_FROM_NAME: "Drive Pilot" }),
    "Drive Pilot <verified@example.com>");
  assert.equal(resolveConfiguredFrom({ EMAIL_FROM_ADDRESS: "", EMAIL_FROM: "Legacy <legacy@example.com>" }),
    "Legacy <legacy@example.com>");
});

test("production mode delivers to intended recipients", async () => {
  let payload;
  const provider = createResendEmailProvider({
    env: env({ EMAIL_MODE: "production" }),
    fetchImpl: async (_url, options) => {
      payload = JSON.parse(options.body);
      return response(200, { id: "production-123" });
    },
  });
  await provider.send(message({ to: ["one@example.com", "two@example.com"] }));
  assert.deepEqual(payload.to, ["one@example.com", "two@example.com"]);
  assert.equal(payload.from, "Drive Pilot <sender@example.com>");
});

test("disabled email does not call Resend", async () => {
  let calls = 0;
  const provider = createResendEmailProvider({
    env: env({ EMAIL_ENABLED: "false", RESEND_API_KEY: "" }),
    fetchImpl: async () => { calls += 1; return response(200, { id: "ignored" }); },
  });
  assert.deepEqual(await provider.send(message()), { skipped: true, reason: "EMAIL_DISABLED" });
  assert.equal(calls, 0);
});

test("provider selection rejects old Elastic Email setting", () => {
  assert.throws(() => createEmailProvider({ env: env({ EMAIL_PROVIDER: "elasticemail" }) }),
    /Unsupported EMAIL_PROVIDER: elasticemail/);
});

test("429 and server errors are retryable; ordinary 409 and 400 errors are permanent", async () => {
  for (const status of [429, 500, 503]) {
    const provider = createResendEmailProvider({ env: env(), fetchImpl: async () => response(status) });
    await assert.rejects(provider.send(message()),
      (error) => error instanceof EmailProviderError && error.retryable === true && error.status === status && error.code === `RESEND_${status}`);
  }
  for (const status of [400, 401, 403, 409, 422]) {
    const provider = createResendEmailProvider({ env: env(), fetchImpl: async () => response(status) });
    await assert.rejects(provider.send(message()),
      (error) => error instanceof EmailProviderError && error.retryable === false && error.code === `RESEND_${status}`);
  }
});

test("concurrent idempotent request conflicts can be retried", async () => {
  const provider = createResendEmailProvider({
    env: env(),
    fetchImpl: async () => response(409, { name: "concurrent_idempotent_requests" }),
  });
  await assert.rejects(provider.send(message()), (error) => error.retryable === true && error.status === 409);
});

test("missing configuration and malformed successful responses are permanent errors", async () => {
  for (const overrides of [{ RESEND_API_KEY: "" }, { EMAIL_TEST_RECIPIENT: "" }]) {
    const provider = createResendEmailProvider({ env: env(overrides), fetchImpl: async () => response(200, { id: "unused" }) });
    await assert.rejects(provider.send(message()),
      (error) => error instanceof EmailProviderError && error.retryable === false);
  }
  const provider = createResendEmailProvider({ env: env(), fetchImpl: async () => response(200, { success: true }) });
  await assert.rejects(provider.send(message()),
    (error) => error.code === "RESEND_RESPONSE_INVALID" && error.retryable === false);
});

test("network failures and timeouts remain retryable", async () => {
  const networkProvider = createResendEmailProvider({ env: env(), fetchImpl: async () => { throw new Error("offline"); } });
  await assert.rejects(networkProvider.send(message()), (error) => error.code === "EMAIL_NETWORK_ERROR" && error.retryable === true);
  const timeoutProvider = createResendEmailProvider({
    env: env(),
    fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    }),
  });
  await assert.rejects(timeoutProvider.send(message()), (error) => error.code === "EMAIL_TIMEOUT" && error.retryable === true);
});

test("sender parser supports display names and plain addresses", () => {
  assert.deepEqual(parseEmailAddress("Drive Pilot <sender@example.com>"), {
    displayName: "Drive Pilot", email: "sender@example.com",
  });
  assert.deepEqual(parseEmailAddress("sender@example.com"), { displayName: "", email: "sender@example.com" });
});

test("provider logs never include API key", async () => {
  const originalLog = console.log;
  const output = [];
  console.log = (line) => output.push(String(line));
  try {
    const provider = createResendEmailProvider({ env: env(), fetchImpl: async () => response(200, { id: "safe-id" }) });
    await provider.send(message());
  } finally {
    console.log = originalLog;
  }
  assert.equal(output.some((line) => line.includes("re_test_dummy_key")), false);
});
