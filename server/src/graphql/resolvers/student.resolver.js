const { Student } = require("../../models/User");
const { AuthenticationError } = require("apollo-server-express");
const { updateStudentProfileSchema } = require("../../schemas/validation");
const { Mutation } = require("../resolvers");
const studentBookingModel = require("../../models/studentBooking.model");

const studentResolver = {
  Query: {
    studentProfile: async (_, __, { user }) => {
      if (!user) {
        throw new AuthenticationError("Not authenticated");
      }

      try {
        const student = await Student.findById(user.id);
        console.log("student data from DB:", student);
        console.log("profileImage field:", student.profileImage);

        // Check if the field exists but under a different name
        const studentObj = student.toObject ? student.toObject() : student;
        console.log("All student fields:", Object.keys(studentObj));

        // Try to find any field that might contain profile image URL
        const possibleImageFields = Object.keys(studentObj).filter(
          (key) =>
            typeof studentObj[key] === "string" &&
            (key.toLowerCase().includes("image") ||
              key.toLowerCase().includes("photo") ||
              key.toLowerCase().includes("avatar") ||
              key.toLowerCase().includes("picture"))
        );
        console.log("Possible image fields:", possibleImageFields);

        if (!student) {
          return null;
        }

        return {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          phone: student.phone,
          location: student.location,
          description: student.description,
          homeAddress: student.homeAddress,
          zipCode: student.zipCode,
          fatherName: student.fatherName,
          dateOfBirth: student.dateOfBirth,
          profileImage:
            student.profileImage || student.avatar || student.photo || null, // Try alternative field names
          documents: student.documents,
          languagePreference: student.languagePreference,
        };
      } catch (error) {
        console.error("Error fetching student profile:", error);
        throw new Error("Failed to fetch student profile");
      }
    },

    getStudentLessons: async (_, { studentId }) => {
      try {
        return await studentBookingModel.find({ studentId });
      } catch (error) {
        throw new Error(`Error fetching student lessons: ${error.message}`);
      }
    },

    getStudentLessonHistory: async (_, { studentId }) => {
      try {
        const lessons = await studentBookingModel.find({ studentId });

        return lessons.map((lesson) => {
          // Format the dates in DD-MM-YYYY format
          const bookingDate = new Date(lesson.createdAt)
            .toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
            .replace(/\//g, "-");

          // Get the end date from the slot
          const endDate = lesson.slots[0].date.split("-").reverse().join("-");

          // Map status to the format shown in the UI
          let statusDisplay;

          statusDisplay =
            lesson.status.charAt(0).toUpperCase() + lesson.status.slice(1);

          return {
            lessonBooked: `Lesson ${lesson._id.toString().substr(-1)}`,
            bookingDate: bookingDate,
            // Return the payment as a number instead of a string with $ symbol
            payment: lesson.totalAmount,
            status: statusDisplay,
            endDate: endDate,
          };
        });
      } catch (error) {
        throw new Error(`Error fetching lesson history: ${error.message}`);
      }
    },
  },
  Mutation: {
    updateStudentProfile: async (_, { input }, { user }) => {
      if (!user) throw new Error("Not authenticated");

      try {
        // Validate input
        const validatedInput = updateStudentProfileSchema.parse(input);

        // Remove any undefined or null values from input
        const cleanInput = Object.entries(validatedInput).reduce(
          (acc, [key, value]) => {
            if (value !== undefined && value !== null) {
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
          "homeAddress",
          "firstName",
          "lastName",
          "location",
          "zipCode",
          "documents",
          "description",
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
        const existingStudent = await Student.findById(user.id);
        if (!existingStudent) {
          throw new Error("Instructor not found");
        }

        // Update the instructor profile
        const instructor = await Student.findByIdAndUpdate(
          user.id,
          { $set: filteredInput },
          { new: true, runValidators: true }
        );

        if (!instructor) {
          throw new Error("Failed to update Student profile");
        }

        // Return only the fields that are defined in the InstructorProfile type
        return {
          id: instructor.id,
          firstName: instructor.firstName,
          lastName: instructor.lastName,
          email: instructor.email,
          location: instructor.location,
          homeAddress: instructor.homeAddress,
          zipCode: instructor.zipCode,
          documents: instructor.documents,
          description: instructor.description,
          phone: instructor.phone,
          fatherName: instructor.fatherName,
          dateOfBirth: instructor.dateOfBirth,
          languagePreference: instructor.languagePreference,
          profileImage: instructor.profileImage,
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
        throw new Error(`Error updating student profile: ${error.message}`);
      }
    },
  },
};

module.exports = studentResolver;
