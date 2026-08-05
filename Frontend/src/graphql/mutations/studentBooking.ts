import { gql } from "@apollo/client";

export const CREATE_BOOKING = gql`
  mutation CreateBooking($input: StudentBookingInput!) {
    createBooking(input: $input) {
      booking {
        _id
        slots {
          id
          _id
          date
          startTime
          endTime
          booked
          status
          paymentStatus
          chargeAmount
          payoutStatus
          refundAmount
          refundedAt
        }
        totalAmount
        finalAmount
        paymentMethod {
          type
          cardNumber
          paymentMethodId
          cardLast4
          cardBrand
        }
        stripePaymentIntentId
        status
        createdAt
        updatedAt
      }
      requiresAction
      clientSecret
      paymentIntentId
    }
  }
`;

export const CREATE_BOOKING_CHECKOUT_SESSION = gql`
  mutation CreateBookingCheckoutSession($input: StudentBookingInput!) {
    createBookingCheckoutSession(input: $input) {
      url
      bookingId
      deferred
    }
  }
`;

export const CREATE_CHECKOUT_SESSION_FOR_PENDING_BOOKING = gql`
  mutation CreateCheckoutSessionForPendingBooking($bookingId: ID!) {
    createCheckoutSessionForPendingBooking(bookingId: $bookingId) {
      url
      bookingId
      deferred
    }
  }
`;

export const COMPLETE_BOOKING_FROM_CHECKOUT = gql`
  mutation CompleteBookingFromCheckout($sessionId: String!) {
    completeBookingFromCheckout(sessionId: $sessionId) {
      _id
      status
      slots {
        _id
        date
        startTime
        endTime
        status
        paymentStatus
      }
      totalAmount
      finalAmount
      createdAt
      updatedAt
    }
  }
`;

export const COMPLETE_DEFERRED_BOOKING_FROM_CHECKOUT = gql`
  mutation CompleteDeferredBookingFromCheckout($sessionId: String!) {
    completeDeferredBookingFromCheckout(sessionId: $sessionId) {
      _id
      status
      slots {
        _id
        date
        startTime
        endTime
        status
        paymentStatus
      }
      totalAmount
      finalAmount
      createdAt
      updatedAt
    }
  }
`;

export const COMPLETE_BOOKING_AFTER_PAYMENT = gql`
  mutation CompleteBookingAfterPayment(
    $paymentIntentId: ID!
    $input: StudentBookingInput!
  ) {
    completeBookingAfterPayment(paymentIntentId: $paymentIntentId, input: $input) {
      _id
      status
      slots {
        _id
        date
        startTime
        endTime
        status
        paymentStatus
      }
      totalAmount
      finalAmount
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_SLOT_STATUS = gql`
  mutation UpdateSlotStatus($input: UpdateSlotStatusInput!) {
    updateSlotStatus(input: $input) {
      _id
      status
      slots {
        _id
        date
        startTime
        endTime
        status
        booked
      }
      studentId {
        _id
        firstName
        lastName
        email
        profileImage
      }
      instructorId {
        _id
        firstName
        lastName
        email
        profileImage
      }
      totalAmount
      paymentMethod {
        type
        cardNumber
      }
    }
  }
`;
export const GET_T48_CLIENT_SECRET = gql`
  mutation GetT48ClientSecret($bookingId: ID!, $slotId: ID!) {
    getT48ClientSecret(bookingId: $bookingId, slotId: $slotId)
  }
`;

export const COMPLETE_T48_SLOT_PAYMENT = gql`
  mutation CompleteT48SlotPayment($paymentIntentId: ID!) {
    completeT48SlotPayment(paymentIntentId: $paymentIntentId) {
      _id
      status
      slots {
        _id
        date
        startTime
        endTime
        status
        paymentStatus
      }
    }
  }
`;

export const GET_STUDENT_BOOKINGS = gql`
  query GetStudentBookings {
    getStudentBookings {
      _id
      totalAmount
      finalAmount
      status
      createdAt
      updatedAt
      instructorId {
        _id
        firstName
        lastName
        email
        description
      }
      slots {
        id
        _id
        date
        startTime
        endTime
        booked
        status
        cancellationDate
        completionMarkedAt
        cancelledBy
        paymentStatus
        chargeAmount
        payoutStatus
        refundAmount
        refundedAt
        paymentReminderStartedAt
        paymentReminderDeadlineAt
        paymentReminder1SentAt
        paymentReminder2SentAt
        paymentReminder3SentAt
      }
      paymentMethod {
        type
        cardNumber
        paymentMethodId
        cardLast4
        cardBrand
      }
      stripePaymentIntentId
      stripeCustomerId
      teacherTariff {
        lessonFee
        finalPricePerLesson
        lessonDiscount
      }
    }
  }
`;

export const GET_COMPLETED_STUDENT_BOOKINGS = gql`
  query GetCompletedStudentBookings {
    getCompletedStudentBookings {
      _id
      totalAmount
      finalAmount
      status
      createdAt
      updatedAt
      instructorId {
        _id
        firstName
        lastName
        email
        description
      }
      studentId {
        _id
        firstName
        lastName
        profileImage
      }
      slots {
        _id
        date
        startTime
        endTime
        booked
        status
        feedBackStatus
      }
      paymentMethod {
        type
        cardNumber
      }
    }
  }
`;
export const GET_INSTRUCTOR_BOOKINGS = gql`
  query GetInstructorBookings {
    getInstructorBookings {
      _id
      studentId {
        firstName
        lastName
        email
      }
      slots {
        id
        date
        startTime
        endTime
        booked
        status
      }
      totalAmount
      paymentMethod {
        type
        cardNumber
      }
      status
      createdAt
    }
  }
`;

export const UPDATE_BOOKING_STATUS = gql`
  mutation UpdateBookingStatus($bookingId: ID!, $status: BookingStatus!) {
    updateBookingStatus(bookingId: $bookingId, status: $status) {
      _id
      status
      updatedAt
    }
  }
`;

export const CANCEL_BOOKING = gql`
  mutation CancelBooking($bookingId: ID!, $slotId: ID!) {
    cancelBookingSlot(bookingId: $bookingId, slotId: $slotId) {
      _id
      status
      slots {
        _id
        date
        startTime
        endTime
        status
        paymentStatus
        refundAmount
        refundedAt
      }
      updatedAt
    }
  }
`;

export const RESCHEDULE_BOOKING_SLOT = gql`
  mutation RescheduleBookingSlot($input: RescheduleBookingSlotInput!) {
    rescheduleBookingSlot(input: $input) {
      _id
      status
      slots {
        _id
        date
        startTime
        endTime
        status
        paymentStatus
        cancellationDate
        cancelledBy
      }
      updatedAt
    }
  }
`;

export const REQUEST_REFUND = gql`
  mutation RequestRefund(
    $bookingId: ID!
    $slotId: ID!
    $message: String!
    $attachments: [RefundAttachmentInput!]
  ) {
    requestRefund(
      bookingId: $bookingId
      slotId: $slotId
      message: $message
      attachments: $attachments
    ) {
      id
      status
      bookingId
      slotId
      message
      attachments {
        url
        fileName
        mimeType
      }
    }
  }
`;
