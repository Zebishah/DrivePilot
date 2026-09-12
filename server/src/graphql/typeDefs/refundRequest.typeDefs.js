const { gql } = require("apollo-server-express");

const refundRequestTypeDefs = gql`
  enum RefundRequestStatus {
    pending
    processing
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
    message: String!
    attachments: [RefundAttachment!]!
    studentName: String
    instructorName: String
    slotDate: String
    slotStartTime: String
    slotEndTime: String
  }

  type RefundAttachment {
    url: String!
    fileName: String!
    mimeType: String!
  }

  input RefundAttachmentInput {
    url: String!
    fileName: String!
    mimeType: String!
  }

  extend type Query {
    getRefundRequests(status: RefundRequestStatus): [RefundRequest!]!
    getMyRefundRequests: [RefundRequest!]!
  }

  extend type Mutation {
    requestRefund(
      bookingId: ID!
      slotId: ID!
      message: String!
      attachments: [RefundAttachmentInput!]
    ): RefundRequest!
    approveRefundRequest(id: ID!): RefundRequest!
    rejectRefundRequest(id: ID!, rejectionReason: String): RefundRequest!
  }
`;

module.exports = refundRequestTypeDefs;
