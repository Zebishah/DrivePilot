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
} = require("../../services/stripeService");
const { notifyBookingParties } = require("../../utils/SendOtpEmail");
const {
  getOrCreateOperation,
  claimOperation,
  markAttempt,
  markProviderSuccess,
  markLocalSuccess,
  markCompleted,
  markRetryable,
  markManualReview,
  getLatestOperation,
} = require("../../services/financialOperationService");
const {
  retrieveRefund,
  retrieveTransferReversal,
} = require("../../services/stripeService");
const { fromMinorUnits, toMinorUnits } = require("../../utils/money");

function toIsoString(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

function toId(value) {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (value.toString && typeof value.toString === "function")
    return value.toString();
  return String(value);
}

const refundRequestResolver = {
  RefundRequest: {
    id: (parent) => toId(parent._id) || toId(parent.id),
    bookingId: (parent) => toId(parent.bookingId),
    slotId: (parent) => toId(parent.slotId),
    studentId: (parent) => toId(parent.studentId),
    instructorId: (parent) => toId(parent.instructorId),
    processedBy: (parent) => toId(parent.processedBy),
    requestedAt: (parent) => toIsoString(parent.requestedAt),
    processedAt: (parent) => toIsoString(parent.processedAt),
    message: (parent) => String(parent?.message ?? ""),
    attachments: (parent) =>
      Array.isArray(parent?.attachments) ? parent.attachments : [],
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
    async requestRefund(
      _,
      { bookingId, slotId, message, attachments = [] },
      { user },
    ) {
      if (!user || user.role !== "Student") {
        throw new ForbiddenError("Not authorized");
      }
      const trimmedMessage = String(message || "").trim();
      if (!trimmedMessage) {
        throw new UserInputError("Refund justification message is required.");
      }
      const normalizedAttachments = (attachments || []).map((f) => ({
        url: String(f?.url || "").trim(),
        fileName: String(f?.fileName || "").trim(),
        mimeType: String(f?.mimeType || "").trim().toLowerCase(),
      }));
      const allowedAttachmentMimePrefixes = ["image/"];
      const allowedAttachmentMimes = ["application/pdf"];
      for (const f of normalizedAttachments) {
        if (!f.url || !f.fileName || !f.mimeType) {
          throw new UserInputError(
            "Each attachment must include url, fileName, and mimeType.",
          );
        }
        const isAllowed =
          allowedAttachmentMimes.includes(f.mimeType) ||
          allowedAttachmentMimePrefixes.some((prefix) =>
            f.mimeType.startsWith(prefix),
          );
        if (!isAllowed) {
          throw new UserInputError(
            "Only PDF and image files are allowed as refund attachments.",
          );
        }
      }

      const slotIdStr = String(slotId);

      const booking = await StudentBooking.findById(bookingId)
        .populate("instructorId", "_id firstName lastName email")
        .populate("studentId", "_id firstName lastName email");

      if (!booking) throw new UserInputError("Booking not found");
      if (booking.studentId._id.toString() !== user.id.toString()) {
        throw new ForbiddenError(
          "Only the student of this booking can request a refund.",
        );
      }

      const slot = booking.slots.id(slotIdStr);
      if (!slot) throw new UserInputError("Slot not found");

      if (slot.status !== "cancelled") {
        throw new UserInputError(
          "Refund can only be requested for a cancelled lesson. Please cancel the lesson first.",
        );
      }

      // Refund cannot be requested for lessons that are already in the past (lesson date/time has passed)
      const slotEnd = new Date(
        `${slot.date}T${slot.endTime || slot.startTime}`,
      );
      if (slotEnd <= new Date()) {
        throw new UserInputError(
          "Refund cannot be requested for lessons that have already passed. Please request a refund before the lesson date.",
        );
      }
      // Consider slot paid if paymentStatus is "paid" OR booking/slot has payment info (instant or T-48)
      const slotPaid =
        String(slot.paymentStatus) === "paid" ||
        (booking.stripePaymentIntentId && slot.chargeAmount != null) ||
        (slot.paymentIntentId && slot.chargeAmount != null);
      if (!slotPaid) {
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
      // Instant payment: booking.stripePaymentIntentId. T-48 payment: slot.paymentIntentId (per-slot PI).
      const paymentIntentId =
        booking.stripePaymentIntentId || slot.paymentIntentId;
      if (!paymentIntentId || slot.chargeAmount == null) {
        await RefundRequest.findByIdAndUpdate(id, {
          status: "rejected",
          processedAt: new Date(),
          processedBy: user.id,
          rejectionReason: "Payment information missing for refund.",
        });
        throw new UserInputError("Payment information missing for refund.");
      }

      const existing = await RefundRequest.findOne({
        bookingId,
        slotId: slotIdStr,
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

      let refundRequest;
      const refundAmountMinor = Number.isSafeInteger(slot.grossAmountMinor)
        ? slot.grossAmountMinor
        : toMinorUnits(slot.chargeAmount);
      try {
        refundRequest = await RefundRequest.create({
          bookingId: booking._id,
          slotId: slotIdStr,
          studentId: booking.studentId._id,
          instructorId: booking.instructorId._id,
          amount: Number(fromMinorUnits(refundAmountMinor)),
          amountMinor: refundAmountMinor,
          currency: DEFAULT_CURRENCY.toUpperCase(),
          status: "pending",
          message: trimmedMessage,
          attachments: normalizedAttachments,
          studentName,
          instructorName,
          slotDate: slot.date,
          slotStartTime: slot.startTime,
          slotEndTime: slot.endTime,
        });
      } catch (err) {
        if (err?.code === 11000) {
          throw new UserInputError(
            "A refund request already exists for this lesson.",
          );
        }
        throw err;
      }

      return refundRequest;
    },

    async approveRefundRequest(_, { id }, { user }) {
      if (!user || user.role !== "Admin") {
        throw new ForbiddenError("Not authorized");
      }

      let refundRequest = await RefundRequest.findOneAndUpdate(
        { _id: id, status: "pending" },
        { $set: { status: "processing" } },
        { new: true },
      );
      if (!refundRequest) {
        const existingRequest = await RefundRequest.findById(id);
        if (!existingRequest) throw new UserInputError("Refund request not found");
        if (existingRequest.status === "processing") {
          const existingOperation = await getLatestOperation({
            aggregateType: "REFUND_REQUEST",
            aggregateId: String(id),
            operationType: "REFUND",
          });
          const leaseActive =
            existingOperation?.status === "PROCESSING" &&
            existingOperation.leaseExpiresAt &&
            new Date(existingOperation.leaseExpiresAt) > new Date();
          if (!leaseActive) refundRequest = existingRequest;
          else throw new UserInputError("Refund request is already processing.");
        } else {
          throw new UserInputError(
            `Refund request is already ${existingRequest.status}.`,
          );
        }
      }

      const booking = await StudentBooking.findById(refundRequest.bookingId)
        .populate("instructorId", "_id firstName lastName email")
        .populate("studentId", "_id firstName lastName email");

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
      // Do not approve refund if lesson was marked completed or missed (data integrity)
      if (slot.status === "completed" || slot.status === "missed") {
        await RefundRequest.findByIdAndUpdate(id, {
          status: "rejected",
          processedAt: new Date(),
          processedBy: user.id,
          rejectionReason:
            "Lesson was marked completed or missed; refund not allowed.",
        });
        throw new UserInputError(
          "Refund cannot be approved: lesson is marked completed or missed.",
        );
      }
      // Do not approve refund if lesson date has passed (request may have been submitted before date passed)
      const slotEnd = new Date(
        `${slot.date}T${slot.endTime || slot.startTime}`,
      );
      if (slotEnd <= new Date()) {
        await RefundRequest.findByIdAndUpdate(id, {
          status: "rejected",
          processedAt: new Date(),
          processedBy: user.id,
          rejectionReason:
            "Lesson date has passed; refund approval not allowed.",
        });
        throw new UserInputError(
          "Refund cannot be approved: lesson date has passed.",
        );
      }
      // Instant payment: booking.stripePaymentIntentId. T-48 payment: slot.paymentIntentId (per-slot PI).
      const paymentIntentId =
        booking.stripePaymentIntentId || slot.paymentIntentId;
      if (!paymentIntentId || slot.chargeAmount == null) {
        throw new UserInputError("Payment information missing for refund.");
      }

      const amountCentimes = Number.isSafeInteger(slot.grossAmountMinor)
        ? slot.grossAmountMinor
        : toMinorUnits(slot.chargeAmount);
      const instructorAmountMinor = Number.isSafeInteger(slot.instructorAmountMinor)
        ? slot.instructorAmountMinor
        : toMinorUnits(slot.instructorAmount || 0);
      const commissionAmountMinor = Number.isSafeInteger(slot.commissionAmountMinor)
        ? slot.commissionAmountMinor
        : toMinorUnits(slot.dspCommission || 0);
      if (amountCentimes <= 0 || instructorAmountMinor + commissionAmountMinor !== amountCentimes) {
        throw new UserInputError("Invalid booking financial snapshot; manual review is required.");
      }

      let refundId;
      let refundProviderStatus;
      let transferId = null;
      let reversalId = null;
      let reversalProviderSucceeded = false;
      const refundOperation = await getOrCreateOperation({
        operationType: "REFUND",
        aggregateType: "REFUND_REQUEST",
        aggregateId: String(refundRequest._id),
        bookingId: booking._id,
        slotId: refundRequest.slotId,
        studentId: booking.studentId._id,
        instructorId: booking.instructorId._id,
        currency: DEFAULT_CURRENCY.toUpperCase(),
        requestedAmount: Number(fromMinorUnits(amountCentimes)),
        requestedAmountMinor: amountCentimes,
        idempotencyKey: `refund-${String(refundRequest._id)}`,
        metadata: {
          bookingId: String(booking._id),
          slotId: String(refundRequest.slotId),
        },
      });
      if (refundOperation.status === "FAILED_MANUAL_REVIEW") {
        throw new UserInputError(
          "This refund requires manual review before it can be retried.",
        );
      }
      let reversalOperation = null;
      try {
        transferId = await getTransferIdFromPaymentIntent(
          paymentIntentId,
        ).catch(() => null);
        if (
          transferId &&
          instructorAmountMinor > 0
        ) {
          const instructorShareCentimes = instructorAmountMinor;
          reversalOperation = await getOrCreateOperation({
            operationType: "TRANSFER_REVERSAL",
            aggregateType: "REFUND_REQUEST",
            aggregateId: String(refundRequest._id),
            bookingId: booking._id,
            slotId: refundRequest.slotId,
            instructorId: booking.instructorId._id,
            currency: DEFAULT_CURRENCY.toUpperCase(),
            requestedAmount: Number(fromMinorUnits(instructorAmountMinor)),
            requestedAmountMinor: instructorAmountMinor,
            idempotencyKey: `reversal-${String(refundRequest._id)}`,
            metadata: {
              bookingId: String(booking._id),
              slotId: String(refundRequest.slotId),
            },
          });
          reversalId = reversalOperation.providerObjectId;
          if (reversalId) {
            const existingReversal = await retrieveTransferReversal(
              transferId,
              reversalId,
            );
            reversalId = existingReversal?.id || reversalId;
            reversalProviderSucceeded = true;
          } else {
            const claimedReversal = await claimOperation(reversalOperation);
            if (!claimedReversal) throw new Error("Transfer reversal is already processing");
            await markAttempt(claimedReversal, claimedReversal.leaseOwner);
            const reversal = await createTransferReversal({
              transferId,
              amountCentimes: instructorShareCentimes,
              metadata: {
                bookingId: String(booking._id),
                slotId: String(refundRequest.slotId),
                operationId: reversalOperation.operationId,
                reason: "refund_approved_by_admin",
              },
              idempotencyKey: reversalOperation.idempotencyKey,
            });
            reversalId = reversal.reversalId;
            await markProviderSuccess(reversalOperation, {
              providerObjectId: reversalId,
              providerStatus: "succeeded",
              localStatus: "provider_succeeded",
            });
            reversalProviderSucceeded = true;
          }
        }

        if (refundOperation.providerObjectId) {
          const existingRefund = await retrieveRefund(
            refundOperation.providerObjectId,
          );
          refundId = existingRefund.id;
          refundProviderStatus = existingRefund.status;
          if (refundOperation.providerStatus === "succeeded") {
            await markProviderSuccess(refundOperation, {
              providerObjectId: refundId,
              providerStatus: existingRefund.status,
              localStatus: "provider_succeeded",
            });
          }
        } else {
          const claimedRefund = await claimOperation(refundOperation);
          if (!claimedRefund) throw new Error("Refund is already processing");
          await markAttempt(claimedRefund, claimedRefund.leaseOwner);
          const result = await createRefund({
            paymentIntentId,
            amountCentimes,
            reason: "requested_by_customer",
            idempotencyKey: refundOperation.idempotencyKey,
          });
          refundId = result.refundId;
          refundProviderStatus = result.status;
          await markProviderSuccess(refundOperation, {
            providerObjectId: refundId,
            providerStatus: "succeeded",
            localStatus: "provider_succeeded",
          });
        }
        if (refundProviderStatus && refundProviderStatus !== "succeeded") {
          const pendingRefund = new Error(
            `Stripe refund status is ${refundProviderStatus}.`,
          );
          pendingRefund.code =
            refundProviderStatus === "pending"
              ? "REFUND_PENDING"
              : "REFUND_NOT_SUCCEEDED";
          throw pendingRefund;
        }
      } catch (stripeErr) {
        const concurrentOperation = String(stripeErr?.message || "").includes(
          "already processing",
        );
        if (concurrentOperation) {
          throw new UserInputError("Refund is already being processed.");
        }
        if (stripeErr?.code === "REFUND_PENDING") {
          await markRetryable(refundOperation, stripeErr);
        } else if (reversalProviderSucceeded || stripeErr?.code === "REFUND_NOT_SUCCEEDED") {
          await markManualReview(
            refundOperation,
            stripeErr,
            "transfer_reversal_succeeded_refund_failed",
          );
        } else {
          await markRetryable(refundOperation, stripeErr);
        }
        if (reversalOperation && !reversalProviderSucceeded) {
          await markRetryable(reversalOperation, stripeErr);
        }
        throw new UserInputError(
          stripeErr.message ||
            "Refund could not be completed. It remains available for recovery.",
        );
      }

      slot.status = "refund";
      slot.paymentStatus = "refunded";
      slot.refundAmount = Number(fromMinorUnits(amountCentimes));
      slot.grossAmountMinor = amountCentimes;
      slot.refundAmountMinor = amountCentimes;
      slot.refundedAt = new Date();
      booking.updatedAt = new Date();
      await booking.save();

      const occurredAt = new Date();
      await createTransaction({
        type: "refund",
        role: "student",
        direction: "credit",
        amount: Number(fromMinorUnits(amountCentimes)),
        amountMinor: amountCentimes,
        currency: DEFAULT_CURRENCY.toUpperCase(),
        status: "succeeded",
        bookingId: booking._id,
        slotId: refundRequest.slotId,
        studentId: booking.studentId._id,
        stripePaymentIntentId: paymentIntentId,
        stripeRefundId: refundId,
        financialOperationId: refundOperation.operationId,
        eventType: "REFUND_STUDENT_CREDIT",
        description: "Refund for cancelled lesson (approved by admin)",
        occurredAt,
      });

      if (
        transferId &&
        instructorAmountMinor > 0
      ) {
        await createTransaction({
          type: "transfer_reversal",
          role: "instructor",
          direction: "debit",
          amount: Number(fromMinorUnits(instructorAmountMinor)),
          amountMinor: instructorAmountMinor,
          currency: DEFAULT_CURRENCY.toUpperCase(),
          status: "succeeded",
          bookingId: booking._id,
          slotId: refundRequest.slotId,
          instructorId: booking.instructorId._id,
          stripePaymentIntentId: paymentIntentId,
          stripeTransferReversalId: reversalId,
          financialOperationId: reversalOperation?.operationId,
          eventType: "TRANSFER_REVERSAL_INSTRUCTOR_DEBIT",
          description: "Reversal of instructor share due to refund",
          occurredAt,
        });
      }
      if (commissionAmountMinor > 0) {
        await createTransaction({
          type: "transfer_reversal",
          role: "platform",
          direction: "debit",
          amount: Number(fromMinorUnits(commissionAmountMinor)),
          amountMinor: commissionAmountMinor,
          currency: DEFAULT_CURRENCY.toUpperCase(),
          status: "succeeded",
          bookingId: booking._id,
          slotId: refundRequest.slotId,
          studentId: booking.studentId._id,
          instructorId: booking.instructorId._id,
          stripePaymentIntentId: paymentIntentId,
          stripeRefundId: refundId,
          financialOperationId: refundOperation.operationId,
          eventType: "REFUND_PLATFORM_COMMISSION_REVERSAL",
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
      await markLocalSuccess(refundOperation, "refund_request_and_booking_applied");
      await markCompleted(refundOperation);
      if (reversalOperation) {
        await markLocalSuccess(reversalOperation, "booking_and_transaction_applied");
        await markCompleted(reversalOperation);
      }
      try {
        await notifyBookingParties(
          booking,
          "booking_refunded",
          user?.email || process.env.ADMIN_EMAIL,
        );
      } catch (mailErr) {
        console.error(
          "[RefundRequest] Failed to send refund notification emails:",
          mailErr,
        );
      }

      return refundRequest;
    },

    async rejectRefundRequest(_, { id, rejectionReason }, { user }) {
      if (!user || user.role !== "Admin") {
        throw new ForbiddenError("Not authorized");
      }

      const refundRequest = await RefundRequest.findOneAndUpdate(
        { _id: id, status: "pending" },
        {
          $set: {
            status: "rejected",
            processedAt: new Date(),
            processedBy: user.id,
            ...(rejectionReason != null ? { rejectionReason } : {}),
          },
        },
        { new: true },
      );
      if (refundRequest) return refundRequest;

      const existingRequest = await RefundRequest.findById(id);
      if (!existingRequest) throw new UserInputError("Refund request not found");
      if (existingRequest.status !== "pending") {
        throw new UserInputError(
          `Refund request is already ${existingRequest.status}.`,
        );
      }
      throw new UserInputError("Refund request could not be rejected. Please retry.");
    },
  },
};

module.exports = refundRequestResolver;
