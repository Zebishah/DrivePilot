const mongoose = require("mongoose");

const OUTBOX_STATUSES = [
  "PENDING",
  "PROCESSING",
  "RETRYABLE",
  "DELIVERED",
  "DEAD",
];

const outboxEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    eventType: { type: String, required: true, index: true },
    aggregateType: { type: String, required: true },
    aggregateId: { type: String, required: true },
    dedupeKey: { type: String, required: true, unique: true },
    status: { type: String, required: true, enum: OUTBOX_STATUSES, default: "PENDING" },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    attemptCount: { type: Number, required: true, default: 0, min: 0 },
    maxAttempts: { type: Number, required: true, default: 8, min: 1, max: 20 },
    nextAttemptAt: { type: Date },
    availableAt: { type: Date, required: true, default: Date.now },
    leaseOwner: { type: String },
    leaseExpiresAt: { type: Date },
    processingStartedAt: { type: Date },
    deliveredAt: { type: Date },
    failedAt: { type: Date },
    lastErrorCode: { type: String },
    lastErrorMessage: { type: String },
    provider: { type: String },
    providerMessageId: { type: String },
    replayCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

outboxEventSchema.index({ status: 1, availableAt: 1, nextAttemptAt: 1 });
outboxEventSchema.index({ status: 1, leaseExpiresAt: 1 });
outboxEventSchema.index({ eventType: 1, status: 1, createdAt: -1 });
outboxEventSchema.index({ createdAt: 1 });

outboxEventSchema.statics.statuses = OUTBOX_STATUSES;

module.exports = mongoose.model("OutboxEvent", outboxEventSchema);
