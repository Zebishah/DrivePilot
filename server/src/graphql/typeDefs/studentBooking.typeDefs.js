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
    completed
    refund
    cancelled
    missed
  }
  enum SlotStatus {
    available
    booked
    completed
    refund
    cancelled
    missed
  }
  input UpdateSlotStatusInput {
    bookingId: ID!
    slotId: ID!
    status: SlotStatus!
  }

  enum feedBackStatusEnum {
    pending
    completed
  }
  type Slot {
    id: ID
    _id: ID
    date: String!
    startTime: String!
    endTime: String!
    booked: Boolean
    status: status
    review: Boolean
    paymentStatus: String
    chargeAmount: Float
    instructorAmount: Float
    payoutStatus: String
    refundAmount: Float
    refundedAt: String
    cancellationDate: String
    completionMarkedAt: String
    cancelledBy: String
  }

  type PaymentMethod {
    type: String!
    cardNumber: String
    paymentMethodId: String
    cardLast4: String
    cardBrand: String
  }

  type UserBooking {
    _id: ID!
    firstName: String!
    profileImage: String
    lastName: String!
    email: String!
    description: String
  }

  type TeacherTariffInfo {
    lessonFee: Float
    finalPricePerLesson: Float
    lessonDiscount: Float
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
    stripePaymentIntentId: String
    stripeCustomerId: String
    profileImage: String
    createdAt: String!
    updatedAt: String!
    teacherTariff: TeacherTariffInfo
  }

  input SlotInput {
    id: ID
    date: String!
    startTime: String!
    endTime: String!
    status: status
    review: Boolean
  }

  input PaymentMethodInput {
    type: String!
    cardNumber: String
    paymentMethodId: String
    cardLast4: String
    cardBrand: String
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
    upcomingBookings: [StudentBooking!]!
    cancelledBookings: [StudentBooking!]!
    historyBookings: [StudentBooking!]!
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
    _id: ID!
    date: String!
    startTime: String!
    endTime: String!
    booked: Boolean
    feedBackStatus: feedBackStatusEnum
    status: status
    review: Boolean
    paymentStatus: String
    chargeAmount: Float
    instructorAmount: Float
    payoutStatus: String
    refundAmount: Float
    refundedAt: String
    cancellationDate: String
    completionMarkedAt: String
    cancelledBy: String
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
    getUnseenBookingsCount: Int!
  }

  type CreateBookingPayload {
    booking: StudentBooking
    requiresAction: Boolean
    clientSecret: String
    paymentIntentId: String
  }

  type CreateBookingCheckoutPayload {
    url: String!
    bookingId: ID
    deferred: Boolean
  }

  type Mutation {
    createBooking(input: StudentBookingInput!): CreateBookingPayload!
    createBookingCheckoutSession(
      input: StudentBookingInput!
    ): CreateBookingCheckoutPayload!
    # Resume checkout for an abandoned pending booking (same booking, new Stripe session).
    createCheckoutSessionForPendingBooking(
      bookingId: ID!
    ): CreateBookingCheckoutPayload!
    completeBookingFromCheckout(sessionId: String!): StudentBooking!
    completeDeferredBookingFromCheckout(sessionId: String!): StudentBooking!
    completeBookingAfterPayment(
      paymentIntentId: ID!
      input: StudentBookingInput!
    ): StudentBooking!
    # For T-48 3DS fallback: student completes a pending off-session PaymentIntent
    completeT48SlotPayment(paymentIntentId: ID!): StudentBooking!
    # Get client secret for a requires_action T-48 PaymentIntent so student can confirm it via Stripe.js
    getT48ClientSecret(bookingId: ID!, slotId: ID!): String!
    updateBookingStatus(bookingId: ID!, status: BookingStatus!): StudentBooking!
    cancelBookingSlot(bookingId: ID!, slotId: ID!): StudentBooking!
    markBookingsAsViewed: Boolean!
    updateSlotStatus(input: UpdateSlotStatusInput!): StudentBooking!
  }
`;

module.exports = studentBookingTypeDefs;
