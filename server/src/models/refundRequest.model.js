const mongoose = require("mongoose");

const refundRequestSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentBooking",
      required: true,
    },
    slotId: {
      type: String,
      required: true,
    },
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
    amount: { type: Number, required: true },
    amountMinor: {
      type: Number,
      min: 0,
      validate: {
        validator: (value) => value == null || Number.isSafeInteger(value),
        message: "amountMinor must be a safe integer",
      },
    },
    currency: { type: String, enum: ["CHF"], default: "CHF" },
    status: {
      type: String,
      enum: ["pending", "processing", "approved", "rejected"],
      default: "pending",
    },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    stripeRefundId: { type: String },
    rejectionReason: { type: String },
    message: { type: String, required: true, trim: true },
    attachments: [
      {
        url: { type: String, required: true },
        fileName: { type: String, required: true },
        mimeType: { type: String, required: true },
      },
    ],
    // Snapshot for admin display (student/instructor names)
    studentName: { type: String },
    instructorName: { type: String },
    slotDate: { type: String },
    slotStartTime: { type: String },
    slotEndTime: { type: String },
  },
  { timestamps: true },
);

refundRequestSchema.index({ bookingId: 1, slotId: 1 }, { unique: true });
refundRequestSchema.index({ studentId: 1, status: 1 });
refundRequestSchema.index({ status: 1 });
refundRequestSchema.index({ bookingId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("RefundRequest", refundRequestSchema);
