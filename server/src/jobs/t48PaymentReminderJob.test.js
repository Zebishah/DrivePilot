const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildReminderMilestones,
  resolveT48PaymentWindow,
} = require("./t48PaymentReminderJob");

test("buildReminderMilestones returns 12h, 18h and 24h checkpoints", () => {
  const base = new Date("2026-01-01T00:00:00.000Z");
  const milestones = buildReminderMilestones(base);

  assert.equal(
    milestones.secondReminderAt.toISOString(),
    "2026-01-01T12:00:00.000Z",
  );
  assert.equal(
    milestones.thirdReminderAt.toISOString(),
    "2026-01-01T18:00:00.000Z",
  );
  assert.equal(milestones.deadlineAt.toISOString(), "2026-01-02T00:00:00.000Z");
});

test("does not invent a past deadline when reminder timestamps are missing", () => {
  const window = resolveT48PaymentWindow({
    date: "2026-08-05",
    startTime: "17:30",
    paymentStatus: "payment_failed",
  });
  assert.equal(window, null);
});

test("uses stored reminder start + 24h as cancel deadline", () => {
  const window = resolveT48PaymentWindow({
    paymentReminderStartedAt: "2026-08-05T12:00:00.000Z",
  });
  assert.equal(window.deadlineAt.toISOString(), "2026-08-06T12:00:00.000Z");
});
