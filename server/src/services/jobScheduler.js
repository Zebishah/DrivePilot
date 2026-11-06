const crypto = require("crypto");
const { runDurableJob } = require("./jobExecutionService");
const { logger, classifyError } = require("../utils/logger");

function createJobScheduler({ jobs, leaseMs, heartbeatMs, shutdownTimeoutMs, maxRetryDelayMs = 60 * 60 * 1000 }) {
  const timers = new Set();
  const activeRuns = new Set();
  const failureStreaks = new Map();
  let stopped = false;

  function schedule(entry, delayMs) {
    if (stopped) return;
    const timer = setTimeout(() => {
      timers.delete(timer);
      execute(entry);
    }, Math.max(0, delayMs));
    timers.add(timer);
  }

  async function execute(entry) {
    if (stopped) return;
    let failed = false;
    const run = runDurableJob(
      entry.name,
      entry.run,
      {
        leaseMs,
        heartbeatMs,
        leaseOwner: `${entry.name}-${crypto.randomUUID()}`,
        jobContext: entry.jobContext,
      },
    )
      .catch((error) => {
        failed = true;
        failureStreaks.set(entry.name, (failureStreaks.get(entry.name) || 0) + 1);
        logger.error("scheduled_job_failed", {
          jobName: entry.name,
          code: error?.code || "JOB_FAILED",
          errorCategory: classifyError(error),
          error,
        });
      })
      .finally(() => {
        activeRuns.delete(run);
        if (!failed) failureStreaks.set(entry.name, 0);
        const streak = failureStreaks.get(entry.name) || 0;
        const retryDelay = Math.min(
          maxRetryDelayMs,
          entry.intervalMs * 2 ** Math.max(0, streak - 1),
        );
        schedule(entry, failed ? retryDelay : entry.intervalMs);
      });
    activeRuns.add(run);
    await run;
  }

  return {
    start() {
      stopped = false;
      for (const entry of jobs) schedule(entry, 0);
    },
    async stop() {
      stopped = true;
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
      if (!activeRuns.size) return;
      await Promise.race([
        Promise.allSettled([...activeRuns]),
        new Promise((resolve) => setTimeout(resolve, shutdownTimeoutMs)),
      ]);
    },
  };
}

module.exports = { createJobScheduler };
