const dayjs = require("dayjs"); // Add this import at the top

function checkAllSlotsBooked(availability) {
  console.log(`Checking availability ${availability._id}:`, {
    availabilityTime: `${availability.startTime}-${availability.endTime}`,
    totalSlots: availability.slots.length,
    bookedSlots: availability.slots.filter((s) => s.booked).length,
  });

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

  console.log(
    `Total minutes: ${totalMinutes}, Booked minutes: ${bookedMinutes}, Percentage: ${((bookedMinutes / totalMinutes) * 100).toFixed(1)}%`
  );

  // Consider it fully booked if 100% is booked
  return bookedMinutes >= totalMinutes;
}

module.exports = checkAllSlotsBooked;
