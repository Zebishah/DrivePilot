import { Slot } from "../../types/Bookings";

export function getSlotDurationInHours(slot: Slot) {
  const [startHour, startMinute] = slot.startTime.split(":").map(Number);
  const [endHour, endMinute] = slot.endTime.split(":").map(Number);

  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;

  return (end - start) / 60; // returns duration in hours
}
export function getSlotDurations(slots: Slot[]) {
  const durations = slots.map((slot) => {
    const [startH, startM] = slot.startTime.split(":").map(Number);
    const [endH, endM] = slot.endTime.split(":").map(Number);

    const start = startH * 60 + startM;
    const end = endH * 60 + endM;
    const durationMinutes = end - start;
    const durationHours = durationMinutes / 60;

    return parseFloat(durationHours.toFixed(2));
  });

  const totalDuration = parseFloat(
    durations.reduce((acc, val) => acc + val, 0).toFixed(2)
  );

  return { durations, totalDuration };
}
