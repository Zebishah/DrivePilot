function isRealStripePaymentMethodId(paymentMethodId) {
  const id = String(paymentMethodId || "").trim();
  return /^pm_[A-Za-z0-9]+$/.test(id);
}

function hasSavedStripeCustomer(booking) {
  return Boolean(String(booking?.stripeCustomerId || "").trim());
}

function isIncompleteCheckoutBooking(booking) {
  if (!booking) return false;
  if (hasSavedStripeCustomer(booking)) return false;
  const slots = booking.slots || [];
  if (slots.some((slot) => String(slot?.paymentStatus || "").toLowerCase() === "paid")) {
    return false;
  }
  return true;
}

function shouldSkipT48Charge({ booking, slot } = {}) {
  if (!booking || !slot) return true;
  if (String(slot.status || "").toLowerCase() === "cancelled" || slot.booked === false) {
    return true;
  }
  if (String(slot.paymentStatus || "") !== "pending_payment") return true;
  if (!isRealStripePaymentMethodId(booking.paymentMethod?.paymentMethodId)) return true;
  if (isIncompleteCheckoutBooking(booking)) return true;
  return false;
}

function shouldAutoCancelUnpaidSlot({ booking, slot, now = new Date() } = {}) {
  if (!booking || !slot) return false;
  if (String(slot.status || "").toLowerCase() === "cancelled" || slot.booked === false) {
    return false;
  }
  if (!["requires_action", "payment_failed"].includes(String(slot.paymentStatus || ""))) {
    return false;
  }
  if (isIncompleteCheckoutBooking(booking)) return false;
  if (!isRealStripePaymentMethodId(booking.paymentMethod?.paymentMethodId)) return false;

  const startedAt =
    slot.paymentReminderStartedAt ||
    slot.paymentReminder1SentAt ||
    slot.chargedAt ||
    null;
  if (!startedAt) return false;

  const started = new Date(startedAt);
  if (Number.isNaN(started.getTime())) return false;

  const deadlineAt = slot.paymentReminderDeadlineAt
    ? new Date(slot.paymentReminderDeadlineAt)
    : new Date(started.getTime() + 24 * 60 * 60 * 1000);
  if (Number.isNaN(deadlineAt.getTime())) return false;

  return now.getTime() >= deadlineAt.getTime();
}

/**
 * Unpaid lesson whose end time has already passed cannot be paid anymore.
 * Cancel it (and free the slot) without waiting for the full 24h window.
 * Never touches paid / refunded / already-cancelled slots.
 */
function shouldCancelUnpaidPastLesson({
  booking,
  slot,
  slotEndMs,
  now = new Date(),
} = {}) {
  if (!booking || !slot) return false;
  if (String(slot.status || "").toLowerCase() === "cancelled" || slot.booked === false) {
    return false;
  }
  const pay = String(slot.paymentStatus || "").toLowerCase();
  if (pay === "paid" || pay === "refunded") return false;
  if (!Number.isFinite(Number(slotEndMs))) return false;
  return Number(now.getTime()) >= Number(slotEndMs);
}

function canReviveAutoCancelledCheckout(booking) {
  if (!booking) return false;
  const status = String(booking.status || "").toLowerCase();
  if (status === "pending") return true;
  if (status !== "cancelled" && status !== "semi_cancelled") return false;
  const slots = booking.slots || [];
  if (slots.some((slot) => String(slot?.paymentStatus || "").toLowerCase() === "paid")) {
    return false;
  }
  return slots.every((slot) => {
    const cancelledBy = String(slot?.cancelledBy || "").toLowerCase();
    return !cancelledBy || cancelledBy === "admin";
  });
}

module.exports = {
  isRealStripePaymentMethodId,
  hasSavedStripeCustomer,
  isIncompleteCheckoutBooking,
  shouldSkipT48Charge,
  shouldAutoCancelUnpaidSlot,
  shouldCancelUnpaidPastLesson,
  canReviveAutoCancelledCheckout,
};
