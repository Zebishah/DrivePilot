const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export type LessonTab =
  | "upcoming"
  | "abandoned"
  | "cancelled"
  | "missed"
  | "history";

export type LessonEffectiveStatus =
  | "upcoming"
  | "abandoned"
  | "awaiting_payment"
  | "cancelled"
  | "refunded"
  | "missed"
  | "completed"
  | "no_status";

export function isPaymentConfirmed(paymentStatus?: string | null): boolean {
  return String(paymentStatus || "").toLowerCase() === "paid";
}

export function isIncompleteCheckout({
  bookingStatus,
  hasStripeCustomerId,
  slotsPaid,
}: {
  bookingStatus?: string | null;
  hasStripeCustomerId?: boolean;
  slotsPaid?: boolean;
}): boolean {
  return (
    String(bookingStatus || "").toLowerCase() === "pending" &&
    !hasStripeCustomerId &&
    !slotsPaid
  );
}

export function isUnconfirmedPaymentStatus(
  paymentStatus?: string | null,
): boolean {
  const pay = String(paymentStatus || "").toLowerCase();
  if (pay === "paid" || pay === "refunded") return false;
  return true;
}

/** True only for T-48 3DS/retry when a card is already saved on the booking. */
export function shouldUseSavedCardCompletion({
  paymentStatus,
  hasStripeCustomerId,
  hasPaymentMethodId,
}: {
  paymentStatus?: string | null;
  hasStripeCustomerId?: boolean;
  hasPaymentMethodId?: boolean;
}): boolean {
  const pay = String(paymentStatus || "").toLowerCase();
  if (pay !== "requires_action" && pay !== "payment_failed") return false;
  return Boolean(hasStripeCustomerId && hasPaymentMethodId);
}

/**
 * Complete/Retry (and the 24h cancel deadline) only while the lesson is still
 * recoverable: checkout never finished, T-48 charge failed, or 3DS incomplete.
 * A deferred booking waiting for its scheduled T-48 charge shows neither.
 */
export function shouldShowPaymentRetryCta({
  slotStatus,
  paymentStatus,
  bookingStatus,
  hasStripeCustomerId,
  anySlotPaid = false,
}: {
  slotStatus?: string | null;
  paymentStatus?: string | null;
  bookingStatus?: string | null;
  hasStripeCustomerId?: boolean;
  anySlotPaid?: boolean;
}): boolean {
  const st = String(slotStatus || "").toLowerCase();
  if (["cancelled", "refund", "completed", "missed"].includes(st)) return false;

  const pay = String(paymentStatus || "").toLowerCase();
  if (pay === "paid" || pay === "refunded") return false;
  if (pay === "requires_action" || pay === "payment_failed") return true;
  return isIncompleteCheckout({
    bookingStatus,
    hasStripeCustomerId,
    slotsPaid: anySlotPaid,
  });
}

export function resolveActiveLessonPlacement({
  slotStatus,
  paymentStatus,
  slotEndMs,
  nowMs,
}: {
  slotStatus?: string | null;
  paymentStatus?: string | null;
  bookingStatus?: string | null;
  hasStripeCustomerId?: boolean;
  anySlotPaid?: boolean;
  slotEndMs?: number;
  nowMs?: number;
}): { tab: LessonTab; effectiveStatus: LessonEffectiveStatus } | null {
  const st = String(slotStatus || "").toLowerCase();
  const pay = String(paymentStatus || "").toLowerCase();

  if (st === "cancelled") {
    return { tab: "cancelled", effectiveStatus: "cancelled" };
  }
  if (st === "refund") {
    return { tab: "cancelled", effectiveStatus: "refunded" };
  }
  if (st === "missed") {
    return { tab: "missed", effectiveStatus: "missed" };
  }
  if (st === "completed") {
    return { tab: "history", effectiveStatus: "completed" };
  }

  const unpaid = !isPaymentConfirmed(pay) && pay !== "refunded";
  const lessonPassed = Number.isFinite(slotEndMs)
    ? Number(slotEndMs) <= Number(nowMs)
    : false;

  if (unpaid) {
    // Lesson already over and never paid: Cancelled (not History, not stuck Abandoned).
    if (lessonPassed) {
      return { tab: "cancelled", effectiveStatus: "cancelled" };
    }
    if (pay === "requires_action" || pay === "payment_failed") {
      return { tab: "abandoned", effectiveStatus: "awaiting_payment" };
    }
    return { tab: "abandoned", effectiveStatus: "abandoned" };
  }

  if (st === "booked" || st === "confirmed") {
    if (lessonPassed) {
      return { tab: "history", effectiveStatus: "no_status" };
    }
    return { tab: "upcoming", effectiveStatus: "upcoming" };
  }

  return null;
}

export function formatDeadlineHhMmDdMmYyyy(date: Date, timeZone?: string): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
  return `${get("hour")}:${get("minute")}, ${get("day")}/${get("month")}/${get("year")}`;
}

export function parseFlexibleTimestamp(
  value?: string | Date | number | null,
): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value;
    const parsed = new Date(ms);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const str = String(value).trim();
  if (!str || str === "null" || str === "undefined") return null;
  if (/^\d+$/.test(str)) {
    const numeric = Number(str);
    const ms = numeric < 1e12 ? numeric * 1000 : numeric;
    const parsed = new Date(ms);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function resolvePaymentDeadline({
  paymentReminderDeadlineAt,
  paymentReminderStartedAt,
  chargedAt,
}: {
  paymentReminderDeadlineAt?: string | Date | null;
  paymentReminderStartedAt?: string | Date | null;
  chargedAt?: string | Date | null;
  slotDate?: string | null;
  slotStartTime?: string | null;
  businessTimezone?: string;
}): Date | null {
  const storedDeadline = parseFlexibleTimestamp(paymentReminderDeadlineAt);
  if (storedDeadline) return storedDeadline;

  const reminderBase =
    parseFlexibleTimestamp(paymentReminderStartedAt) ||
    parseFlexibleTimestamp(chargedAt);
  if (reminderBase) {
    return new Date(reminderBase.getTime() + TWENTY_FOUR_HOURS_MS);
  }

  // Do not guess "lesson time minus 24h". That is only correct when the T-48
  // charge ran exactly 48h before the lesson. Same-day / late tests would show
  // a deadline on the previous day (already expired).
  return null;
}

/** Incomplete checkout hold: booking createdAt + 24 hours. */
export function resolveIncompleteCheckoutDeadline(
  createdAt?: string | Date | null,
): Date | null {
  const created = parseFlexibleTimestamp(createdAt);
  if (!created) return null;
  return new Date(created.getTime() + TWENTY_FOUR_HOURS_MS);
}

/** Real cancel-by time for Abandoned / Action Required rows. */
export function resolveUnpaidCancelDeadline({
  paymentReminderDeadlineAt,
  paymentReminderStartedAt,
  chargedAt,
  bookingCreatedAt,
}: {
  paymentReminderDeadlineAt?: string | Date | null;
  paymentReminderStartedAt?: string | Date | null;
  chargedAt?: string | Date | null;
  bookingCreatedAt?: string | Date | null;
}): Date | null {
  return (
    resolvePaymentDeadline({
      paymentReminderDeadlineAt,
      paymentReminderStartedAt,
      chargedAt,
    }) || resolveIncompleteCheckoutDeadline(bookingCreatedAt)
  );
}

/**
 * Deferred T-48 only applies when the booking was created more than 48h before
 * the lesson. Same-day / instant checkout must not show a past T-48 date.
 */
export function isDeferredT48Payment({
  bookingCreatedAt,
  slotStartMs,
  nowMs = Date.now(),
}: {
  bookingCreatedAt?: string | Date | null;
  slotStartMs?: number | null;
  nowMs?: number;
}): boolean {
  if (!Number.isFinite(Number(slotStartMs))) return false;
  const t48Ms = Number(slotStartMs) - FORTY_EIGHT_HOURS_MS;
  if (bookingCreatedAt) {
    const createdMs = parseFlexibleTimestamp(bookingCreatedAt)?.getTime();
    if (Number.isFinite(Number(createdMs))) return t48Ms > Number(createdMs);
  }
  return Number(nowMs) < t48Ms;
}

export function resolvePaymentChip({
  slotStatus,
  paymentStatus,
  bookingStatus,
  hasStripeCustomerId,
  anySlotPaid = false,
  slotStartMs,
  bookingCreatedAt,
  nowMs = Date.now(),
}: {
  slotStatus?: string | null;
  paymentStatus?: string | null;
  bookingStatus?: string | null;
  hasStripeCustomerId?: boolean;
  anySlotPaid?: boolean;
  slotStartMs?: number | null;
  bookingCreatedAt?: string | Date | null;
  nowMs?: number;
}): {
  label: string;
  color: "success" | "warning" | "info" | "error" | "default";
  showT48Schedule: boolean;
} {
  const slotSt = String(slotStatus || "").toLowerCase();
  const pay = String(paymentStatus || "").toLowerCase();
  const isCancelledLike = slotSt === "cancelled" || slotSt === "refund";

  if (
    isCancelledLike &&
    (pay === "requires_action" ||
      pay === "payment_failed" ||
      pay === "pending_payment")
  ) {
    return { label: "Not Paid In Time", color: "error", showT48Schedule: false };
  }
  if (pay === "paid") {
    return { label: "Paid", color: "success", showT48Schedule: false };
  }
  if (pay === "requires_action" || pay === "payment_failed") {
    return { label: "Action Required", color: "warning", showT48Schedule: false };
  }
  if (pay === "refunded") {
    return { label: "Refunded", color: "default", showT48Schedule: false };
  }
  if (pay === "pending_payment") {
    const incomplete = isIncompleteCheckout({
      bookingStatus,
      hasStripeCustomerId,
      slotsPaid: anySlotPaid,
    });
    const deferred =
      !incomplete &&
      Boolean(hasStripeCustomerId) &&
      isDeferredT48Payment({
        bookingCreatedAt,
        slotStartMs,
        nowMs,
      });

    if (!deferred) {
      return { label: "Pay now", color: "warning", showT48Schedule: false };
    }

    const t48Ms = Number(slotStartMs) - FORTY_EIGHT_HOURS_MS;
    if (Number.isFinite(t48Ms) && Number(nowMs) >= t48Ms) {
      return { label: "Due Now (T-48)", color: "warning", showT48Schedule: true };
    }
    return { label: "Pending (T-48)", color: "info", showT48Schedule: true };
  }
  return { label: "—", color: "default", showT48Schedule: false };
}
