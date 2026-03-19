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
          enum: [
            "pending_payment", // Awaiting T-48 charge
            "payment_failed", // T-48 charge failed
            "requires_action", // 3DS authentication needed
            "paid", // Payment successful
            "refunded", // Refunded
          ],
          default: "pending_payment",
        },
        // Per-slot Stripe PaymentIntent for T-48 charging
        paymentIntentId: { type: String },
        chargedAt: { type: Date },
        /** Number of T-48 charge attempts; after max retries slot is marked payment_failed */
        paymentRetryCount: { type: Number, default: 0 },
        chargeAmount: { type: Number },
        dspCommission: { type: Number },
        instructorAmount: { type: Number },
        // --- Payout (3 days after completed) ---
        payoutStatus: {
          type: String,
          enum: ["not_applicable", "pending", "processing", "completed"],
          default: "not_applicable",
        },
        completionMarkedAt: { type: Date },
        payoutEligibleAt: { type: Date },
        payoutId: { type: String },
        payoutDate: { type: Date },
        // --- Refund ---
        refundAmount: { type: Number },
        refundedAt: { type: Date },
        // --- Lesson-end reminder ---
        lessonEndReminderSent: { type: Boolean, default: false },
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
      // For card payments (immediate or T-48)
      paymentMethodId: { type: String },
      cardLast4: { type: String },
      cardBrand: { type: String },
      // For deferred flow when using SetupIntents (optional)
      setupIntentId: { type: String },
    },
    stripePaymentIntentId: { type: String },
    /** Stripe Customer ID; required for off-session (T-48) charges when payment method was saved via setup mode */
    stripeCustomerId: { type: String },
    cancellationDate: { type: Date },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "completed",
        "semi_cancelled",
        "cancelled",
        "refund",
      ],
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
