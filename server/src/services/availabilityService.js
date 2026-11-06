const TeacherAvailability = require("../models/teacherAvailability.model");

function slotMatcher(slot) {
  return {
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    booked: false,
  };
}

/**
 * Atomically marks an advertised availability slot as booked. Embedded slots
 * cannot have a standalone unique index, so the false -> true predicate is
 * the persistence-level compare-and-set that closes the double-booking race.
 * Missing availability documents remain compatible with legacy bookings.
 */
async function claimAvailabilitySlot({ teacherId, slot, session, model = TeacherAvailability }) {
  const dayQuery = {
    teacherId,
    date: new Date(slot.date),
  };
  let dayExistsQuery = typeof model.exists === "function"
    ? model.exists(dayQuery)
    : model.findOne(dayQuery);
  if (session) dayExistsQuery = dayExistsQuery.session(session);
  const dayExists = await dayExistsQuery;

  if (!dayExists) return { claimed: false, skipped: true };

  const claimed = await model.findOneAndUpdate(
    {
      teacherId,
      date: new Date(slot.date),
      availableSlots: { $elemMatch: slotMatcher(slot) },
    },
    {
      $set: {
        "availableSlots.$.booked": true,
        "availableSlots.$.status": "booked",
      },
    },
    { new: true, session },
  );

  if (!claimed) {
    const error = new Error("The selected slot is no longer available.");
    error.code = "SLOT_UNAVAILABLE";
    throw error;
  }
  return { claimed: true, availabilityId: claimed._id };
}

async function claimAvailabilitySlots({ teacherId, slots, session, model = TeacherAvailability }) {
  const claims = [];
  try {
    for (const slot of slots) {
      const claim = await claimAvailabilitySlot({ teacherId, slot, session, model });
      if (claim.claimed) claims.push({ teacherId, slot, availabilityId: claim.availabilityId });
    }
    return claims;
  } catch (error) {
    await releaseAvailabilitySlots({ claims, session, model });
    throw error;
  }
}

async function releaseAvailabilitySlots({ claims, session, model = TeacherAvailability }) {
  for (const { teacherId, slot } of claims || []) {
    await model.updateOne(
      {
        teacherId,
        date: new Date(slot.date),
        availableSlots: {
          $elemMatch: {
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            booked: true,
          },
        },
      },
      {
        $set: {
          "availableSlots.$.booked": false,
          "availableSlots.$.status": "available",
        },
      },
      { session },
    );
  }
}

async function recordBookedAvailabilitySlots({
  teacherId,
  bookingId,
  slots,
  model = TeacherAvailability,
}) {
  if (typeof model.updateOne !== "function") return;
  for (const slot of slots || []) {
    const slotId = String(slot._id || slot.id);
    await model.updateOne(
      {
        teacherId,
        date: new Date(slot.date),
        availableSlots: {
          $elemMatch: {
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            booked: true,
          },
        },
        slots: { $not: { $elemMatch: { id: slotId } } },
      },
      {
        $push: {
          slots: {
            id: slotId,
            bookingId: String(bookingId),
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            booked: true,
            status: "booked",
          },
        },
      },
    );
  }

  // Recompute only the scalar day status. Array writes remain atomic and do
  // not save a stale Mongoose document over another request's slot claim.
  await model.updateMany(
    { teacherId, date: { $in: [...new Set((slots || []).map((slot) => new Date(slot.date)))] }, availableSlots: { $not: { $elemMatch: { booked: false } } } },
    { $set: { status: "booked" } },
  );
  await model.updateMany(
    { teacherId, date: { $in: [...new Set((slots || []).map((slot) => new Date(slot.date)))] }, availableSlots: { $elemMatch: { booked: false } } },
    { $set: { status: "available" } },
  );
}

module.exports = {
  claimAvailabilitySlot,
  claimAvailabilitySlots,
  releaseAvailabilitySlots,
  recordBookedAvailabilitySlots,
};
