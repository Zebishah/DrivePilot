const { gql } = require("apollo-server-express");

const refundRequestTypeDefs = gql`
  enum RefundRequestStatus {
    pending
    approved
    rejected
  }

  type RefundRequest {
    id: ID!
    bookingId: ID!
    slotId: ID!
    studentId: ID!
    instructorId: ID!
    amount: Float!
    currency: String!
    status: RefundRequestStatus!
    requestedAt: String!
    processedAt: String
    processedBy: ID
    stripeRefundId: String
    rejectionReason: String
    studentName: String
    instructorName: String
    slotDate: String
    slotStartTime: String
    slotEndTime: String
  }

  extend type Query {
    getRefundRequests(status: RefundRequestStatus): [RefundRequest!]!
    getMyRefundRequests: [RefundRequest!]!
  }

  extend type Mutation {
    requestRefund(bookingId: ID!, slotId: ID!): RefundRequest!
    approveRefundRequest(id: ID!): RefundRequest!
    rejectRefundRequest(id: ID!, rejectionReason: String): RefundRequest!
  }
`;

module.exports = refundRequestTypeDefs;
