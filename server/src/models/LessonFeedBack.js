// models/Feedback.js
const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Lesson ID is required"],
    ref: "Lesson",
  },
  instructorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Instructor ID is required"],
    ref: "User",
  },
  instructorEmail: {
    type: String,
    required: [true, "Instructor email is required"],
    trim: true,
    lowercase: true,
  },
  feedbackTags: [
    {
      type: String,
      required: true,
      trim: true,
    },
  ],
  title: {
    type: String,
    required: [true, "Title is required"],
    trim: true,
    maxlength: [500, "Title cannot exceed 500 characters"],
  },
  message: {
    type: String,
    required: [true, "Message is required"],
    trim: true,
    maxlength: [5000, "Message cannot exceed 5000 characters"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
feedbackSchema.pre("save", function (next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

// Create a compound index to ensure one feedback per lesson per instructor
feedbackSchema.index({ lessonId: 1, instructorId: 1 }, { unique: true });

// Add text index for searching
feedbackSchema.index({
  title: "text",
  message: "text",
  feedbackTags: "text",
});

module.exports = mongoose.model("Feedback", feedbackSchema);
