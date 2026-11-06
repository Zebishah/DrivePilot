const mongoose = require("mongoose");

const financialOperationSchema = new mongoose.Schema(
  {
    operationId: { type: String, required: true, unique: true },
    operationType: {
      type: String,
      required: true,
      enum: [
        "DIRECT_PAYMENT",
        "CHECKOUT_SESSION",
        "T48_PAYMENT",
        "REFUND",
        "TRANSFER_REVERSAL",
        "PAYOUT",
      ],
    },
    aggregateType: { type: String, required: true },
    aggregateId: { type: String, required: true },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentBooking",
    },
    slotId: { type: String },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Instructor",
    },
    currency: { type: String, required: true, enum: ["CHF"], default: "CHF" },
    // Legacy major-unit amount retained for read compatibility.
    requestedAmount: { type: Number },
    requestedAmountMinor: {
      type: Number,
      min: 0,
      validate: {
        validator: (value) => value == null || Number.isSafeInteger(value),
        message: "requestedAmountMinor must be a safe integer",
      },
    },
    provider: { type: String, required: true, default: "stripe" },
    providerObjectId: { type: String },
    secondaryProviderObjectId: { type: String },
    idempotencyKey: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: [
        "PENDING",
        "PROCESSING",
        "VERIFYING_PROVIDER",
        "PROVIDER_SUCCEEDED",
        "LOCAL_APPLIED",
        "COMPLETED",
        "RETRYABLE",
        "FAILED_MANUAL_REVIEW",
      ],
      default: "PENDING",
    },
    providerStatus: { type: String },
    localStatus: { type: String },
    attemptCount: { type: Number, required: true, default: 0 },
    lastAttemptAt: { type: Date },
    nextAttemptAt: { type: Date },
    lastErrorCode: { type: String },
    lastErrorMessage: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    leaseOwner: { type: String },
    leaseExpiresAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

// A key is unique for each business/provider operation. Existing provider
// IDs are unique only when present, allowing pre-Phase-2 records to coexist.
financialOperationSchema.index({ idempotencyKey: 1 }, { unique: true });
financialOperationSchema.index(
  { providerObjectId: 1 },
  {
    unique: true,
    partialFilterExpression: { providerObjectId: { $type: "string" } },
  },
);
financialOperationSchema.index({ operationType: 1, aggregateType: 1, aggregateId: 1 });
financialOperationSchema.index({ bookingId: 1, slotId: 1, operationType: 1 });
financialOperationSchema.index({ status: 1, nextAttemptAt: 1 });
financialOperationSchema.index({ status: 1, operationType: 1, providerObjectId: 1, updatedAt: 1 });
financialOperationSchema.index({ leaseExpiresAt: 1 });

module.exports = mongoose.model("FinancialOperation", financialOperationSchema);
