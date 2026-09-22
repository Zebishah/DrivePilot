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
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    notificationPreferences: {
      bookingUpdates: { type: Boolean, default: true },
      lessonReminders: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      paymentUpdates: { type: Boolean, default: true },
      feedbackNotifications: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
      reviews: { type: Boolean, default: true },
      documentStatus: { type: Boolean, default: true },
    },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
  },
  baseOptions,
);

const User = mongoose.model("User", baseSchema);

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  // OTPs are strings so a valid code can never lose a leading zero.
  otp: { type: String, required: true, match: /^\d{6}$/ },
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
  stripePaymentMethods: [
    {
      paymentMethodId: { type: String, required: true },
      type: {
        type: String,
        enum: ["card", "twint"],
        required: true,
      },
      isDefault: { type: Boolean, default: false },
      cardBrand: { type: String },
      cardLast4: { type: String },
      cardExpMonth: { type: Number },
      cardExpYear: { type: Number },
      twintToken: { type: String },
      twintRegisteredAt: { type: Date },
      createdAt: { type: Date, default: Date.now },
    },
  ],
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
  stripeFinancialStatus: {
    hasDisputes: { type: Boolean, default: false },
    currentlyDueRequirements: { type: Boolean, default: false },
    payoutsBlocked: { type: Boolean, default: false },
    lastWebhookSync: Date,
  },

  stripeAccount: {
    accountId: {
      type: String,
      index: true,
      sparse: true,
    },

    accountType: {
      type: String,
      enum: ["express"],
      default: "express",
    },

    // v1 is the legacy Express account shape; new accounts are created with
    // Accounts v2 while retaining the same Express Dashboard experience.
    accountVersion: {
      type: String,
      enum: ["v1", "v2"],
      default: "v1",
    },

    country: {
      type: String,
      default: "CH",
    },

    currency: {
      type: String,
      default: "chf",
    },

    chargesEnabled: {
      type: Boolean,
      default: false,
    },

    payoutsEnabled: {
      type: Boolean,
      default: false,
    },
    accountCreatedAt: Date, // when stripe account was created
    accountUpdatedAt: Date, // last time stripe account changed

    // defaultCurrency: {
    //   type: String,
    //   default: "chf",
    // },

    isRestricted: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
    detailsSubmitted: {
      type: Boolean,
      default: false,
    },

    onboardingCompletedAt: Date,

    requirements: {
      currentlyDue: [String],
      eventuallyDue: [String],
      pastDue: [String],
      disabledReason: String,
    },

    capabilities: {
      cardPayments: String,
      transfers: String,
    },

    // Accounts v2 uses recipient capabilities instead of the v1
    // charges_enabled/transfers fields.
    recipientTransfersStatus: String,
    recipientPayoutsStatus: String,

    lastSyncedAt: Date,
  },

  onboardingStatus: {
    type: String,
    enum: [
      "not_started",
      "account_created",
      "link_generated",
      "submitted",
      "verified",
      "restricted",
      "disabled",
      "rejected",
    ],
    default: "not_started",
  },

  /** True only when Stripe onboarding is verified (chargesEnabled && payoutsEnabled). Used to gate bookings and payouts. */
  isActive: { type: Boolean, default: false },

  commission: {
    rate: {
      type: Number,
      default: 20, // percent
    },

    /** Per-instructor override: instructor share % (0–100). When set, this instructor gets this % and admin gets the rest. */
    instructorRate: { type: Number, default: null },

    type: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },

    fixedAmount: {
      type: Number,
      default: 0, // only used if type = fixed
    },

    lastModifiedAt: Date,
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
    /** When set, platform default = instructor gets this %; admin gets the rest. When null, defaultRate = admin %. */
    defaultInstructorRate: { type: Number, default: null },
    canModifyRates: { type: Boolean, default: true },
    defaultType: {
      type: String,
      enum: ["percentage", "amount"],
      default: "percentage",
    },
    defaultFixedAmount: { type: Number, default: 0 },
    minFare: { type: Number, default: null },
    maxFare: { type: Number, default: null },
    payoutMethods: { type: [String], default: ["Stripe"] },
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
