const SLOT_TRANSITIONS = {
  available: new Set(["available", "booked", "cancelled"]),
  booked: new Set(["booked", "completed", "missed", "cancelled", "refund"]),
  confirmed: new Set(["confirmed", "completed", "missed", "cancelled", "refund"]),
  completed: new Set(["completed"]),
  missed: new Set(["missed"]),
  cancelled: new Set(["cancelled"]),
  refund: new Set(["refund"]),
};

const BOOKING_TRANSITIONS = {
  pending: new Set(["pending", "confirmed", "cancelled"]),
  confirmed: new Set(["confirmed", "completed", "semi_cancelled", "cancelled", "refund"]),
  semi_cancelled: new Set(["semi_cancelled", "completed", "cancelled", "refund"]),
  completed: new Set(["completed"]),
  cancelled: new Set(["cancelled"]),
  refund: new Set(["refund"]),
};

function assertTransition(table, from, to, label) {
  const current = String(from || "").toLowerCase();
  const next = String(to || "").toLowerCase();
  if (!table[current]?.has(next)) {
    throw new Error(`Invalid ${label} transition: ${current || "unknown"} → ${next}`);
  }
  return true;
}

function assertSlotTransition(from, to) {
  return assertTransition(SLOT_TRANSITIONS, from, to, "slot");
}

function assertBookingTransition(from, to) {
  return assertTransition(BOOKING_TRANSITIONS, from, to, "booking");
}

function deriveBookingStatus(slots) {
  const statuses = (slots || []).map((slot) => String(slot.status || "").toLowerCase());
  if (!statuses.length) return "pending";
  const count = (status) => statuses.filter((value) => value === status).length;
  if (count("cancelled") === statuses.length) return "cancelled";
  if (count("completed") === statuses.length) return "completed";
  if (count("refund") === statuses.length) return "refund";
  if (count("cancelled") > 0) return "semi_cancelled";
  return "confirmed";
}

module.exports = {
  BOOKING_TRANSITIONS,
  SLOT_TRANSITIONS,
  assertBookingTransition,
  assertSlotTransition,
  deriveBookingStatus,
};
