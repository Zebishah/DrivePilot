const { gql } = require("apollo-server-express");

module.exports = gql`
  type Feedback {
    _id: ID!
    lessonId: ID!
    instructorId: ID!
    instructorEmail: String!
    feedbackTags: [String!]!
    hoursRemaining: String!
    message: String!
    createdAt: String!
  }

  input CreateFeedbackInput {
    lessonId: ID!
    instructorId: ID!
    instructorEmail: String!
    feedbackTags: [String!]!
    hoursRemaining: String!
    message: String!
  }
  input UpdateFeedbackInput {
    feedbackId: ID!
    feedbackTags: [String!]!
    hoursRemaining: String!
    message: String!
  }

  type Query {
    getFeedbackByLessonId(lessonId: ID!): Feedback
    getAllFeedbacks: [Feedback!]!
  }

  type Mutation {
    createFeedback(input: CreateFeedbackInput!): Feedback!
    updateFeedback(input: UpdateFeedbackInput!): Feedback!
    deleteFeedback(feedbackId: ID!): Boolean! # Add this line
  }
`;
