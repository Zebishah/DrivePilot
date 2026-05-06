import { gql } from "@apollo/client";

export const GET_ALL_STUDENT_BOOKINGS = gql`
  query GetAllStudentBookings {
    getAllStudentBookings {
      _id
      studentId {
        _id
        firstName
        lastName
        email
        phone
        profileImage
        homeAddress
        location
        zipCode
      }
      instructorId {
        _id
        firstName
        lastName
        email
        phone
        profileImage
        carName
        transmissionType
        experience
        location
      }
      slots {
        _id
        date
        startTime
        endTime
        booked
        review
        feedBackStatus
        cancellationDate
        refundedAt
        cancelledBy
        completionMarkedAt
        status
      }
      totalAmount
      finalAmount
      paymentMethod {
        type
        cardNumber
      }
      status
      createdAt
      updatedAt
    }
  }
`;
export const GET_INSTRUCTOR_BOOKINGS_BY_ID = gql`
  query GetInstructorBookingsById($instructorId: ID!) {
    getInstructorBookingsById(instructorId: $instructorId) {
      _id
      studentId {
        _id
        firstName
        lastName
        email
        phone
        profileImage
        homeAddress
        location
        zipCode
      }
      instructorId {
        _id
        firstName
        lastName
        email
        phone
        profileImage
        carName
        transmissionType
        experience
        location
      }
      slots {
        _id
        date
        startTime
        endTime
        booked
        review
        feedBackStatus
        cancellationDate
        refundedAt
        completionMarkedAt
        cancelledBy
        status
        paymentStatus
        paymentReminderStartedAt
        paymentReminderDeadlineAt
        paymentReminder1SentAt
        paymentReminder2SentAt
        paymentReminder3SentAt
      }
      totalAmount
      finalAmount
      paymentMethod {
        type
        cardNumber
      }
      status
      stripeCustomerId
      createdAt
      updatedAt
    }
  }
`;
