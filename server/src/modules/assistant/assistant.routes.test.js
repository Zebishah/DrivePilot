const test = require("node:test");
const assert = require("node:assert/strict");

const router = require("./assistant.routes");

test("assistant rate limiting uses the authenticated user id when available", () => {
  assert.equal(
    router.assistantRateLimitKey({ assistantUser: { id: "user-123" }, ip: "2001:db8::1" }),
    "user:user-123",
  );
});

test("assistant rate limiting normalizes IPv6 addresses through the package helper", () => {
  const key = router.assistantRateLimitKey({ ip: "2001:db8::1" });

  assert.match(key, /^ip:/);
  assert.notEqual(key, "ip:2001:db8::1");
});
