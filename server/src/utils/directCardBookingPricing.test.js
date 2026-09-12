const test = require("node:test");
const assert = require("node:assert/strict");

const { buildDirectCardSlotSplits } = require("./directCardBookingPricing");

test("direct-card slot pricing keeps commission settings in scope after payment", () => {
  const calls = [];
  const platformSettings = { defaultRate: 20 };
  const splits = buildDirectCardSlotSplits({
    finalAmount: 100,
    numSlots: 2,
    instructor: { _id: "instructor-1" },
    platformSettings,
    getCommissionSplit: (amount, instructor, settings) => {
      calls.push({ amount, instructor, settings });
      return { dspCommission: amount * 0.2, instructorAmount: amount * 0.8 };
    },
  });

  assert.equal(splits.length, 2);
  assert.deepEqual(calls.map((call) => call.amount), [50, 50]);
  assert.ok(calls.every((call) => call.settings === platformSettings));
  assert.equal(splits[0].dspCommission + splits[0].instructorAmount, 50);
});
