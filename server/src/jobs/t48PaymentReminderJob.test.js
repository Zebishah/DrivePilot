const test = require("node:test");
const assert = require("node:assert/strict");

const { buildReminderMilestones } = require("./t48PaymentReminderJob");

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
