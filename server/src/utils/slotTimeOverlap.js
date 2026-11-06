function timeToMinutes(timeStr) {
  const [hStr, mStr] = String(timeStr || "00:00").split(":");
  const hours = Number(hStr);
  const minutes = Number(mStr);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return NaN;
  return hours * 60 + minutes;
}

function slotsOverlap(a, b) {
  if (!a || !b || a.date !== b.date) return false;
  const aStart = timeToMinutes(a.startTime);
  const aEnd = timeToMinutes(a.endTime);
  const bStart = timeToMinutes(b.startTime);
  const bEnd = timeToMinutes(b.endTime);
  if (![aStart, aEnd, bStart, bEnd].every(Number.isFinite)) return false;
  return aStart < bEnd && bStart < aEnd;
}

function isActiveUnpaidOrPaidSlot(slot) {
  const status = String(slot?.status || "").toLowerCase();
  if (status === "cancelled" || status === "refund") return false;
  const pay = String(slot?.paymentStatus || "").toLowerCase();
  if (pay === "refunded") return false;
  if (slot?.booked) return true;
  return ["pending_payment", "requires_action", "payment_failed", "paid"].includes(
    pay,
  );
}

module.exports = { timeToMinutes, slotsOverlap, isActiveUnpaidOrPaidSlot };
