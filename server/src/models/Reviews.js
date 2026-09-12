const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    reviewStatus: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    reviewRating: {
      type: Number,
      min: 1,
      max: 5,
      required: false, // Only required when review is completed
    },
    reviewDescription: {
      type: String,
      required: false, // Only required when review is completed
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Instructor",
      required: true,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentBooking",
      required: true,
    },
    slotId: {
      type: String, // Since slots are embedded, we'll use the slot's id field
      required: true,
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

// A student may review a lesson slot once. The uniqueness key mirrors the
// mutation's business identity and closes the read-before-create race.
reviewSchema.index({ lessonId: 1, slotId: 1, studentId: 1 }, { unique: true });
reviewSchema.index({ instructorId: 1, createdAt: -1 });
reviewSchema.index({ studentId: 1, createdAt: -1 });

const Review = mongoose.model("Review", reviewSchema);
module.exports = { Review };
