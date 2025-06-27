const { default: mongoose } = require("mongoose");

const bulkLessonPackageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
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
  packageDiscount: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  PackageEndDate: {
    type: Date,
    default: null,
  },
  finalPackagePrice: {
    type: Number,
    required: true,
  },
  studentSave: {
    type: Number,
    required: true,
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

    lessonDiscount: {
      type: Number,
      required: true,
    },
    FinalPricePerLesson: {
      type: Number,
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TeacherTariff", teacherTariffSchema);
