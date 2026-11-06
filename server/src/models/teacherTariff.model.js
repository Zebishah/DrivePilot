const { default: mongoose } = require("mongoose");

const minorAmount = {
  type: Number,
  min: 0,
  validate: {
    validator: (value) => value == null || Number.isSafeInteger(value),
    message: "Minor-unit amount must be a safe integer",
  },
};

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
  costMinor: minorAmount,
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
  finalPackagePriceMinor: minorAmount,
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
    lessonFeeMinor: minorAmount,
    bulkPackages: [bulkLessonPackageSchema],

    lessonDiscount: {
      type: Number,
      required: true,
    },
    FinalPricePerLesson: {
      type: Number,
      required: true,
    },
    FinalPricePerLessonMinor: minorAmount,
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TeacherTariff", teacherTariffSchema);
