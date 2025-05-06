const mongoose = require("mongoose");
const { Schema } = mongoose;

const slotSchema = new Schema(
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
  },
  { _id: false }
);

const paymentMethodSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["card", "cash"],
      required: true,
    },
    cardNumber: {
      type: String,
    },
  },
  { _id: false }
);

const studentBookingSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    instructorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    slots: {
      type: [slotSchema],
      required: true,
      validate: [(array) => array.length > 0, "At least one slot is required"],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, "Total amount cannot be negative"],
    },
    paymentMethod: {
      type: paymentMethodSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
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
  }
);

// Add indexes for common queries
studentBookingSchema.index({ studentId: 1, status: 1 });
studentBookingSchema.index({ instructorId: 1, status: 1 });

// Check if the model exists before creating it to prevent the OverwriteModelError
const StudentBooking =
  mongoose.models.StudentBooking ||
  mongoose.model("StudentBookingg", studentBookingSchema);

module.exports = StudentBooking;
