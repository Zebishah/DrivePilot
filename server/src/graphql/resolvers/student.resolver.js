const { Student } = require("../../models/User");
const { AuthenticationError } = require("apollo-server-express");

const studentResolver = {
  Query: {
    studentProfile: async (_, __, { user }) => {
      if (!user) {
        throw new AuthenticationError("Not authenticated");
      }

      try {
        const student = await Student.findById(user.id);
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
          address: student.address,
          zipCode: student.zipCode,
          fatherName: student.fatherName,
          dateOfBirth: student.dateOfBirth,
          languagePreference: student.languagePreference,
        };
      } catch (error) {
        throw new Error("Failed to fetch student profile");
      }
    },
  },
};

module.exports = studentResolver;
