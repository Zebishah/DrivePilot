const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isRealStripePaymentMethodId,
  isIncompleteCheckoutBooking,
  shouldSkipT48Charge,
  shouldAutoCancelUnpaidSlot,
  shouldCancelUnpaidPastLesson,
  canReviveAutoCancelledCheckout,
} = require("./checkoutPaymentGuard");

test("placeholder checkout paymentMethodId is not a real Stripe PM", () => {
  assert.equal(isRealStripePaymentMethodId("checkout"), false);
  assert.equal(isRealStripePaymentMethodId(""), false);
  assert.equal(isRealStripePaymentMethodId(null), false);
  assert.equal(isRealStripePaymentMethodId("pm_abc123"), true);
});

test("instant checkout without customer is incomplete", () => {
  assert.equal(
    isIncompleteCheckoutBooking({
      status: "pending",
      paymentMethod: { paymentMethodId: "checkout" },
      slots: [{ paymentStatus: "pending_payment" }],
    }),
    true,
  );
});

test("skips T-48 charge for instant checkout placeholder PM", () => {
  assert.equal(
    shouldSkipT48Charge({
      booking: {
        status: "pending",
        paymentMethod: { paymentMethodId: "checkout" },
        slots: [{ paymentStatus: "pending_payment", status: "booked", booked: true }],
      },
      slot: { paymentStatus: "pending_payment", status: "booked", booked: true },
    }),
    true,
  );
});

test("does not auto-cancel incomplete checkout marked payment_failed", () => {
  assert.equal(
    shouldAutoCancelUnpaidSlot({
      booking: {
        status: "pending",
        paymentMethod: { paymentMethodId: "checkout" },
        slots: [{ paymentStatus: "payment_failed", status: "booked", booked: true }],
      },
      slot: {
        paymentStatus: "payment_failed",
        status: "booked",
        booked: true,
        paymentReminderStartedAt: "2026-08-01T00:00:00.000Z",
        paymentReminderDeadlineAt: "2026-08-02T00:00:00.000Z",
      },
      now: new Date("2026-08-05T15:18:00.000Z"),
    }),
    false,
  );
});

test("auto-cancels real T-48 failure after stored deadline", () => {
  assert.equal(
    shouldAutoCancelUnpaidSlot({
      booking: {
        status: "confirmed",
        stripeCustomerId: "cus_123",
        paymentMethod: { paymentMethodId: "pm_abc123" },
        slots: [{ paymentStatus: "requires_action", status: "booked", booked: true }],
      },
      slot: {
        paymentStatus: "requires_action",
        status: "booked",
        booked: true,
        paymentReminderStartedAt: "2026-08-04T12:00:00.000Z",
        paymentReminderDeadlineAt: "2026-08-05T12:00:00.000Z",
      },
      now: new Date("2026-08-05T12:00:00.000Z"),
    }),
    true,
  );
});

test("cancels unpaid slot only after lesson end has passed", () => {
  const booking = {
    status: "pending",
    paymentMethod: { paymentMethodId: "checkout" },
    slots: [{ paymentStatus: "pending_payment", status: "booked", booked: true }],
  };
  const slot = {
    paymentStatus: "pending_payment",
    status: "booked",
    booked: true,
  };
  assert.equal(
    shouldCancelUnpaidPastLesson({
      booking,
      slot,
      slotEndMs: Date.parse("2026-08-07T12:00:00.000Z"),
      now: new Date("2026-08-07T11:59:00.000Z"),
    }),
    false,
  );
  assert.equal(
    shouldCancelUnpaidPastLesson({
      booking,
      slot,
      slotEndMs: Date.parse("2026-08-07T12:00:00.000Z"),
      now: new Date("2026-08-07T12:00:00.000Z"),
    }),
    true,
  );
});

test("does not cancel paid or already-cancelled slots when lesson ends", () => {
  assert.equal(
    shouldCancelUnpaidPastLesson({
      booking: { status: "confirmed" },
      slot: { paymentStatus: "paid", status: "booked", booked: true },
      slotEndMs: Date.parse("2026-08-07T10:00:00.000Z"),
      now: new Date("2026-08-07T12:00:00.000Z"),
    }),
    false,
  );
  assert.equal(
    shouldCancelUnpaidPastLesson({
      booking: { status: "pending" },
      slot: {
        paymentStatus: "pending_payment",
        status: "cancelled",
        booked: false,
      },
      slotEndMs: Date.parse("2026-08-07T10:00:00.000Z"),
      now: new Date("2026-08-07T12:00:00.000Z"),
    }),
    false,
  );
});

test("paid Stripe checkout can revive system auto-cancelled booking", () => {
  assert.equal(
    canReviveAutoCancelledCheckout({
      status: "cancelled",
      slots: [
        {
          paymentStatus: "payment_failed",
          cancelledBy: "admin",
        },
      ],
    }),
    true,
  );
  assert.equal(
    canReviveAutoCancelledCheckout({
      status: "cancelled",
      slots: [{ paymentStatus: "pending_payment", cancelledBy: "student" }],
    }),
    false,
  );
});
