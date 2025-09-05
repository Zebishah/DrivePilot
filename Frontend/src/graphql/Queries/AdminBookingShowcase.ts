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
        status
      }
      totalAmount
      finalAmount
      paymentMethod {
        type
        cardNumber
      }
      feedBackStatus
      status
      createdAt
      updatedAt
    }
  }
`;
