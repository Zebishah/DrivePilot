const { ContactDetailModel } = require("../../models/AdminContact");
const ContaactFormServices = require("../../services/ContaactFormServices");
const contactDetailService = require("../../services/ContactAdminServices");
const { AuthenticationError } = require("apollo-server-express");

const contactDetailResolvers = {
  Query: {
    getAllContactDetails: async (_, __, { user }) => {
      if (!user || user.role !== "Admin") {
        throw new AuthenticationError("Unauthorized.");
      }
      return await contactDetailService.getAllContactDetails();
    },
    getMyContactDetail: async (_, __, { user }) => {
      if (!user || user.role !== "Admin") {
        throw new AuthenticationError("Unauthorized.");
      }
      return await contactDetailService.getContactDetailByAdminId(user.id);
    },
  },

  Mutation: {
    createContactDetail: async (_, { supportEmail }, { user }) => {
      if (!user || user.role !== "Admin") {
        throw new AuthenticationError("Unauthorized: Admin access required.");
      }
      return await contactDetailService.createContactDetail(
        supportEmail,
        user.id
      );
    },

    updateContactDetail: async (_, { id, supportEmail }, { user }) => {
      if (!user || user.role !== "Admin") {
        throw new AuthenticationError("Unauthorized.");
      }
      return await contactDetailService.updateContactDetail(id, {
        supportEmail,
      });
    },

    deleteContactDetail: async (_, { id }, { user }) => {
      if (!user || user.role !== "Admin") {
        throw new AuthenticationError("Unauthorized.");
      }
      return await contactDetailService.deleteContactDetail(id);
    },
    sendContactEmail: async (_, { input }) => {
      try {
        // Validate input
        const { name, email, description } = input;

        if (!name || !name.trim()) {
          throw new UserInputError("Name is required");
        }

        if (!email || !email.trim()) {
          throw new UserInputError("Email is required");
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new UserInputError("Please provide a valid email address");
        }

        if (!description || !description.trim()) {
          throw new UserInputError("Description is required");
        }
        const contactDetail = await ContactDetailModel.findOne();
        if (!contactDetail || !contactDetail.supportEmail) {
          throw new Error("Support email not configured in database.");
        }
        // Sanitize input
        const sanitizedInput = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          description: description.trim(),
        };

        // Send email
        const result = await ContaactFormServices.sendContactEmail(
          sanitizedInput,
          contactDetail.supportEmail
        );

        return result;
      } catch (error) {
        console.error("Error in sendContactEmail resolver:", error);

        if (error instanceof UserInputError) {
          throw error;
        }

        return {
          success: false,
          message:
            "An error occurred while sending your message. Please try again later.",
        };
      }
    },
  },
};

module.exports = contactDetailResolvers;
