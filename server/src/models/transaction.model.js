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
    currency: {
      type: String,
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
    description: String,
    occurredAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Transaction", transactionSchema);
