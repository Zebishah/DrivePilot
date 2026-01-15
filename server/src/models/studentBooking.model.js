const mongoose = require("mongoose");
const { Review } = require("./Reviews");

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
        feedBackStatus: {
          type: String,
          enum: ["pending", "completed"],
          default: "pending",
        },
        booked: {
          type: Boolean,
          default: false,
        },
        cancellationDate: { type: Date }, // 👈 slot-level cancellation
        review: {
          type: Boolean,
          default: false,
        },
        status: {
          type: String,
          enum: [
            "available",
            "booked",
            "cancelled",
            "refund",
            "missed",
            "completed",
          ],
          default: "available",
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
    cancellationDate: { type: Date },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "refund",
        "semi_cancelled",
      ],
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
