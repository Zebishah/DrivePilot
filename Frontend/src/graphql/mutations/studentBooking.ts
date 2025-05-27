import { gql } from "@apollo/client";

export const CREATE_BOOKING = gql`
  mutation CreateBooking($input: StudentBookingInput!) {
    createBooking(input: $input) {
      _id

      slots {
        date
        startTime
        endTime
      }
      totalAmount
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

export const GET_STUDENT_BOOKINGS = gql`
  query GetStudentBookings {
    getStudentBookings {
      _id
      totalAmount
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
        date
        startTime
        endTime
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
        date
        startTime
        endTime
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
  mutation CancelBooking($bookingId: ID!) {
    cancelBooking(bookingId: $bookingId) {
      _id
      status
      updatedAt
    }
  }
`;
