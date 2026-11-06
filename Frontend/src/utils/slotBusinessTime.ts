import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

function readSlotTimezone() {
  try {
    const env = import.meta.env as { VITE_SLOT_TIMEZONE?: string } | undefined;
    return env?.VITE_SLOT_TIMEZONE || "Europe/Zurich";
  } catch {
    return "Europe/Zurich";
  }
}

export const SLOT_BUSINESS_TIMEZONE = readSlotTimezone();

function normalizeSlotTime(timeStr?: string) {
  if (!timeStr) return "00:00:00";
  return String(timeStr).split(":").length === 2 ? `${timeStr}:00` : timeStr;
}

/** Slot wall-clock is Switzerland time, not the viewer's local clock. */
export function isBusinessSlotStartPast(
  date: string,
  startTime: string,
  nowMs: number = Date.now(),
): boolean {
  const start = dayjs.tz(
    `${date} ${normalizeSlotTime(startTime)}`,
    "YYYY-MM-DD HH:mm:ss",
    SLOT_BUSINESS_TIMEZONE,
  );
  if (!start.isValid()) return false;
  return start.valueOf() <= nowMs;
}
