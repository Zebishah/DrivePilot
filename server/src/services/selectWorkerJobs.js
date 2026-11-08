function selectWorkerJobs(jobs, { runWorker = false, runEmailWorker = false } = {}) {
  if (runWorker && runEmailWorker) {
    throw new Error("RUN_EMAIL_WORKER and RUN_WORKER cannot both be true");
  }
  if (runWorker) return jobs;
  if (runEmailWorker) {
    const emailJob = jobs.find((job) => job.name === "OutboxEmail");
    if (!emailJob) throw new Error("OutboxEmail job is not registered");
    return [emailJob];
  }
  return [];
}

module.exports = { selectWorkerJobs };
