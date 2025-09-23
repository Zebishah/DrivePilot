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
const studentBookingModel = require("../../models/studentBooking.model");
const { notifyBookingParties } = require("../../utils/SendOtpEmail");
const teacherTariffModel = require("../../models/teacherTariff.model");

const studentBookingResolver = {
  Query: {
    // getStudentBookings: async (_, __, { user }) => {
    //   validateUser(user);
    //   const bookings = await StudentBooking.find({ studentId: user.id })
    //     .populate("instructorId", "_id firstName lastName email description")
    //     .sort({ createdAt: -1 });

    //   return bookings;
    // },

    getStudentBookings: async (_, __, { user }) => {
      validateUser(user);

      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0); // start of today

      // Get all bookings for this student
      const allBookings = await StudentBooking.find({ studentId: user.id })
        .populate(
          "instructorId",
          "_id firstName lastName email description profileImage"
        )
        .sort({ createdAt: -1 });

      const filteredBookings = [];

      for (const booking of allBookings) {
        // keep only today/future slots
        const futureSlots = booking.slots.filter((slot) => {
          const slotDate = new Date(slot.date);
          return slotDate >= currentDate;
        });

        if (!futureSlots.length) continue;

        // 🔑 Fetch the instructor's tariff (default or first)
        const teacherTariff = await teacherTariffModel
          .findOne({
            teacherId: booking.instructorId._id,
          })
          .lean();

        // Safely handle if no tariff found
        const tariffDetails = teacherTariff
          ? {
              lessonFee: teacherTariff.lessonFee,
              finalPricePerLesson: teacherTariff.FinalPricePerLesson,
              lessonDiscount: teacherTariff.lessonDiscount,
            }
          : {
              lessonFee: null,
              finalPricePerLesson: null,
              lessonDiscount: null,
            };

        filteredBookings.push({
          ...booking.toObject(),
          slots: futureSlots,
          teacherTariff: tariffDetails, // ✅ Add tariff info here
        });
      }

      return filteredBookings;
    },
    getCompletedStudentBookings: async (_, __, { user }) => {
      validateUser(user);

      const now = new Date();

      const allBookings = await StudentBooking.find({
        instructorId: user?.id,
        status: { $in: ["confirmed", "semi_cancelled"] },
      })
        .populate("instructorId", "_id firstName lastName email profileImage")
        .populate("studentId", "_id firstName lastName email profileImage");

      const completedLessons = [];

      for (const booking of allBookings) {
        if (!booking.slots?.length) continue;

        // ✅ gather all slots for this booking that are completed
        const completedSlots = booking.slots.filter((slot) => {
          const slotEndDateTime = new Date(`${slot.date}T${slot.endTime}:00`);
          return (
            slotEndDateTime <= now &&
            slot.status !== "cancelled" &&
            slot.status !== "refund"
          );
        });

        if (completedSlots.length) {
          // ✅ push only one object per booking, with all its completed slots
          completedLessons.push({
            ...booking.toObject(),
            slots: completedSlots,
          });
        }
      }

      // Sort by latest slot end time (descending)
      completedLessons.sort((a, b) => {
        const aEnd = new Date(
          `${a.slots[a.slots.length - 1].date}T${a.slots[a.slots.length - 1].endTime}:00`
        );
        const bEnd = new Date(
          `${b.slots[b.slots.length - 1].date}T${b.slots[b.slots.length - 1].endTime}:00`
        );
        return bEnd - aEnd;
      });

      return completedLessons;
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
          review: false,
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

        // Process each availability block
        await Promise.all(
          Object.values(slotsByAvailability).map(
            async ({ availability, slotsToAdd }) => {
              let hasChanges = false;

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
              }
            }
          )
        );

        // 4. Optional: populate instructor
        const savedBooking = await StudentBooking.findById(booking._id)
          .populate(
            "instructorId",
            "_id firstName lastName email phone description profileImage address"
          )
          .populate(
            "studentId",
            "_id firstName lastName email phone profileImage homeAddress"
          );
        console.log("saved booking", savedBooking);
        const bookingData = JSON.parse(JSON.stringify(savedBooking));
        // 5. Send email notifications to all parties
        console.log("bookingData", bookingData);
        try {
          await notifyBookingParties(bookingData, "booking_created");
          console.log("Booking creation emails sent successfully");
        } catch (emailError) {
          console.error("Failed to send booking creation emails:", emailError);
          // Don't throw error here as booking was successful
        }

        return savedBooking;
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

      const booking = await StudentBooking.findById(bookingId)
        .populate("instructorId", "_id firstName lastName email phone")
        .populate("studentId", "_id firstName lastName email phone");

      if (!booking) {
        throw new UserInputError("Booking not found");
      }

      if (booking.instructorId._id.toString() !== user.id.toString()) {
        throw new AuthenticationError("Not authorized to update this booking");
      }

      const oldStatus = booking.status;
      booking.status = status;
      await booking.save();

      // Send email notifications if status actually changed
      if (oldStatus !== status) {
        try {
          await notifyBookingParties(booking, "booking_status_updated");
          console.log("Booking status update emails sent successfully");
        } catch (emailError) {
          console.error(
            "Failed to send booking status update emails:",
            emailError
          );
        }
      }

      return booking;
    },

    cancelBookingSlot: async (_, { bookingId, slotId }, { user }) => {
      validateUser(user);

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // 1. Find the booking with populated data
        const booking = await StudentBooking.findById(bookingId)
          .populate("instructorId", "_id firstName lastName email phone")
          .populate("studentId", "_id firstName lastName email phone")
          .session(session);

        if (!booking) throw new UserInputError("Booking not found");

        const uid = user.id.toString();
        if (
          booking.studentId._id.toString() !== uid &&
          booking.instructorId._id.toString() !== uid
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
        slot.cancellationDate = new Date();

        // 4. Check if all slots are cancelled to determine booking status
        const allSlotsCancelled = booking.slots.every(
          (s) => s.status === "cancelled"
        );

        const oldStatus = booking.status;
        if (allSlotsCancelled) {
          booking.status = "cancelled";
          booking.cancellationDate = new Date();
        } else {
          booking.status = "semi_cancelled";
        }

        await booking.save({ session });

        // 5. Remove the slot from teacher availability
        await teacherAvailabilityModel.updateOne(
          {
            teacherId: booking.instructorId._id,
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
            teacherId: booking.instructorId._id,
            date: slot.date,
          })
          .session(session);

        if (teacherAvailability && teacherAvailability.slots.length === 0) {
          await teacherAvailabilityModel.updateOne(
            {
              teacherId: booking.instructorId._id,
              date: slot.date,
            },
            {
              $set: { status: "available" },
            },
            { session }
          );
        }

        await session.commitTransaction();

        // 7. Send email notifications
        try {
          await notifyBookingParties(booking, "booking_cancelled");
          console.log("Booking cancellation emails sent successfully");
        } catch (emailError) {
          console.error(
            "Failed to send booking cancellation emails:",
            emailError
          );
        }

        return booking;
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        session.endSession();
      }
    },
  },
};

module.exports = studentBookingResolver;
