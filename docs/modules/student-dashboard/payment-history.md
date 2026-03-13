# Student Dashboard -> Payment History (deep)

**Module:** `student-dashboard`  
**Feature:** `payment-history`  
**Route:** `/student-dashboard/payment-history`

This screen is the student-facing financial ledger. It shows lesson payments, refunds, rejected/cancelled financial outcomes, summary cards, and detailed transaction rows with pagination.

## Purpose

- Give students a clear view of what they paid and what was refunded.
- Separate completed vs refund vs rejected transaction states.
- Show lesson-slot context for each transaction row.
- Provide a modal detail surface for transaction metadata.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/pages/private/student-dashboard/StudentPaymentHistoryPage.tsx` | Main payment-history page | Calls student transaction list/count/stats queries; renders stat cards, filter tabs, paginated table, and detail modal. |
| `Frontend/src/graphql/Queries/transactionQueries.ts` | Transaction GraphQL definitions | Defines student transaction list/count/stats queries and related fields like `lessonSummary`. |

## Frontend GraphQL

### `GET_STUDENT_TRANSACTIONS`

- File: `Frontend/src/graphql/Queries/transactionQueries.ts`
- Query field: `getStudentTransactions(limit, offset, view)`
- Used by: main transaction table.

### `GET_STUDENT_TRANSACTIONS_COUNT`

- File: `Frontend/src/graphql/Queries/transactionQueries.ts`
- Query field: `getStudentTransactionCount(view)`
- Used by: pagination.

### `GET_STUDENT_TRANSACTION_STATS`

- File: `Frontend/src/graphql/Queries/transactionQueries.ts`
- Query field: `getStudentTransactionStats`
- Used by: top summary cards (`totalSpent`, `totalRefunded`, counts).

### Refund request history

- File: `Frontend/src/graphql/mutations/refundRequest.ts`
- Query field: `GET_MY_REFUND_REQUESTS`
- Used when the UI needs refund-request state beyond the raw transaction ledger.

## Backend schema

### TypeDefs

- File: `server/src/graphql/typeDefs/transaction.typeDefs.js`
- Relevant query fields:
  - `getStudentTransactions(limit, offset, view)`
  - `getStudentTransactionCount(view)`
  - `getStudentTransactionStats`
  - `getStudentBookingTransactions(bookingId)`
- Relevant types:
  - `Transaction`
  - `StudentTransactionStats`
- File: `server/src/graphql/typeDefs/refundRequest.typeDefs.js`
  - `getMyRefundRequests`

### Resolvers

- File: `server/src/graphql/resolvers/transaction.resolver.js`
  - `Query.getStudentTransactions`
  - `Query.getStudentTransactionCount`
  - `Query.getStudentTransactionStats`
  - `Transaction.lessonSummary`
- File: `server/src/graphql/resolvers/refundRequest.resolver.js`
  - `Query.getMyRefundRequests`

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/transaction.model.js` | Primary financial transaction store |
| `server/src/models/refundRequest.model.js` | Student refund-request state |
| `server/src/models/studentBooking.model.js` | Source for lesson summary / slot context |
| `server/src/services/transactionService.js` | Creates many of the ledger rows displayed here |
| `server/src/services/stripeService.js` | Payment/refund helpers behind transaction creation |

## Data flow

1. Student opens `/student-dashboard/payment-history`.
2. The page loads:
   - transaction list
   - transaction count
   - stats summary
3. Filter tabs change the `view` variable (`all`, `completed`, `refund`, `rejected`).
4. Pagination updates the `offset`.
5. Backend returns only the current student’s ledger rows and aggregate totals.
6. `lessonSummary` is resolved from booking/slot data so the table can show which lesson each transaction belongs to.

## Developer notes

- This page is transaction-ledger driven, not booking-ledger driven; one booking can produce multiple financial rows.
- Refund requests and refund transactions are related but not identical concepts. The student may see both the request state and the final refund transaction depending on the UI surface.
- Server-side pagination is already implemented, so large student ledgers do not require fetching every row at once.
