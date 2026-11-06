const dayjs = require("dayjs"); // Add this import at the top

function checkAllSlotsBooked(availability) {
  // If there are no slots at all, consider it not booked
  if (!availability.slots || availability.slots.length === 0) {
    return false;
  }

  // Convert availability block to minutes
  const availabilityStart = dayjs(`2000-01-01 ${availability.startTime}`);
  const availabilityEnd = dayjs(`2000-01-01 ${availability.endTime}`);
  const totalMinutes = availabilityEnd.diff(availabilityStart, "minute");

  // Calculate total booked minutes (only count booked slots)
  let bookedMinutes = 0;
  availability.slots.forEach((slot) => {
    if (slot.booked) {
      const slotStart = dayjs(`2000-01-01 ${slot.startTime}`);
      const slotEnd = dayjs(`2000-01-01 ${slot.endTime}`);
      const slotDuration = slotEnd.diff(slotStart, "minute");
      bookedMinutes += slotDuration;
    }
  });

  // Consider it fully booked if 100% is booked
  return bookedMinutes >= totalMinutes;
}

module.exports = checkAllSlotsBooked;
