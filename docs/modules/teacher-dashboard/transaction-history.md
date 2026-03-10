# Teacher Dashboard -> Transaction History (deep)

**Module:** `teacher-dashboard`  
**Feature:** `transaction-history`  
**Route:** `/teacher-dashboard/transaction-history`

This page is the instructor-facing transaction ledger. It shows received amounts, payouts, and transaction history with filtering and pagination.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/pages/private/teacher-dashboard/InstructorTransactionHistoryPage.tsx` | Main transaction-history page | Calls instructor transaction list/count/stats queries; renders stat cards, filter tabs, paginated table, and detail modal. |
| `Frontend/src/graphql/Queries/transactionQueries.ts` | Shared transaction GraphQL | Defines instructor transaction queries and counts. |
| `Frontend/src/pages/private/teacher-dashboard/tabs/PaymentTab.tsx` | Related older surface | Imports transaction queries too, but the live full history UI is the dedicated route page above. |

## Frontend GraphQL

### `GET_INSTRUCTOR_TRANSACTIONS`

- File: `Frontend/src/graphql/Queries/transactionQueries.ts`
- Query field: `getInstructorTransactions(limit, offset, type)`
- Used by: `InstructorTransactionHistoryPage.tsx`

### `GET_INSTRUCTOR_TRANSACTIONS_COUNT`

- File: `Frontend/src/graphql/Queries/transactionQueries.ts`
- Query field: `getInstructorTransactionCount(type)`
- Used by: pagination on `InstructorTransactionHistoryPage.tsx`

### `GET_INSTRUCTOR_TRANSACTION_STATS`

- File: `Frontend/src/graphql/Queries/transactionQueries.ts`
- Query field: `getInstructorTransactionStats`
- Used by: summary stat cards

## Backend schema

### TypeDefs

- File: `server/src/graphql/typeDefs/transaction.typeDefs.js`
- Relevant query fields:
  - `getInstructorTransactions(limit, offset, type): [Transaction!]!`
  - `getInstructorTransactionCount(type): Int!`
  - `getInstructorTransactionStats: InstructorTransactionStats!`
- Relevant types:
  - `Transaction`
  - `InstructorTransactionStats`

### Resolvers

- File: `server/src/graphql/resolvers/transaction.resolver.js`
- Relevant resolvers:
  - `Query.getInstructorTransactions`
    - Instructor-only
    - Filters by current `user.id`, `role: "instructor"`, and optional type
    - Applies sort and pagination
  - `Query.getInstructorTransactionCount`
    - Instructor-only
    - Counts matching transactions for pagination
  - `Query.getInstructorTransactionStats`
    - Instructor-only
    - Aggregates totals for received payments, payouts, and counts
  - `Transaction.lessonSummary`
    - Loads booking slot context to show human-readable lesson date/time in the UI

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/transaction.model.js` | Primary transaction store |
| `server/src/models/studentBooking.model.js` | Resolves `lessonSummary` from booking/slot data |
| `server/src/services/transactionService.js` | Creates many of the transaction rows shown here |
| `server/src/routes/stripeWebhook.routes.js` | Writes transaction-related state via Stripe events |
| `server/src/jobs/payoutJob.js` | Generates payout-side financial events |
| `server/src/jobs/t48ChargeJob.js` | Generates deferred payment-related events |

## Data flow

1. Instructor opens `/teacher-dashboard/transaction-history`.
2. Page loads:
   - list query
   - count query
   - stats query
3. Changing filter tab changes the `type` variable and reloads list/count.
4. Changing page sends a new `offset`.
5. Backend returns only the current instructor’s transactions.
6. `lessonSummary` is resolved from booking/slot data so the UI can show which lesson each row belongs to.

## Developer notes

- This is the live transaction-history surface for instructors.
- `PaymentTab.tsx` still imports transaction queries, but its history branch is effectively dormant compared with this dedicated page.
