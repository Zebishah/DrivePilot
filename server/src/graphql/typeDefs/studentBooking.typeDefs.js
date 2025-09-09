const { gql } = require("apollo-server-express");

const studentBookingTypeDefs = gql`
  enum BookingStatus {
    pending
    confirmed
    semi_cancelled
    cancelled
    completed
    refund
  }
  enum status {
    available
    booked
    cancelled
    refund
  }
  enum feedBackStatusEnum {
    pending
    completed
  }
  type Slot {
    id: ID
    date: String!
    startTime: String!
    endTime: String!
    booked: Boolean
    status: status
    review: Boolean
  }

  type PaymentMethod {
    type: String!
    cardNumber: String
  }

  type UserBooking {
    _id: ID!
    firstName: String!
    profileImage: String
    lastName: String!
    email: String!
    description: String
  }

  type StudentBooking {
    _id: ID!
    studentId: UserBooking!
    instructorId: UserBooking!
    slots: [Slot!]!
    totalAmount: Int!
    finalAmount: Float!

    paymentMethod: PaymentMethod!
    status: BookingStatus!
    profileImage: String
    feedBackStatus: feedBackStatusEnum
    createdAt: String!
    updatedAt: String!
  }

  input SlotInput {
    date: String!
    startTime: String!
    endTime: String!
    status: status
    review: Boolean
  }

  input PaymentMethodInput {
    type: String!
    cardNumber: String
  }

  input StudentBookingInput {
    instructorId: ID!
    slots: [SlotInput!]!
    totalAmount: Float!
    finalAmount: Float!
    paymentMethod: PaymentMethodInput!
  }
  type StudentDashboardDetails {
    studentInfo: StudentInfo!
    lessonStats: LessonStats!
    graphStats: [GraphPoint!]!
    completedBookings: [StudentBooking!]!
    uncompletedBookings: [StudentBooking!]!
  }

  type StudentInfo {
    _id: ID!
    firstName: String!
    lastName: String!
    email: String!
    profileImage: String
    phone: String
    dateOfBirth: String
    fatherName: String
    description: String
    homeAddress: String
    location: String
    zipCode: String
    languagePreference: [String]
  }

  type LessonStats {
    totalLessons: Int!
    totalLessonDurationInMinutes: Int!
  }

  type GraphPoint {
    date: String! # "2025-06-05"
    lessonsBooked: Int! # 3
  }

  type InstructorInfo {
    _id: ID!
    firstName: String
    lastName: String
    email: String
    profileImage: String
  }

  type Slot {
    date: String!
    startTime: String!
    endTime: String!
    booked: Boolean
    status: status
    review: Boolean
  }

  type PaymentInfo {
    status: String
    createdAt: String
    updatedAt: String
  }
  input UpdateBookingStatusInput {
    bookingId: ID!
    studentId: ID!

    status: String!
  }

  input CancelBookingInput {
    bookingId: ID!
    studentId: ID!
    slotId: ID!
  }
  type BookingResponse {
    _id: ID!
    status: String!
    message: String!
  }
  type Query {
    getStudentBookings: [StudentBooking!]!
    getCompletedStudentBookings: [StudentBooking!]!
    getStudentDashboardDetails(studentId: ID!): StudentDashboardDetails
    getInstructorBookings: [StudentBooking!]!
  }

  type Mutation {
    createBooking(input: StudentBookingInput!): StudentBooking!
    updateBookingStatus(bookingId: ID!, status: BookingStatus!): StudentBooking!
    cancelBookingSlot(bookingId: ID!, slotId: ID!): StudentBooking!
  }
`;

module.exports = studentBookingTypeDefs;
