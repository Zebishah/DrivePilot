const { gql } = require('apollo-server-express');

const studentBookingTypeDefs = gql`
  enum BookingStatus {
    pending
    confirmed
    cancelled
    completed
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

  type UserBooking {
    _id: ID!
    firstName: String!
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
    paymentMethod: PaymentMethod!
    status: BookingStatus!
    createdAt: String!
    updatedAt: String!    
  }

  input SlotInput {
    date: String!
    startTime: String!
    endTime: String!
  }

  input PaymentMethodInput {
    type: String!
    cardNumber: String
  }

  input StudentBookingInput {
    instructorId: ID!
    slots: [SlotInput!]!
    totalAmount: Float!
    paymentMethod: PaymentMethodInput!
  }

  type Query {
    getStudentBookings: [StudentBooking!]!
    getInstructorBookings: [StudentBooking!]!
  }

  type Mutation {
    createBooking(input: StudentBookingInput!): StudentBooking!
    updateBookingStatus(bookingId: ID!, status: BookingStatus!): StudentBooking!
    cancelBooking(bookingId: ID!): StudentBooking!
  }
`;

module.exports = studentBookingTypeDefs;