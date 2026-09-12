const mongoose = require("mongoose");
const { Schema } = mongoose;

const minorAmount = {
  type: Number,
  min: 0,
  validate: {
    validator: (value) => value == null || Number.isSafeInteger(value),
    message: "Minor-unit amount must be a safe integer",
  },
};

// Slot Schema - Updated
const slotSchema = new Schema(
  {
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    price: { type: Number, required: true }, // NEW: Price per slot

    // Payment tracking per slot
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

    // Lesson status
    lessonStatus: {
      type: String,
      enum: [
        "upcoming", // Confirmed, not happened yet
        "completed", // Student attended
        "missed", // Student didn't show
        "cancelled", // Cancelled
      ],
      default: "upcoming",
    },

    // Payout tracking
    payoutStatus: {
      type: String,
      enum: [
        "not_applicable", // Lesson not done yet
        "pending", // In 3-day safety window
        "processing", // Payout created
        "completed", // Paid to instructor's bank
      ],
      default: "not_applicable",
    },

    // Stripe payment details
    paymentIntentId: { type: String }, // Stripe PaymentIntent ID
    chargedAt: { type: Date }, // When T-48 charge happened
    chargeAmount: { type: Number }, // Legacy major-unit compatibility field
    grossAmountMinor: minorAmount,

    // Commission split
    dspCommission: { type: Number }, // Legacy major-unit compatibility field
    commissionAmountMinor: minorAmount,
    instructorAmount: { type: Number }, // Legacy major-unit compatibility field
    instructorAmountMinor: minorAmount,

    // Completion tracking
    completionMarkedAt: { type: Date }, // When marked complete/missed
    payoutEligibleAt: { type: Date }, // When payout can happen (+3 days)
    payoutId: { type: String }, // Stripe Payout ID
    payoutDate: { type: Date }, // When paid to bank

    // Refund tracking
    refundStatus: {
      type: String,
      enum: ["none", "requested", "approved", "processed"],
      default: "none",
    },
    refundAmount: { type: Number }, // Legacy major-unit compatibility field
    refundAmountMinor: minorAmount,
    refundPercentage: { type: Number }, // Refund percentage
    refundReason: { type: String }, // Why refunded
    refundDate: { type: Date }, // When refunded

    // Old fields (keep for backward compatibility)
    booked: { type: Boolean, default: false },
    review: { type: Boolean, default: false },
    cancellationDate: { type: String },
  },
  { _id: true },
);

// Payment Method Schema - Updated for Stripe
const paymentMethodSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["card", "twint"],
      required: true,
    },
    // Stripe-specific fields
    setupIntentId: { type: String }, // Stripe SetupIntent ID
    paymentMethodId: { type: String }, // Stripe PaymentMethod ID

    // Card details (last 4 digits for display)
    cardLast4: { type: String },
    cardBrand: { type: String }, // visa, mastercard, etc.

    // TWINT details
    twintToken: { type: String }, // TWINT User-on-File token
  },
  { _id: false },
);

// Main Booking Schema - Updated
const studentBookingSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    instructorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Slots
    slots: {
      type: [slotSchema],
      required: true,
      validate: [(array) => array.length > 0, "At least one slot is required"],
    },

    // Payment info
    totalAmount: {
      type: Number,
      required: true,
      min: [0, "Total amount cannot be negative"],
    },
    currency: { type: String, enum: ["CHF"], default: "CHF" },
    grossAmountMinor: minorAmount,
    commissionAmountMinor: minorAmount,
    instructorAmountMinor: minorAmount,
    paymentMethod: {
      type: paymentMethodSchema,
      required: true,
    },

    // Stripe customer
    stripeCustomerId: { type: String }, // Stripe Customer ID

    // Overall booking status (derived from slots)
    status: {
      type: String,
      enum: [
        "pending_payment", // All slots awaiting payment
        "partially_paid", // Some slots paid, some pending
        "confirmed", // All slots paid
        "in_progress", // Some lessons happened
        "completed", // All lessons done
        "semi_cancelled", // Some slots cancelled, some still activethere
        "cancelled", // All slots cancelled
        "refunded", // Refunded
      ],
      default: "pending_payment",
    },

    // Feedback
    feedBackStatus: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },

    // Metadata
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

// Indexes
studentBookingSchema.index({ studentId: 1, status: 1 });
studentBookingSchema.index({ instructorId: 1, status: 1 });
studentBookingSchema.index({ "slots.paymentStatus": 1 });
studentBookingSchema.index({ "slots.payoutStatus": 1 });
studentBookingSchema.index({ "slots.paymentIntentId": 1 });
studentBookingSchema.index({ stripeCustomerId: 1 });

// Virtual for calculating booking-level status
studentBookingSchema.virtual("overallStatus").get(function () {
  const allPaid = this.slots.every((s) => s.paymentStatus === "paid");
  const anyPaid = this.slots.some((s) => s.paymentStatus === "paid");
  const allCompleted = this.slots.every(
    (s) => s.lessonStatus === "completed" || s.lessonStatus === "missed",
  );

  if (allCompleted) return "completed";
  if (allPaid) return "confirmed";
  if (anyPaid) return "partially_paid";
  return "pending_payment";
});

const StudentBooking =
  mongoose.models.StudentBooking ||
  mongoose.model("StudentBooking", studentBookingSchema);

module.exports = StudentBooking;
