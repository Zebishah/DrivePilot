const crypto = require("crypto");
const JobExecution = require("../models/JobExecution");

function runId(jobName) {
  return `${jobName}-${crypto.randomUUID()}`;
}

async function acquireJobLease(jobName, leaseOwner, leaseMs) {
  const now = new Date();
  const id = runId(jobName);
  try {
    return await JobExecution.findOneAndUpdate(
      {
        jobName,
        $or: [
          { status: { $ne: "RUNNING" } },
          { status: "RUNNING", leaseExpiresAt: null },
          { status: "RUNNING", leaseExpiresAt: { $lte: now } },
        ],
      },
      {
        $set: {
          runId: id,
          status: "RUNNING",
          leaseOwner,
          leaseExpiresAt: new Date(now.getTime() + leaseMs),
          startedAt: now,
          finishedAt: null,
          lastError: null,
          updatedAt: now,
        },
        $inc: { attemptCount: 1 },
        $setOnInsert: { jobName },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    // Concurrent upsert means another instance created the unique job row.
    if (error?.code === 11000) return null;
    throw error;
  }
}

async function renewJobLease(execution, leaseOwner, leaseMs) {
  if (!execution?._id) return null;
  return JobExecution.findOneAndUpdate(
    { _id: execution._id, status: "RUNNING", leaseOwner },
    { $set: { leaseExpiresAt: new Date(Date.now() + leaseMs), updatedAt: new Date() } },
    { new: true },
  );
}

async function finishJobExecution(execution, leaseOwner, result = {}) {
  if (!execution?._id) return null;
  const processed = Number(result.processed ?? result.scanned ?? result.selected ?? 0);
  const failures = Number(result.errors ?? result.failed ?? result.retryable ?? 0);
  console.log("[JobExecution] completed", {
    jobName: execution.jobName,
    runId: execution.runId,
    leaseOwner,
    startedAt: execution.startedAt,
    finishedAt: new Date().toISOString(),
    selected: Number(result.selected ?? 0),
    processed,
    succeeded: Math.max(0, processed - failures),
    retryable: Number(result.retryable ?? 0),
    manualReview: Number(result.manualReview ?? 0),
    failed: failures,
  });
  return JobExecution.findOneAndUpdate(
    { _id: execution._id, status: "RUNNING", leaseOwner },
    {
      $set: {
        status: "SUCCEEDED",
        finishedAt: new Date(),
        nextRunAt: null,
        leaseOwner: null,
        leaseExpiresAt: null,
        lastError: null,
        processedCount: Number.isFinite(processed) ? processed : 0,
        successCount: Number.isFinite(processed - failures) ? Math.max(0, processed - failures) : 0,
        failureCount: Number.isFinite(failures) ? failures : 0,
        metadata: result,
      },
    },
    { new: true },
  );
}

async function failJobExecution(execution, leaseOwner, error, result = {}) {
  if (!execution?._id) return null;
  console.error("[JobExecution] failed", {
    jobName: execution.jobName,
    runId: execution.runId,
    leaseOwner,
    code: error?.code || "JOB_FAILED",
    message: String(error?.message || error).slice(0, 300),
  });
  return JobExecution.findOneAndUpdate(
    { _id: execution._id, status: "RUNNING", leaseOwner },
    {
      $set: {
        status: "FAILED",
        finishedAt: new Date(),
        nextRunAt: null,
        leaseOwner: null,
        leaseExpiresAt: null,
        lastError: String(error?.message || error || "Job failed").slice(0, 1000),
        metadata: result,
      },
    },
    { new: true },
  );
}

async function runDurableJob(jobName, job, options = {}) {
  const leaseOwner = options.leaseOwner || `${jobName}-${crypto.randomUUID()}`;
  const leaseMs = options.leaseMs || 10 * 60 * 1000;
  const heartbeatMs = Math.min(options.heartbeatMs || 60 * 1000, Math.max(1000, Math.floor(leaseMs / 3)));
  const execution = await acquireJobLease(jobName, leaseOwner, leaseMs);
  if (!execution) return { skipped: true, reason: "lease_active" };

  let leaseLost = false;
  let heartbeatStopped = false;
  let heartbeatTimer = null;
  const scheduleHeartbeat = () => {
    if (heartbeatStopped) return;
    heartbeatTimer = setTimeout(async () => {
      try {
        const renewed = await renewJobLease(execution, leaseOwner, leaseMs);
        if (!renewed) leaseLost = true;
      } catch (_) {
        leaseLost = true;
      }
      scheduleHeartbeat();
    }, heartbeatMs);
  };
  scheduleHeartbeat();

  try {
    const result = (await job({
      jobName,
      runId: execution.runId,
      leaseOwner,
      leaseExpiresAt: execution.leaseExpiresAt,
      ...(options.jobContext || {}),
    })) || {};
    if (leaseLost) {
      const error = new Error("Job lease was lost while execution was running");
      error.code = "JOB_LEASE_LOST";
      await failJobExecution(execution, leaseOwner, error, result);
      return { ...result, failed: true, leaseLost: true };
    }
    await finishJobExecution(execution, leaseOwner, result);
    return result;
  } catch (error) {
    await failJobExecution(execution, leaseOwner, error);
    throw error;
  } finally {
    heartbeatStopped = true;
    if (heartbeatTimer) clearTimeout(heartbeatTimer);
  }
}

module.exports = {
  acquireJobLease,
  renewJobLease,
  finishJobExecution,
  failJobExecution,
  runDurableJob,
};
