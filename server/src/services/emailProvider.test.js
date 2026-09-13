const test = require("node:test");
const assert = require("node:assert/strict");
const { EmailProviderError, createElasticEmailProvider, createEmailProvider, parseEmailAddress } = require("./emailProvider");

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
    EMAIL_PROVIDER: "elasticemail",
    EMAIL_ENABLED: "true",
    EMAIL_MODE: "test",
    EMAIL_TEST_RECIPIENT: "test-owner@example.com",
    ELASTIC_EMAIL_API_KEY: "elastic_test_key",
    EMAIL_REQUEST_TIMEOUT_MS: "1000",
    ...overrides,
  };
}

test("Elastic Email test mode maps the transactional payload and sender", async () => {
  const calls = [];
  const provider = createElasticEmailProvider({
    env: env(),
    fetchImpl: async (url, options) => {
      calls.push({ url, options, body: JSON.parse(options.body) });
      return response(200, { MessageID: "elastic-123" });
    },
  });

  const result = await provider.send({
    to: "real-recipient@example.com",
    from: "DSP Marketplace <sender@example.com>",
    replyTo: "Support <support@example.com>",
    subject: "Test",
    html: "<p>Hello</p>",
    text: "Hello",
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.elasticemail.com/v4/emails/transactional");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers["X-ElasticEmail-ApiKey"], "elastic_test_key");
  assert.equal(calls[0].body.Recipients.To[0], "test-owner@example.com");
  assert.equal(calls[0].body.Content.From, "DSP Marketplace <sender@example.com>");
  assert.equal(calls[0].body.Content.ReplyTo, "Support <support@example.com>");
  assert.equal(calls[0].body.Content.Subject, "Test");
  assert.deepEqual(calls[0].body.Content.Body, [
    { ContentType: "HTML", Charset: "utf-8", Content: "<p>Hello</p>" },
    { ContentType: "PlainText", Charset: "utf-8", Content: "Hello" },
  ]);
  assert.equal(result.provider, "elasticemail");
  assert.equal(result.providerMessageId, "elastic-123");
  assert.deepEqual(result.intendedRecipients, ["real-recipient@example.com"]);
});

test("production mode sends all intended recipients", async () => {
  let request;
  const provider = createElasticEmailProvider({
    env: env({ EMAIL_MODE: "production" }),
    fetchImpl: async (url, options) => {
      request = { url, options, body: JSON.parse(options.body) };
      return response(200, { TransactionID: "transaction-123" });
    },
  });

  await provider.send({
    to: ["one@example.com", "two@example.com"],
    from: "sender@example.com",
    subject: "Production",
    html: "<p>Production</p>",
    text: "Production",
  });

  assert.deepEqual(request.body.Recipients.To, ["one@example.com", "two@example.com"]);
  assert.equal(request.body.Content.From, "sender@example.com");
});

test("disabled email does not call Elastic Email", async () => {
  let calls = 0;
  const provider = createElasticEmailProvider({
    env: env({ EMAIL_ENABLED: "false", ELASTIC_EMAIL_API_KEY: "" }),
    fetchImpl: async () => {
      calls += 1;
      return response(200, { MessageID: "not-sent" });
    },
  });

  assert.deepEqual(
    await provider.send({ to: "user@example.com", subject: "Ignored", html: "<p />", text: "Ignored" }),
    { skipped: true, reason: "EMAIL_DISABLED" },
  );
  assert.equal(calls, 0);
});

test("provider selection rejects unsupported providers", () => {
  assert.throws(
    () => createEmailProvider({ env: env({ EMAIL_PROVIDER: "resend" }) }),
    /Unsupported EMAIL_PROVIDER: resend/,
  );
});

test("Elastic Email classifies rate limits and server errors as retryable", async () => {
  for (const status of [429, 500, 503]) {
    const provider = createElasticEmailProvider({ env: env(), fetchImpl: async () => response(status) });
    await assert.rejects(
      provider.send({ to: "user@example.com", from: "DSP <sender@example.com>", subject: "Test", html: "<p />", text: "Test" }),
      (error) => error instanceof EmailProviderError && error.retryable === true && error.status === status && error.code === `ELASTICEMAIL_${status}`,
    );
  }
});

test("Elastic Email classifies client errors and missing configuration as permanent", async () => {
  const provider = createElasticEmailProvider({ env: env(), fetchImpl: async () => response(400) });
  await assert.rejects(
    provider.send({ to: "user@example.com", from: "DSP <sender@example.com>", subject: "Test", html: "<p />", text: "Test" }),
    (error) => error.code === "ELASTICEMAIL_400" && error.retryable === false,
  );

  for (const overrides of [{ ELASTIC_EMAIL_API_KEY: "" }, { EMAIL_TEST_RECIPIENT: "" }]) {
    const missingConfigProvider = createElasticEmailProvider({ env: env(overrides), fetchImpl: async () => response(200, { MessageID: "unused" }) });
    await assert.rejects(
      missingConfigProvider.send({ to: "user@example.com", from: "DSP <sender@example.com>", subject: "Test", html: "<p />", text: "Test" }),
      (error) => error instanceof EmailProviderError && error.retryable === false,
    );
  }
});

test("network errors and timeouts are retryable", async () => {
  const networkProvider = createElasticEmailProvider({
    env: env(),
    fetchImpl: async () => { throw new Error("socket failed"); },
  });
  await assert.rejects(
    networkProvider.send({ to: "user@example.com", from: "sender@example.com", subject: "Test", html: "<p />", text: "Test" }),
    (error) => error.code === "EMAIL_NETWORK_ERROR" && error.retryable === true,
  );

  const timeoutProvider = createElasticEmailProvider({
    env: env({ EMAIL_REQUEST_TIMEOUT_MS: "1000" }),
    fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    }),
  });
  await assert.rejects(
    timeoutProvider.send({ to: "user@example.com", from: "sender@example.com", subject: "Test", html: "<p />", text: "Test" }),
    (error) => error.code === "EMAIL_TIMEOUT" && error.retryable === true,
  );
});

test("malformed successful responses are not marked as delivered", async () => {
  const provider = createElasticEmailProvider({ env: env(), fetchImpl: async () => response(200, { success: true }) });
  await assert.rejects(
    provider.send({ to: "user@example.com", from: "sender@example.com", subject: "Test", html: "<p />", text: "Test" }),
    (error) => error.code === "ELASTICEMAIL_RESPONSE_INVALID" && error.retryable === false,
  );
});

test("sender parser supports display names and plain addresses", () => {
  assert.deepEqual(parseEmailAddress("DSP Marketplace <sender@example.com>"), {
    displayName: "DSP Marketplace",
    email: "sender@example.com",
  });
  assert.deepEqual(parseEmailAddress("sender@example.com"), { displayName: "", email: "sender@example.com" });
});

test("provider logs never include the API key", async () => {
  const originalLog = console.log;
  const output = [];
  console.log = (line) => output.push(String(line));
  try {
    const provider = createElasticEmailProvider({ env: env(), fetchImpl: async () => response(200, { MessageID: "safe-id" }) });
    await provider.send({ to: "user@example.com", from: "sender@example.com", subject: "Test", html: "<p />", text: "Test" });
  } finally {
    console.log = originalLog;
  }
  assert.equal(output.some((line) => line.includes("elastic_test_key")), false);
});
