const mongoose = require("mongoose");

const stripeWebhookEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    eventType: { type: String, required: true },
    stripeAccountId: { type: String },
    apiVersion: { type: String },
    livemode: { type: Boolean },
    createdAtProvider: { type: Date },
    status: {
      type: String,
      required: true,
      enum: ["RECEIVED", "PROCESSING", "PROCESSED", "RETRYABLE", "DEAD", "IGNORED"],
      default: "RECEIVED",
    },
    attemptCount: { type: Number, required: true, default: 0 },
    nextAttemptAt: { type: Date },
    lastAttemptAt: { type: Date },
    processedAt: { type: Date },
    leaseOwner: { type: String },
    leaseExpiresAt: { type: Date },
    providerObjectType: { type: String },
    providerObjectId: { type: String },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    localStatus: { type: String },
    lastErrorCode: { type: String },
    lastErrorMessage: { type: String },
    receivedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

stripeWebhookEventSchema.index({ status: 1, nextAttemptAt: 1, receivedAt: 1 });
stripeWebhookEventSchema.index({ status: 1, leaseExpiresAt: 1 });
stripeWebhookEventSchema.index({ providerObjectId: 1, eventType: 1 });
stripeWebhookEventSchema.index({ eventType: 1, receivedAt: 1 });

module.exports = mongoose.model("StripeWebhookEvent", stripeWebhookEventSchema);
