const mongoose = require("mongoose");

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
  },
  {
    timestamps: true,
  }
);
availabilitySlotSchema.index(
  { teacherId: 1, date: 1, startTime: 1, endTime: 1 },
  { unique: true }
);

// Create index for efficient querying
availabilitySlotSchema.index({ teacherId: 1, date: 1 });

module.exports = mongoose.model("TeacherAvailability", availabilitySlotSchema);
