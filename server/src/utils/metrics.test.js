const test = require("node:test");
const assert = require("node:assert/strict");
const metrics = require("./metrics");

test("metrics provide counters and bounded timing snapshots", () => {
  metrics.reset();
  metrics.increment("payment.succeeded", 2, { currency: "CHF" });
  metrics.increment("payment.succeeded", 1, { currency: "CHF" });
  metrics.observe("payment.duration_ms", 12, { flow: "direct" });
  metrics.observe("payment.duration_ms", 18, { flow: "direct" });
  const snapshot = metrics.snapshot();
  assert.equal(snapshot.counters["payment.succeeded|currency=CHF"], 3);
  assert.deepEqual(snapshot.timings["payment.duration_ms|flow=direct"], { count: 2, totalMs: 30, maxMs: 18 });
  metrics.reset();
});
