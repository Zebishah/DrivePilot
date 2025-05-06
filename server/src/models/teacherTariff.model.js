const mongoose = require("mongoose");

const bulkLessonPackageSchema = new mongoose.Schema({
  lessons: {
    type: Number,
    required: true,
    min: 2,
    max: 40,
  },
  cost: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  startDate: {
    type: String,
    default: null,
  },
  endDate: {
    type: String,
    default: null,
  },
});

const teacherTariffSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lessonFee: {
      type: Number,
      required: true,
    },
    bulkPackages: [bulkLessonPackageSchema],
    packageDiscount: {
      type: Number,
      required: true,
    },
    discountStartDate: {
      type: String,
    },
    discountEndDate: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TeacherTariff", teacherTariffSchema);
