const { gql } = require("apollo-server-express");

const reviewTypeDefs = gql`
  type SlotDetails {
    date: String!
    startTime: String!
    endTime: String!
    status: String!
    booked: Boolean
    review: Boolean
  }

  type StudentBookingSlot {
    lessonNumber: String!
    lessonId: ID!
    instructorName: String!
    instructorId: ID!
    studentId: ID!
    dateOfBooking: String!
    slotStatus: String!
    isCompleted: Boolean!
    isReviewed: Boolean!
    slotId: String!
    profileImage: String!
    slotDetails: SlotDetails!
  }
  input CreateReviewInput {
    reviewRating: Float!
    reviewDescription: String!
    studentId: ID!
    instructorId: ID!
    lessonId: ID!
    slotId: String!
  }

  input UpdateReviewInput {
    reviewRating: Float
    reviewDescription: String
  }

  # Response types
  type ReviewUser {
    _id: ID!
    firstName: String!
    lastName: String!
    profileImage: String
  }

  type Review {
    _id: ID!
    reviewStatus: String!
    reviewRating: Float
    reviewDescription: String
    studentId: ReviewUser!
    instructorId: ReviewUser!
    lessonId: ID!
    slotId: String!
    createdAt: String!
    updatedAt: String!
  }

  type DeleteResponse {
    success: Boolean!
    message: String!
  }
  type StudentHoursProgress {
    totalRequiredHours: Float!
    completedHours: Float!
    remainingHours: Float!
    studentInfo: StudentInfo!
    bookingsBreakdown: BookingsBreakdown!
  }

  type StudentInfo {
    _id: ID!
    firstName: String!
    lastName: String!
    email: String!
    profileImage: String
    lessonHoursLeft: String
  }

  type BookingsBreakdown {
    totalBookings: Int!
    completedBookings: Int!
    pendingBookings: Int!
    totalBookedSlots: Int!
    completedSlots: Int!
    pendingSlots: Int!
  }
  extend type Query {
    getInstructorReviews(instructorId: ID!): [Review!]!
    getStudentReviews(studentId: ID!): [Review!]!
    getAllStudentBookingSlots: [StudentBookingSlot!]!
    getReviewByLessonSlot(lessonId: ID!, slotId: String!): Review
    getStudentHoursProgress(studentId: ID!): StudentHoursProgress!
  }

  # Mutations
  extend type Mutation {
    createReview(input: CreateReviewInput!): Review!
    updateReview(reviewId: ID!, input: UpdateReviewInput!): Review!
    deleteReview(reviewId: ID!): DeleteResponse!
  }
`;
module.exports = reviewTypeDefs;
