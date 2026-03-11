# Admin Dashboard -> Payment Management (deep)

**Module:** `admin-dashboard`  
**Feature:** `payment-management`  
**Route:** `/admin-dashboard/transactions`

This module is the admin financial console. It has two parts:

- **Payments and Transactions**: view platform transaction history and stats
- **Commission Management**: read and update platform commission settings

## Purpose

- Show all DSP financial activity in one place.
- Filter transactions by party (`platform`, `instructor`, `student`) and type (`payment`, `refund`, `payout`, `transfer_reversal`, `adjustment`).
- Show platform-level transaction stats.
- Show lesson slot context for each transaction.
- Let admins update platform commission defaults.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/pages/private/admin-dashboard/AdminTransactionsPage.tsx` | Main route page | Uses `GET_ADMIN_TRANSACTIONS_WITH_PARTIES`, `GET_ADMIN_TRANSACTIONS_COUNT`, `GET_ADMIN_TRANSACTION_STATS`; contains the internal `CommissionManagementTab` that uses `GET_PLATFORM_COMMISSION_SETTINGS` and `UPDATE_PLATFORM_COMMISSION_SETTINGS`. |
| `Frontend/src/graphql/Queries/transactionQueries.ts` | Shared transaction GraphQL | Defines all admin, student, and instructor transaction queries; admin page uses only the admin/commission subset. |

## Frontend GraphQL used by admin page

### Transaction list and stats

- `GET_ADMIN_TRANSACTIONS_WITH_PARTIES`
  - Query field: `getAdminTransactions(filter, limit, offset)`
  - Adds nested `student` and `instructor` party fields
  - Used for the main admin table and detail modal
- `GET_ADMIN_TRANSACTIONS_COUNT`
  - Query field: `getAdminTransactionCount(filter)`
  - Used for pagination
- `GET_ADMIN_TRANSACTION_STATS`
  - Query field: `getAdminTransactionStats`
  - Used for the top stat cards

### Commission management

- `GET_PLATFORM_COMMISSION_SETTINGS`
  - Query field: `getPlatformCommissionSettings`
  - Used by `CommissionManagementTab`
- `UPDATE_PLATFORM_COMMISSION_SETTINGS`
  - Mutation field: `updatePlatformCommissionSettings(input)`
  - Used by `CommissionManagementTab`

## Backend schema

### TypeDefs

- File: `server/src/graphql/typeDefs/transaction.typeDefs.js`
- Main enums:
  - `TransactionType`
  - `TransactionRole`
  - `TransactionDirection`
  - `TransactionStatus`
  - `StudentTransactionView`
- Main types:
  - `Transaction`
  - `TransactionParty`
  - `AdminTransactionStats`
  - `PlatformCommissionSettings`
- Main input:
  - `AdminTransactionFilterInput`
  - `UpdatePlatformCommissionInput`
- Admin-facing query fields:
  - `getAdminTransactions(filter, limit, offset)`
  - `getAdminTransactionCount(filter)`
  - `getAdminTransactionStats`
  - `getPlatformCommissionSettings`
- Admin-facing mutation field:
  - `updatePlatformCommissionSettings(input)`

### Resolvers

- File: `server/src/graphql/resolvers/transaction.resolver.js`
- Helper functions:
  - `buildAdminTransactionQuery(filter)` builds the Mongo query for role/type/status/date filters
  - `formatLessonSummary(slot)` creates human-readable lesson labels
  - `toTransactionParty(userDoc)` normalizes a user into the GraphQL `TransactionParty` shape
- `Transaction` field resolvers:
  - `lessonSummary`
    - Loads `StudentBooking` and finds the matching slot
  - `student`
    - Resolves student party data from `User`
  - `instructor`
    - Resolves instructor party data from `User`
- Admin query resolvers:
  - `getAdminTransactions`
    - Admin-only
    - Uses `buildAdminTransactionQuery`
    - Applies sort + pagination
  - `getAdminTransactionCount`
    - Admin-only
    - Counts documents with the same filter
  - `getAdminTransactionStats`
    - Admin-only
    - Aggregates gross volume and transaction counts
    - `totalEarned` is based on platform gross receipt transactions, not only commission rows
  - `getPlatformCommissionSettings`
    - Admin-only
    - Reads `Admin.platformCommission`
    - Falls back to defaults when unset
- Admin mutation resolver:
  - `updatePlatformCommissionSettings`
    - Admin-only
    - Updates `Admin.platformCommission`
    - Supports `defaultRate`, `defaultType`, `defaultFixedAmount`, `minFare`, `maxFare`, `payoutMethods`

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/transaction.model.js` | Primary transaction store |
| `server/src/models/studentBooking.model.js` | Used to resolve `lessonSummary`, fallback studentId/instructorId, and booking-linked context |
| `server/src/models/User` | Used to resolve `student` and `instructor` display parties |

## Data flow

1. Admin opens `AdminTransactionsPage.tsx`.
2. Transaction tab loads:
   - `GET_ADMIN_TRANSACTION_STATS`
   - `GET_ADMIN_TRANSACTIONS_WITH_PARTIES`
   - `GET_ADMIN_TRANSACTIONS_COUNT`
3. Changing party tab, type tab, or page changes query variables and reloads the table.
4. Each row can show lesson slot context because the backend resolves `lessonSummary`.
5. Opening the second tab mounts `CommissionManagementTab`.
6. `GET_PLATFORM_COMMISSION_SETTINGS` loads the current platform defaults.
7. Saving the form calls `UPDATE_PLATFORM_COMMISSION_SETTINGS`, which persists the config under the admin record.

## Developer notes

- `transactionQueries.ts` is a shared file for admin, student, and instructor transaction screens. The admin page uses only a subset.
- `CommissionManagementTab` lives inside `AdminTransactionsPage.tsx`, so the commission feature is part of this same route file rather than a separate page.
- The backend resolver is also shared across roles; only the admin-specific queries and mutation in this doc are part of the admin module.
