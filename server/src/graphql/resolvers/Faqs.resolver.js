const faqService = require("../../services/FaqServices");
const { AuthenticationError } = require("apollo-server-express");

const faqResolvers = {
  Query: {
    getAllFaqs: () => faqService.getAllFaqs(),

    getFaqsByAdmin: (_, __, { user }) => {
      if (!user || user.role !== "Admin") {
        throw new AuthenticationError("Unauthorized");
      }
      return faqService.getFaqsByAdmin(user.id);
    },

    getFaqById: (_, { id }) => faqService.getFaqById(id),
  },

  Mutation: {
    createFaq: async (_, { question, answer }, { user }) => {
      if (!user || user.role !== "Admin") {
        throw new AuthenticationError("Unauthorized");
      }

      // Check if FAQ with this question already exists for this admin
      const existingFaq = await faqService.getFaqByQuestionAndAdmin(
        question,
        user.id
      );
      if (existingFaq) {
        // Update existing FAQ
        return faqService.updateFaq(existingFaq._id, { question, answer });
      } else {
        // Create new FAQ
        return faqService.createFaq(question, answer, user.id);
      }
    },

    updateFaq: (_, { id, question, answer }, { user }) => {
      if (!user || user.role !== "Admin") {
        throw new AuthenticationError("Unauthorized");
      }
      return faqService.updateFaq(id, { question, answer });
    },

    deleteFaq: (_, { id }, { user }) => {
      if (!user || user.role !== "Admin") {
        throw new AuthenticationError("Unauthorized");
      }
      return faqService.deleteFaq(id);
    },
  },
};

module.exports = faqResolvers;
