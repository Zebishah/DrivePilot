const mongoose = require("mongoose");
const { Review } = require("./Reviews");

const studentBookingSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Instructor",
      required: true,
    },
    slots: [
      {
        date: {
          type: String,
          required: true,
        },
        startTime: {
          type: String,
          required: true,
        },
        endTime: {
          type: String,
          required: true,
        },
        feedBackStatus: {
          type: String,
          enum: ["pending", "completed"],
          default: "pending",
        },
        booked: {
          type: Boolean,
          default: false,
        },
        cancellationDate: { type: Date },
        review: {
          type: Boolean,
          default: false,
        },
        status: {
          type: String,
          enum: [
            "available",
            "booked",
            "confirmed",
            "completed",
            "missed",
            "cancelled",
            "refund",
          ],
          default: "available",
        },
        // --- Payment (per-slot for instant pay; T-48 will use later) ---
        paymentStatus: {
          type: String,
          enum: ["pending_payment", "paid", "refunded"],
          default: "pending_payment",
        },
        chargeAmount: { type: Number },
        dspCommission: { type: Number },
        instructorAmount: { type: Number },
        // --- Payout (3 days after completed) ---
        payoutStatus: {
          type: String,
          enum: ["not_applicable", "pending", "completed"],
          default: "not_applicable",
        },
        completionMarkedAt: { type: Date },
        payoutEligibleAt: { type: Date },
        payoutId: { type: String },
        payoutDate: { type: Date },
        // --- Refund ---
        refundAmount: { type: Number },
        refundedAt: { type: Date },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    finalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: {
        type: String,
        required: true,
      },
      cardNumber: {
        type: String,
        required: false,
      },
      paymentMethodId: { type: String },
      cardLast4: { type: String },
      cardBrand: { type: String },
    },
    stripePaymentIntentId: { type: String },
    cancellationDate: { type: Date },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled", "refund"],
      default: "pending",
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("StudentBooking", studentBookingSchema);
