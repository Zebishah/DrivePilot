function positiveInteger(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function booleanValue(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  const normalized = String(raw).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  throw new Error(`${name} must be true/false`);
}

const CRON_RUNS = booleanValue("CRON_RUNS", false);
const RUN_API = booleanValue("RUN_API", true);
const RUN_WORKER = booleanValue("RUN_WORKER", CRON_RUNS);

const JOB_CONFIG = {
  runApi: RUN_API,
  runWorker: RUN_WORKER,
  leaseMs: positiveInteger("JOB_LEASE_MS", 10 * 60 * 1000),
  heartbeatMs: positiveInteger("JOB_HEARTBEAT_MS", 60 * 1000),
  shutdownTimeoutMs: positiveInteger("JOB_SHUTDOWN_TIMEOUT_MS", 30 * 1000),
  maxRetryDelayMs: positiveInteger("JOB_MAX_RETRY_DELAY_MS", 60 * 60 * 1000),
  webhookProcessorIntervalMs: positiveInteger("STRIPE_WEBHOOK_PROCESSOR_INTERVAL_MS", 5 * 1000),
  reconciliationIntervalMs: positiveInteger("FINANCIAL_RECONCILIATION_INTERVAL_MS", 15 * 60 * 1000),
  payoutIntervalMs: positiveInteger("PAYOUT_JOB_INTERVAL_MS", 3 * 60 * 1000),
  t48IntervalMs: positiveInteger("T48_CHARGE_JOB_INTERVAL_MS", 60 * 1000),
  t48ReminderIntervalMs: positiveInteger("T48_REMINDER_JOB_INTERVAL_MS", 10 * 60 * 1000),
  pendingCleanupIntervalMs: positiveInteger("PENDING_CLEANUP_JOB_INTERVAL_MS", 24 * 60 * 60 * 1000),
  abandonedReminderIntervalMs: positiveInteger("ABANDONED_REMINDER_JOB_INTERVAL_MS", 10 * 60 * 1000),
  lessonEndReminderIntervalMs: positiveInteger("LESSON_END_REMINDER_INTERVAL_MS", 2 * 60 * 1000),
  defaultBatchSize: positiveInteger("JOB_BATCH_SIZE", 25),
  payoutBatchSize: positiveInteger("PAYOUT_JOB_BATCH_SIZE", 25),
  t48BatchSize: positiveInteger("T48_CHARGE_JOB_BATCH_SIZE", 25),
  reminderBatchSize: positiveInteger("REMINDER_JOB_BATCH_SIZE", 25),
  cleanupBatchSize: positiveInteger("PENDING_CLEANUP_BATCH_SIZE", 25),
  emailClaimMs: positiveInteger("EMAIL_CLAIM_MS", 15 * 60 * 1000),
};

if (!JOB_CONFIG.runApi && !JOB_CONFIG.runWorker) {
  throw new Error("At least one of RUN_API or RUN_WORKER must be enabled");
}
if (JOB_CONFIG.heartbeatMs >= JOB_CONFIG.leaseMs / 2) {
  throw new Error("JOB_HEARTBEAT_MS must be less than half of JOB_LEASE_MS");
}

module.exports = JOB_CONFIG;
