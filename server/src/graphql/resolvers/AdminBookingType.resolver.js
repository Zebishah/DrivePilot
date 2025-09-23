const { UserInputError } = require("apollo-server-express");
const studentBookingModel = require("../../models/studentBooking.model");

const { User, Student, Instructor } = require("../../models/User");
const { notifyBookingParties } = require("../../utils/SendOtpEmail");

const AdminBookingResolvers = {
  Query: {
    getAllStudentBookings: async () => {
      try {
        const bookings = await studentBookingModel
          .find({})
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

        // Add slotsCount to each booking
        const bookingsWithCount = bookings.map((b) => ({
          ...b.toObject(),
          slotsCount: b.slots?.length || 0,
        }));

        // Total slots across all bookings
        const totalSlots = bookingsWithCount.reduce(
          (sum, b) => sum + b.slotsCount,
          0
        );

        console.log("Bookings found:", bookingsWithCount.length);
        console.log("Total slots found:", totalSlots);

        return bookingsWithCount;
      } catch (error) {
        throw new Error(`Failed to fetch student bookings: ${error.message}`);
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

        if (!booking) {
          throw new Error("Booking not found");
        }

        // Verify the student ID matches
        if (booking.studentId._id.toString() !== studentId) {
          throw new Error("Student ID does not match booking");
        }

        const slotIndex = booking.slots.findIndex(
          (slot) => slot._id.toString() === slotId
        );
        if (slotIndex === -1) {
          throw new Error("Slot not found");
        }
        if (booking.slots[slotIndex].status === "cancelled") {
          throw new UserInputError("Slot is already cancelled");
        }
        // Update slot to cancelled and not booked
        booking.slots[slotIndex].status = "cancelled";
        booking.slots[slotIndex].booked = false;
        booking.slots[slotIndex].cancellationDate = new Date();

        // Update overall booking status
        const remainingBookedSlots = booking.slots.filter(
          (slot) => slot._id.toString() !== slotId && slot.booked
        );

        if (remainingBookedSlots.length === 0) {
          booking.status = "cancelled";
          booking.cancellationDate = new Date();
        } else {
          booking.status = "semi_cancelled";
        }

        booking.updatedAt = new Date();

        // Add reason to booking if provided
        if (reason) {
          booking.reason = reason;
        }

        await booking.save();

        // Send email notifications
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
