const mongoose = require("mongoose");

const studentBookingSchema = new mongoose.Schema(
  {
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
    slots: [
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
        booked: {
          type: Boolean,
          default: false,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    finalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: {
        type: String,
        required: true,
      },
      cardNumber: {
        type: String,
        required: false,
      },
    },
    feedBackStatus: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
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

module.exports = mongoose.model("StudentBooking", studentBookingSchema);
