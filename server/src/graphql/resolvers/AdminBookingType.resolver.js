const { UserInputError } = require("apollo-server-express");
const mongoose = require("mongoose");
const studentBookingModel = require("../../models/studentBooking.model");
const { getSlotEndTimestampUtc } = require("../../utils/slotTimezone");

const { User, Student, Instructor } = require("../../models/User");

// Payout delay after lesson completed (must match studentBooking.resolver.js)
const PAYOUT_DELAY_MS = 1 * 60 * 1000;
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
          0,
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
          `Failed to fetch bookings for instructor: ${error.message}`,
        );
      }
    },
  },

  Mutation: {
    updateBookingStatusAdmin: async (_, { input }) => {
      try {
        const { bookingId, slotId, status } = input;

        const validStatuses = [
          "available",
          "booked",
          "completed",
          "refund",
          "cancelled",
          "missed",
          "yet",
        ];
        if (!validStatuses.includes(status)) {
          throw new Error(
            `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
          );
        }

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
          (slot) => slot._id.toString() === slotId,
        );
        if (slotIndex === -1) {
          throw new Error("Slot not found");
        }

        // Block marking as completed before the slot end time in all environments
        // Slot times are in business timezone (SLOT_TIMEZONE, default Europe/Zurich)
        if (status === "completed") {
          const slot = booking.slots[slotIndex];
          const endTimeStr =
            slot.endTime && slot.endTime.split(":").length >= 3
              ? slot.endTime
              : `${slot.endTime || "17:00"}:00`;
          const slotEndMs = getSlotEndTimestampUtc(slot.date, endTimeStr);
          const nowMs = Date.now();
          if (isNaN(slotEndMs)) {
            throw new Error(
              "Cannot mark this slot as completed: invalid slot end time.",
            );
          }
          if (slotEndMs > nowMs) {
            throw new Error(
              "Cannot mark this slot as completed before its end time.",
            );
          }
        }

        const oldStatus = booking.slots[slotIndex].status;

        // Update the specific slot
        booking.slots[slotIndex].status = status;
        booking.slots[slotIndex].booked =
          status === "booked" || status === "completed";

        if (status === "cancelled" && oldStatus !== "cancelled") {
          booking.slots[slotIndex].cancellationDate = new Date().toISOString();
        }

        // When marking completed: set completion and payout-eligible (same as instructor updateSlotStatus)
        if (status === "completed") {
          const now = new Date();
          booking.slots[slotIndex].completionMarkedAt = now;
          const payoutEligibleAt = new Date(now.getTime() + PAYOUT_DELAY_MS);
          booking.slots[slotIndex].payoutEligibleAt = payoutEligibleAt;
          if (
            booking.slots[slotIndex].paymentStatus === "paid" &&
            booking.slots[slotIndex].instructorAmount != null
          ) {
            booking.slots[slotIndex].payoutStatus = "pending";
          }
        }

        // Update booking-level status based on all slots (same as instructor)
        const statusCounts = booking.slots.reduce((acc, slot) => {
          acc[slot.status] = (acc[slot.status] || 0) + 1;
          return acc;
        }, {});
        const totalSlots = booking.slots.length;

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
          booking.status = "confirmed";
        } else {
          booking.status = "confirmed";
        }

        booking.updatedAt = new Date();
        await booking.save();

        // Sync slot status to instructor availability (same as instructor updateSlotStatus)
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
            availability.slots = availability.slots.filter(
              (s) => !(s.id === slotId || matchSlot(s)),
            );
            const availableSlot = availability.availableSlots.find(matchSlot);
            if (availableSlot) {
              availableSlot.booked = false;
              availableSlot.status = "available";
            }
          } else {
            const bookedValue = status === "booked" || status === "completed";
            let bookedSlotEntry = availability.slots.find(
              (s) => s.id === slotId || matchSlot(s),
            );
            if (bookedSlotEntry) {
              bookedSlotEntry.status = status;
              bookedSlotEntry.booked = bookedValue;
            } else if (status === "booked" || status === "completed") {
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
          const allBooked =
            availability.availableSlots.length > 0 &&
            availability.availableSlots.every((s) => s.booked === true);
          availability.status = allBooked ? "booked" : "available";
          await availability.save();
        }

        if (oldStatus !== status) {
          try {
            let emailType = "booking_status_updated";
            if (status === "cancelled") {
              emailType = "booking_cancelled";
            } else if (status === "completed") {
              emailType = "booking_completed";
            }
            await notifyBookingParties(booking, emailType);
            console.log("Admin booking status update emails sent successfully");
          } catch (emailError) {
            console.error(
              "Failed to send admin booking status update emails:",
              emailError,
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
          (slot) => slot._id.toString() === slotId,
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
            (s) => s.id !== slot._id.toString(),
          );

          // 2️⃣ Add or mark as available
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

          await teacherAvailability.save();
        }

        // Notify parties
        try {
          await notifyBookingParties(booking, "booking_cancelled");
          console.log("Admin booking cancellation emails sent successfully");
        } catch (emailError) {
          console.error(
            "Failed to send admin booking cancellation emails:",
            emailError,
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
