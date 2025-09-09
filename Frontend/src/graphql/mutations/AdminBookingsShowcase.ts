import { gql } from "@apollo/client";

export const UPDATE_BOOKING_STATUS = gql`
  mutation UpdateBookingStatusAdmin($input: UpdateBookingStatusInputAdmin!) {
    updateBookingStatusAdmin(input: $input) {
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
  mutation CancelBookingAdmin($input: CancelBookingAdminInputAdmin!) {
    cancelBookingAdmin(input: $input) {
      _id
      status
      slots {
        _id
        status
        booked
        cancellationDate
      }
      cancellationDate
      updatedAt
    }
  }
`;
