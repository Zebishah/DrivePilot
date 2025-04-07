const mongoose = require("mongoose");

const baseOptions = {
  discriminatorKey: "role", // Keeps track of the user type
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
    resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpiry: {
      type: Date,
      default: null,
    },
  },
  baseOptions
);

const User = mongoose.model("User", baseSchema);
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
const StudentSchema = new mongoose.Schema({
  homeAddress: String,
  location: String,
  zipCode: String,
  documentType: String,
  documentUrl: String,
  paymentInfo: {
    isPaid: { type: Boolean, default: false },
    paymentDate: Date,
  },
});

const DocumentSchema = new mongoose.Schema({
  documentType: String,
  documentUrl: String,
});

const InstructorSchema = new mongoose.Schema({
  address: { type: String, required: false },
  location: { type: String, required: false },
  zipCode: { type: String, required: false },
  description: { type: String, required: false },
  experience: { type: String, required: false },
  documents: [DocumentSchema], // Array of documents
  phone: { type: String, required: false },
  fatherName: { type: String, required: false },
  dateOfBirth: { type: String, required: false },
  languagePreference: { type: String, required: false },
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

const AdminSchema = new mongoose.Schema({
  adminLevel: {
    type: String,
    enum: ["super", "regular"],
    default: "regular",
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
