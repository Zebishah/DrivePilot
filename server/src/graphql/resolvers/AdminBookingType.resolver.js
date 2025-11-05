const { UserInputError } = require("apollo-server-express");
const studentBookingModel = require("../../models/studentBooking.model");

const { User, Student, Instructor } = require("../../models/User");
const { notifyBookingParties } = require("../../utils/SendOtpEmail");
const StudentBooking = require("../../models/StudentBooking");
const teacherAvailabilityModel = require("../../models/teacherAvailability.model");

const AdminBookingResolvers = {
  Query: {
    getAllStudentBookings: async () => {
      try {
        const bookings = await StudentBooking.find({})
          .populate({
            path: "studentId",
            model: "Student",
            select:
              "_id firstName lastName email phone profileImage homeAddress location zipCode",
          })
          .populate({
            path: "instructorId",
            model: "Instructor",
            select:
              "_id firstName lastName email phone profileImage carName transmissionType experience location",
          })
          .sort({ createdAt: -1 });

        const bookingsWithCount = bookings.map((b) => ({
          ...b.toObject(),
          slotsCount: b.slots?.length || 0,
        }));

        const totalSlots = bookingsWithCount.reduce(
          (sum, b) => sum + b.slotsCount,
          0
        );

        console.log("Bookings found:", bookings.length);
        console.log("Total slots found:", totalSlots);

        return bookingsWithCount;
      } catch (error) {
        throw new Error(`Failed to fetch student bookings: ${error.message}`);
      }
    },
    getInstructorBookingsById: async (_, { instructorId }) => {
      try {
        const bookings = await StudentBooking.find({ instructorId })
          .populate({
            path: "studentId",
            model: "Student",
            select:
              "_id firstName lastName email phone profileImage homeAddress location zipCode",
          })
          .populate({
            path: "instructorId",
            model: "Instructor",
            select:
              "_id firstName lastName email phone profileImage carName transmissionType experience location",
          })
          .sort({ createdAt: -1 });

        return bookings.map((b) => ({
          ...b.toObject(),
          slotsCount: b.slots?.length || 0,
        }));
      } catch (error) {
        throw new Error(
          `Failed to fetch bookings for instructor: ${error.message}`
        );
      }
    },
  },

  Mutation: {
    updateBookingStatusAdmin: async (_, { input }) => {
      try {
        const { bookingId, slotId, status } = input;

        const booking = await studentBookingModel
          .findById(bookingId)
          .populate({
            path: "studentId",
            model: "Student",
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

        const slotIndex = booking.slots.findIndex(
          (slot) => slot._id.toString() === slotId
        );
        if (slotIndex === -1) {
          throw new Error("Slot not found");
        }

        // Store old status for comparison
        const oldStatus = booking.status;

        // Update slot status and booked flag based on new status
        booking.slots[slotIndex].status =
          status === "cancelled" ? "cancelled" : status;
        booking.slots[slotIndex].booked = status !== "cancelled";

        // Update overall booking status
        booking.status = status;
        booking.updatedAt = new Date();

        await booking.save();

        // Send email notifications if status actually changed
        if (oldStatus !== status) {
          try {
            const emailType =
              status === "cancelled"
                ? "booking_cancelled"
                : "booking_status_updated";
            await notifyBookingParties(booking, emailType);
            console.log("Admin booking status update emails sent successfully");
          } catch (emailError) {
            console.error(
              "Failed to send admin booking status update emails:",
              emailError
            );
          }
        }

        return booking;
      } catch (error) {
        throw new Error(`Failed to update booking status: ${error.message}`);
      }
    },

    cancelBookingAdmin: async (_, { input }) => {
      try {
        const { bookingId, slotId, studentId, reason } = input;

        const booking = await studentBookingModel
          .findById(bookingId)
          .populate({
            path: "studentId",
            model: "Student",
            select:
              "_id firstName lastName email phone profileImage homeAddress location zipCode",
          })
          .populate({
            path: "instructorId",
            model: "Instructor",
            select:
              "_id firstName lastName email phone profileImage carName transmissionType experience location",
          });

        if (!booking) throw new Error("Booking not found");
        if (booking.studentId._id.toString() !== studentId)
          throw new Error("Student ID does not match booking");

        const slotIndex = booking.slots.findIndex(
          (slot) => slot._id.toString() === slotId
        );
        if (slotIndex === -1) throw new Error("Slot not found");

        const slot = booking.slots[slotIndex];
        if (slot.status === "cancelled")
          throw new UserInputError("Slot is already cancelled");

        // Update slot
        slot.status = "cancelled";
        slot.booked = false;
        slot.cancellationDate = new Date();

        const remainingBookedSlots = booking.slots.filter((s) => s.booked);
        booking.status = remainingBookedSlots.length
          ? "semi_cancelled"
          : "cancelled";
        if (remainingBookedSlots.length === 0)
          booking.cancellationDate = new Date();
        if (reason) booking.reason = reason;
        booking.updatedAt = new Date();

        await booking.save();

        // ✅ Update teacher availability
        const teacherAvailability = await teacherAvailabilityModel.findOne({
          teacherId: booking.instructorId._id,
          date: new Date(slot.date),
        });

        if (teacherAvailability) {
          // 1️⃣ Remove from booked slots
          teacherAvailability.slots = teacherAvailability.slots.filter(
            (s) => s.id !== slot._id.toString()
          );

          // 2️⃣ Add or mark as available
          const existingAvailable = teacherAvailability.availableSlots.find(
            (s) =>
              s.date === slot.date &&
              s.startTime === slot.startTime &&
              s.endTime === slot.endTime
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
            (s) => s.booked === false
          );
          teacherAvailability.status = hasAvailable ? "available" : "booked";

          await teacherAvailability.save();
        }

        // Notify parties
        try {
          await notifyBookingParties(booking, "booking_cancelled");
          console.log("Admin booking cancellation emails sent successfully");
        } catch (emailError) {
          console.error(
            "Failed to send admin booking cancellation emails:",
            emailError
          );
        }

        return booking;
      } catch (error) {
        throw error;
      }
    },
  },
};

module.exports = AdminBookingResolvers;
