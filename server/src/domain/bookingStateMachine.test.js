const test = require("node:test");
const assert = require("node:assert/strict");
const {
  assertBookingTransition,
  assertSlotTransition,
  deriveBookingStatus,
} = require("./bookingStateMachine");

test("booking state machine accepts supported lifecycle transitions", () => {
  assert.doesNotThrow(() => assertBookingTransition("pending", "confirmed"));
  assert.doesNotThrow(() => assertBookingTransition("confirmed", "completed"));
  assert.doesNotThrow(() => assertSlotTransition("booked", "missed"));
  assert.doesNotThrow(() => assertSlotTransition("completed", "completed"));
});

test("booking state machine rejects reopening terminal states", () => {
  assert.throws(
    () => assertBookingTransition("completed", "confirmed"),
    /Invalid booking transition/,
  );
  assert.throws(
    () => assertSlotTransition("cancelled", "completed"),
    /Invalid slot transition/,
  );
});

test("aggregate booking status is derived from slot outcomes", () => {
  assert.equal(deriveBookingStatus([{ status: "booked" }]), "confirmed");
  assert.equal(deriveBookingStatus([{ status: "completed" }, { status: "completed" }]), "completed");
  assert.equal(deriveBookingStatus([{ status: "cancelled" }, { status: "booked" }]), "semi_cancelled");
  assert.equal(deriveBookingStatus([{ status: "refund" }]), "refund");
});
