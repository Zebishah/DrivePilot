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

test("guests can use product guidance while account assistance still requires authentication", async () => {
  const express = require("express");
  const app = express();
  app.use(router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const request = path => fetch(`${base}/api/v1/assistant/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "Show my payments" }) });
    const guest = await request("public/chat");
    assert.equal(guest.status, 200);
    assert.match((await guest.json()).answer, /sign in/);
    assert.equal((await request("chat")).status, 401);
    const invalid = await fetch(`${base}/api/v1/assistant/public/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "" }) });
    assert.equal(invalid.status, 400);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
