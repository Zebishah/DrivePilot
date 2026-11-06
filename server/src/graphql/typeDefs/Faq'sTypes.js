const { gql } = require("apollo-server-express");

const faqTypeDefs = gql`
  type Faq {
    _id: ID
    question: String
    answer: String
    adminId: ID
    createdAt: String
    updatedAt: String
  }

  type Query {
    getAllFaqs: [Faq]
    getFaqsByAdmin(adminId: ID!): [Faq]
    getFaqById(id: ID!): Faq
  }

  type Mutation {
    createFaq(question: String!, answer: String!, adminId: ID!): Faq
    updateFaq(id: ID!, question: String, answer: String): Faq
    deleteFaq(id: ID!): Faq
  }
`;

module.exports = faqTypeDefs;
