import { gql } from "@apollo/client";

const TRANSACTION_FIELDS = gql`
  fragment TransactionFields on Transaction {
    id
    type
    role
    direction
    amount
    currency
    status
    bookingId
    slotId
    studentId
    instructorId
    stripePaymentIntentId
    stripeChargeId
    stripePayoutId
    stripeRefundId
    description
    occurredAt
    createdAt
    updatedAt
  }
`;

export const GET_ADMIN_TRANSACTIONS = gql`
  ${TRANSACTION_FIELDS}
  query GetAdminTransactions($filter: AdminTransactionFilterInput) {
    getAdminTransactions(filter: $filter) {
      ...TransactionFields
    }
  }
`;

export const GET_INSTRUCTOR_TRANSACTIONS = gql`
  ${TRANSACTION_FIELDS}
  query GetInstructorTransactions($limit: Int, $offset: Int) {
    getInstructorTransactions(limit: $limit, offset: $offset) {
      ...TransactionFields
    }
  }
`;

export const GET_STUDENT_TRANSACTIONS = gql`
  ${TRANSACTION_FIELDS}
  query GetStudentTransactions($limit: Int, $offset: Int) {
    getStudentTransactions(limit: $limit, offset: $offset) {
      ...TransactionFields
    }
  }
`;

export const GET_BOOKING_TRANSACTIONS = gql`
  ${TRANSACTION_FIELDS}
  query GetBookingTransactions($bookingId: ID!) {
    getBookingTransactions(bookingId: $bookingId) {
      ...TransactionFields
    }
  }
`;

export const GET_STUDENT_BOOKING_TRANSACTIONS = gql`
  ${TRANSACTION_FIELDS}
  query GetStudentBookingTransactions($bookingId: ID!) {
    getStudentBookingTransactions(bookingId: $bookingId) {
      ...TransactionFields
    }
  }
`;
