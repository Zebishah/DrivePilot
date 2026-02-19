import { gql } from "@apollo/client";

export const REQUEST_REFUND = gql`
  mutation RequestRefund($bookingId: ID!, $slotId: ID!) {
    requestRefund(bookingId: $bookingId, slotId: $slotId) {
      id
      status
      amount
      requestedAt
      bookingId
      slotId
    }
  }
`;

export const APPROVE_REFUND_REQUEST = gql`
  mutation ApproveRefundRequest($id: ID!) {
    approveRefundRequest(id: $id) {
      id
      status
      processedAt
      stripeRefundId
    }
  }
`;

export const REJECT_REFUND_REQUEST = gql`
  mutation RejectRefundRequest($id: ID!, $rejectionReason: String) {
    rejectRefundRequest(id: $id, rejectionReason: $rejectionReason) {
      id
      status
      processedAt
      rejectionReason
    }
  }
`;

export const GET_MY_REFUND_REQUESTS = gql`
  query GetMyRefundRequests {
    getMyRefundRequests {
      id
      bookingId
      slotId
      amount
      status
      requestedAt
      processedAt
      rejectionReason
    }
  }
`;

export const GET_REFUND_REQUESTS = gql`
  query GetRefundRequests($status: RefundRequestStatus) {
    getRefundRequests(status: $status) {
      id
      bookingId
      slotId
      studentId
      instructorId
      amount
      currency
      status
      requestedAt
      processedAt
      processedBy
      rejectionReason
      studentName
      instructorName
      slotDate
      slotStartTime
      slotEndTime
    }
  }
`;
