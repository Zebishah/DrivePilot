const mongoose = require("mongoose");
const { Review } = require("./Reviews");

const minorAmount = {
  type: Number,
  min: 0,
  validate: {
    validator: (value) => value == null || Number.isSafeInteger(value),
    message: "Minor-unit amount must be a safe integer",
  },
};

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
        cancelledBy: { type: String, enum: ["student", "instructor", "admin"] },
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
        rescheduleRequest: {
          status: { type: String, enum: ["none", "pending", "accepted", "rejected"], default: "none" },
          requestedBy: { type: String, enum: ["student", "instructor", "admin"] },
          requestedAt: { type: Date },
          respondedAt: { type: Date },
          responseReason: { type: String, maxlength: 500 },
          newDate: { type: String },
          newStartTime: { type: String },
          newEndTime: { type: String },
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
        // Connected account charge/payment ID (often `py_...`) for strict refund mapping
        connectChargeId: { type: String },
        // Transfer ID (`tr_...`) to correlate connect charge events
        transferId: { type: String },
        chargedAt: { type: Date },
        /** Number of T-48 charge attempts; after max retries slot is marked payment_failed */
        paymentRetryCount: { type: Number, default: 0 },
        chargeAmount: { type: Number },
        dspCommission: { type: Number },
        instructorAmount: { type: Number },
        grossAmountMinor: minorAmount,
        commissionAmountMinor: minorAmount,
        instructorAmountMinor: minorAmount,
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
        refundAmountMinor: minorAmount,
        refundedAt: { type: Date },
        // --- Lesson-end reminder ---
        lessonEndReminderSent: { type: Boolean, default: false },
        lessonEndReminderClaimedAt: { type: Date },
        lessonEndReminderClaimedUntil: { type: Date },
        lessonEndReminderClaimOwner: { type: String },
        lessonEndReminderAttemptCount: { type: Number, default: 0 },
        // --- T-48 payment follow-up reminders ---
        paymentReminderStartedAt: { type: Date },
        paymentReminderDeadlineAt: { type: Date },
        paymentReminder1SentAt: { type: Date },
        paymentReminder2SentAt: { type: Date },
        paymentReminder3SentAt: { type: Date },
        paymentReminderClaimedAt: { type: Date },
        paymentReminderClaimedUntil: { type: Date },
        paymentReminderClaimOwner: { type: String },
        paymentReminderAttemptCount: { type: Number, default: 0 },
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
    currency: { type: String, enum: ["CHF"], default: "CHF" },
    grossAmountMinor: minorAmount,
    commissionAmountMinor: minorAmount,
    instructorAmountMinor: minorAmount,
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
    paymentCorrelationId: { type: String },
    /** Stripe Customer ID; required for off-session (T-48) charges when payment method was saved via setup mode */
    stripeCustomerId: { type: String },
    checkoutSessionId: { type: String },
    checkoutAttempt: { type: Number, default: 0 },
    /** Abandoned checkout reminder tracking (student incentive email) */
    abandonedCheckoutReminderSentAt: { type: Date },
    abandonedCheckoutReminderClaimedAt: { type: Date },
    abandonedCheckoutReminderClaimedUntil: { type: Date },
    abandonedCheckoutReminderClaimOwner: { type: String },
    abandonedCheckoutReminderAttemptCount: { type: Number, default: 0 },
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

studentBookingSchema.index({ studentId: 1, status: 1 });
studentBookingSchema.index({ instructorId: 1, status: 1 });
studentBookingSchema.index({ "slots.paymentStatus": 1 });
studentBookingSchema.index({ "slots.payoutStatus": 1 });
studentBookingSchema.index({ "slots.paymentStatus": 1, "slots.payoutEligibleAt": 1 });
studentBookingSchema.index({ "slots.payoutStatus": 1, "slots.payoutEligibleAt": 1 });
studentBookingSchema.index({ "slots.paymentIntentId": 1 });
studentBookingSchema.index({ stripeCustomerId: 1 });
studentBookingSchema.index({ status: 1, createdAt: 1, stripeCustomerId: 1 });
studentBookingSchema.index({ instructorId: 1, createdAt: -1 });
studentBookingSchema.index({ studentId: 1, createdAt: -1 });
studentBookingSchema.index({ stripePaymentIntentId: 1 });
studentBookingSchema.index({ checkoutSessionId: 1 });
studentBookingSchema.index({ "slots.lessonEndReminderSent": 1 });
studentBookingSchema.index({ "slots.paymentReminderDeadlineAt": 1 });

module.exports =
  mongoose.models.StudentBooking || mongoose.model("StudentBooking", studentBookingSchema);
