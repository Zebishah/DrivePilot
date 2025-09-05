const studentBookingModel = require("../../models/studentBooking.model");

const { User, Student, Instructor } = require("../../models/User");

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

        const booking = await studentBookingModel.findById(bookingId);
        if (!booking) {
          throw new Error("Booking not found");
        }

        const slotIndex = booking.slots.findIndex(
          (slot) => slot._id.toString() === slotId
        );
        if (slotIndex === -1) {
          throw new Error("Slot not found");
        }

        // Update slot status and booked flag based on new status
        booking.slots[slotIndex].status =
          status === "cancelled" ? "cancelled" : "booked";
        booking.slots[slotIndex].booked = status !== "cancelled";

        // Update overall booking status
        booking.status = status;
        booking.updatedAt = new Date();

        await booking.save();

        // Populate and return the updated booking
        const updatedBooking = await studentBookingModel
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

        return updatedBooking;
      } catch (error) {
        throw new Error(`Failed to update booking status: ${error.message}`);
      }
    },

    cancelBookingAdmin: async (_, { input }) => {
      try {
        const { bookingId, slotId, studentId, reason } = input;

        const booking = await studentBookingModel.findById(bookingId);
        if (!booking) {
          throw new Error("Booking not found");
        }

        // Verify the student ID matches
        if (booking.studentId.toString() !== studentId) {
          throw new Error("Student ID does not match booking");
        }

        const slotIndex = booking.slots.findIndex(
          (slot) => slot._id.toString() === slotId
        );
        if (slotIndex === -1) {
          throw new Error("Slot not found");
        }

        // Update slot to cancelled and not booked
        booking.slots[slotIndex].status = "cancelled";
        booking.slots[slotIndex].booked = false;

        // Update overall booking status
        const remainingBookedSlots = booking.slots.filter(
          (slot) => slot._id.toString() !== slotId && slot.booked
        );

        if (remainingBookedSlots.length === 0) {
          booking.status = "cancelled";
        } else {
          booking.status = "semi_cancelled";
        }

        booking.updatedAt = new Date();
        await booking.save();

        // Log cancellation reason (you might want to store this in a separate collection)
        console.log(
          `Booking ${bookingId} slot ${slotId} cancelled by admin. Reason: ${reason}`
        );

        // Populate and return the updated booking
        const updatedBooking = await studentBookingModel
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

        return updatedBooking;
      } catch (error) {
        throw new Error(`Failed to cancel booking: ${error.message}`);
      }
    },
  },
};

module.exports = AdminBookingResolvers;
