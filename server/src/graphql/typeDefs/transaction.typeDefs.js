const { gql } = require("apollo-server-express");

const transactionTypeDefs = gql`
  enum TransactionType {
    payment
    payout
    refund
    transfer_reversal
    adjustment
  }

  enum TransactionRole {
    platform
    instructor
    student
  }

  enum TransactionDirection {
    credit
    debit
  }

  enum TransactionStatus {
    pending
    succeeded
    failed
    cancelled
  }

  type Transaction {
    id: ID!
    type: TransactionType!
    role: TransactionRole!
    direction: TransactionDirection!
    amount: Float!
    currency: String!
    status: TransactionStatus!

    bookingId: ID
    slotId: ID
    studentId: ID
    instructorId: ID

    stripePaymentIntentId: String
    stripeChargeId: String
    stripeTransferId: String
    stripePayoutId: String
    stripeRefundId: String
    stripeTransferReversalId: String

    description: String
    occurredAt: String
    createdAt: String!
    updatedAt: String!
  }

  input AdminTransactionFilterInput {
    type: TransactionType
    role: TransactionRole
    status: TransactionStatus
    instructorId: ID
    studentId: ID
    bookingId: ID
    from: String
    to: String
  }

  extend type Query {
    getAdminTransactions(filter: AdminTransactionFilterInput): [Transaction!]!
    getBookingTransactions(bookingId: ID!): [Transaction!]!
    getInstructorTransactions(limit: Int, offset: Int): [Transaction!]!
    getStudentTransactions(limit: Int, offset: Int): [Transaction!]!
    getStudentBookingTransactions(bookingId: ID!): [Transaction!]!
  }
`;

module.exports = transactionTypeDefs;
