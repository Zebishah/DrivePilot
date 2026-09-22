const { default: mongoose } = require("mongoose");
const TeacherAvailability = require("../../models/teacherAvailability.model");
const { startOfMonth, endOfMonth } = require("date-fns");
const { isInstructorPaymentReady } = require("../utils/instructorPaymentReady");
const { cache } = require("../../services/cacheService");
const cacheKeys = require("../../services/cacheKeys");
const { invalidateAvailability } = require("../../services/cacheInvalidation");

const resolvers = {
  Query: {
    teacherAvailability: async (_, { month }, { user }) => {
      if (!user) throw new Error("Not authenticated");

      try {
        return await cache.getOrSet({
          category: "instructor_availability",
          key: cacheKeys.instructorAvailability(user.id, month),
          ttlSeconds: 15,
          loader: async () => {
        const monthDate = new Date(month);
        const startDate = startOfMonth(monthDate);
        const endDate = endOfMonth(monthDate);

        // ✅ Find all availability docs for this teacher in the given month
        const availabilities = await TeacherAvailability.find({
          teacherId: user.id,
          date: { $gte: startDate, $lte: endDate },
        }).sort({ date: 1 }).lean();

        // ✅ Format response: only include availableSlots whose status is available or cancelled (exclude booked, completed, refund)
        return availabilities.map((availability) => ({
          id: availability._id.toString(),
          date: availability.date.toISOString(),
          status: availability.status,
          availableSlots: availability.availableSlots
            .filter(
              (slot) =>
                slot.status === "available" || slot.status === "cancelled",
            )
            .map((slot) => ({
              id: slot.id,
              date: slot.date,
              startTime: slot.startTime,
              endTime: slot.endTime,
              status: slot.status,
              booked: slot.booked,
            })),
          slots: (availability.slots || []).map((slot) => ({
            id: slot.id,
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: slot.status,
            booked: slot.booked,
          })),
        }));
          },
        });
      } catch (error) {
        console.error("Error fetching teacher availability:", error);
        throw new Error("Error fetching teacher availability");
      }
    },
  },

  Mutation: {
    addAvailabilitySlot: async (_, { input }, { user }) => {
      if (!user) throw new Error("Not authenticated");

      // Do not allow instructors to add availability until payments are fully ready
      if (user.role !== "Instructor") {
        throw new Error("Only instructors can manage availability");
      }

      const InstructorModel = require("../../models/User").Instructor;
      const instructor = await InstructorModel.findById(user.id).lean();
      if (!instructor || !isInstructorPaymentReady(instructor)) {
        throw new Error(
          "You need to complete Stripe onboarding before you can publish availability slots.",
        );
      }

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
            (slot) => newStart < slot.endTime && newEnd > slot.startTime, // overlap condition
          );
          if (overlap) {
            throw new Error(
              "This time slot overlaps with an existing availability for the same teacher.",
            );
          }
        }

        // 3️⃣ Validate start/end time using minutes (support custom minutes like 10:15)
        const [startHour, startMinute] = newStart.split(":").map((v) => parseInt(v, 10));
        const [endHour, endMinute] = newEnd.split(":").map((v) => parseInt(v, 10));

        const startTotalMinutes = startHour * 60 + (startMinute || 0);
        const endTotalMinutes = endHour * 60 + (endMinute || 0);

        if (endTotalMinutes <= startTotalMinutes) {
          throw new Error("End time must be greater than start time");
        }

        if (endTotalMinutes - startTotalMinutes < 60) {
          throw new Error(
            "Oops! Availability slots need to be at least 1 hour long. Try selecting a longer time range."
          );
        }

        // 4️⃣ Generate new 1-hour slots, preserving the exact start minutes
        const newSlots = [];
        for (
          let currentStartMinutes = startTotalMinutes;
          currentStartMinutes + 60 <= endTotalMinutes;
          currentStartMinutes += 60
        ) {
          const currentEndMinutes = currentStartMinutes + 60;

          const startH = Math.floor(currentStartMinutes / 60)
            .toString()
            .padStart(2, "0");
          const startM = (currentStartMinutes % 60).toString().padStart(2, "0");

          const endH = Math.floor(currentEndMinutes / 60)
            .toString()
            .padStart(2, "0");
          const endM = (currentEndMinutes % 60).toString().padStart(2, "0");

          newSlots.push({
            id: new mongoose.Types.ObjectId().toString(),
            date: input.date,
            startTime: `${startH}:${startM}`,
            endTime: `${endH}:${endM}`,
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

        await invalidateAvailability(user.id);

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
          },
        );

        await invalidateAvailability(user.id);

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
