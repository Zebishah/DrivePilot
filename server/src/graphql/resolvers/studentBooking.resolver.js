const { studentBookingSchema } = require("../../schemas/studentBooking.schema");
const StudentBooking = require("../../models/studentBooking.model");
const {
  AuthenticationError,
  UserInputError,
} = require("apollo-server-express");
const { validateUser } = require("../../utils/auth");
const teacherAvailabilityModel = require("../../models/teacherAvailability.model");
const { default: mongoose } = require("mongoose");
const { User } = require("../../models/User");

const studentBookingResolver = {
  Query: {
    getStudentBookings: async (_, __, { user }) => {
      validateUser(user);
      return await StudentBooking.find({ studentId: user.id })
        .populate("instructorId", "_id firstName lastName email description")
        .sort({ createdAt: -1 });
    },
    getCompletedStudentBookings: async (_, __, { user }) => {
      validateUser(user);

      const now = new Date();

      // Populate both instructorId and studentId (booker) with profileImage included
      const allBookings = await StudentBooking.find({
        instructorId: user?.id,
        status: "confirmed", // Only confirmed bookings
      })

        .populate(
          "instructorId",
          "_id firstName lastName email description profileImage"
        )
        .populate("studentId", "_id firstName lastName email profileImage");

      const completedBookings = allBookings.filter((booking) => {
        if (!booking.slots || booking.slots.length === 0) return false;

        // Get the latest slot by end time
        const lastSlot = booking.slots.reduce((latest, current) => {
          const latestEnd = new Date(`${latest.date}T${latest.endTime}:00`);
          const currentEnd = new Date(`${current.date}T${current.endTime}:00`);
          return currentEnd > latestEnd ? current : latest;
        });

        const lastEndDateTime = new Date(
          `${lastSlot.date}T${lastSlot.endTime}:00`
        );

        return lastEndDateTime <= now;
      });

      // Sort by latest completed first
      const sortedBookings = completedBookings.sort((a, b) => {
        const getLastEndTime = (slots) => {
          return slots.reduce((latest, current) => {
            const latestEnd = new Date(`${latest.date}T${latest.endTime}:00`);
            const currentEnd = new Date(
              `${current.date}T${current.endTime}:00`
            );
            return currentEnd > latestEnd ? current : latest;
          });
        };

        const aEnd = new Date(
          `${getLastEndTime(a.slots).date}T${getLastEndTime(a.slots).endTime}:00`
        );
        const bEnd = new Date(
          `${getLastEndTime(b.slots).date}T${getLastEndTime(b.slots).endTime}:00`
        );

        return bEnd - aEnd; // Descending
      });
      console.log("allBookings", sortedBookings);
      // Add bookerProfileImage to each booking object
      const bookingsWithStudentProfile = sortedBookings.map((booking) => {
        const bookingObj = booking.toObject(); // Convert to plain object

        return {
          ...bookingObj,
          // Add the student's (booker's) profile image
          bookerProfileImage: booking.studentId?.profileImage || "",
          // Also fix the instructor's profile image in the response
          instructorId: {
            ...bookingObj.instructorId,
            profileImage: booking.instructorId?.profileImage || "",
          },
        };
      });

      return bookingsWithStudentProfile;
    },
    getInstructorBookings: async (_, __, { user }) => {
      validateUser(user);
      return await StudentBooking.find({ instructorId: user.id })
        .populate("studentId", "_id firstName lastName email description")
        .sort({ createdAt: -1 });
    },
    getStudentDashboardDetails: async (_, { studentId }, { user }) => {
      validateUser(user);

      const student = await User.findById(studentId).lean();
      if (!student) throw new Error("Student not found");

      const allBookings = await StudentBooking.find({
        studentId,
        status: "confirmed",
      })
        .populate("instructorId", "_id firstName lastName email profileImage")
        .populate("studentId", "_id firstName lastName email profileImage") // Add this line
        .lean();

      const now = new Date();

      let totalLessonCount = 0;
      let totalDurationMinutes = 0;
      const graphMap = new Map();

      const completedBookings = [];
      const uncompletedBookings = [];

      for (const booking of allBookings) {
        if (!booking.slots || booking.slots.length === 0) continue;

        totalLessonCount += 1;

        // Calculate total duration per booking
        for (const slot of booking.slots) {
          const start = new Date(`${slot.date}T${slot.startTime}:00`);
          const end = new Date(`${slot.date}T${slot.endTime}:00`);
          const duration = (end - start) / (1000 * 60); // minutes
          totalDurationMinutes += duration;

          // Track for graph
          const count = graphMap.get(slot.date) || 0;
          graphMap.set(slot.date, count + 1);
        }

        // Check if completed
        const latestSlot = booking.slots.reduce((latest, curr) => {
          const latestEnd = new Date(`${latest.date}T${latest.endTime}:00`);
          const currentEnd = new Date(`${curr.date}T${curr.endTime}:00`);
          return currentEnd > latestEnd ? curr : latest;
        });

        const lastEndTime = new Date(
          `${latestSlot.date}T${latestSlot.endTime}:00`
        );
        const isCompleted = lastEndTime <= now;

        const finalBooking = {
          ...booking,
          profileImage: student.profileImage || "", // Changed from bookerProfileImage
          instructorId: {
            ...booking.instructorId,
            profileImage: booking.instructorId?.profileImage || "",
          },
        };

        if (isCompleted) {
          completedBookings.push(finalBooking);
        } else {
          uncompletedBookings.push(finalBooking);
        }
      }

      const graphStats = Array.from(graphMap.entries()).map(
        ([date, lessonsBooked]) => ({
          date,
          lessonsBooked,
        })
      );

      return {
        studentInfo: {
          _id: student._id,
          // Fix: Use fallback values and check multiple possible locations for firstName/lastName
          firstName: student.firstName || student.firstName || "N/A",
          lastName: student.lastName || student.lastName || "N/A",
          email: student.paymentInfo?.email || student.email || "N/A",
          phone: student.phone || "",
          profileImage: student.profileImage || "",
          dateOfBirth: student.dateOfBirth || "",
          fatherName: student.fatherName || "",
          description: student.description || "",
          homeAddress: student.homeAddress || "",
          location: student.location || "",
          zipCode: student.zipCode || "",
          languagePreference: student.languagePreference || [],
        },
        lessonStats: {
          totalLessons: totalLessonCount,
          totalLessonDurationInMinutes: totalDurationMinutes,
        },
        graphStats,
        completedBookings,
        uncompletedBookings,
      };
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
        //Temp status confirmed as there is no payment integration yet
        //TODO: Integrate payment gateway and update status accordingly
        const booking = new StudentBooking({
          ...validatedInput,
          status: "confirmed", // Set status as confirmed directly
        });
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
        const booking =
          await StudentBooking.findById(bookingId).session(session);
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
