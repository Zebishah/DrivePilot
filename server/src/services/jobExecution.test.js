const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

function withMocks(mocks, callback) {
  const originalLoad = Module._load;
  Module._load = function mockedLoad(request, parent, isMain) {
    const match = Object.entries(mocks).find(([suffix]) => request.endsWith(suffix));
    return match ? match[1] : originalLoad.call(this, request, parent, isMain);
  };
  return Promise.resolve(callback()).finally(() => {
    Module._load = originalLoad;
  });
}

test("job lease allows one owner and fences stale owners", async () => {
  let current = null;
  const fakeModel = {
    findOneAndUpdate: async (query, update) => {
      const now = Date.now();
      const active = current?.status === "RUNNING" &&
        current.leaseExpiresAt && new Date(current.leaseExpiresAt).getTime() > now;
      if (query.status === "RUNNING" && current?.status !== "RUNNING") return null;
      if (active && !query.leaseOwner) return null;
      if (query._id && String(query._id) !== String(current?._id)) return null;
      if (query.leaseOwner && query.leaseOwner !== current?.leaseOwner) return null;
      if (query.status === "RUNNING" && current?.status === "RUNNING" && active && query.leaseOwner !== current.leaseOwner) return null;
      if (update.$setOnInsert && !current) current = { _id: "job-1", ...update.$setOnInsert };
      current = { ...current, ...(update.$set || {}) };
      if (update.$inc) {
        for (const [key, value] of Object.entries(update.$inc)) current[key] = (current[key] || 0) + value;
      }
      return { ...current };
    },
  };

  await withMocks({ "models/JobExecution": fakeModel }, async () => {
    delete require.cache[require.resolve("./jobExecutionService")];
    const service = require("./jobExecutionService");
    const first = await service.acquireJobLease("PayoutJob", "owner-1", 60_000);
    assert.ok(first);
    const second = await service.acquireJobLease("PayoutJob", "owner-2", 60_000);
    assert.equal(second, null);

    current.leaseExpiresAt = new Date(Date.now() - 1);
    const recovered = await service.acquireJobLease("PayoutJob", "owner-2", 60_000);
    assert.equal(recovered.leaseOwner, "owner-2");
    assert.equal(await service.finishJobExecution(first, "owner-1", {}), null);
    assert.ok(await service.finishJobExecution(recovered, "owner-2", { processed: 1 }));
  });
});

test("scheduler self-schedules without overlapping runs and stops cleanly", async () => {
  let active = 0;
  let maximum = 0;
  let calls = 0;
  const fakeExecutionService = {
    runDurableJob: async (_name, job) => {
      active += 1;
      maximum = Math.max(maximum, active);
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 8));
      await job();
      active -= 1;
      return {};
    },
  };

  await withMocks({ "jobExecutionService": fakeExecutionService }, async () => {
    delete require.cache[require.resolve("./jobScheduler")];
    const { createJobScheduler } = require("./jobScheduler");
    const scheduler = createJobScheduler({
      jobs: [{ name: "TestJob", run: async () => {}, intervalMs: 2 }],
      leaseMs: 1000,
      heartbeatMs: 100,
      shutdownTimeoutMs: 100,
    });
    scheduler.start();
    await new Promise((resolve) => setTimeout(resolve, 28));
    await scheduler.stop();
    const callsAtStop = calls;
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(calls, callsAtStop);
    assert.equal(maximum, 1);
  });
});

test("reminder claim prevents two workers from sending the same notification", async () => {
  let claimed = false;
  let sends = 0;
  const slot = { _id: "slot-1", paymentStatus: "payment_failed" };
  const booking = {
    _id: "booking-1",
    status: "confirmed",
    slots: Object.assign([slot], { id: () => slot }),
    studentId: { email: "student@example.test", firstName: "Student" },
    instructorId: { firstName: "Instructor" },
  };
  const fakeBookingModel = {
    findById: () => ({
      ...booking,
      populate() { return this; },
    }),
    updateOne: async (_query, update) => {
      if (update.$set?.["slots.$.paymentReminderClaimedAt"]) {
        if (claimed) return { modifiedCount: 0 };
        claimed = true;
        return { modifiedCount: 1 };
      }
      claimed = false;
      return { modifiedCount: 1 };
    },
  };

  await withMocks(
    {
      "studentBooking.model": fakeBookingModel,
      SendOtpEmail: { sendBookingEmail: async () => { sends += 1; } },
    },
    async () => {
      delete require.cache[require.resolve("../jobs/t48PaymentReminderJob")];
      const { sendStudentReminderEmail } = require("../jobs/t48PaymentReminderJob");
      const results = await Promise.all([
        sendStudentReminderEmail("booking-1", "slot-1", 2, { leaseOwner: "worker-1" }),
        sendStudentReminderEmail("booking-1", "slot-1", 2, { leaseOwner: "worker-2" }),
      ]);
      assert.deepEqual(results.sort(), [false, true]);
      assert.equal(sends, 1);
    },
  );
});
