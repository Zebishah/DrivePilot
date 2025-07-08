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
const checkAllSlotsBooked = require("../../utils/CheckAllSlotsBooked");

const studentBookingResolver = {
  Query: {
    getStudentBookings: async (_, __, { user }) => {
      console.log("user", user);
      validateUser(user);
      const bookings = await StudentBooking.find({ studentId: user.id })
        .populate("instructorId", "_id firstName lastName email description")
        .sort({ createdAt: -1 });
      console.log("bookings", bookings);
      return bookings;
    },
    getCompletedStudentBookings: async (_, __, { user }) => {
      validateUser(user);

      const now = new Date();

      // Populate both instructorId and studentId (booker) with profileImage included
      const allBookings = await StudentBooking.find({
        instructorId: user?.id,
        status: { $in: ["confirmed", "semi_cancelled"] },
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
        instructorId: user.id,
        status: { $in: ["confirmed", "semi_cancelled"] },
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

        const { instructorId } = validatedInput;

        const enrichedSlots = validatedInput.slots.map((slot) => ({
          ...slot,
          id: new mongoose.Types.ObjectId().toString(), // ✅ Unique ID for slot
          booked: true,
          status: "booked",
        }));

        // 1. Check for overlapping bookings WITH THE SAME INSTRUCTOR
        const existingBookings = await StudentBooking.find({
          studentId: user.id,
          instructorId: instructorId,
          status: { $ne: "cancelled" },
        });

        for (const newSlot of enrichedSlots) {
          const conflictingBooking = existingBookings.find((booking) =>
            booking.slots.some(
              (existingSlot) =>
                existingSlot.date === newSlot.date &&
                existingSlot.booked &&
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
              `You already have a booking with this instructor on ${newSlot.date} between ${newSlot.startTime} and ${newSlot.endTime}`
            );
          }
        }

        const booking = new StudentBooking({
          ...validatedInput,
          slots: enrichedSlots,
          status: "confirmed",
        });

        await booking.save();

        // 3. Update availability and push booked sub-slots
        // Group slots by date and availability block
        const slotsByAvailability = {};

        for (const slot of enrichedSlots) {
          const availability = await teacherAvailabilityModel.findOne({
            teacherId: instructorId,
            date: slot.date,
            startTime: { $lte: slot.startTime },
            endTime: { $gte: slot.endTime },
          });

          if (!availability) continue;

          const availabilityKey = `${availability._id}`;
          if (!slotsByAvailability[availabilityKey]) {
            slotsByAvailability[availabilityKey] = {
              availability,
              slotsToAdd: [],
            };
          }

          slotsByAvailability[availabilityKey].slotsToAdd.push(slot);
        }
        console.log("slots", enrichedSlots);
        // Process each availability block
        await Promise.all(
          Object.values(slotsByAvailability).map(
            async ({ availability, slotsToAdd }) => {
              let hasChanges = false;
              console.log("slots toAdd", slotsToAdd);
              // Add new slots if they don't already exist
              for (const slot of slotsToAdd) {
                const alreadyExists = availability.slots.some(
                  (s) =>
                    s.date === slot.date &&
                    s.startTime === slot.startTime &&
                    s.endTime === slot.endTime
                );

                if (!alreadyExists) {
                  availability.slots.push({
                    id: slot.id, // ✅ Now consistent with StudentBooking slot
                    date: slot.date,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    booked: true,
                    status: "booked",
                  });
                  hasChanges = true;
                }
              }

              // Only check and update status if we made changes
              if (hasChanges) {
                // Check if all slots are now booked
                const allSlotsBooked = checkAllSlotsBooked(availability);
                if (allSlotsBooked) {
                  availability.status = "booked";
                }

                await availability.save();
                console.log(
                  `Availability ${availability._id} updated. Status: ${availability.status}`
                );
              }
            }
          )
        );

        // 4. Optional: populate instructor
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
    cancelBookingSlot: async (_, { bookingId, slotId }, { user }) => {
      validateUser(user);

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // 1. Find the booking
        const booking =
          await StudentBooking.findById(bookingId).session(session);
        if (!booking) throw new UserInputError("Booking not found");

        const uid = user.id.toString();
        if (
          booking.studentId.toString() !== uid &&
          booking.instructorId.toString() !== uid
        ) {
          throw new AuthenticationError(
            "Not authorized to cancel this booking"
          );
        }

        // 2. Find the specific slot in the booking
        const slot = booking.slots.id(slotId);
        if (!slot) throw new UserInputError("Slot not found");

        if (slot.status === "cancelled") {
          throw new UserInputError("Slot is already cancelled");
        }

        // 3. Mark the slot as cancelled in the booking
        slot.status = "cancelled";
        slot.booked = false;

        // 4. Check if all slots are cancelled to determine booking status
        const allSlotsCancelled = booking.slots.every(
          (s) => s.status === "cancelled"
        );

        // If all slots are cancelled, mark booking as cancelled, otherwise semi-cancelled
        if (allSlotsCancelled) {
          booking.status = "cancelled";
        } else {
          booking.status = "semi_cancelled";
        }

        await booking.save({ session });

        // 5. Remove the slot from teacher availability using the simple 'id' field
        await teacherAvailabilityModel.updateOne(
          {
            teacherId: booking.instructorId,
            "slots.id": slotId,
          },
          {
            $pull: {
              slots: {
                id: slotId,
              },
            },
          },
          { session }
        );

        // 6. Check if teacher availability document has any remaining slots
        const teacherAvailability = await teacherAvailabilityModel
          .findOne({
            teacherId: booking.instructorId,
            date: slot.date,
          })
          .session(session);

        // If no slots remain for this date, you might want to update the status
        if (teacherAvailability && teacherAvailability.slots.length === 0) {
          await teacherAvailabilityModel.updateOne(
            {
              teacherId: booking.instructorId,
              date: slot.date,
            },
            {
              $set: { status: "available" },
            },
            { session }
          );
        }

        await session.commitTransaction();
        session.endSession();

        // Populate the booking with related data before returning
        const populatedBooking = await StudentBooking.findById(bookingId)
          .populate("studentId")
          .populate("instructorId");

        return populatedBooking;
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
      }
    },
  },
};

module.exports = studentBookingResolver;
