const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema({
  id: { type: String },
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  booked: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["available", "booked", "cancelled"],
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
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["available", "booked", "cancelled"],
      default: "available",
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

availabilitySlotSchema.index(
  { teacherId: 1, date: 1, startTime: 1, endTime: 1 },
  { unique: true }
);

availabilitySlotSchema.index({ teacherId: 1, date: 1 });

module.exports = mongoose.model("TeacherAvailability", availabilitySlotSchema);
