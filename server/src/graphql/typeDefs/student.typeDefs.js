const { gql } = require("apollo-server-express");

const studentTypeDefs = gql`
  type Document {
    documentType: String!
    documentUrl: String!
  }
  interface User {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    role: UserRole
    isProfileComplete: Boolean!
    isUserVerified: Boolean
    isUserAuthenticated: Boolean
    authProvider: AuthProvider!
    createdAt: String!
    updatedAt: String!
  }
  type Slot {
    date: String!
    startTime: String!
    endTime: String!
  }

  type PaymentMethod {
    type: String!
    cardNumber: String
  }

  type StudentLesson {
    _id: ID!
    studentId: ID!
    instructorId: ID!
    slots: [Slot!]!
    totalAmount: Float!
    paymentMethod: PaymentMethod!
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  type LessonBookingHistory {
    lessonBooked: String!
    bookingDate: String!
    payment: Float!
    status: String!
    endDate: String!
  }
  type StudentProfile {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    phone: String
    location: String
    fatherName: String
    description: String
    profileImage: String
    homeAddress: String
    zipCode: String
    documents: [Document!]
    dateOfBirth: String
    languagePreference: [String] # Changed from String to [String]
  }
  extend type Query {
    me: User
    studentProfile: StudentProfile
    getStudentLessons(studentId: ID!): [StudentLesson]
    getStudentLessonHistory(studentId: ID!): [LessonBookingHistory]
  }
`;

module.exports = studentTypeDefs;
