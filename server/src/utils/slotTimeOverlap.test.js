const assert = require("node:assert/strict");
const test = require("node:test");
const { slotsOverlap, isActiveUnpaidOrPaidSlot } = require("./slotTimeOverlap");

test("detects overlap despite HH:mm vs HH:mm:ss", () => {
  assert.equal(
    slotsOverlap(
      { date: "2026-08-05", startTime: "17:30", endTime: "18:30" },
      { date: "2026-08-05", startTime: "17:30:00", endTime: "18:30:00" },
    ),
    true,
  );
});

test("2-hour slot overlaps nested 1-hour slot", () => {
  assert.equal(
    slotsOverlap(
      { date: "2026-08-05", startTime: "17:30", endTime: "19:30" },
      { date: "2026-08-05", startTime: "17:30", endTime: "18:30" },
    ),
    true,
  );
});

test("cancelled slot is not treated as active", () => {
  assert.equal(
    isActiveUnpaidOrPaidSlot({
      status: "cancelled",
      booked: false,
      paymentStatus: "pending_payment",
    }),
    false,
  );
});
