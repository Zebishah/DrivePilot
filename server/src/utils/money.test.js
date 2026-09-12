const test = require("node:test");
const assert = require("node:assert/strict");
const {
  toMinorUnits,
  fromMinorUnits,
  formatMoney,
  allocateAmount,
  calculateCommission,
  buildBookingMoneySnapshot,
} = require("./money");

test("converts CHF decimal values to minor units with deterministic half-up rounding", () => {
  assert.equal(toMinorUnits("0.01"), 1);
  assert.equal(toMinorUnits("0.05"), 5);
  assert.equal(toMinorUnits("0.10"), 10);
  assert.equal(toMinorUnits("10.01"), 1001);
  assert.equal(toMinorUnits("10.005"), 1001);
  assert.equal(fromMinorUnits(2550), "25.50");
  assert.equal(formatMoney(2550), "CHF 25.50");
});

test("rejects invalid, negative, and unsafe money values", () => {
  for (const value of ["NaN", "Infinity", "", "CHF 10", -1, Number.POSITIVE_INFINITY]) {
    assert.throws(() => toMinorUnits(value));
  }
  assert.throws(() => fromMinorUnits(Number.MAX_SAFE_INTEGER + 1));
});

test("allocates remainders to the earliest stable slots", () => {
  assert.deepEqual(allocateAmount(1000, 3), [334, 333, 333]);
  assert.deepEqual(allocateAmount(1001, 3), [334, 334, 333]);
  assert.deepEqual(allocateAmount(1, 4), [1, 0, 0, 0]);
});

test("calculates commission in minor units and preserves the gross invariant", () => {
  const split = calculateCommission(1001, {}, { defaultRate: 20 });
  assert.deepEqual(split, { commissionMinor: 200, instructorAmountMinor: 801 });
  assert.equal(split.commissionMinor + split.instructorAmountMinor, 1001);

  const fixed = calculateCommission(1000, { commission: { type: "fixed", fixedAmount: 2.55 } });
  assert.deepEqual(fixed, { commissionMinor: 255, instructorAmountMinor: 745 });
});

test("builds multi-slot booking snapshots with exact sums", () => {
  const snapshot = buildBookingMoneySnapshot({
    grossAmountMinor: 1000,
    slotCount: 3,
    platformSettings: { defaultRate: 20 },
  });
  assert.deepEqual(snapshot.slots.map((slot) => slot.grossAmountMinor), [334, 333, 333]);
  assert.equal(snapshot.grossAmountMinor, 1000);
  assert.equal(snapshot.commissionAmountMinor, 200);
  assert.equal(snapshot.instructorAmountMinor, 800);
  assert.equal(snapshot.slots.reduce((sum, slot) => sum + slot.commissionAmountMinor, 0), snapshot.commissionAmountMinor);
  assert.equal(snapshot.slots.reduce((sum, slot) => sum + slot.instructorAmountMinor, 0), snapshot.instructorAmountMinor);
  for (const slot of snapshot.slots) {
    assert.equal(slot.commissionAmountMinor + slot.instructorAmountMinor, slot.grossAmountMinor);
  }
});
