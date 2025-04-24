const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, Student, Instructor, otpSchema, Otp } = require("../models/User");
const {
  signUpSchema,
  studentProfileSchema,
  instructorProfileSchema,
  resetPasswordSchema,
} = require("../schemas/validation");
const {
  AuthenticationError,
  UserInputError,
} = require("apollo-server-express");
const s3 = require("../config/awsConfig");
const { sendTemplateEmail } = require("../services/emailService");
const {
  generateResetToken,
  clearResetToken,
  createAuthToken,
  verifyResetToken,
} = require("../services/tokenService");
const { generateOTP, sendOtpEmail } = require("../utils/SendOtpEmail");
require("dotenv").config();

const createToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

const resolvers = {
  Query: {
    me: async (_, __, { user }) => {
      if (!user) {
        throw new AuthenticationError("Not authenticated");
      }
      return await User.findById(user.id);
    },
    teacherProfile: async (_, __, { user }) => {
      if (!user) {
        throw new AuthenticationError("Not authenticated");
      }
      try {
        const instructor = await Instructor.findById(user.id);
        if (!instructor) {
          return null;
        }
        return {
          id: instructor.id,
          firstName: instructor.firstName,
          lastName: instructor.lastName,
          email: instructor.email,
          phone: instructor.phone,
          location: instructor.location,
          experience: instructor.experience,
          description: instructor.description,
          address: instructor.address,
          zipCode: instructor.zipCode,
          documents: instructor.documents,
          fatherName: instructor.fatherName,
          dateOfBirth: instructor.dateOfBirth,
          languagePreference: instructor.languagePreference,
        };
      } catch (error) {
        return null;
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

        await sendOtpEmail(user.email, otp, "email_verification");
        // const token = createToken(user);
        await Otp.create({
          email: user.email,
          otp,
          type: "email_verification",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });
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
    verifyUser: async (_, { input }) => {
      try {
        const { email, otp, type } = input;

        const otpEntry = await Otp.findOne({
          email,
          otp,
          type,
          status: "unused",
        });

        if (!otpEntry) {
          throw new UserInputError("Invalid or expired OTP.");
        }

        if (otpEntry.expiresAt < new Date()) {
          await Otp.findByIdAndUpdate(otpEntry._id, { status: "expired" });
          throw new UserInputError("OTP has expired.");
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
        console.error("❌ Error in verifyUser:", error);
        if (error instanceof UserInputError) {
          throw error;
        }
        throw new Error("Failed to verify user. Please try again.");
      }
    },
    resendOtp: async (_, { input }) => {
      try {
        const { email, type } = input;

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
          message: `OTP for ${type} has been resent to ${email}`,
          email,
        };
      } catch (error) {
        throw new UserInputError(
          "Failed to resend OTP. Please try again later."
        );
      }
    },
    signIn: async (_, { email, password }) => {
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
        const otp = generateOTP();

        await Otp.create({
          email: user.email,
          otp,
          type: "two_factor_auth",
          status: "unused",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        });

        await sendOtpEmail(user.email, otp, "two_factor_auth");

        return {
          success: true,
          message: "OTP sent for two-factor authentication",
          user: userObj,
          token,
        };
      } catch (error) {
        console.error("SignIn Error:", error);
        if (error instanceof UserInputError) {
          throw error;
        }
        throw new Error("Failed to sign in. Please try again.");
      }
    },

    selectRole: async (_, { role }, { user }) => {
      if (!user) {
        throw new AuthenticationError("Not authenticated");
      }

      // Find the existing user
      const existingUser = await User.findById(user.id);

      if (!existingUser) {
        throw new Error("User not found");
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
          { new: true }
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
          (doc) => doc.documentType
        );

        const missingDocuments = requiredDocumentTypes.filter(
          (type) => !providedDocumentTypes.includes(type)
        );

        if (missingDocuments.length > 0) {
          throw new UserInputError(
            `Missing required documents: ${missingDocuments.join(", ")}`
          );
        }

        const updatedInstructor = await Instructor.findByIdAndUpdate(
          user.id,
          {
            ...input,
            isProfileComplete: true,
          },
          { new: true }
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

    generateUploadUrl: async (_, { userId, role, fileName, fileType }) => {
      const folder = role === "Student" ? "students" : "teachers";
      const fileKey = `${folder}/${userId}/${Date.now()}-${fileName}`;

      const s3Params = {
        Bucket: "dspbucket918",
        Key: fileKey,
        Expires: 60,
        ContentType: fileType,
      };

      const uploadUrl = await s3.getSignedUrlPromise("putObject", s3Params);

      const fileUrl = `https://dspbucket918.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

      return { uploadUrl, fileUrl };
    },

    forgotPassword: async (_, { email }) => {
      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
        throw new UserInputError("No account with that email exists");
      }
      if (
        user?.authProvider === "google" ||
        user?.authProvider === "facebook"
      ) {
        throw new UserInputError("No account with that email exists");
      }

      // Generate reset token
      const { resetToken, resetTokenExpiry } = generateResetToken();

      // Save token to user document
      await User.findByIdAndUpdate(user.id, {
        resetToken,
        resetTokenExpiry,
      });

      // Create reset URL
      const resetUrl = `${process.env.Frontend_URL}/auth/reset-password/${resetToken}`;

      // Send email using the email service
      try {
        await sendTemplateEmail(user.email, "passwordReset", resetUrl);

        return {
          success: true,
          message: "Password reset email sent",
        };
      } catch (error) {
        throw new Error("Failed to send reset email");
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
          userRecord.password
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
  },
};

module.exports = resolvers;
