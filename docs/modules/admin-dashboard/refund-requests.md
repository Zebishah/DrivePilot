# Admin Dashboard -> Refund Requests (deep)

**Module:** `admin-dashboard`  
**Feature:** `refund-requests`  
**Route:** `/admin-dashboard/refund-requests`

This module is the admin review queue for lesson refund requests created by students.

## Purpose

- Show all refund requests with status tabs (`all`, `pending`, `approved`, `rejected`).
- Let admins approve or reject pending requests.
- Enforce refund business rules before money moves.
- Record refund and reversal transactions after approval.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/pages/private/admin-dashboard/AdminRefundRequestsPage.tsx` | Main route page | Calls `GET_REFUND_REQUESTS`, `APPROVE_REFUND_REQUEST`, `REJECT_REFUND_REQUEST`; renders table, tabs, reject dialog, and toasts. |
| `Frontend/src/graphql/mutations/refundRequest.ts` | Shared refund GraphQL | Defines admin operations and student refund operations in the same file. |

## Frontend GraphQL used by admin page

### `GET_REFUND_REQUESTS`

- File: `Frontend/src/graphql/mutations/refundRequest.ts`
- Query field: `getRefundRequests(status: RefundRequestStatus)`
- Used by: `AdminRefundRequestsPage.tsx`
- Note: the page passes `undefined` for the `all` tab so backend returns every request

### `APPROVE_REFUND_REQUEST`

- File: `Frontend/src/graphql/mutations/refundRequest.ts`
- Mutation field: `approveRefundRequest(id: ID!)`
- Used by: approve button in `AdminRefundRequestsPage.tsx`

### `REJECT_REFUND_REQUEST`

- File: `Frontend/src/graphql/mutations/refundRequest.ts`
- Mutation field: `rejectRefundRequest(id: ID!, rejectionReason: String)`
- Used by: reject dialog in `AdminRefundRequestsPage.tsx`

## Backend schema

### TypeDefs

- File: `server/src/graphql/typeDefs/refundRequest.typeDefs.js`
- Main enum:
  - `RefundRequestStatus`
- Main type:
  - `RefundRequest`
- Query fields:
  - `getRefundRequests(status: RefundRequestStatus): [RefundRequest!]!`
  - `getMyRefundRequests: [RefundRequest!]!`
- Mutation fields:
  - `requestRefund(bookingId: ID!, slotId: ID!): RefundRequest!`
  - `approveRefundRequest(id: ID!): RefundRequest!`
  - `rejectRefundRequest(id: ID!, rejectionReason: String): RefundRequest!`

### Resolvers

- File: `server/src/graphql/resolvers/refundRequest.resolver.js`
- Query resolvers:
  - `getRefundRequests`
    - Admin-only
    - Optional status filter
    - Sorts newest request first
  - `getMyRefundRequests`
    - Student-only
    - Used by student dashboard, not this admin page
- Mutation resolvers relevant to this module:
  - `approveRefundRequest`
    - Admin-only
    - Validates request exists and is still pending
    - Re-loads booking and slot
    - Rejects approval when:
      - slot already refunded
      - payout already happened
      - slot is `completed` or `missed`
      - lesson date has passed
    - Uses Stripe helpers:
      - `getTransferIdFromPaymentIntent`
      - `createTransferReversal`
      - `createRefund`
    - Updates booking slot to `refund`
    - Marks `paymentStatus = refunded`
    - Creates financial records through `createTransaction`
    - Updates `teacherAvailabilityModel`
    - Marks the refund request `approved`
  - `rejectRefundRequest`
    - Admin-only
    - Marks request as rejected
    - Saves `processedAt`, `processedBy`, optional `rejectionReason`
- Mutation that feeds this module:
  - `requestRefund`
    - Student-only
    - Creates the pending refund request the admin later sees here

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/refundRequest.model.js` | Stores refund requests |
| `server/src/models/studentBooking.model.js` | Source of slot/booking state during approval |
| `server/src/models/teacherAvailability.model.js` | Mirrors refund status into availability |
| `server/src/services/stripeService.js` | Executes Stripe refund and transfer reversal actions |
| `server/src/services/transactionService.js` | Creates transaction ledger rows after approval |

## Data flow

1. Student side creates a refund request with `requestRefund`.
2. Admin opens `AdminRefundRequestsPage.tsx`.
3. `GET_REFUND_REQUESTS` loads all or filtered requests.
4. Approve button -> `APPROVE_REFUND_REQUEST`.
5. Backend re-validates the request, processes Stripe refund/reversal, updates booking + transactions + availability, then marks the request approved.
6. Reject button -> `REJECT_REFUND_REQUEST`.
7. Backend records the rejection metadata and returns the updated request.

## Developer notes

- This page is only the admin queue. The creation side of the flow lives in student refund UI, but both halves share the same GraphQL module file.
- The resolver intentionally re-checks all refund rules at approval time so the request cannot become invalid between creation and admin action.
- The page disables both approve and reject flows while one request action is running, which helps avoid race conditions in the UI.
