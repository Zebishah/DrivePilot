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
    lessonSummary
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

const TRANSACTION_PARTY_FIELDS = gql`
  fragment TransactionPartyFields on TransactionParty {
    id
    firstName
    lastName
    email
    profileImage
    location
  }
`;

export const GET_ADMIN_TRANSACTIONS_WITH_PARTIES = gql`
  ${TRANSACTION_FIELDS}
  ${TRANSACTION_PARTY_FIELDS}
  query GetAdminTransactions($filter: AdminTransactionFilterInput) {
    getAdminTransactions(filter: $filter) {
      ...TransactionFields
      student { ...TransactionPartyFields }
      instructor { ...TransactionPartyFields }
    }
  }
`;

export const GET_ADMIN_TRANSACTION_STATS = gql`
  query GetAdminTransactionStats {
    getAdminTransactionStats {
      totalEarned
      totalPayments
      totalRefunds
      totalPayouts
      transactionCount
    }
  }
`;

export const GET_STUDENT_TRANSACTION_STATS = gql`
  query GetStudentTransactionStats {
    getStudentTransactionStats {
      totalSpent
      totalRefunded
      paymentCount
      refundCount
      transactionCount
    }
  }
`;

export const GET_INSTRUCTOR_TRANSACTION_STATS = gql`
  query GetInstructorTransactionStats {
    getInstructorTransactionStats {
      totalReceived
      totalPayouts
      paymentCount
      payoutCount
      transactionCount
    }
  }
`;

export const GET_PLATFORM_COMMISSION_SETTINGS = gql`
  query GetPlatformCommissionSettings {
    getPlatformCommissionSettings {
      defaultRate
      defaultType
      defaultFixedAmount
      minFare
      maxFare
      payoutMethods
    }
  }
`;

export const UPDATE_PLATFORM_COMMISSION_SETTINGS = gql`
  mutation UpdatePlatformCommissionSettings($input: UpdatePlatformCommissionInput!) {
    updatePlatformCommissionSettings(input: $input) {
      defaultRate
      defaultType
      defaultFixedAmount
      minFare
      maxFare
      payoutMethods
    }
  }
`;
