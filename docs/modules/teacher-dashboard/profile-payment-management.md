# Teacher Dashboard -> Profile Payment Management / Stripe (deep)

**Module:** `teacher-dashboard`  
**Feature:** `profile-payment-management`  
**Surface:** Payment Management tab inside `/teacher-dashboard/settings`  
**Related routes:** `/payment/refresh`, `/payment/complete`

This feature handles instructor Stripe onboarding and payment readiness. It also contains an older transaction-history branch, but the live full history UI now lives on the dedicated transaction-history route.

## Purpose

- Show Stripe onboarding status.
- Start Stripe onboarding.
- Continue or regenerate onboarding link when setup is incomplete or action is required.
- Refresh Stripe onboarding verification.
- Expose Stripe financial/restriction state from teacher profile.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/pages/private/teacher-dashboard/tabs/PaymentTab.tsx` | Main Stripe/payment setup tab | Uses profile Stripe status and Stripe onboarding mutations. Also loads instructor transactions/stats, though the visible active branch is setup-only. |
| `Frontend/src/pages/private/teacher-dashboard/StripePaymentRefresh.tsx` | Refresh route | Re-triggers Stripe account link flow. |
| `Frontend/src/pages/private/teacher-dashboard/StripePaymentComplete.tsx` | Completion route | Verifies onboarding status after Stripe returns to the app. |
| `Frontend/src/graphql/mutations/profile.ts` | Profile and Stripe GraphQL | Defines `GET_TEACHER_PROFILE`, `CREATE_STRIPE_ACCOUNT`, `REGENERATE_STRIPE_LINK`, `VERIFY_STRIPE_ONBOARDING`, and related profile operations. |
| `Frontend/src/graphql/Queries/transactionQueries.ts` | Transaction queries | Used by `PaymentTab.tsx` for the dormant/history branch and stats. |

## Frontend GraphQL

### Stripe onboarding operations

- `GET_TEACHER_PROFILE`
  - source of:
    - `onboardingStatus`
    - `isActive`
    - `stripeAccount`
    - `stripeFinancialStatus`
- `CREATE_STRIPE_ACCOUNT`
  - starts onboarding and returns an onboarding URL
- `REGENERATE_STRIPE_LINK`
  - continues or repairs onboarding flow
- `VERIFY_STRIPE_ONBOARDING`
  - refreshes backend Stripe/account state after return from Stripe

### Transaction-related operations used inside the tab

- `GET_INSTRUCTOR_TRANSACTIONS`
- `GET_INSTRUCTOR_TRANSACTION_STATS`

These are loaded in `PaymentTab.tsx`, but the current tab state is fixed to `"setup"`, so the transaction-history branch inside this component is not the main live history UI anymore.

## Backend schema

### TypeDefs

- File: `server/src/graphql/typeDefs.js`
- Relevant mutations:
  - `createStripeAccount`
  - `verifyStripeOnboarding`
  - `regenerateStripeLink`
  - `setInstructorPayoutToManual`
- Relevant types:
  - `CreateStripeAccountPayload`
  - `VerifyStripeOnboardingPayload`
  - `RegenerateStripeLinkPayload`
  - `SetPayoutSchedulePayload`
- Relevant query/type data:
  - `teacherProfile` includes onboarding/account/financial status fields

### Resolvers

- File: `server/src/graphql/resolvers.js`
- Relevant resolvers:
  - `Query.teacherProfile`
  - `Mutation.createStripeAccount`
  - `Mutation.verifyStripeOnboarding`
  - `Mutation.regenerateStripeLink`
  - `Mutation.setInstructorPayoutToManual`

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/services/stripeService.js` | Core Stripe account, onboarding, payout, and payment integration |
| `server/src/graphql/utils/instructorPaymentReady.js` | Shared readiness logic that also gates availability |
| `server/src/routes/stripeWebhook.routes.js` | Stripe webhook processing |
| `server/src/jobs/payoutJob.js` | Instructor payout scheduling |
| `server/src/jobs/t48ChargeJob.js` | Deferred charge scheduling |
| `server/src/services/transactionService.js` | Transaction ledger entries tied to Stripe events |

## Data flow

1. Instructor opens Payment Management tab.
2. `GET_TEACHER_PROFILE` loads current Stripe onboarding/account state.
3. Depending on `onboardingStatus`, the UI renders a different onboarding-state card.
4. Connect / continue / fix actions call:
   - `CREATE_STRIPE_ACCOUNT`, or
   - `REGENERATE_STRIPE_LINK`
5. User is redirected to Stripe-hosted onboarding.
6. Stripe returns to `/payment/complete` or `/payment/refresh`.
7. These pages call `VERIFY_STRIPE_ONBOARDING` or restart onboarding as needed.
8. Updated Stripe state is reflected back into `teacherProfile`, which also drives availability gating and layout-level payment readiness.

## Developer notes

- `PaymentTab.tsx` still imports and queries transaction-history data, but `sectionTab` is hardcoded to `"setup"`, so this branch is effectively dormant.
- The real, user-visible full transaction history for instructors is the separate `/teacher-dashboard/transaction-history` page.
