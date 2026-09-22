const mongoose = require("mongoose");

const bookingEventSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "StudentBooking", required: true },
    slotId: { type: String },
    eventType: { type: String, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorRole: { type: String, enum: ["Student", "Instructor", "Admin", "System"] },
    fromState: { type: String },
    toState: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    dedupeKey: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

bookingEventSchema.index({ bookingId: 1, createdAt: 1 });

module.exports = mongoose.models.BookingEvent || mongoose.model("BookingEvent", bookingEventSchema);
