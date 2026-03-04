const moment = require("moment-timezone");

/**
 * Slot times (date + start/end) are stored in the business timezone (e.g. Europe/Zurich).
 * Parse slot end to UTC milliseconds for comparison with Date.now().
 * Set SLOT_TIMEZONE in .env (e.g. Europe/Zurich) so "3–4 PM" is interpreted correctly for all clients worldwide.
 *
 * @param {string} slotDate - "YYYY-MM-DD"
 * @param {string} endTimeStr - "HH:mm" or "HH:mm:ss"
 * @param {string} [timezone] - Optional override; otherwise uses process.env.SLOT_TIMEZONE or "Europe/Zurich"
 * @returns {number} UTC timestamp in ms, or NaN if invalid
 */
function getSlotEndTimestampUtc(slotDate, endTimeStr, timezone) {
  const tz = timezone || process.env.SLOT_TIMEZONE || "Europe/Zurich";
  const m = moment.tz(`${slotDate} ${endTimeStr}`, "YYYY-MM-DD HH:mm:ss", tz);
  return m.isValid() ? m.valueOf() : NaN;
}

module.exports = { getSlotEndTimestampUtc };
