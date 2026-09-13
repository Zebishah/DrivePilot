const test = require("node:test");
const assert = require("node:assert/strict");
const { AiProviderError, createFixtureProvider, createGeminiProvider } = require("./aiProvider");

test("fixture provider deterministically selects a role-approved tool and returns a final response", async () => {
  const provider = createFixtureProvider({ config: { enabled: true, mode: "fixture" } });
  const first = await provider.generate({ messages: [{ role: "user", content: "Do I have a payment needing action?" }], metadata: { userRole: "Student" } });
  assert.deepEqual(first.toolCalls, [{ name: "getMyPaymentStatus", arguments: {} }]);
  const final = await provider.generate({ messages: [{ role: "tool", name: "getMyPaymentStatus", content: "{}" }], metadata: { userRole: "Student" } });
  assert.equal(final.text, "Verified application data is available below.");
});

test("Gemini provider parses text and function calls without network access in tests", async () => {
  let calls = 0;
  const provider = createGeminiProvider({
    config: { enabled: true, mode: "live", provider: "gemini", model: "test-model", requestTimeoutMs: 1000 },
    env: { GEMINI_API_KEY: "test-key" },
    fetchImpl: async (_url, options) => {
      calls += 1;
      assert.equal(options.method, "POST");
      return { ok: true, status: 200, async json() { return { candidates: [{ content: { parts: [{ functionCall: { name: "getMyPaymentStatus", args: {} } }] } }] }; } };
    },
  });
  const result = await provider.generate({ system: "bounded", messages: [{ role: "user", content: "payments" }], tools: [{ name: "getMyPaymentStatus", description: "status", inputSchema: { type: "OBJECT", properties: {}, additionalProperties: false } }] });
  assert.equal(calls, 1);
  assert.deepEqual(result.toolCalls, [{ name: "getMyPaymentStatus", arguments: {} }]);
});

test("Gemini provider classifies rate limits and missing configuration safely", async () => {
  const rateLimited = createGeminiProvider({ config: { enabled: true, mode: "live", provider: "gemini", requestTimeoutMs: 1000 }, env: { GEMINI_API_KEY: "key" }, fetchImpl: async () => ({ ok: false, status: 429, async json() { return {}; } }) });
  await assert.rejects(rateLimited.generate({ system: "x", messages: [], tools: [] }), (error) => error instanceof AiProviderError && error.retryable);
  const missing = createGeminiProvider({ config: { enabled: true, mode: "live", provider: "gemini" }, env: {}, fetchImpl: async () => ({ ok: true, status: 200, async json() { return {}; } }) });
  await assert.rejects(missing.generate({ system: "x", messages: [], tools: [] }), (error) => error.code === "AI_CONFIGURATION_MISSING" && !error.retryable);
});
