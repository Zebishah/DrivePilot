const test = require("node:test");
const assert = require("node:assert/strict");
const { selectWorkerJobs } = require("./selectWorkerJobs");

const jobs = [
  { name: "StripeWebhookProcessor" },
  { name: "FinancialReconciliation" },
  { name: "PayoutJob" },
  { name: "T48ChargeJob" },
  { name: "T48PaymentReminderJob" },
  { name: "PendingBookingCleanupJob" },
  { name: "AbandonedCheckoutReminderJob" },
  { name: "LessonEndReminder" },
  { name: "OutboxEmail" },
];

test("email-only mode cannot activate financial or reminder jobs", () => {
  const selected = selectWorkerJobs(jobs, { runEmailWorker: true, runWorker: false });
  assert.deepEqual(selected.map((job) => job.name), ["OutboxEmail"]);
});

test("full worker mode retains all registered jobs", () => {
  assert.deepEqual(selectWorkerJobs(jobs, { runWorker: true }), jobs);
});

test("API-only mode selects no jobs", () => {
  assert.deepEqual(selectWorkerJobs(jobs), []);
});

test("invalid combinations and missing outbox fail closed", () => {
  assert.throws(
    () => selectWorkerJobs(jobs, { runWorker: true, runEmailWorker: true }),
    /cannot both be true/,
  );
  assert.throws(
    () => selectWorkerJobs([], { runEmailWorker: true }),
    /OutboxEmail job is not registered/,
  );
});
