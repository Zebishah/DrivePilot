/**
 * Minutes after booking creation before an incomplete (abandoned) checkout is
 * auto-cancelled and slots are released. Used by:
 * - pendingBookingCleanupJob
 * - abandonedCheckoutReminderJob (eligibility + email copy)
 *
 * Single env: PENDING_CLEANUP_STALE_MINUTES (default: 24 hours).
 */
function getPendingCleanupStaleMinutes() {
  const parsed = parseInt(
    process.env.PENDING_CLEANUP_STALE_MINUTES || String(24 * 60),
    10,
  );
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 24 * 60;
  }
  return parsed;
}

/** Short phrase for student-facing email (e.g. "24 hours", "90 minutes"). */
function describeHoldDurationMinutes(minutes) {
  if (minutes % 1440 === 0 && minutes >= 1440) {
    const days = minutes / 1440;
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  if (minutes % 60 === 0 && minutes >= 60) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return `${minutes} minutes`;
}

module.exports = {
  getPendingCleanupStaleMinutes,
  describeHoldDurationMinutes,
};
