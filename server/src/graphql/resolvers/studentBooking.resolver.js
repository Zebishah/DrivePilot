const { studentBookingSchema } = require("../../schemas/studentBooking.schema");
const StudentBooking = require("../../models/studentBooking.model");
const {
  AuthenticationError,
  UserInputError,
} = require("apollo-server-express");
const { validateUser } = require("../../utils/auth");
const teacherAvailabilityModel = require("../../models/teacherAvailability.model");
const { default: mongoose } = require("mongoose");

const studentBookingResolver = {
  Query: {
    getStudentBookings: async (_, __, { user }) => {
      validateUser(user);
      return await StudentBooking.find({ studentId: user.id })
        .populate("instructorId", "_id firstName lastName email description")
        .sort({ createdAt: -1 });
    },

    getInstructorBookings: async (_, __, { user }) => {
      validateUser(user);
      return await StudentBooking.find({ instructorId: user.id })
        .populate("studentId", "_id firstName lastName email description")
        .sort({ createdAt: -1 });
    },
  },

  Mutation: {
    createBooking: async (_, { input }, { user }) => {
      validateUser(user);
      try {
        const validatedInput = studentBookingSchema.parse({
          ...input,
          studentId: user.id,
        });

        // Extract slots from the input
        const { slots, instructorId } = validatedInput;

        // Check if student has already booked any lessons with overlapping dates and times
        const existingBookings = await StudentBooking.find({
          studentId: user.id,
          status: { $ne: "cancelled" }, // Exclude cancelled bookings
        });

        // Check for each slot if there's an existing booking with the same date and time
        for (const newSlot of slots) {
          const conflictingBooking = existingBookings.find((booking) =>
            booking.slots.some(
              (existingSlot) =>
                existingSlot.date === newSlot.date &&
                // Check if times overlap
                ((newSlot.startTime >= existingSlot.startTime &&
                  newSlot.startTime < existingSlot.endTime) ||
                  (newSlot.endTime > existingSlot.startTime &&
                    newSlot.endTime <= existingSlot.endTime) ||
                  (newSlot.startTime <= existingSlot.startTime &&
                    newSlot.endTime >= existingSlot.endTime))
            )
          );

          if (conflictingBooking) {
            throw new UserInputError(
              `You already have a booking on ${newSlot.date} between ${newSlot.startTime} and ${newSlot.endTime}`
            );
          }
        }

        // 1) Create & save the booking
        const booking = new StudentBooking(validatedInput);
        await booking.save();

        // 2) **Mark those availability slots as “booked”**
        // finding the booking
        const bulkConditions = slots.map((s) => ({
          teacherId: instructorId,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          status: "available",
        }));

        await teacherAvailabilityModel.updateMany(
          { $or: bulkConditions },
          { $set: { status: "booked" } }
        );

        // 3) Populate and return
        await booking.populate(
          "instructorId",
          "_id firstName lastName email description"
        );

        return booking;
      } catch (error) {
        console.error("Booking creation error:", error);
        if (error.errors) {
          throw new UserInputError("Invalid input", { errors: error.errors });
        }
        throw error;
      }
    },

    updateBookingStatus: async (_, { bookingId, status }, { user }) => {
      validateUser(user);
      const booking = await StudentBooking.findById(bookingId);
      if (!booking) {
        throw new UserInputError("Booking not found");
      }
      if (booking.instructorId.toString() !== user.id.toString()) {
        throw new AuthenticationError("Not authorized to update this booking");
      }
      booking.status = status;
      await booking.save();
      return booking;
    },
    cancelBooking: async (_, { bookingId }, { user }) => {
      validateUser(user);

      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        // 1) Load & auth
        const booking = await StudentBooking.findById(bookingId).session(
          session
        );
        if (!booking) {
          throw new UserInputError("Booking not found");
        }
        const uid = user.id.toString();
        if (
          booking.studentId.toString() !== uid &&
          booking.instructorId.toString() !== uid
        ) {
          throw new AuthenticationError(
            "Not authorized to cancel this booking"
          );
        }

        // 2) Flip booking status
        booking.status = "cancelled";
        await booking.save({ session });

        // 3) Build bulk‐update conditions for each slot
        const bulkConditions = booking.slots.map((slot) => ({
          teacherId: booking.instructorId,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: "booked", // only reset those that were booked
        }));

        // 4) Mark them available again
        await teacherAvailabilityModel.updateMany(
          { $or: bulkConditions },
          { $set: { status: "available" } },
          { session }
        );

        // 5) Commit & return
        await session.commitTransaction();
        session.endSession();

        return booking;
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
      }
    },
  },
};

module.exports = studentBookingResolver;
