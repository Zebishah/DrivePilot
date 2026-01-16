const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema({
  id: { type: String },
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  booked: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["available", "booked", "cancelled", "missed", "completed", "refund"],
    default: "available",
  },
});
const availabilitySlotSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "available",
        "booked",
        "cancelled",
        "missed",
        "completed",
        "refund",
        "yet",
      ],
      default: "available",
    },
    availableSlots: {
      type: [slotSchema],
      default: [],
    },

    slots: {
      type: [slotSchema],
      required: false, // Optional; can be added during booking
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Avoid duplicate date/time range for the same teacher
availabilitySlotSchema.index(
  { teacherId: 1, date: 1, startTime: 1, endTime: 1 },
  { unique: true }
);
availabilitySlotSchema.index({ teacherId: 1, date: 1 });

module.exports = mongoose.model("TeacherAvailability", availabilitySlotSchema);
