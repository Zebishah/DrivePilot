const test = require("node:test");
const assert = require("node:assert/strict");
const { requestCorrelationMiddleware } = require("./requestCorrelation");

function response() {
  const headers = {};
  const listeners = {};
  return {
    statusCode: 200,
    setHeader: (key, value) => { headers[key] = value; },
    on: (event, callback) => { listeners[event] = callback; },
    headers,
    finish: () => listeners.finish?.(),
  };
}

test("request correlation accepts safe IDs and returns the response header", () => {
  const req = { method: "POST", path: "/graphql", get: (name) => name === "x-request-id" ? "client-123" : undefined };
  const res = response();
  let called = false;
  requestCorrelationMiddleware(req, res, () => { called = true; });
  assert.equal(called, true);
  assert.equal(req.requestId, "client-123");
  assert.equal(req.correlationId, "client-123");
  assert.equal(res.headers["x-request-id"], "client-123");
  res.finish();
});

test("unsafe or oversized IDs are replaced", () => {
  const req = { method: "GET", url: "/health", get: () => "x".repeat(500) };
  const res = response();
  requestCorrelationMiddleware(req, res, () => {});
  assert.notEqual(req.requestId, "x".repeat(500));
  assert.match(req.requestId, /^[0-9a-f-]{36}$/);
});
