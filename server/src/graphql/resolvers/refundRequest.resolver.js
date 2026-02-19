const { ForbiddenError, UserInputError } = require("apollo-server-express");
const RefundRequest = require("../../models/refundRequest.model");
const StudentBooking = require("../../models/studentBooking.model");
const teacherAvailabilityModel = require("../../models/teacherAvailability.model");
const { createTransaction } = require("../../services/transactionService");
const {
  createRefund,
  getTransferIdFromPaymentIntent,
  createTransferReversal,
  DEFAULT_CURRENCY,
  CENTIMES_PER_UNIT,
} = require("../../services/stripeService");

function toIsoString(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

const refundRequestResolver = {
  RefundRequest: {
    id: (parent) => parent._id?.toString() || parent.id,
    requestedAt: (parent) => toIsoString(parent.requestedAt),
    processedAt: (parent) => toIsoString(parent.processedAt),
  },

  Query: {
    async getRefundRequests(_, { status }, { user }) {
      if (!user || user.role !== "Admin") {
        throw new ForbiddenError("Not authorized");
      }
      const query = status ? { status } : {};
      return RefundRequest.find(query).sort({ requestedAt: -1 }).lean();
    },

    async getMyRefundRequests(_, __, { user }) {
      if (!user || user.role !== "Student") {
        throw new ForbiddenError("Not authorized");
      }
      return RefundRequest.find({ studentId: user.id })
        .sort({ requestedAt: -1 })
        .lean();
    },
  },

  Mutation: {
    async requestRefund(_, { bookingId, slotId }, { user }) {
      if (!user || user.role !== "Student") {
        throw new ForbiddenError("Not authorized");
      }

      const booking = await StudentBooking.findById(bookingId)
        .populate("instructorId", "_id firstName lastName email")
        .populate("studentId", "_id firstName lastName email");

      if (!booking) throw new UserInputError("Booking not found");
      if (booking.studentId._id.toString() !== user.id.toString()) {
        throw new ForbiddenError(
          "Only the student of this booking can request a refund.",
        );
      }

      const slot = booking.slots.id(slotId);
      if (!slot) throw new UserInputError("Slot not found");

      if (slot.status !== "cancelled") {
        throw new UserInputError(
          "Refund can only be requested for a cancelled lesson. Please cancel the lesson first.",
        );
      }
      if (slot.paymentStatus !== "paid") {
        throw new UserInputError(
          "This lesson was not paid; no refund applies.",
        );
      }
      if (slot.payoutId) {
        throw new UserInputError(
          "Refund is not available because the instructor has already been paid out for this lesson.",
        );
      }
      if (
        slot.refundedAt ||
        slot.status === "refund" ||
        slot.paymentStatus === "refunded"
      ) {
        throw new UserInputError("This lesson has already been refunded.");
      }
      if (!booking.stripePaymentIntentId || slot.chargeAmount == null) {
        throw new UserInputError("Payment information missing for refund.");
      }

      const existing = await RefundRequest.findOne({
        bookingId,
        slotId,
      }).lean();
      if (existing) {
        if (existing.status === "pending") {
          throw new UserInputError(
            "A refund request for this lesson is already pending admin approval.",
          );
        }
        if (existing.status === "approved") {
          throw new UserInputError("This lesson has already been refunded.");
        }
        throw new UserInputError(
          "Your previous refund request for this lesson was rejected.",
        );
      }

      const studentName =
        [booking.studentId.firstName, booking.studentId.lastName]
          .filter(Boolean)
          .join(" ") || "Student";
      const instructorName =
        [booking.instructorId.firstName, booking.instructorId.lastName]
          .filter(Boolean)
          .join(" ") || "Instructor";

      const refundRequest = await RefundRequest.create({
        bookingId: booking._id,
        slotId,
        studentId: booking.studentId._id,
        instructorId: booking.instructorId._id,
        amount: slot.chargeAmount,
        currency: DEFAULT_CURRENCY.toUpperCase(),
        status: "pending",
        studentName,
        instructorName,
        slotDate: slot.date,
        slotStartTime: slot.startTime,
        slotEndTime: slot.endTime,
      });

      return refundRequest;
    },

    async approveRefundRequest(_, { id }, { user }) {
      if (!user || user.role !== "Admin") {
        throw new ForbiddenError("Not authorized");
      }

      const refundRequest = await RefundRequest.findById(id);
      if (!refundRequest) throw new UserInputError("Refund request not found");
      if (refundRequest.status !== "pending") {
        throw new UserInputError(
          `Refund request is already ${refundRequest.status}.`,
        );
      }

      const booking = await StudentBooking.findById(refundRequest.bookingId)
        .populate("instructorId", "_id firstName lastName")
        .populate("studentId", "_id firstName lastName");

      if (!booking) throw new UserInputError("Booking not found");
      const slot = booking.slots.id(refundRequest.slotId);
      if (!slot) throw new UserInputError("Slot not found");

      if (
        slot.refundedAt ||
        slot.status === "refund" ||
        slot.paymentStatus === "refunded"
      ) {
        await RefundRequest.findByIdAndUpdate(id, {
          status: "rejected",
          processedAt: new Date(),
          processedBy: user.id,
          rejectionReason: "Slot was already refunded.",
        });
        throw new UserInputError(
          "This lesson has already been refunded. Refund request marked as rejected.",
        );
      }
      if (slot.payoutId) {
        await RefundRequest.findByIdAndUpdate(id, {
          status: "rejected",
          processedAt: new Date(),
          processedBy: user.id,
          rejectionReason: "Instructor has already been paid out.",
        });
        throw new UserInputError(
          "Refund is not available because the instructor has already been paid out. Request rejected.",
        );
      }
      if (!booking.stripePaymentIntentId || slot.chargeAmount == null) {
        throw new UserInputError("Payment information missing for refund.");
      }

      const amountCentimes = Math.round(
        Number(slot.chargeAmount) * CENTIMES_PER_UNIT,
      );

      let refundId;
      let transferId = null;
      try {
        transferId = await getTransferIdFromPaymentIntent(
          booking.stripePaymentIntentId,
        ).catch(() => null);
        if (
          transferId &&
          slot.instructorAmount != null &&
          slot.instructorAmount > 0
        ) {
          const instructorShareCentimes = Math.round(
            Number(slot.instructorAmount) * CENTIMES_PER_UNIT,
          );
          await createTransferReversal({
            transferId,
            amountCentimes: instructorShareCentimes,
            metadata: {
              bookingId: String(booking._id),
              slotId: String(refundRequest.slotId),
              reason: "refund_approved_by_admin",
            },
          });
        }

        const result = await createRefund({
          paymentIntentId: booking.stripePaymentIntentId,
          amountCentimes,
          reason: "requested_by_customer",
        });
        refundId = result.refundId;
      } catch (stripeErr) {
        await RefundRequest.findByIdAndUpdate(id, {
          status: "rejected",
          processedAt: new Date(),
          processedBy: user.id,
          rejectionReason: `Stripe error: ${stripeErr.message || "Refund failed"}`,
        });
        throw new UserInputError(
          stripeErr.message ||
            "Refund could not be processed. Request marked as rejected.",
        );
      }

      slot.status = "refund";
      slot.paymentStatus = "refunded";
      slot.refundAmount = slot.chargeAmount;
      slot.refundedAt = new Date();
      booking.updatedAt = new Date();
      await booking.save();

      const occurredAt = new Date();
      await createTransaction({
        type: "refund",
        role: "student",
        direction: "credit",
        amount: slot.chargeAmount,
        currency: DEFAULT_CURRENCY.toUpperCase(),
        status: "succeeded",
        bookingId: booking._id,
        slotId: refundRequest.slotId,
        studentId: booking.studentId._id,
        stripePaymentIntentId: booking.stripePaymentIntentId,
        stripeRefundId: refundId,
        description: "Refund for cancelled lesson (approved by admin)",
        occurredAt,
      });

      if (
        transferId &&
        slot.instructorAmount != null &&
        slot.instructorAmount > 0
      ) {
        await createTransaction({
          type: "transfer_reversal",
          role: "instructor",
          direction: "debit",
          amount: slot.instructorAmount,
          currency: DEFAULT_CURRENCY.toUpperCase(),
          status: "succeeded",
          bookingId: booking._id,
          slotId: refundRequest.slotId,
          instructorId: booking.instructorId._id,
          stripePaymentIntentId: booking.stripePaymentIntentId,
          description: "Reversal of instructor share due to refund",
          occurredAt,
        });
      }
      if (slot.dspCommission != null && slot.dspCommission > 0) {
        await createTransaction({
          type: "transfer_reversal",
          role: "platform",
          direction: "debit",
          amount: slot.dspCommission,
          currency: DEFAULT_CURRENCY.toUpperCase(),
          status: "succeeded",
          bookingId: booking._id,
          slotId: refundRequest.slotId,
          studentId: booking.studentId._id,
          instructorId: booking.instructorId._id,
          stripePaymentIntentId: booking.stripePaymentIntentId,
          stripeRefundId: refundId,
          description: "Platform commission reversed due to refund",
          occurredAt,
        });
      }

      const availability = await teacherAvailabilityModel.findOne({
        teacherId: booking.instructorId._id,
        date: new Date(slot.date),
      });
      if (availability) {
        const matchSlot = (s) =>
          s.date === slot.date &&
          s.startTime === slot.startTime &&
          s.endTime === slot.endTime;
        const bookedEntry = availability.slots.find(
          (s) => s.id === refundRequest.slotId || matchSlot(s),
        );
        if (bookedEntry) bookedEntry.status = "refund";
        const availableSlot = availability.availableSlots.find(matchSlot);
        if (availableSlot) availableSlot.status = "refund";
        await availability.save();
      }

      refundRequest.status = "approved";
      refundRequest.processedAt = new Date();
      refundRequest.processedBy = user.id;
      refundRequest.stripeRefundId = refundId;
      await refundRequest.save();

      return refundRequest;
    },

    async rejectRefundRequest(_, { id, rejectionReason }, { user }) {
      if (!user || user.role !== "Admin") {
        throw new ForbiddenError("Not authorized");
      }

      const refundRequest = await RefundRequest.findById(id);
      if (!refundRequest) throw new UserInputError("Refund request not found");
      if (refundRequest.status !== "pending") {
        throw new UserInputError(
          `Refund request is already ${refundRequest.status}.`,
        );
      }

      refundRequest.status = "rejected";
      refundRequest.processedAt = new Date();
      refundRequest.processedBy = user.id;
      if (rejectionReason != null)
        refundRequest.rejectionReason = rejectionReason;
      await refundRequest.save();

      return refundRequest;
    },
  },
};

module.exports = refundRequestResolver;
