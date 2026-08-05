import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDeadlineHhMmDdMmYyyy,
  parseFlexibleTimestamp,
  resolveActiveLessonPlacement,
  resolvePaymentChip,
  resolvePaymentDeadline,
  resolveUnpaidCancelDeadline,
  shouldShowPaymentRetryCta,
  shouldUseSavedCardCompletion,
} from "./unpaidBookingLifecycle.ts";

test("T-48 saved-card pending stays Abandoned until payment is confirmed", () => {
  const result = resolveActiveLessonPlacement({
    slotStatus: "booked",
    paymentStatus: "pending_payment",
    bookingStatus: "confirmed",
    hasStripeCustomerId: true,
    slotEndMs: Date.parse("2026-08-10T15:00:00.000Z"),
    nowMs: Date.parse("2026-08-04T08:00:00.000Z"),
  });
  assert.deepEqual(result, { tab: "abandoned", effectiveStatus: "abandoned" });
});

test("3DS / failed T-48 charge sits in Abandoned", () => {
  const now = Date.parse("2026-08-04T08:00:00.000Z");
  const futureEnd = Date.parse("2026-08-10T15:00:00.000Z");

  for (const paymentStatus of ["requires_action", "payment_failed"]) {
    const result = resolveActiveLessonPlacement({
      slotStatus: "booked",
      paymentStatus,
      bookingStatus: "confirmed",
      hasStripeCustomerId: true,
      slotEndMs: futureEnd,
      nowMs: now,
    });
    assert.equal(result.tab, "abandoned");
    assert.equal(result.effectiveStatus, "awaiting_payment");
  }
});

test("retry CTA never shows on cancelled, refunded or finished lessons", () => {
  for (const slotStatus of ["cancelled", "refund", "completed", "missed"]) {
    assert.equal(
      shouldShowPaymentRetryCta({
        slotStatus,
        paymentStatus: "payment_failed",
        bookingStatus: "cancelled",
        hasStripeCustomerId: true,
      }),
      false,
    );
  }
  assert.equal(
    shouldShowPaymentRetryCta({
      slotStatus: "cancelled",
      paymentStatus: "pending_payment",
      bookingStatus: "cancelled",
      hasStripeCustomerId: false,
    }),
    false,
  );
});

test("retry CTA is only for incomplete checkout or failed/3DS T-48", () => {
  assert.equal(
    shouldShowPaymentRetryCta({
      slotStatus: "booked",
      paymentStatus: "pending_payment",
      bookingStatus: "confirmed",
      hasStripeCustomerId: true,
    }),
    false,
  );
  assert.equal(
    shouldShowPaymentRetryCta({
      paymentStatus: "requires_action",
      bookingStatus: "confirmed",
      hasStripeCustomerId: true,
    }),
    true,
  );
  assert.equal(
    shouldShowPaymentRetryCta({
      paymentStatus: "pending_payment",
      bookingStatus: "pending",
      hasStripeCustomerId: false,
    }),
    true,
  );
});

test("incomplete checkout is Abandoned", () => {
  const result = resolveActiveLessonPlacement({
    slotStatus: "booked",
    paymentStatus: "pending_payment",
    bookingStatus: "pending",
    hasStripeCustomerId: false,
    slotEndMs: Date.parse("2026-08-10T15:00:00.000Z"),
    nowMs: Date.parse("2026-08-04T08:00:00.000Z"),
  });
  assert.deepEqual(result, { tab: "abandoned", effectiveStatus: "abandoned" });
});

test("incomplete checkout stays Abandoned even after lesson start and with empty slot status", () => {
  const pastEnd = Date.parse("2026-08-05T10:00:00.000Z");
  const now = Date.parse("2026-08-05T12:00:00.000Z");
  assert.deepEqual(
    resolveActiveLessonPlacement({
      slotStatus: "booked",
      paymentStatus: "pending_payment",
      bookingStatus: "pending",
      hasStripeCustomerId: false,
      slotEndMs: pastEnd,
      nowMs: now,
    }),
    { tab: "abandoned", effectiveStatus: "abandoned" },
  );
  assert.deepEqual(
    resolveActiveLessonPlacement({
      slotStatus: "available",
      paymentStatus: "pending_payment",
      bookingStatus: "pending",
      hasStripeCustomerId: false,
      slotEndMs: pastEnd,
      nowMs: now,
    }),
    { tab: "abandoned", effectiveStatus: "abandoned" },
  );
});

test("paid future lesson is Upcoming", () => {
  const result = resolveActiveLessonPlacement({
    slotStatus: "booked",
    paymentStatus: "paid",
    bookingStatus: "confirmed",
    hasStripeCustomerId: true,
    slotEndMs: Date.parse("2026-08-10T15:00:00.000Z"),
    nowMs: Date.parse("2026-08-04T08:00:00.000Z"),
  });
  assert.deepEqual(result, { tab: "upcoming", effectiveStatus: "upcoming" });
});

test("formats deadline as HH:MM, DD/MM/YYYY in the given timezone", () => {
  const date = new Date("2026-08-04T08:00:00.000Z");
  assert.equal(
    formatDeadlineHhMmDdMmYyyy(date, "Europe/Zurich"),
    "10:00, 04/08/2026",
  );
});

test("uses stored reminder deadline when present", () => {
  const deadline = resolvePaymentDeadline({
    paymentReminderDeadlineAt: "2026-08-04T08:00:00.000Z",
    paymentReminderStartedAt: "2026-08-03T08:00:00.000Z",
    slotDate: "2026-08-10",
    slotStartTime: "15:00",
    businessTimezone: "Europe/Zurich",
  });
  assert.ok(deadline);
  assert.equal(deadline.toISOString(), "2026-08-04T08:00:00.000Z");
});

test("falls back to reminder start + 24h and does not invent lesson-minus-24h", () => {
  const fromStart = resolvePaymentDeadline({
    paymentReminderStartedAt: "2026-08-03T08:00:00.000Z",
    slotDate: "2026-08-10",
    slotStartTime: "15:00",
    businessTimezone: "Europe/Zurich",
  });
  assert.equal(fromStart?.toISOString(), "2026-08-04T08:00:00.000Z");

  const fromSlotOnly = resolvePaymentDeadline({
    slotDate: "2026-08-10",
    slotStartTime: "15:00",
    businessTimezone: "Europe/Zurich",
  });
  assert.equal(fromSlotOnly, null);
});

test("same-day / instant checkout shows Pay now and hides past T-48 dates", () => {
  const chip = resolvePaymentChip({
    paymentStatus: "pending_payment",
    bookingStatus: "pending",
    hasStripeCustomerId: false,
    slotStartMs: Date.parse("2026-08-05T17:30:00.000Z"),
    bookingCreatedAt: "2026-08-05T10:00:00.000Z",
    nowMs: Date.parse("2026-08-05T12:00:00.000Z"),
  });
  assert.equal(chip.label, "Pay now");
  assert.equal(chip.showT48Schedule, false);
});

test("deferred saved-card booking shows future T-48 schedule", () => {
  const chip = resolvePaymentChip({
    paymentStatus: "pending_payment",
    bookingStatus: "confirmed",
    hasStripeCustomerId: true,
    slotStartMs: Date.parse("2026-08-10T17:30:00.000Z"),
    bookingCreatedAt: "2026-08-05T10:00:00.000Z",
    nowMs: Date.parse("2026-08-05T12:00:00.000Z"),
  });
  assert.equal(chip.label, "Pending (T-48)");
  assert.equal(chip.showT48Schedule, true);
});

test("deferred booking past T-48 still shows Due Now with schedule", () => {
  const chip = resolvePaymentChip({
    paymentStatus: "pending_payment",
    bookingStatus: "confirmed",
    hasStripeCustomerId: true,
    slotStartMs: Date.parse("2026-08-10T17:30:00.000Z"),
    bookingCreatedAt: "2026-08-05T10:00:00.000Z",
    nowMs: Date.parse("2026-08-09T12:00:00.000Z"),
  });
  assert.equal(chip.label, "Due Now (T-48)");
  assert.equal(chip.showT48Schedule, true);
});

test("incomplete checkout for a future lesson does not show T-48 dates", () => {
  const chip = resolvePaymentChip({
    paymentStatus: "pending_payment",
    bookingStatus: "pending",
    hasStripeCustomerId: false,
    slotStartMs: Date.parse("2026-08-10T17:30:00.000Z"),
    bookingCreatedAt: "2026-08-05T10:00:00.000Z",
    nowMs: Date.parse("2026-08-05T12:00:00.000Z"),
  });
  assert.equal(chip.label, "Pay now");
  assert.equal(chip.showT48Schedule, false);
});

test("parses numeric timestamp strings", () => {
  const ms = Date.parse("2026-08-05T10:00:00.000Z");
  assert.equal(
    parseFlexibleTimestamp(String(ms))?.toISOString(),
    "2026-08-05T10:00:00.000Z",
  );
});

test("unpaid cancel deadline falls back to createdAt + 24h", () => {
  const deadline = resolveUnpaidCancelDeadline({
    bookingCreatedAt: "2026-08-05T10:00:00.000Z",
  });
  assert.equal(deadline?.toISOString(), "2026-08-06T10:00:00.000Z");
});

test("retry CTA is hidden for healthy T-48 pending payment", () => {
  assert.equal(
    shouldShowPaymentRetryCta({
      paymentStatus: "payment_failed",
      bookingStatus: "confirmed",
      hasStripeCustomerId: true,
    }),
    true,
  );
});

test("3DS complete page is only for saved-card failures", () => {
  assert.equal(
    shouldUseSavedCardCompletion({
      paymentStatus: "requires_action",
      hasStripeCustomerId: false,
      hasPaymentMethodId: false,
    }),
    false,
  );
  assert.equal(
    shouldUseSavedCardCompletion({
      paymentStatus: "payment_failed",
      hasStripeCustomerId: true,
      hasPaymentMethodId: true,
    }),
    true,
  );
  assert.equal(
    shouldUseSavedCardCompletion({
      paymentStatus: "pending_payment",
      hasStripeCustomerId: false,
      hasPaymentMethodId: false,
    }),
    false,
  );
});
