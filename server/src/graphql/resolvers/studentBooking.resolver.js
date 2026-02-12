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
const { getIOInstance } = require("../../socket");
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
          "_id firstName lastName email description profileImage",
        )
        .sort({ createdAt: -1 });

      const filteredBookings = [];

      for (const booking of allBookings) {
        // keep only today/future slots
        const futureSlots = booking.slots.filter((slot) => {
          return slot;
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
    getUnseenBookingsCount: async (_, __, { user }) => {
      try {
        if (!user || user.role !== "Admin") {
          throw new Error("Unauthorized");
        }

        // Get the last time admin viewed bookings
        // You can store this in a separate AdminActivity collection or in the Admin model
        const admin = await Admin.findById(user.id);
        const lastViewedAt = admin?.lastBookingViewedAt || new Date(0);

        // Count bookings created after last viewed time
        const unseenCount = await StudentBooking.countDocuments({
          createdAt: { $gt: lastViewedAt },
        });

        console.log(`📊 Admin ${user.id} has ${unseenCount} unseen bookings`);

        return {
          count: unseenCount,
          lastViewedAt,
        };
      } catch (error) {
        console.error("Error getting unseen bookings count:", error);
        throw error;
      }
    },

    getCompletedStudentBookings: async (_, __, { user }) => {
      validateUser(user);

      const now = new Date();

      const allBookings = await StudentBooking.find({
        instructorId: user?.id,
        status: { $in: ["confirmed", "semi_cancelled", "completed"] },
      })
        .populate("instructorId", "_id firstName lastName email profileImage")
        .populate("studentId", "_id firstName lastName email profileImage");

      const completedLessons = [];

      for (const booking of allBookings) {
        if (!booking.slots?.length) continue;

        // ✅ gather all slots that are completed (time passed or instructor marked completed), and were booked (exclude cancelled/refund)
        const completedSlots = booking.slots.filter((slot) => {
          if (
            !slot.booked ||
            slot.status === "cancelled" ||
            slot.status === "refund"
          )
            return false;
          const slotEndDateTime = new Date(`${slot.date}T${slot.endTime}:00`);
          return slot.status === "completed" || slotEndDateTime <= now;
        });

        if (completedSlots.length) {
          // ✅ push only one object per booking, with all its completed slots
          completedLessons.push({
            ...booking.toObject(),
            slots: completedSlots,
          });
        }
      }

      // Sort by latest slot end time in each booking (descending)
      completedLessons.sort((a, b) => {
        const aLatest = Math.max(
          ...a.slots.map((s) =>
            new Date(`${s.date}T${s.endTime}:00`).getTime(),
          ),
        );
        const bLatest = Math.max(
          ...b.slots.map((s) =>
            new Date(`${s.date}T${s.endTime}:00`).getTime(),
          ),
        );
        return bLatest - aLatest;
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
        status: { $in: ["confirmed", "semi_cancelled", "completed"] },
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

        const finalBookingBase = {
          ...booking,
          profileImage: student.profileImage || "",
          instructorId: {
            ...booking.instructorId,
            profileImage: booking.instructorId?.profileImage || "",
          },
        };

        // Active slots: booked, not cancelled, not refund
        const activeSlots = booking.slots.filter(
          (slot) =>
            slot.booked &&
            slot.status !== "cancelled" &&
            slot.status !== "refund",
        );

        // Completed slot = status === "completed" OR slot end time has passed
        const completedSlots = activeSlots.filter((slot) => {
          const slotEnd = new Date(`${slot.date}T${slot.endTime}:00`);
          return slot.status === "completed" || slotEnd <= now;
        });
        const inProgressSlots = activeSlots.filter((slot) => {
          const slotEnd = new Date(`${slot.date}T${slot.endTime}:00`);
          return slot.status !== "completed" && slotEnd > now;
        });

        // Stats and graph: count only active slots
        for (const slot of activeSlots) {
          totalLessonCount += 1;
          const start = new Date(`${slot.date}T${slot.startTime}:00`);
          const end = new Date(`${slot.date}T${slot.endTime}:00`);
          const duration = (end - start) / (1000 * 60);
          totalDurationMinutes += duration;
          const count = graphMap.get(slot.date) || 0;
          graphMap.set(slot.date, count + 1);
        }

        if (completedSlots.length > 0) {
          completedBookings.push({
            ...finalBookingBase,
            slots: completedSlots,
          });
        }
        if (inProgressSlots.length > 0) {
          uncompletedBookings.push({
            ...finalBookingBase,
            slots: inProgressSlots,
          });
        }
      }

      const graphStats = Array.from(graphMap.entries()).map(
        ([date, lessonsBooked]) => ({
          date,
          lessonsBooked,
        }),
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
                    newSlot.endTime >= existingSlot.endTime)),
            ),
          );

          if (conflictingBooking) {
            throw new UserInputError(
              `You already have a booking with this instructor on ${newSlot.date} between ${newSlot.startTime} and ${newSlot.endTime}`,
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
            date: new Date(slot.date),
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

              for (const slot of slotsToAdd) {
                // Check if slot already exists in `slots` (booked list)
                const savedSlot = booking.slots.find(
                  (s) =>
                    s.date === slot.date &&
                    s.startTime === slot.startTime &&
                    s.endTime === slot.endTime,
                );

                if (!savedSlot) continue;

                // Mark slot as booked in booked list
                availability.slots.push({
                  id: savedSlot._id.toString(),
                  bookingId: booking._id.toString(),
                  date: slot.date,
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  booked: true,
                  status: "booked",
                });

                // Find and update in availableSlots (mark as booked)
                const availableSlot = availability.availableSlots.find(
                  (s) =>
                    s.date === slot.date &&
                    s.startTime === slot.startTime &&
                    s.endTime === slot.endTime,
                );

                if (availableSlot) {
                  availableSlot.booked = true;
                  availableSlot.status = "booked";
                }

                hasChanges = true;
              }

              if (hasChanges) {
                // If all availableSlots are booked, mark day as booked
                const allBooked =
                  availability.availableSlots.length > 0 &&
                  availability.availableSlots.every((s) => s.booked === true);

                if (allBooked) {
                  availability.status = "booked";
                } else {
                  availability.status = "available";
                }

                await availability.save();
              }
            },
          ),
        );
        // 4. Optional: populate instructor
        const savedBooking = await StudentBooking.findById(booking._id)
          .populate(
            "instructorId",
            "_id firstName lastName email phone description profileImage address",
          )
          .populate(
            "studentId",
            "_id firstName lastName email phone profileImage homeAddress",
          );

        const bookingData = JSON.parse(JSON.stringify(savedBooking));
        // 5. Send email notifications to all parties

        try {
          await notifyBookingParties(bookingData, "booking_created");
        } catch (emailError) {
          console.error("Failed to send booking creation emails:", emailError);
          // Don't throw error here as booking was successful
        }
        // ✅ NOTIFY ALL ADMINS VIA SOCKET.IO
        const io = getIOInstance();
        if (io && io.notifyNewBooking) {
          io.notifyNewBooking(bookingData);
        } else {
          console.warn("⚠️ Socket.IO instance not available for notifications");
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
    updateSlotStatus: async (_, { input }) => {
      try {
        const { bookingId, slotId, status } = input;

        // Validate status
        const validStatuses = [
          "available",
          "booked",
          "completed",
          "refund",
          "cancelled",
          "missed",
        ];
        if (!validStatuses.includes(status)) {
          throw new Error(
            `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
          );
        }

        // Find and populate the booking
        const booking = await studentBookingModel
          .findById(bookingId)
          .populate({
            path: "studentId",
            model: "User",
            select:
              "_id firstName lastName email phone profileImage homeAddress location zipCode",
          })
          .populate({
            path: "instructorId",
            model: "Instructor",
            select:
              "_id firstName lastName email phone profileImage carName transmissionType experience location",
          });

        if (!booking) {
          throw new Error("Booking not found");
        }

        // Find the slot index
        const slotIndex = booking.slots.findIndex(
          (slot) => slot._id.toString() === slotId,
        );

        if (slotIndex === -1) {
          throw new Error("Slot not found in this booking");
        }

        // Block marking as completed before the slot end time
        if (status === "completed") {
          const slot = booking.slots[slotIndex];
          const slotEnd = new Date(`${slot.date}T${slot.endTime}:00`);
          const now = new Date();
          if (slotEnd > now) {
            throw new Error(
              "Cannot mark this slot as completed before its end time.",
            );
          }
        }

        // Store old status for comparison
        const oldStatus = booking.slots[slotIndex].status;

        // Update the specific slot
        booking.slots[slotIndex].status = status;

        // Set booked flag based on status
        booking.slots[slotIndex].booked =
          status === "booked" || status === "completed";

        // Set cancellation date if cancelling
        if (status === "cancelled" && oldStatus !== "cancelled") {
          booking.slots[slotIndex].cancellationDate = new Date().toISOString();
        }

        // Update booking-level status based on all slots
        const statusCounts = booking.slots.reduce((acc, slot) => {
          acc[slot.status] = (acc[slot.status] || 0) + 1;
          return acc;
        }, {});

        const totalSlots = booking.slots.length;

        // Determine overall booking status
        if (statusCounts.cancelled === totalSlots) {
          booking.status = "cancelled";
          booking.cancellationDate = new Date();
        } else if (statusCounts.completed === totalSlots) {
          booking.status = "completed";
        } else if (statusCounts.refund === totalSlots) {
          booking.status = "refund";
        } else if (statusCounts.cancelled > 0) {
          booking.status = "semi_cancelled";
        } else if (statusCounts.completed > 0 && statusCounts.booked > 0) {
          booking.status = "confirmed"; // Some completed, some pending
        } else {
          booking.status = "confirmed";
        }

        booking.updatedAt = new Date();
        await booking.save();

        // Sync slot status to instructor availability (same as createBooking: both booking slots and availability slots stay in sync)
        const slot = booking.slots[slotIndex];
        const availability = await teacherAvailabilityModel.findOne({
          teacherId: booking.instructorId._id,
          date: new Date(slot.date),
        });

        if (availability) {
          const matchSlot = (s) =>
            s.date === slot.date &&
            s.startTime === slot.startTime &&
            s.endTime === slot.endTime;

          if (status === "cancelled" || status === "available") {
            // Remove from booked slots and mark availableSlots as available again
            availability.slots = availability.slots.filter(
              (s) => !(s.id === slotId || matchSlot(s)),
            );

            const availableSlot = availability.availableSlots.find(matchSlot);
            if (availableSlot) {
              availableSlot.booked = false;
              availableSlot.status = "available";
            }
          } else {
            // For booked | completed | missed | refund: update status in both availability.slots and availability.availableSlots.
            // Booked and completed both stay in slots array (can't book them again); same as createBooking.
            const bookedValue = status === "booked" || status === "completed";

            let bookedSlotEntry = availability.slots.find(
              (s) => s.id === slotId || matchSlot(s),
            );
            if (bookedSlotEntry) {
              bookedSlotEntry.status = status;
              bookedSlotEntry.booked = bookedValue;
            } else if (status === "booked" || status === "completed") {
              // Ensure completed (and booked) also go into slots array like on createBooking
              availability.slots.push({
                id: slotId,
                bookingId: booking._id.toString(),
                date: slot.date,
                startTime: slot.startTime,
                endTime: slot.endTime,
                booked: bookedValue,
                status,
              });
            }

            const availableSlot = availability.availableSlots.find(matchSlot);
            if (availableSlot) {
              availableSlot.status = status;
              availableSlot.booked = bookedValue;
            }
          }

          // Recompute day-level status
          const allBooked =
            availability.availableSlots.length > 0 &&
            availability.availableSlots.every((s) => s.booked === true);
          availability.status = allBooked ? "booked" : "available";
          await availability.save();
        }

        // Send email notifications if status changed
        if (oldStatus !== status) {
          try {
            let emailType = "booking_status_updated";
            if (status === "cancelled") {
              emailType = "booking_cancelled";
            } else if (status === "completed") {
              emailType = "booking_completed";
            }

            await notifyBookingParties(booking, emailType);
            console.log(`Slot status update emails sent: ${emailType}`);
          } catch (emailError) {
            console.error(
              "Failed to send slot status update emails:",
              emailError,
            );
          }
        }

        return booking;
      } catch (error) {
        console.error("Error updating slot status:", error);
        throw new Error(`Failed to update slot status: ${error.message}`);
      }
    },

    markBookingsAsViewed: async (_, __, { user }) => {
      try {
        if (!user || user.role !== "Admin") {
          throw new Error("Unauthorized");
        }

        // Update the admin's last viewed timestamp
        await Admin.findByIdAndUpdate(user.id, {
          lastBookingViewedAt: new Date(),
        });

        console.log(`✅ Admin ${user.id} marked bookings as viewed`);

        return { success: true };
      } catch (error) {
        console.error("Error marking bookings as viewed:", error);
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
            emailError,
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
            "Not authorized to cancel this booking",
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
          (s) => s.status === "cancelled",
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
        const teacherAvailability = await teacherAvailabilityModel
          .findOne({
            teacherId: booking.instructorId._id,
            date: new Date(slot.date),
          })
          .session(session);

        if (teacherAvailability) {
          // 1️⃣ Remove from booked slots
          teacherAvailability.slots = teacherAvailability.slots.filter(
            (s) => s.id !== slotId,
          );

          // 2️⃣ Add or mark slot as available again
          const existingAvailable = teacherAvailability.availableSlots.find(
            (s) =>
              s.date === slot.date &&
              s.startTime === slot.startTime &&
              s.endTime === slot.endTime,
          );

          if (existingAvailable) {
            existingAvailable.booked = false;
            existingAvailable.status = "available";
          } else {
            teacherAvailability.availableSlots.push({
              id: new mongoose.Types.ObjectId().toString(),
              date: slot.date,
              startTime: slot.startTime,
              endTime: slot.endTime,
              booked: false,
              status: "available",
            });
          }

          // 3️⃣ Update overall status
          const hasAvailable = teacherAvailability.availableSlots.some(
            (s) => s.booked === false,
          );
          teacherAvailability.status = hasAvailable ? "available" : "booked";

          await teacherAvailability.save({ session });
        }

        await session.commitTransaction();
        // 7. Send email notifications
        try {
          await notifyBookingParties(booking, "booking_cancelled");
          console.log("Booking cancellation emails sent successfully");
        } catch (emailError) {
          console.error(
            "Failed to send booking cancellation emails:",
            emailError,
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
