const TeacherTariff = require("../../models/teacherTariff.model");
const Instructor = require("../../models/User").Instructor;
const { updateInstructorProfileSchema } = require("../../schemas/validation");

// Default tariff values for new teachers
const DEFAULT_TARIFF = {
  lessonFee: 0,
  bulkPackages: [],
  packageDiscount: 0,
  lessonDiscount: 0,
  PackageDiscountStartDate: "",
  PackageDiscountEndDate: "",
  discountStartDate: "",
  discountEndDate: "",
};

const resolvers = {
  Query: {
    teacherTariff: async (_, __, { user }) => {
      if (!user) throw new Error("Not authenticated");

      try {
        const tariff = await TeacherTariff.findOne({ teacherId: user.id });
        if (!tariff) {
          // Return default values with a flag indicating they are defaults
          return {
            ...DEFAULT_TARIFF,
            isDefault: true,
          };
        }
        return {
          ...tariff.toObject(),
          isDefault: false,
        };
      } catch (error) {
        throw new Error("Error fetching teacher tariff");
      }
    },
  },

  Mutation: {
    updateTeacherTariff: async (_, { input }, { user }) => {
      if (!user) throw new Error("Not authenticated");

      try {
        // Ensure bulkPackages is either an array or undefined
        const updateData = {
          ...input,
          teacherId: user.id,
          bulkPackages: input.bulkPackages || [], // Default to empty array if not provided
        };

        // Process each package to ensure proper format
        if (updateData.bulkPackages.length > 0) {
          updateData.bulkPackages = updateData.bulkPackages.map((pkg) => ({
            lessons: pkg.lessons,
            cost: pkg.cost,
          }));
        }

        const tariff = await TeacherTariff.findOneAndUpdate(
          { teacherId: user.id },
          updateData,
          { new: true, upsert: true }
        );

        return {
          ...tariff.toObject(),
          isDefault: false,
        };
      } catch (error) {
        throw new Error(`Error updating teacher tariff: ${error.message}`);
      }
    },

    updateTeacherProfile: async (_, { input }, { user }) => {
      if (!user) throw new Error("Not authenticated");

      try {
        // Validate input
        const validatedInput = updateInstructorProfileSchema.parse(input);

        // Remove any undefined or null values from input
        const cleanInput = Object.entries(validatedInput).reduce(
          (acc, [key, value]) => {
            if (value !== undefined) {
              acc[key] = value;
            }
            return acc;
          },
          {}
        );

        // Handle special case for languagePreference to ensure it's always an array
        if (cleanInput.languagePreference !== undefined) {
          // If languagePreference is a string, convert it to an array
          if (typeof cleanInput.languagePreference === "string") {
            cleanInput.languagePreference = [cleanInput.languagePreference];
          }
          // If languagePreference is empty or null, set it to an empty array
          if (
            !cleanInput.languagePreference ||
            cleanInput.languagePreference.length === 0
          ) {
            cleanInput.languagePreference = [];
          }
        }

        // Only allow updating instructor-specific fields
        const allowedFields = [
          "address",
          "location",
          "firstName",
          "lastName",
          "zipCode",
          "description",
          "experience",
          "documents",
          "phone",
          "fatherName",
          "dateOfBirth",
          "profileImage",
          "languagePreference",
        ];

        const filteredInput = Object.entries(cleanInput).reduce(
          (acc, [key, value]) => {
            if (allowedFields.includes(key)) {
              acc[key] = value;
            }
            return acc;
          },
          {}
        );

        // First check if the instructor exists
        const existingInstructor = await Instructor.findById(user.id);
        if (!existingInstructor) {
          throw new Error("Instructor not found");
        }

        // Update the instructor profile
        const instructor = await Instructor.findByIdAndUpdate(
          user.id,
          { $set: filteredInput },
          { new: true, runValidators: true }
        );

        if (!instructor) {
          throw new Error("Failed to update instructor profile");
        }

        // Return only the fields that are defined in the InstructorProfile type
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
          profileImage: instructor.profileImage,
          documents: instructor.documents,
          fatherName: instructor.fatherName,
          dateOfBirth: instructor.dateOfBirth,
          languagePreference: instructor.languagePreference, // Will now be an array
        };
      } catch (error) {
        if (error.name === "ValidationError") {
          const validationErrors = Object.values(error.errors).map(
            (err) => err.message
          );
          throw new Error(`Validation error: ${validationErrors.join(", ")}`);
        }
        if (error.name === "CastError") {
          throw new Error(`Invalid data format: ${error.message}`);
        }
        if (error.name === "ZodError") {
          throw new Error(
            `Validation error: ${error.errors
              .map((err) => err.message)
              .join(", ")}`
          );
        }
        throw new Error(`Error updating teacher profile: ${error.message}`);
      }
    },
  },
};

module.exports = resolvers;
