const mongoose = require("mongoose");

const jobExecutionSchema = new mongoose.Schema(
  {
    jobName: { type: String, required: true, unique: true },
    runId: { type: String },
    status: {
      type: String,
      enum: ["IDLE", "RUNNING", "SUCCEEDED", "FAILED"],
      default: "IDLE",
    },
    leaseOwner: { type: String },
    leaseExpiresAt: { type: Date },
    startedAt: { type: Date },
    finishedAt: { type: Date },
    attemptCount: { type: Number, default: 0 },
    lastError: { type: String },
    nextRunAt: { type: Date },
    processedCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

jobExecutionSchema.index({ status: 1, leaseExpiresAt: 1 });
jobExecutionSchema.index({ jobName: 1, nextRunAt: 1 });

module.exports = mongoose.model("JobExecution", jobExecutionSchema);
