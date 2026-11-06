const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["payment", "payout", "refund", "transfer_reversal", "adjustment"],
      required: true,
    },
    role: {
      type: String,
      enum: ["platform", "instructor", "student"],
      required: true,
    },
    direction: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    amountMinor: {
      type: Number,
      min: 0,
      validate: {
        validator: (value) => value == null || Number.isSafeInteger(value),
        message: "amountMinor must be a safe integer",
      },
    },
    currency: {
      type: String,
      enum: ["CHF"],
      default: "CHF",
    },
    status: {
      type: String,
      enum: ["pending", "succeeded", "failed", "cancelled"],
      default: "succeeded",
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentBooking",
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Instructor",
    },
    stripePaymentIntentId: String,
    stripeChargeId: String,
    stripeTransferId: String,
    stripePayoutId: String,
    stripeRefundId: String,
    stripeTransferReversalId: String,
    financialOperationId: String,
    eventType: String,
    correlationKey: String,
    description: String,
    occurredAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

transactionSchema.index(
  { financialOperationId: 1, eventType: 1 },
  {
    unique: true,
    partialFilterExpression: {
      financialOperationId: { $type: "string" },
      eventType: { $type: "string" },
    },
  },
);
transactionSchema.index(
  { correlationKey: 1 },
  { unique: true, partialFilterExpression: { correlationKey: { $type: "string" } } },
);
transactionSchema.index({ bookingId: 1, occurredAt: 1 });
transactionSchema.index({ studentId: 1, role: 1, occurredAt: -1 });
transactionSchema.index({ instructorId: 1, role: 1, occurredAt: -1 });
transactionSchema.index({ type: 1, status: 1, occurredAt: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
