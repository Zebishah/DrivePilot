const mongoose = require("mongoose");

const favoriteInstructorSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    instructorId: { type: mongoose.Schema.Types.ObjectId, ref: "Instructor", required: true },
  },
  { timestamps: true },
);

favoriteInstructorSchema.index({ studentId: 1, instructorId: 1 }, { unique: true });
favoriteInstructorSchema.index({ studentId: 1, createdAt: -1 });

module.exports = mongoose.models.FavoriteInstructor || mongoose.model("FavoriteInstructor", favoriteInstructorSchema);
