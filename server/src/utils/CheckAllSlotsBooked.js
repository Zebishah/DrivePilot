const dayjs = require("dayjs"); // Add this import at the top

function checkAllSlotsBooked(availability) {
  // If using hourlySlots array (recommended approach)
  if (availability.hourlySlots && availability.hourlySlots.length > 0) {
    return availability.hourlySlots.every((slot) => slot.booked);
  }

  // Fallback to checking slots array if hourlySlots doesn't exist
  if (availability.slots && availability.slots.length > 0) {
    try {
      // Get the total duration of the availability block
      const start = dayjs(
        `2000-01-01 ${availability.startTime}`,
        "YYYY-MM-DD HH:mm"
      );
      const end = dayjs(
        `2000-01-01 ${availability.endTime}`,
        "YYYY-MM-DD HH:mm"
      );

      if (!start.isValid() || !end.isValid()) {
        console.error("Invalid time format in availability:", availability);
        return false;
      }

      const totalMinutes = end.diff(start, "minute");

      // Calculate total booked minutes
      let bookedMinutes = 0;
      for (const slot of availability.slots) {
        if (slot.booked) {
          const slotStart = dayjs(
            `2000-01-01 ${slot.startTime}`,
            "YYYY-MM-DD HH:mm"
          );
          const slotEnd = dayjs(
            `2000-01-01 ${slot.endTime}`,
            "YYYY-MM-DD HH:mm"
          );

          if (!slotStart.isValid() || !slotEnd.isValid()) {
            console.error("Invalid time format in slot:", slot);
            continue;
          }

          bookedMinutes += slotEnd.diff(slotStart, "minute");
        }
      }

      // Consider it fully booked if at least 95% is booked
      return bookedMinutes >= totalMinutes * 0.95;
    } catch (error) {
      console.error("Error checking slots:", error);
      return false;
    }
  }

  return false;
}

module.exports = checkAllSlotsBooked;
