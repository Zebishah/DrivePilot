const faqService = require("../../services/FaqServices");
const { AuthenticationError } = require("apollo-server-express");
const { cache } = require("../../services/cacheService");
const { invalidateFaqs } = require("../../services/cacheInvalidation");

const faqResolvers = {
  Query: {
    getAllFaqs: () =>
      cache.getOrSet({
        category: "faq",
        key: "public",
        ttlSeconds: 300,
        loader: async () => {
          const faqs = await faqService.getAllFaqs();
          return faqs.map((faq) =>
            typeof faq.toObject === "function" ? faq.toObject() : faq,
          );
        },
      }),

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
        const result = await faqService.updateFaq(existingFaq._id, { question, answer });
        await invalidateFaqs();
        return result;
      } else {
        // Create new FAQ
        const result = await faqService.createFaq(question, answer, user.id);
        await invalidateFaqs();
        return result;
      }
    },

    updateFaq: async (_, { id, question, answer }, { user }) => {
      if (!user || user.role !== "Admin") {
        throw new AuthenticationError("Unauthorized");
      }
      const result = await faqService.updateFaq(id, { question, answer });
      await invalidateFaqs();
      return result;
    },

    deleteFaq: async (_, { id }, { user }) => {
      if (!user || user.role !== "Admin") {
        throw new AuthenticationError("Unauthorized");
      }
      const result = await faqService.deleteFaq(id);
      await invalidateFaqs();
      return result;
    },
  },
};

module.exports = faqResolvers;
