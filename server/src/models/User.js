const mongoose = require("mongoose");

const baseOptions = {
  discriminatorKey: "role",
  collection: "users",
};

const baseSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["Student", "Instructor", "Admin", "UserBase"],
      default: "UserBase",
      required: false,
    },
    isProfileComplete: { type: Boolean, default: false },
    isUserVerified: { type: Boolean, default: false },
    isUserAuthenticated: { type: Boolean, default: false },
    authProvider: {
      type: String,
      enum: ["local", "google", "facebook"],
      default: "local",
    },
    providerId: String,

    // Stripe Customer ID (for students making payments)
    stripeCustomerId: { type: String },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
  },
  baseOptions
);

const User = mongoose.model("User", baseSchema);

// OTP Schema
const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: Number, required: true },
  status: {
    type: String,
    enum: ["unused", "used", "expired"],
    default: "unused",
  },
  type: {
    type: String,
    enum: ["email_verification", "two_factor_auth"],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});
const Otp = mongoose.model("Otp", otpSchema);

// Student Document Schema
const DocumentSchema = new mongoose.Schema({
  documentType: { type: String, required: true },
  documentUrl: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
});

// Instructor Document Schema
const validDocumentTypes = [
  "Swiss Driving License (Front)",
  "Swiss Driving License (Back)",
  "National ID or Passport",
  "Federal Driving Instructor Certificate",
  "Swiss Criminal Record Extract",
  "Driving Instructor Authorization",
  "Professional Passenger Transport Authorization",
  "Refresher Training Certificates",
  "Other Document (Optional)",
];

const InstructorDocumentSchema = new mongoose.Schema({
  documentType: {
    type: String,
    required: true,
    validate: {
      validator: (v) => validDocumentTypes.includes(v),
      message: (props) => `${props.value} is not a valid document type!`,
    },
  },
  documentUrl: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
  reSubmitted: { type: Date, default: null },
});

// STUDENT SCHEMA
const StudentSchema = new mongoose.Schema({
  homeAddress: String,
  location: String,
  zipCode: String,
  documentType: { type: String, required: false },
  documentUrl: { type: String, required: false },
  documents: [DocumentSchema],

  paymentInfo: {
    isPaid: { type: Boolean, default: false },
    paymentDate: Date,
  },

  // Stripe Payment Methods (Saved Cards/TWINT)
  stripePaymentMethods: [
    {
      paymentMethodId: { type: String, required: true },
      type: {
        type: String,
        enum: ["card", "twint"],
        required: true,
      },
      isDefault: { type: Boolean, default: false },

      // Card details (for display only - last 4 digits)
      cardBrand: { type: String },
      cardLast4: { type: String },
      cardExpMonth: { type: Number },
      cardExpYear: { type: Number },

      // TWINT details
      twintToken: { type: String },
      twintRegisteredAt: { type: Date },

      createdAt: { type: Date, default: Date.now },
    },
  ],

  // Default payment method
  defaultPaymentMethod: {
    type: { type: String, enum: ["card", "twint"] },
    paymentMethodId: { type: String },
  },

  description: { type: String, required: false },
  lessonHoursLeft: { type: String, required: false },
  experience: { type: String, required: false },
  phone: { type: String, required: false },
  fatherName: { type: String, required: false },
  profileImage: { type: String, required: false },
  dateOfBirth: { type: String, required: false },
  languagePreference: { type: [String], required: false },
});

// INSTRUCTOR SCHEMA
const InstructorSchema = new mongoose.Schema({
  address: { type: String, required: false },
  location: { type: String, required: false },
  zipCode: { type: String, required: false },
  description: { type: String, required: false },
  experience: { type: String, required: false },
  documents: [InstructorDocumentSchema],
  phone: { type: String, required: false },
  fatherName: { type: String, required: false },
  profileImage: { type: String, required: false },

  verificationStatus: {
    type: String,
    enum: ["pending", "verified", "rejected"],
    default: "pending",
  },

  // Stripe Connected Account (for receiving payouts)
  stripeConnectedAccountId: { type: String },

  // Stripe onboarding status
  stripeOnboardingStatus: {
    type: String,
    enum: ["not_started", "in_progress", "completed"],
    default: "not_started",
  },

  // Bank account verification status
  bankAccountVerified: { type: Boolean, default: false },

  // Payout settings
  payoutSettings: {
    schedule: {
      type: String,
      enum: ["manual", "automatic"],
      default: "manual",
    },
    delayDays: { type: Number, default: 3 },
  },

  // Earnings tracking
  earnings: {
    totalEarned: { type: Number, default: 0 },
    pendingPayout: { type: Number, default: 0 },
    totalPaidOut: { type: Number, default: 0 },
    lastPayoutDate: { type: Date },
  },

  // Commission rate (DSP takes this %, instructor gets rest)
  commissionRate: { type: Number, default: 20 },

  // Refund statistics
  refundStats: {
    totalRefundsReceived: { type: Number, default: 0 },
    totalRefundAmount: { type: Number, default: 0 },
  },

  dateOfBirth: { type: String, required: false },
  languagePreference: { type: [String], required: false },
  coordinates: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
  },
  carName: { type: String, required: false },
  transmissionType: {
    type: String,
    enum: ["Automatic", "Manual"],
    required: false,
  },
  gender: {
    type: String,
    enum: ["Male", "Female", "Other"],
    required: false,
  },
});

// ADMIN SCHEMA
const AdminSchema = new mongoose.Schema({
  adminLevel: {
    type: String,
    enum: ["super", "regular"],
    default: "regular",
  },

  // Platform-wide commission settings
  platformCommission: {
    defaultRate: { type: Number, default: 20 },
    canModifyRates: { type: Boolean, default: true },
  },

  // Refund management tracking
  refundManagement: {
    totalRefundsProcessed: { type: Number, default: 0 },
    totalRefundAmount: { type: Number, default: 0 },
    lastRefundProcessedAt: { type: Date },
  },

  // Commission tracking
  commissionEarnings: {
    totalCommissionEarned: { type: Number, default: 0 },
    thisMonthCommission: { type: Number, default: 0 },
    lastMonthCommission: { type: Number, default: 0 },
  },
});

InstructorSchema.index({ coordinates: "2dsphere" });

const Student = User.discriminator("Student", StudentSchema);
const Instructor = User.discriminator("Instructor", InstructorSchema);
const Admin = User.discriminator("Admin", AdminSchema);

module.exports = {
  User,
  Student,
  Instructor,
  Admin,
  Otp,
};
