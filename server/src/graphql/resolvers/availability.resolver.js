const { default: mongoose } = require("mongoose");
const TeacherAvailability = require("../../models/teacherAvailability.model");
const { startOfMonth, endOfMonth } = require("date-fns");

const resolvers = {
  Query: {
    teacherAvailability: async (_, { month }, { user }) => {
      if (!user) throw new Error("Not authenticated");

      try {
        const monthDate = new Date(month);
        const startDate = startOfMonth(monthDate);
        const endDate = endOfMonth(monthDate);

        // ✅ Find all availability docs for this teacher in the given month
        const availabilities = await TeacherAvailability.find({
          teacherId: user.id,
          date: { $gte: startDate, $lte: endDate },
        }).sort({ date: 1 });

        // ✅ Format response: only include availableSlots whose status is available or cancelled (exclude booked, completed, refund)
        return availabilities.map((availability) => ({
          id: availability._id.toString(),
          date: availability.date.toISOString(),
          status: availability.status,
          availableSlots: availability.availableSlots
            .filter(
              (slot) =>
                slot.status === "available" || slot.status === "cancelled"
            )
            .map((slot) => ({
              id: slot.id,
              date: slot.date,
              startTime: slot.startTime,
              endTime: slot.endTime,
              status: slot.status,
              booked: slot.booked,
            })),
        }));
      } catch (error) {
        console.error("Error fetching teacher availability:", error);
        throw new Error("Error fetching teacher availability");
      }
    },
  },

  Mutation: {
    addAvailabilitySlot: async (_, { input }, { user }) => {
      if (!user) throw new Error("Not authenticated");

      const newDate = new Date(input.date);
      const newStart = input.startTime;
      const newEnd = input.endTime;
      const newStatus = input.status || "available";

      try {
        // 1️⃣ Check if a TeacherAvailability document already exists for this teacher on the same date
        let availability = await TeacherAvailability.findOne({
          teacherId: user.id,
          date: newDate,
        });

        // 2️⃣ Check for overlapping slots
        if (availability) {
          const overlap = availability.availableSlots.some(
            (slot) => newStart < slot.endTime && newEnd > slot.startTime // overlap condition
          );
          if (overlap) {
            throw new Error(
              "This time slot overlaps with an existing availability for the same teacher."
            );
          }
        }

        // 3️⃣ Validate start/end time
        const startHour = parseInt(newStart.split(":")[0], 10);
        const endHour = parseInt(newEnd.split(":")[0], 10);
        if (startHour >= endHour) {
          throw new Error("End time must be greater than start time");
        }

        // 4️⃣ Generate new hourly slots
        const newSlots = [];
        for (let hour = startHour; hour < endHour; hour++) {
          const start = `${hour.toString().padStart(2, "0")}:00`;
          const end = `${(hour + 1).toString().padStart(2, "0")}:00`;

          newSlots.push({
            id: new mongoose.Types.ObjectId().toString(),
            date: input.date,
            startTime: start,
            endTime: end,
            booked: false,
            status: "available",
          });
        }

        // 5️⃣ If availability exists, append new slots; else create a new document
        if (availability) {
          availability.availableSlots.push(...newSlots);
          await availability.save();
        } else {
          availability = await TeacherAvailability.create({
            teacherId: user.id,
            date: newDate,
            startTime: newStart,
            endTime: newEnd,
            status: newStatus,
            availableSlots: newSlots,
            bookedSlots: [],
          });
        }

        return {
          id: availability._id,
          date: availability.date.toISOString(),
          startTime: availability.startTime,
          endTime: availability.endTime,
          status: availability.status,
          availableSlots: availability.availableSlots,
          bookedSlots: availability.bookedSlots,
        };
      } catch (error) {
        console.error("Error adding availability slot:", error);
        throw new Error(error.message || "Error adding availability slot");
      }
    },

    deleteAvailabilitySlot: async (_, { id }, { user }) => {
      if (!user) throw new Error("Not authenticated");

      try {
        // Find the document that contains this slot in availableSlots
        const result = await TeacherAvailability.updateOne(
          {
            teacherId: user.id,
            "availableSlots.id": id, // find the document containing this slot
          },
          {
            $pull: { availableSlots: { id } }, // remove that specific slot
          }
        );

        // result.modifiedCount > 0 means the slot was deleted
        return result.modifiedCount > 0;
      } catch (error) {
        console.error("Error deleting slot:", error);
        throw new Error("Error deleting availability slot");
      }
    },
  },
};

module.exports = resolvers;
