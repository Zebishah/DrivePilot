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

  enum StudentTransactionView {
    all
    completed
    refund
    rejected
  }

  type TransactionParty {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    profileImage: String
    location: String
  }

  type Transaction {
    id: ID!
    type: TransactionType!
    role: TransactionRole!
    direction: TransactionDirection!
    amount: Float!
    amountMinor: Int
    currency: String!
    status: TransactionStatus!

    bookingId: ID
    slotId: ID
    studentId: ID
    instructorId: ID
    student: TransactionParty
    instructor: TransactionParty

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

    # Human-readable summary of the related lesson slot (for student/admin views),
    # for example: "05 Mar 2026 · 17:00 – 18:00". Uses booking/slot date & time.
    lessonSummary: String
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

  type AdminTransactionStats {
    totalEarned: Float!
    totalPayments: Int!
    totalRefunds: Int!
    totalPayouts: Int!
    transactionCount: Int!
  }

  type StudentTransactionStats {
    totalSpent: Float!
    totalRefunded: Float!
    paymentCount: Int!
    refundCount: Int!
    transactionCount: Int!
  }

  type InstructorTransactionStats {
    totalReceived: Float!
    totalPayouts: Float!
    paymentCount: Int!
    payoutCount: Int!
    transactionCount: Int!
  }

  type PlatformCommissionSettings {
    defaultRate: Float!
    defaultInstructorRate: Float
    defaultType: String!
    defaultFixedAmount: Float!
    minFare: Float
    maxFare: Float
    payoutMethods: [String!]!
  }

  input UpdatePlatformCommissionInput {
    defaultRate: Float
    defaultInstructorRate: Float
    defaultType: String
    defaultFixedAmount: Float
    minFare: Float
    maxFare: Float
    payoutMethods: [String!]
  }

  extend type Query {
    getAdminTransactions(
      filter: AdminTransactionFilterInput
      limit: Int
      offset: Int
    ): [Transaction!]!
    getAdminTransactionCount(filter: AdminTransactionFilterInput): Int!
    getAdminTransactionStats: AdminTransactionStats!
    getBookingTransactions(bookingId: ID!, limit: Int, offset: Int): [Transaction!]!
    getInstructorTransactions(
      limit: Int
      offset: Int
      type: TransactionType
    ): [Transaction!]!
    getInstructorTransactionCount(type: TransactionType): Int!
    getInstructorTransactionStats: InstructorTransactionStats!
    getStudentTransactions(
      limit: Int
      offset: Int
      view: StudentTransactionView
    ): [Transaction!]!
    getStudentTransactionCount(view: StudentTransactionView): Int!
    getStudentTransactionStats: StudentTransactionStats!
    getStudentBookingTransactions(bookingId: ID!, limit: Int, offset: Int): [Transaction!]!
    getPlatformCommissionSettings: PlatformCommissionSettings!
  }

  extend type Mutation {
    updatePlatformCommissionSettings(
      input: UpdatePlatformCommissionInput!
    ): PlatformCommissionSettings!
  }
`;

module.exports = transactionTypeDefs;
