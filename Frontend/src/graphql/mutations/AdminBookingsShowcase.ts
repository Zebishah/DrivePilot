import { gql } from "@apollo/client";

export const UPDATE_BOOKING_STATUS = gql`
  mutation UpdateBookingStatus($input: UpdateBookingStatusInput!) {
    updateBookingStatus(input: $input) {
      _id
      status
      slots {
        _id
        status
        booked
      }
      updatedAt
    }
  }
`;

export const CANCEL_BOOKING_ADMIN = gql`
  mutation CancelBookingAdmin($input: CancelBookingAdminInput!) {
    cancelBookingAdmin(input: $input) {
      _id
      status
      slots {
        _id
        status
        booked
      }
      updatedAt
    }
  }
`;
