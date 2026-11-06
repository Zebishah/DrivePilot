const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, Student, Instructor, otpSchema, Otp } = require("../models/User");
const {
  signUpSchema,
  studentProfileSchema,
  instructorProfileSchema,
  resetPasswordSchema,
} = require("../schemas/validation");
const TeacherTariff = require("../models/teacherTariff.model");
const {
  AuthenticationError,
  UserInputError,
  ForbiddenError,
} = require("apollo-server-express");
const s3 = require("../config/awsConfig");
const { sendTemplateEmail } = require("../services/emailService");
const {
  generateResetToken,
  clearResetToken,
  createAuthToken,
  verifyResetToken,
} = require("../services/tokenService");
const {
  generateOTP,
  sendOtpEmail,
  notifyDocumentStatusParties,
} = require("../utils/SendOtpEmail");
const studentBookingModel = require("../models/studentBooking.model");
const { Review } = require("../models/Reviews");
const { invalidateInstructorPublic } = require("../services/cacheInvalidation");
const {
  createConnectedAccount,
  createAccountLink,
  createLoginLink,
  setManualPayoutSchedule,
  retrieveAccount,
  accountToStripeSnapshot,
  shouldCreateConnectedAccount,
} = require("../services/stripeService");
const {
  requireAuthenticatedUser,
  requireAdmin,
  requireRole,
  requireSelfServiceRole,
  requireInstructorOwnership,
  requireLiveWorkspace,
} = require("../utils/authorization");
const path = require("path");
const { getPrivateDocumentUrl } = require("../services/documentUrlService");
const { OTP_PATTERN } = require("../constants/auth");
const { logger } = require("../utils/logger");
const { getConfiguredDemoEmail, getDemoRoleConfig } = require("../services/demoAccess");
require("dotenv").config();

const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

const resolvePrivateProfileImage = (parent) =>
  getPrivateDocumentUrl(parent?.profileImage);

const createToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      isDemo: Boolean(user.isDemo),
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );
};

const resolvers = {
  Student: {
    profileImage: resolvePrivateProfileImage,
  },
  StudentWithLessonStats: {
    profileImage: resolvePrivateProfileImage,
  },
  Instructor: {
    profileImage: resolvePrivateProfileImage,
  },
  InstructorWithDetails: {
    profileImage: resolvePrivateProfileImage,
  },
  PublicInstructor: {
    profileImage: resolvePrivateProfileImage,
  },
  UserBooking: {
    profileImage: resolvePrivateProfileImage,
  },
  StudentInfo: {
    profileImage: resolvePrivateProfileImage,
  },
  InstructorInfo: {
    profileImage: resolvePrivateProfileImage,
  },
  UserNew: {
    profileImage: resolvePrivateProfileImage,
  },
  ReviewUser: {
    profileImage: resolvePrivateProfileImage,
  },
  TransactionParty: {
    profileImage: resolvePrivateProfileImage,
  },
  UserAdmin: {
    profileImage: resolvePrivateProfileImage,
  },
  StudentAdmin: {
    profileImage: resolvePrivateProfileImage,
  },
  InstructorAdmin: {
    profileImage: resolvePrivateProfileImage,
  },
  StudentBookingSlot: {
    profileImage: resolvePrivateProfileImage,
  },
  StudentBooking: {
    profileImage: resolvePrivateProfileImage,
  },
  Admin: {
    profileImage: resolvePrivateProfileImage,
  },
  InstructorProfile: {
    profileImage: resolvePrivateProfileImage,
  },
  StudentProfile: {
    profileImage: resolvePrivateProfileImage,
  },
  UserBase: {
    profileImage: resolvePrivateProfileImage,
  },
  Document: {
    documentUrl: (parent) => getPrivateDocumentUrl(parent?.documentUrl),
  },
  DocumentStudent: {
    documentUrl: (parent) => getPrivateDocumentUrl(parent?.documentUrl),
  },
  InstructorDocument: {
    documentUrl: (parent) => getPrivateDocumentUrl(parent?.documentUrl),
  },
  Query: {
    me: async (_, __, { user }) => {
      if (!user) {
        throw new AuthenticationError("Not authenticated");
      }
      return await User.findById(user.id);
    },
    getInstructorDocuments: async (_, { instructorId }, { user }) => {
      requireInstructorOwnership(user, instructorId);
      try {
        const instructor = await Instructor.findById(instructorId);
        if (!instructor) {
          throw new UserInputError("Instructor not found");
        }

        return {
          _id: instructor._id,
          documents: instructor.documents || [],
        };
      } catch (error) {
        throw error;
      }
    },
    teacherProfile: async (_, __, { user }) => {
      requireRole(user, "Instructor");

      try {
        const instructor = await Instructor.findById(user.id);
        if (!instructor) {
          return null;
        }

        // Fetch completed reviews for this instructor
        const reviews = await Review.find({
          instructorId: user.id,
          reviewStatus: "completed",
        });

        // Calculate average rating
        const totalRating = reviews.reduce(
          (sum, review) => sum + (review.reviewRating || 0),
          0,
        );
        const reviewsCount = reviews.length;
        const averageRating =
          reviews.length > 0 ? totalRating / reviews.length : null;

        const sa = instructor.stripeAccount || {};
        const sfs = instructor.stripeFinancialStatus || {};
        return {
          id: instructor.id,
          firstName: instructor.firstName,
          lastName: instructor.lastName,
          email: instructor.email,
          phone: instructor.phone,
          location: instructor.location,
          experience: instructor.experience,
          description: instructor.description,
          profileImage: instructor.profileImage,
          address: instructor.address,
          zipCode: instructor.zipCode,
          documents: instructor.documents,
          dateOfBirth: instructor.dateOfBirth,
          languagePreference: instructor.languagePreference,
          reviewRating: averageRating,
          reviewsCount: reviewsCount,
          onboardingStatus: instructor.onboardingStatus ?? null,
          isActive: instructor.isActive ?? false,
          stripeAccount: sa.accountId
            ? {
                accountId: sa.accountId,
                accountVersion: sa.accountVersion || "v1",
                chargesEnabled: !!sa.chargesEnabled,
                payoutsEnabled: !!sa.payoutsEnabled,
                detailsSubmitted: !!sa.detailsSubmitted,
                recipientTransfersStatus: sa.recipientTransfersStatus || null,
                recipientPayoutsStatus: sa.recipientPayoutsStatus || null,
                lastSyncedAt: sa.lastSyncedAt
                  ? new Date(sa.lastSyncedAt).toISOString()
                  : null,
              }
            : null,
          stripeFinancialStatus: sa.accountId
            ? {
                hasDisputes: !!sfs.hasDisputes,
                payoutsBlocked: !!sfs.payoutsBlocked,
                currentlyDueRequirements: !!sfs.currentlyDueRequirements,
                lastWebhookSync: sfs.lastWebhookSync
                  ? new Date(sfs.lastWebhookSync).toISOString()
                  : null,
              }
            : null,
        };
      } catch (error) {
        console.error("Error in teacherProfile:", error);
        return null;
      }
    },

    allInstructors: async (_, __, { user }) => {
      // Optional: Add authentication check if needed
      if (!user) {
        throw new AuthenticationError("Not authenticated");
      }

      // Optional: Add role-based authorization (only admins can see all instructors)
      if (user.role !== "Admin") {
        throw new AuthenticationError("Not authorized to view all instructors");
      }

      try {
        // Fetch all instructors with their documents
        const instructors = await Instructor.find({})
          .sort({ createdAt: -1 }) // Sort by newest first
          .lean(); // Use lean() for better performance if you don't need mongoose document methods

        return instructors.map((instructor) => ({
          _id: instructor._id,
          firstName: instructor.firstName,
          lastName: instructor.lastName,
          email: instructor.email,
          phone: instructor.phone,
          location: instructor.location,
          address: instructor.address,
          zipCode: instructor.zipCode,
          experience: instructor.experience,
          description: instructor.description,
          gender: instructor.gender,
          carName: instructor.carName,
          isUserVerified: instructor.isUserVerified,
          transmissionType: instructor.transmissionType,
          profileImage: instructor.profileImage,
          documents: instructor.documents || [],
          createdAt: instructor.createdAt,
          updatedAt: instructor.updatedAt,
          dateOfBirth: instructor.dateOfBirth,
          languagePreference: instructor.languagePreference || [],
        }));
      } catch (error) {
        console.error("Error fetching all instructors:", error);
        throw new Error("Failed to fetch instructors");
      }
    },

    allInstructorsWithDetails: async (_, __, { user }) => {
      if (!user) {
        throw new AuthenticationError("Not authenticated");
      }

      if (user.role !== "Admin") {
        throw new AuthenticationError("Not authorized to view all instructors");
      }

      try {
        const instructors = await Instructor.find({})
          .sort({ createdAt: -1 })
          .lean();

        const enrichedInstructors = await Promise.all(
          instructors.map(async (instructor) => {
            const [tariff, bookings, reviews] = await Promise.all([
              TeacherTariff.findOne({ teacherId: instructor._id }).lean(),
              studentBookingModel.find({ instructorId: instructor._id }).lean(),
              Review.find({
                instructorId: instructor._id,
                reviewStatus: "completed",
              }).lean(),
            ]);

            // Calculate student count
            const studentIds = new Set(
              bookings.map((b) => b.studentId.toString()),
            );

            // Calculate average review rating
            const totalRatings = reviews.reduce(
              (sum, r) => sum + (r.reviewRating || 0),
              0,
            );
            const reviewRating = reviews.length
              ? (totalRatings / reviews.length).toFixed(1)
              : null;
            const reviewsCount = reviews.length;
            return {
              id: instructor._id.toString(),
              firstName: instructor.firstName,
              lastName: instructor.lastName,
              email: instructor.email,
              phone: instructor.phone,
              location: instructor.location,
              address: instructor.address,
              zipCode: instructor.zipCode,
              experience: instructor.experience,
              description: instructor.description,
              gender: instructor.gender,
              carName: instructor.carName,
              isUserVerified: instructor.isUserVerified,
              transmissionType: instructor.transmissionType,
              profileImage: instructor.profileImage,
              documents: (instructor.documents || []).map((doc) => ({
                id: doc._id.toString(),
                documentType: doc.documentType,
                documentUrl: doc.documentUrl,
                status: doc.status,
              })),
              createdAt: instructor.createdAt,
              updatedAt: instructor.updatedAt,
              dateOfBirth: instructor.dateOfBirth,
              verificationStatus: instructor.verificationStatus,
              languagePreference: instructor.languagePreference || [],
              lessonPrice: tariff?.FinalPricePerLesson || null,
              studentCount: studentIds.size,
              reviewRating, // ⬅️ Average rating here
              reviewsCount,
              commission: {
                instructorRate: instructor.commission?.instructorRate ?? null,
              },
            };
          }),
        );

        return enrichedInstructors;
      } catch (error) {
        console.error("Error fetching enriched instructor data:", error);
        throw new Error("Failed to fetch instructors with details");
      }
    },
    allStudentsWithLessonStats: async (_, __, { user }) => {
      if (!user) {
        throw new AuthenticationError("Not authenticated");
      }

      if (user.role !== "Admin") {
        throw new AuthenticationError("Not authorized to view all students");
      }

      try {
        const students = await Student.find({}).sort({ createdAt: -1 }).lean();

        const enrichedStudents = await Promise.all(
          students.map(async (student) => {
            const bookings = await studentBookingModel
              .find({ studentId: student._id })
              .sort({ createdAt: -1 }) // So we can get the latest booking for `lastLesson`
              .lean();

            // Count lessons
            let totalLessons = 0;
            let bookedLessons = 0;
            let cancelledLessons = 0;

            bookings.forEach((booking) => {
              const slotCount = Array.isArray(booking.slots)
                ? booking.slots.length
                : 0;
              totalLessons += slotCount;

              if (booking.status === "cancelled") {
                cancelledLessons += slotCount;
              } else {
                bookedLessons += slotCount;
              }
            });

            const lastLesson = bookings[0]?.createdAt || null;

            return {
              id: student._id.toString(),
              firstName: student.firstName,
              lastName: student.lastName,
              email: student.email,
              phone: student.phone,
              profileImage: student.profileImage || null,
              location: student.location || null,
              address: student.homeAddress || null,
              zipCode: student.zipCode || null,
              createdAt: student.createdAt,
              updatedAt: student.updatedAt,
              dateOfBirth: student.dateOfBirth || null,
              isUserVerified: student.isUserVerified || false,
              languagePreference: student.languagePreference || [],
              remainingHours: student.lessonHoursLeft || "0",
              lastLesson: lastLesson
                ? new Date(lastLesson).toISOString()
                : null,

              totalLessons,
              bookedLessons,
              cancelledLessons,

              documents: (student.documents || []).map((doc) => ({
                _id: doc._id.toString(),
                documentType: doc.documentType,
                documentUrl: doc.documentUrl,
                status: doc.status,
              })),
            };
          }),
        );

        return enrichedStudents;
      } catch (error) {
        console.error("Error fetching enriched student data:", error);
        throw new Error("Failed to fetch students with lesson stats");
      }
    },
    getStripeExpressDashboardUrl: async (_, __, { user }) => {
      if (!user) throw new AuthenticationError("Not authenticated");
      if (user.role !== "Instructor") {
        throw new ForbiddenError(
          "Only instructors can open the Stripe Express dashboard",
        );
      }
      const instructor = await Instructor.findById(user.id);
      if (!instructor) throw new UserInputError("Instructor not found");
      const accountId = instructor.stripeAccount?.accountId;
      if (!accountId) {
        throw new UserInputError(
          "No Stripe account linked. Connect with Stripe first.",
        );
      }
      try {
        const { url } = await createLoginLink(accountId);
        return { url };
      } catch (err) {
        console.error("getStripeExpressDashboardUrl error:", err);
        throw new UserInputError(
          err.message ||
            "Could not open Stripe dashboard. Try again in a moment.",
        );
      }
    },
  },
  User: {
    __resolveType(obj) {
      if (obj.role === "Student") return "Student";
      if (obj.role === "Instructor") return "Instructor";
      if (obj.role === "Admin") return "Admin";
      return "UserBase";
    },
  },

  Mutation: {
    signUp: async (_, { input }) => {
      try {
        // Validate input
        signUpSchema.parse(input);

        // Check if user exists
        const emailLower = input.email.toLowerCase();
        input.email = emailLower;
        const existingUser = await User.findOne({ email: input.email });
        if (existingUser) {
          throw new UserInputError(`This email is already linked to a ${existingUser?.authProvider} account. Please sign in with ${existingUser?.authProvider}
instead.`);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(input.password, 12);

        // Create user
        const user = await User.create({
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          password: hashedPassword,
        });

        // Convert user to object and ensure id is present
        const userObj = user.toObject();
        delete userObj.password;

        // Ensure ID is included explicitly
        userObj.id = user._id.toString(); // MongoDB uses `_id`, so convert it to a string

        // Save OTP to DB
        const otp = generateOTP();

        await Otp.create({
          email: user.email,
          otp,
          type: "email_verification",
          status: "unused",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });
        await sendOtpEmail(user.email, otp, "email_verification");
        // const token = createToken(user);
        return {
          // token,
          success: true,
          user: userObj,
        };
      } catch (error) {
        if (error.errors) {
          throw new UserInputError("Validation error", {
            errors: error.errors,
          });
        }
        throw error;
      }
    },
    updateInstructorVerificationStatus: async (_, { id, status }, { user }) => {
      requireAdmin(user);
      requireLiveWorkspace(user);
      if (!["pending", "verified", "rejected"].includes(status)) {
        throw new Error("Invalid verification status");
      }
      console.log("Updating instructor verification status:", id, status);
      const updatedInstructor = await Instructor.findByIdAndUpdate(
        id,
        { verificationStatus: status },
        { new: true },
      );

      if (!updatedInstructor) {
        throw new Error("Instructor not found");
      }
      await invalidateInstructorPublic(updatedInstructor._id);
      await sendOtpEmail(
        updatedInstructor.email,
        status,
        "instructor_Verification",
      );
      return updatedInstructor;
    },
    updateInstructorDocuments: async (_, { input }, { user }) => {
      requireLiveWorkspace(user);
      if (!user) {
        throw new AuthenticationError("Not authenticated");
      }

      const { instructorId, documents } = input;

      // Check if user is updating their own documents or is an admin
      if (user.id !== instructorId && user.role !== "Admin") {
        throw new ForbiddenError("Not authorized to update these documents");
      }

      try {
        const instructor = await Instructor.findById(instructorId);
        if (!instructor) {
          throw new UserInputError("Instructor not found");
        }

        // Validate document types
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

        // Check if all document types are valid
        for (const doc of documents) {
          if (!validDocumentTypes.includes(doc.documentType)) {
            throw new UserInputError(
              `Invalid document type: ${doc.documentType}`,
            );
          }
        }

        // Get existing documents
        const existingDocuments = instructor.documents || [];

        // Document types that allow multiple uploads
        const multipleUploadAllowed = [
          "Refresher Training Certificates",
          "Other Document (Optional)",
          "Professional Passenger Transport Authorization", // Add this if it allows multiple
        ];

        // Check if any documents being updated are already accepted
        for (const newDoc of documents) {
          const { documentType } = newDoc;
          if (documentType !== "Other Document (Optional)") {
            if (multipleUploadAllowed.includes(documentType)) {
              // For multiple upload types, check if ALL documents of this type are accepted
              const documentsOfThisType = existingDocuments.filter(
                (doc) => doc.documentType === documentType,
              );

              // If there are documents of this type and ALL of them are accepted, don't allow more uploads
              if (documentsOfThisType.length > 0) {
                const allAccepted = documentsOfThisType.every(
                  (doc) => doc.status === "accepted",
                );
                if (allAccepted) {
                  throw new UserInputError(
                    `Cannot upload more documents of type ${documentType} as all existing documents are already accepted`,
                  );
                }
              }
            } else {
              // For single upload types, check if there's already an accepted document
              const acceptedDoc = existingDocuments.find(
                (doc) =>
                  doc.documentType === documentType &&
                  doc.status === "accepted",
              );

              if (acceptedDoc) {
                throw new UserInputError(
                  `Cannot update document ${documentType} as it is already accepted`,
                );
              }
            }
          }
        }

        // Special handling for Swiss Driving License
        // Check if both front and back are accepted
        const swissLicenseTypes = [
          "Swiss Driving License (Front)",
          "Swiss Driving License (Back)",
        ];
        for (const newDoc of documents) {
          if (swissLicenseTypes.includes(newDoc.documentType)) {
            const acceptedDoc = existingDocuments.find(
              (doc) =>
                doc.documentType === newDoc.documentType &&
                doc.status === "accepted",
            );

            if (acceptedDoc) {
              throw new UserInputError(
                `Cannot update ${newDoc.documentType} as it is already accepted`,
              );
            }
          }
        }

        // Process document updates
        const updatedDocuments = [...existingDocuments];

        for (const newDoc of documents) {
          const { documentType, documentUrl } = newDoc;

          if (multipleUploadAllowed.includes(documentType)) {
            // For multiple upload types, add new documents
            updatedDocuments.push({
              documentType,
              documentUrl,
              status: "pending",
              createdAt: new Date(), // First-time submission timestamp
              reSubmitted: null,
            });
          } else {
            // For single upload types, replace existing documents
            // Remove existing documents of the same type
            const filteredDocuments = updatedDocuments.filter(
              (doc) => doc.documentType !== documentType,
            );
            const previousDoc = updatedDocuments.find(
              (doc) => doc.documentType === documentType,
            );
            // Add the new document
            filteredDocuments.push({
              documentType,
              documentUrl,
              status: "pending",
              createdAt: new Date(),
              reSubmitted: previousDoc ? new Date() : null,
            });

            // Update the documents array
            updatedDocuments.length = 0;
            updatedDocuments.push(...filteredDocuments);
          }
        }

        // Update the instructor with new documents
        const updatedInstructor = await Instructor.findByIdAndUpdate(
          instructorId,
          {
            documents: updatedDocuments,
          },
          { new: true },
        );
        await invalidateInstructorPublic(instructorId);

        return {
          _id: updatedInstructor._id,
          documents: updatedInstructor.documents,
        };
      } catch (error) {
        throw error;
      }
    },
    updateDocumentStatus: async (_, { documentId, status }, { user }) => {
      requireLiveWorkspace(user);
      if (!user) {
        throw new AuthenticationError("Not authenticated");
      }

      // Only admins can update document status
      if (user.role !== "Admin") {
        throw new ForbiddenError("Not authorized to update document status");
      }

      // Validate status
      const validStatuses = ["pending", "accepted", "rejected"];
      if (!validStatuses.includes(status)) {
        throw new UserInputError(`Invalid status: ${status}`);
      }

      try {
        // Find the instructor with the document
        const instructor = await Instructor.findOne({
          "documents._id": documentId,
        });

        if (!instructor) {
          throw new UserInputError("Document not found");
        }

        // Find the document and update its status
        const document = instructor.documents.find(
          (doc) => doc._id.toString() === documentId,
        );

        if (!document) {
          throw new UserInputError("Document not found");
        }

        // Store the old status for comparison
        const oldStatus = document.status;

        // Check if this is a Swiss Driving License document
        const isSwissLicenseFront =
          document.documentType === "Swiss Driving License (Front)";
        const isSwissLicenseBack =
          document.documentType === "Swiss Driving License (Back)";

        let updatedDocuments = [];

        if (isSwissLicenseFront || isSwissLicenseBack) {
          // Update both front and back Swiss Driving License documents
          instructor.documents.forEach((doc) => {
            if (
              doc.documentType === "Swiss Driving License (Front)" ||
              doc.documentType === "Swiss Driving License (Back)"
            ) {
              doc.status = status;
              updatedDocuments.push(doc);
            }
          });
        } else {
          // Update only the specific document
          document.status = status;
          updatedDocuments.push(document);
        }

        // Save the instructor
        await instructor.save();

        // Send email notifications for each updated document (only if status actually changed)
        if (oldStatus !== status) {
          try {
            // Send notification for the primary document that was requested to be updated
            await notifyDocumentStatusParties(
              {
                _id: document._id,
                documentType: document.documentType,
                documentUrl: document.documentUrl,
                status: status,
              },
              {
                firstName: instructor.firstName,
                lastName: instructor.lastName,
                email: instructor.email,
              },
              "document_status_updated",
            );
            return {
              _id: document._id,
              documentType: document.documentType,
              documentUrl: document.documentUrl,
              status: document.status,
            };
          } catch (emailError) {
            console.error(
              "Failed to send document status update email:",
              emailError,
            );
            // Don't throw the error - we still want to return the updated document
            // even if email sending fails
          }
        }

        return {
          _id: document._id,
          documentType: document.documentType,
          documentUrl: document.documentUrl,
          status: document.status,
        };
      } catch (error) {
        throw error;
      }
    },
    updateDocumentStatusStudent: async (
      parent,
      { studentId, documentType, status },
      context,
    ) => {
      requireAdmin(context.user);
      requireLiveWorkspace(context.user);
      try {
        // Find the student and update the specific document status
        const updatedStudent = await Student.findOneAndUpdate(
          {
            _id: studentId,
            "documents.documentType": documentType,
          },
          {
            $set: {
              "documents.$.status": status,
            },
          },
          { new: true },
        );

        if (!updatedStudent) {
          throw new Error("Student or document not found");
        }

        return updatedStudent;
      } catch (error) {
        throw new Error(`Failed to update document status: ${error.message}`);
      }
    },
    verifyUser: async (_, { input }) => {
      try {
        const email = String(input?.email || "").trim().toLowerCase();
        const { otp, type } = input;

        if (typeof otp !== "string" || !OTP_PATTERN.test(otp)) {
          throw new UserInputError("OTP must be exactly 6 digits.");
        }

        const otpEntry = await Otp.findOneAndUpdate({
          email,
          otp,
          type,
          status: "unused",
          expiresAt: { $gt: new Date() },
        }, { $set: { status: "used" } }, { new: true });

        if (!otpEntry) {
          throw new UserInputError("Invalid or expired OTP.");
        }

        const user = await User.findOne({ email });

        if (!user) {
          throw new Error("User not found.");
        }

        if (type === "email_verification") {
          user.isUserVerified = true;
        } else if (type === "two_factor_auth") {
          user.isUserAuthenticated = true;
        }

        await user.save();

        const token = createToken(user);

        const userObj = user.toObject();
        delete userObj.password;
        userObj.id = user._id.toString();

        if (type === "email_verification") {
          await sendOtpEmail(user.email, user.firstName, "welcome_email");
        }

        await Otp.findByIdAndDelete(otpEntry._id);

        return {
          success: true,
          token,
          user: userObj,
        };
      } catch (error) {
        logger.error("otp_verification_failed", { code: error?.code || "OTP_VERIFICATION_FAILED", error });
        if (error instanceof UserInputError) {
          throw error;
        }
        throw new Error("Failed to verify user. Please try again.");
      }
    },
    resendOtp: async (_, { input }) => {
      try {
        const email = String(input?.email || "").trim().toLowerCase();
        const { type } = input;
        const recentOtp = await Otp.findOne({
          email,
          type,
          status: "unused",
          createdAt: { $gte: new Date(Date.now() - OTP_RESEND_COOLDOWN_MS) },
        }).select("_id").lean();
        if (recentOtp) {
          throw new UserInputError("Please wait before requesting another code.");
        }

        await Otp.deleteMany({ email, type });

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await Otp.create({
          email,
          otp,
          type,
          status: "unused",
          expiresAt,
        });

        await sendOtpEmail(email, otp, type);

        return {
          success: true,
          message: "A new verification code has been sent.",
          email,
        };
      } catch (error) {
        if (error instanceof UserInputError) throw error;
        throw new UserInputError(
          "Failed to resend OTP. Please try again later.",
        );
      }
    },
    signIn: async (_, { email, password }) => {
      const emailLower = email.toLowerCase();
      email = emailLower;
      try {
        const user = await User.findOne({ email });
        if (!user) {
          throw new UserInputError("Invalid credentials");
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          throw new UserInputError("Invalid credentials");
        }

        let token = null;
        if (user?.role === "Admin") {
          token = createToken(user);
        }

        const userObj = user.toObject();
        delete userObj.password;
        userObj.id = user._id.toString();

        // If user is not verified, send verification OTP
        if (!user.isUserVerified) {
          // Delete existing unused email verification OTPs
          await Otp.deleteMany({
            email: user.email,
            type: "email_verification",
          });

          const otp = generateOTP();

          await Otp.create({
            email: user.email,
            otp,
            type: "email_verification",
            status: "unused",
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          });

          await sendOtpEmail(user.email, otp, "email_verification");

          return {
            success: true,
            message: "Email not verified. Verification OTP has been sent.",
            user: userObj,
          };
        }

        // If verified, send two-factor authentication OTP
        if (user?.role !== "Admin") {
          await Otp.deleteMany({
            email: user.email,
            type: "two_factor_auth",
            status: "unused",
          });
          const otp = generateOTP();
          await Otp.create({
            email: user.email,
            otp,
            type: "two_factor_auth",
            status: "unused",
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          });
          await sendOtpEmail(user.email, otp, "two_factor_auth");
        }

        return {
          success: true,
          message: "OTP sent for two-factor authentication",
          user: userObj,
          token,
        };
      } catch (error) {
        logger.error("sign_in_failed", { code: error?.code || "SIGN_IN_FAILED", error });
        if (error instanceof UserInputError) {
          throw error;
        }
        throw new Error("Failed to sign in. Please try again.");
      }
    },

    loginDemo: async (_, { role }) => {
      const roleConfig = getDemoRoleConfig(role);
      const email = getConfiguredDemoEmail(role);
      if (!roleConfig || !email) {
        throw new UserInputError("This demo workspace is not configured.");
      }

      try {
        const user = await User.findOne({
          email,
          role: roleConfig.role,
          isDemo: true,
        });
        if (!user) {
          throw new UserInputError("This demo workspace is not configured.");
        }

        const userObj = user.toObject();
        delete userObj.password;
        userObj.id = user._id.toString();

        logger.info("demo_login_succeeded", {
          role: roleConfig.role,
          userId: userObj.id,
        });

        return {
          success: true,
          token: createToken(user),
          user: userObj,
        };
      } catch (error) {
        logger.error("demo_login_failed", {
          role: roleConfig?.role || "unknown",
          code: error?.code || "DEMO_LOGIN_FAILED",
        });
        if (error instanceof UserInputError) throw error;
        throw new UserInputError("This demo workspace is temporarily unavailable.");
      }
    },

    selectRole: async (_, { role }, { user }) => {
      requireAuthenticatedUser(user);

      requireSelfServiceRole(role);

      // Find the existing user
      const existingUser = await User.findById(user.id);

      if (!existingUser) {
        throw new Error("User not found");
      }

      if (existingUser.role !== "UserBase") {
        throw new ForbiddenError("Role selection is only available for new accounts");
      }

      // Remove the existing user
      await User.deleteOne({ _id: user.id });

      // Create a new user with the selected role
      let newUser;
      switch (role) {
        case "Student":
          newUser = new Student({ ...existingUser.toObject(), role });
          break;
        case "Instructor":
          newUser = new Instructor({ ...existingUser.toObject(), role });
          break;
        case "Admin":
          newUser = new Admin({ ...existingUser.toObject(), role });
          break;
        default:
          newUser = new User({ ...existingUser.toObject(), role });
          break;
      }

      await newUser.save();

      // Generate a new token with the updated role
      const token = createToken(newUser);

      return {
        token,
        user: newUser,
      };
    },

    setupStudentProfile: async (_, { input }, { user }) => {
      if (!user) {
        throw new AuthenticationError("Not authenticated");
      }

      if (user.role !== "Student") {
        throw new UserInputError("User is not a student");
      }

      const existingStudent = await Student.findById(user.id);
      if (!existingStudent) {
        throw new UserInputError("Student not found");
      }
      try {
        // Update the schema validation if needed
        studentProfileSchema.parse(input);

        const updateData = {
          ...input,
          isProfileComplete: true,
        };

        // If documents array is provided, use it
        if (input.documents && input.documents.length > 0) {
          updateData.documents = input.documents;
          // For backward compatibility, set the first document as the primary
        }

        const updatedStudent = await Student.findByIdAndUpdate(
          user.id,
          updateData,
          { new: true },
        );

        await sendOtpEmail(
          user.email,
          existingStudent.firstName,
          "welcome_email_Student",
        );

        return updatedStudent;
      } catch (error) {
        if (error.errors) {
          throw new UserInputError("Validation error", {
            errors: error.errors,
          });
        }
        throw error;
      }
    },

    setupInstructorProfile: async (_, { input }, { user }) => {
      if (!user) {
        throw new AuthenticationError("Not authenticated");
      }

      if (user.role !== "Instructor") {
        throw new UserInputError("User is not an instructor");
      }
      const existingInstructor = await Instructor.findById(user.id);
      if (!existingInstructor) {
        throw new UserInputError("Instructor not found");
      }
      try {
        // First validate the basic schema
        instructorProfileSchema.parse(input);

        // Now validate that all required documents are present
        const requiredDocumentTypes = [
          "Swiss Driving License (Front)",
          "Swiss Driving License (Back)",
          "National ID or Passport",
          "Federal Driving Instructor Certificate",
          "Swiss Criminal Record Extract",
        ];

        // Check that all required document types are present
        const providedDocumentTypes = input.documents.map(
          (doc) => doc.documentType,
        );

        const missingDocuments = requiredDocumentTypes.filter(
          (type) => !providedDocumentTypes.includes(type),
        );

        if (missingDocuments.length > 0) {
          throw new UserInputError(
            `Missing required documents: ${missingDocuments.join(", ")}`,
          );
        }

        const updatedInstructor = await Instructor.findByIdAndUpdate(
          user.id,
          {
            ...input,
            isProfileComplete: true,
            onboardingStatus: "not_started",
            isActive: false,
          },
          { new: true },
        );
        await invalidateInstructorPublic(user.id);

        // Delete existing unused email verification OTPs

        await sendOtpEmail(
          user.email,
          existingInstructor.firstName,
          "welcome_email_Instructor",
        );

        return updatedInstructor;
      } catch (error) {
        if (error.errors) {
          throw new UserInputError("Validation error", {
            errors: error.errors,
          });
        }
        throw error;
      }
    },

    generateUploadUrl: async (
      _,
      { userId, role, fileName, fileType, fileSize },
      { user },
    ) => {
      const authenticatedUser = requireAuthenticatedUser(user);
      const maxFileSize = 10 * 1024 * 1024;
      const allowedMimeTypes = new Set([
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
      ]);
      if (!allowedMimeTypes.has(String(fileType).toLowerCase())) {
        throw new UserInputError("Only PDF, JPEG, PNG, and WebP files are allowed");
      }
      if (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > maxFileSize) {
        throw new UserInputError("File size must be between 1 byte and 10 MB");
      }

      const requestedRole = String(role);
      requireSelfServiceRole(requestedRole);
      const isAdminUpload = authenticatedUser.role === "Admin";
      if (
        !isAdminUpload &&
        (String(authenticatedUser.id) !== String(userId) ||
          requestedRole !== authenticatedUser.role)
      ) {
        throw new ForbiddenError("You may only upload files for your own account");
      }
      if (!isAdminUpload && !["Student", "Instructor"].includes(requestedRole)) {
        throw new UserInputError("Invalid upload role");
      }

      if (isAdminUpload) {
        const targetModel = requestedRole === "Student" ? Student : Instructor;
        const target = await targetModel.findById(userId).select("_id").lean();
        if (!target) throw new UserInputError("Upload target not found");
      }

      const folder = requestedRole === "Student" ? "students" : "teachers";
      const safeFileName = path
        .basename(String(fileName))
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .slice(0, 160);
      if (!safeFileName || safeFileName === "." || safeFileName === "..") {
        throw new UserInputError("Invalid file name");
      }
      const fileKey = `${folder}/${userId}/${Date.now()}-${safeFileName}`;

      const s3Params = {
        Bucket: process.env.BUCKET_NAME,
        Key: fileKey,
        Expires: 60,
        ContentType: fileType,
      };

      const uploadUrl = await s3.getSignedUrlPromise("putObject", s3Params);

      const fileUrl = `https://${process.env.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

      return { uploadUrl, fileUrl };
    },
    deleteStudents: async (_, { studentIds }, { user }) => {
      try {
        requireAdmin(user);
        requireLiveWorkspace(user);
        if (!user || user.role !== "Admin") {
          throw new Error("Unauthorized access");
        }

        const { deletedCount } = await Student.deleteMany({
          _id: { $in: studentIds },
        });

        return {
          success: true,
          message: `${deletedCount} student(s) deleted successfully.`,
        };
      } catch (error) {
        console.error("Error deleting students:", error);
        return {
          success: false,
          message: "Failed to delete students.",
        };
      }
    },
    deleteInstructors: async (_, { instructorIds }, { user }) => {
      try {
        requireAdmin(user);
        requireLiveWorkspace(user);
        if (!user || user.role !== "Admin") {
          throw new Error("Unauthorized access");
        }

        const { deletedCount } = await Instructor.deleteMany({
          _id: { $in: instructorIds },
        });

        return {
          success: true,
          message: `${deletedCount} instructor(s) deleted successfully.`,
        };
      } catch (error) {
        console.error("Error deleting instructors:", error);
        return {
          success: false,
          message: "Failed to delete instructors.",
        };
      }
    },
    forgotPassword: async (_, { email }) => {
      const normalizedEmail = String(email || "").trim().toLowerCase();
      const user = await User.findOne({ email: normalizedEmail });
      const genericResponse = {
        success: true,
        message: "If an account exists, password reset instructions have been sent",
      };
      // Keep reset requests indistinguishable for unknown and OAuth-only accounts.
      if (
        !user ||
        user.authProvider === "google" ||
        user.authProvider === "facebook"
      ) {
        return genericResponse;
      }

      // Generate reset token
      const { resetToken, resetTokenExpiry } = generateResetToken();

      // Save token to user document
      await User.findByIdAndUpdate(user.id, {
        resetToken,
        resetTokenExpiry,
      });

      // Create reset URL
      const frontendBase = (
        process.env.FRONTEND_URL ||
        process.env.Frontend_URL ||
        "http://localhost:5173"
      ).replace(/\/$/, "");
      const resetUrl = `${frontendBase}/auth/reset-password/${resetToken}`;

      // Send email using the email service
      try {
        await sendTemplateEmail(user.email, "passwordReset", resetUrl);

        return {
          ...genericResponse,
        };
      } catch (error) {
        console.error("Password reset notification enqueue failed:", error.code || error.message);
        return genericResponse;
      }
    },

    resetPassword: async (_, { token, newPassword }) => {
      try {
        // Validate password
        resetPasswordSchema.parse({ newPassword });

        // Verify token and get user
        const user = await verifyResetToken(token);

        if (!user) {
          throw new UserInputError("Invalid or expired reset token");
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update user password and clear reset token
        await User.findByIdAndUpdate(user.id, {
          password: hashedPassword,
        });

        // Clear the reset token
        await clearResetToken(user.id);

        // Generate new JWT for auto login
        const authToken = createToken(user);

        return {
          success: true,
          message: "Password successfully reset",
          token: authToken,
        };
      } catch (error) {
        if (error.errors) {
          throw new UserInputError("Validation error", {
            errors: error.errors,
          });
        }
        throw error;
      }
    },

    changePassword: async (_, { currentPassword, newPassword }, { user }) => {
      requireLiveWorkspace(user);
      if (!user) {
        throw new AuthenticationError("Not authenticated");
      }

      try {
        // Validate new password
        resetPasswordSchema.parse({ newPassword });

        // Find the user
        const userRecord = await User.findById(user.id);
        if (!userRecord) {
          throw new Error("User not found");
        }

        // Check current password
        const isValid = await bcrypt.compare(
          currentPassword,
          userRecord.password,
        );
        if (!isValid) {
          throw new UserInputError("Current password is incorrect");
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password
        await User.findByIdAndUpdate(user.id, {
          password: hashedPassword,
        });

        return {
          success: true,
          message: "Password successfully changed",
        };
      } catch (error) {
        if (error.errors) {
          throw new UserInputError("Validation error", {
            errors: error.errors,
          });
        }
        throw error;
      }
    },

    createStripeAccount: async (_, __, { user }) => {
      requireLiveWorkspace(user);
      if (!user) throw new AuthenticationError("Not authenticated");
      if (user.role !== "Instructor") {
        throw new ForbiddenError(
          "Only instructors can create a Stripe account",
        );
      }
      const instructor = await Instructor.findById(user.id);
      if (!instructor) throw new UserInputError("Instructor not found");
      if (!instructor.isProfileComplete) {
        throw new UserInputError(
          "Complete your profile before setting up payments",
        );
      }
      try {
        const accountId = instructor.stripeAccount?.accountId;
        const accountVersion = instructor.stripeAccount?.accountVersion || "v1";
        if (!shouldCreateConnectedAccount(instructor)) {
          // Ensure existing accounts use manual payouts so we control payout timing
          try {
            await setManualPayoutSchedule(accountId, { accountVersion });
          } catch (e) {
            console.error(
              "Failed to set manual payout schedule for existing account:",
              e.message,
            );
          }
          const { url } = await createAccountLink(accountId, { accountVersion });
          await Instructor.findByIdAndUpdate(user.id, {
            onboardingStatus: "link_generated",
          });
          await invalidateInstructorPublic(user.id);
          return {
            success: true,
            message: "Onboarding link generated",
            onboardingUrl: url,
            onboardingStatus: "link_generated",
          };
        }
        const account = await createConnectedAccount(instructor.email, {
          accountVersion: "v2",
          idempotencyKey: `connect-account:${user.id}`,
        });
        // Configure new instructor accounts to use manual payouts so funds
        // stay in Stripe balance until we explicitly create payouts.
        try {
          await setManualPayoutSchedule(account.id, { accountVersion: "v2" });
        } catch (e) {
          console.error(
            "Failed to set manual payout schedule for new account:",
            e.message,
          );
        }
        await Instructor.findByIdAndUpdate(user.id, {
          "stripeAccount.accountId": account.id,
          "stripeAccount.accountVersion": "v2",
          "stripeAccount.accountCreatedAt": new Date(),
          onboardingStatus: "account_created",
        });
        const { url } = await createAccountLink(account.id, {
          accountVersion: "v2",
        });
        await Instructor.findByIdAndUpdate(user.id, {
          onboardingStatus: "link_generated",
        });
        await invalidateInstructorPublic(user.id);
        return {
          success: true,
          message: "Stripe account created",
          onboardingUrl: url,
          onboardingStatus: "link_generated",
        };
      } catch (err) {
        console.error("createStripeAccount error:", err);
        const isConnectNotEnabled =
          err.message && err.message.includes("signed up for Connect");
        throw new UserInputError(
          isConnectNotEnabled
            ? "Payment setup is still being configured. Please try again in a few minutes or contact support."
            : err.message || "Failed to create Stripe account",
        );
      }
    },

    setInstructorPayoutToManual: async (_, { instructorId }, { user }) => {
      requireLiveWorkspace(user);
      if (!user) throw new AuthenticationError("Not authenticated");
      if (user.role !== "Admin") {
        throw new ForbiddenError(
          "Only admins can set an instructor's payout schedule to manual",
        );
      }
      const instructor = await Instructor.findById(instructorId);
      if (!instructor) throw new UserInputError("Instructor not found");
      const accountId = instructor.stripeAccount?.accountId;
      const accountVersion = instructor.stripeAccount?.accountVersion || "v1";
      if (!accountId) {
        return {
          success: false,
          message: "This instructor has no Stripe connected account.",
        };
      }
      try {
        await setManualPayoutSchedule(accountId, { accountVersion });
        return {
          success: true,
          message:
            "Payout schedule set to manual. The connected account balance should now be available for manual payouts.",
        };
      } catch (err) {
        console.error("setInstructorPayoutToManual error:", err);
        return {
          success: false,
          message: err.message || "Failed to set payout schedule to manual",
        };
      }
    },

    verifyStripeOnboarding: async (_, __, { user }) => {
      requireLiveWorkspace(user);
      if (!user) throw new AuthenticationError("Not authenticated");
      if (user.role !== "Instructor") {
        throw new ForbiddenError(
          "Only instructors can verify Stripe onboarding",
        );
      }
      const instructor = await Instructor.findById(user.id);
      if (!instructor) throw new UserInputError("Instructor not found");
      const accountId = instructor.stripeAccount?.accountId;
      const accountVersion = instructor.stripeAccount?.accountVersion || "v1";
      if (!accountId) {
        return {
          success: false,
          message: "No Stripe account linked",
          onboardingStatus: "not_started",
          chargesEnabled: false,
          payoutsEnabled: false,
        };
      }
      try {
        const account = await retrieveAccount(accountId, { accountVersion });
        const { stripeAccountUpdate, onboardingStatus, isActive } =
          accountToStripeSnapshot(account);
        await Instructor.findByIdAndUpdate(
          user.id,
          {
            $set: {
              ...stripeAccountUpdate,
              onboardingStatus,
              isActive,
              "stripeFinancialStatus.lastWebhookSync": new Date(),
            },
          },
          { new: true },
        );
        await invalidateInstructorPublic(user.id);
        return {
          success: true,
          message: "Status updated",
          onboardingStatus,
          chargesEnabled: account.charges_enabled ?? false,
          payoutsEnabled: account.payouts_enabled ?? false,
        };
      } catch (err) {
        console.error("verifyStripeOnboarding error:", err);
        throw new UserInputError(
          err.message || "Failed to verify Stripe onboarding",
        );
      }
    },

    regenerateStripeLink: async (_, __, { user }) => {
      requireLiveWorkspace(user);
      if (!user) throw new AuthenticationError("Not authenticated");
      if (user.role !== "Instructor") {
        throw new ForbiddenError("Only instructors can regenerate Stripe link");
      }
      const instructor = await Instructor.findById(user.id);
      if (!instructor) throw new UserInputError("Instructor not found");
      const accountId = instructor.stripeAccount?.accountId;
      const accountVersion = instructor.stripeAccount?.accountVersion || "v1";
      if (!accountId) {
        throw new UserInputError(
          "No Stripe account found. Use Connect with Stripe first.",
        );
      }
      // Only skip new link when account is already fully verified (no need to re-onboard).
      // When Stripe restricts or rejects (detailsSubmitted but not chargesEnabled), allow a new link so they can fix it.
      if (
        instructor.stripeAccount?.chargesEnabled &&
        instructor.stripeAccount?.payoutsEnabled
      ) {
        return {
          success: true,
          message: "Account already verified; no onboarding needed",
          onboardingUrl: null,
        };
      }
      try {
        const { url } = await createAccountLink(accountId, { accountVersion });
        return {
          success: true,
          message: "New onboarding link generated",
          onboardingUrl: url,
        };
      } catch (err) {
        console.error("regenerateStripeLink error:", err);
        throw new UserInputError(
          err.message || "Failed to regenerate Stripe link",
        );
      }
    },

    updateInstructorCommission: async (
      _,
      { instructorId, input },
      { user },
    ) => {
      requireLiveWorkspace(user);
      if (!user) throw new AuthenticationError("Not authenticated");
      if (user.role !== "Admin") {
        throw new ForbiddenError(
          "Only admins can update instructor commission",
        );
      }
      const instructor = await Instructor.findById(instructorId);
      if (!instructor) throw new UserInputError("Instructor not found");
      if (!instructor.commission) instructor.commission = {};
      instructor.commission.instructorRate =
        input.instructorRate !== undefined && input.instructorRate !== null
          ? input.instructorRate
          : null;
      instructor.commission.lastModifiedAt = new Date();
      await instructor.save();
      return instructor;
    },
  },
};

module.exports = resolvers;
