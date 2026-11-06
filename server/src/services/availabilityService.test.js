const test = require("node:test");
const assert = require("node:assert/strict");
const { claimAvailabilitySlot } = require("./availabilityService");

class FakeQuery {
  constructor(value) { this.value = value; }
  session() { return this; }
  then(resolve, reject) { return Promise.resolve(this.value).then(resolve, reject); }
}

test("availability claim is an atomic compare-and-set", async () => {
  const state = { booked: false };
  const model = {
    exists: () => new FakeQuery(true),
    findOneAndUpdate: () => {
      if (state.booked) return new FakeQuery(null);
      state.booked = true;
      return new FakeQuery({ _id: "availability-1" });
    },
  };
  const input = {
    teacherId: "teacher-1",
    slot: { date: "2026-09-15", startTime: "09:00", endTime: "10:00" },
    model,
  };

  const results = await Promise.allSettled([
    claimAvailabilitySlot(input),
    claimAvailabilitySlot(input),
  ]);

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  assert.equal(results.find((result) => result.status === "rejected").reason.code, "SLOT_UNAVAILABLE");
});

test("availability release is safe to repeat", async () => {
  let releaseCalls = 0;
  const model = {
    updateOne: async () => {
      releaseCalls += 1;
      return { acknowledged: true };
    },
  };
  const { releaseAvailabilitySlots } = require("./availabilityService");
  const claims = [{
    teacherId: "teacher-1",
    slot: { date: "2026-09-15", startTime: "09:00", endTime: "10:00" },
  }];

  await releaseAvailabilitySlots({ claims, model });
  await releaseAvailabilitySlots({ claims, model });
  assert.equal(releaseCalls, 2);
});
