const moment = require("moment-timezone");

/**
 * Slot times (date + start/end) are stored in the business timezone (e.g. Europe/Zurich).
 * Parse slot start/end to UTC milliseconds for comparison with Date.now().
 * Set SLOT_TIMEZONE in .env (e.g. Europe/Zurich) so "3–4 PM" is interpreted correctly for all clients worldwide.
 *
 * @param {string} slotDate - "YYYY-MM-DD"
 * @param {string} timeStr - "HH:mm" or "HH:mm:ss"
 * @param {string} [timezone] - Optional override; otherwise uses process.env.SLOT_TIMEZONE or "Europe/Zurich"
 * @returns {number} UTC timestamp in ms, or NaN if invalid
 */
function parseSlotTimestampUtc(slotDate, timeStr, timezone) {
  const tz = timezone || process.env.SLOT_TIMEZONE || "Europe/Zurich";
  const normalizedTime =
    typeof timeStr === "string" && timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  const m = moment.tz(
    `${slotDate} ${normalizedTime}`,
    "YYYY-MM-DD HH:mm:ss",
    tz,
  );
  return m.isValid() ? m.valueOf() : NaN;
}

function getSlotStartTimestampUtc(slotDate, startTimeStr, timezone) {
  return parseSlotTimestampUtc(slotDate, startTimeStr, timezone);
}

function getSlotEndTimestampUtc(slotDate, endTimeStr, timezone) {
  return parseSlotTimestampUtc(slotDate, endTimeStr, timezone);
}

module.exports = { getSlotStartTimestampUtc, getSlotEndTimestampUtc };
