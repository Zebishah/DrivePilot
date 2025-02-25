const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, Student, Instructor } = require("../models/User");
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
          throw new UserInputError("Email already exists");
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

        const token = createToken(user);

        return {
          token,
          user: userObj, // Ensure `id` is always present
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
        studentProfileSchema.parse(input);

        const updatedStudent = await Student.findByIdAndUpdate(
          user.id,
          {
            ...input,
            isProfileComplete: true,
          },
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
        instructorProfileSchema.parse(input);

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

    signIn: async (_, { email, password }) => {
      const user = await User.findOne({ email });
      if (!user) {
        throw new UserInputError("Invalid credentials");
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        throw new UserInputError("Invalid credentials");
      }

      const token = createToken(user);

      return {
        token,
        user,
      };
    },
    generateUploadUrl: async (_, { userId, role, fileName, fileType }) => {
      const folder = role === "Student" ? "students" : "teachers";
      const fileKey = `${folder}/${userId}/${Date.now()}-${fileName}`;

      const s3Params = {
        Bucket: process.env.BUCKET_NAME,
        Key: fileKey,
        Expires: 60,
        ContentType: fileType,
      };

      console.log("s3params", s3Params);

      const uploadUrl = await s3.getSignedUrlPromise("putObject", s3Params);

      const fileUrl = `https://${process.env.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

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
      const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password/${resetToken}`;

      // Send email using the email service
      try {
        await sendTemplateEmail(user.email, "passwordReset", resetUrl);

        return {
          success: true,
          message: "Password reset email sent",
        };
      } catch (error) {
        console.error("Email sending error:", error);
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
