const { gql } = require("apollo-server-express");

const AdminBookingTypeDefs = gql`
  type UserAdmin {
    _id: ID!
    firstName: String!
    lastName: String!
    email: String!
    phone: String
    profileImage: String
  }

  type StudentAdmin {
    _id: ID!
    firstName: String!
    lastName: String!
    email: String!
    phone: String
    profileImage: String
    homeAddress: String
    location: String
    zipCode: String
  }

  type InstructorAdmin {
    _id: ID!
    firstName: String!
    lastName: String!
    email: String!
    phone: String
    profileImage: String
    carName: String
    transmissionType: String
    experience: String
    location: String
  }

  type BookingSlotAdmin {
    _id: ID!
    date: String!
    startTime: String!
    endTime: String!
    booked: Boolean!
    review: Boolean!
    status: SlotStatusAdmin!
  }

  type PaymentMethodAdmin {
    type: String!
    cardNumber: String
  }

  type StudentBookingAdmin {
    _id: ID!
    studentId: StudentAdmin!
    instructorId: InstructorAdmin!
    slots: [BookingSlotAdmin!]!
    totalAmount: Float!
    finalAmount: Float!
    paymentMethod: PaymentMethodAdmin!
    feedBackStatus: FeedbackStatusAdmin!
    status: BookingStatusAdmin!
    createdAt: String!
    updatedAt: String!
  }

  enum SlotStatusAdmin {
    available
    booked
    cancelled
  }

  enum BookingStatusAdmin {
    pending
    confirmed
    cancelled
    completed
    semi_cancelled
  }

  enum FeedbackStatusAdmin {
    pending
    completed
  }

  input UpdateBookingStatusInputAdmin {
    bookingId: ID!
    slotId: ID!
    status: BookingStatusAdmin!
  }

  input CancelBookingAdminInputAdmin {
    bookingId: ID!
    slotId: ID!
    studentId: ID!
    reason: String
  }

  type Query {
    getAllStudentBookings: [StudentBookingAdmin!]!
  }

  type Mutation {
    updateBookingStatusAdmin(
      input: UpdateBookingStatusInputAdmin!
    ): StudentBookingAdmin!
    cancelBookingAdmin(
      input: CancelBookingAdminInputAdmin!
    ): StudentBookingAdmin!
  }
`;

module.exports = AdminBookingTypeDefs;
