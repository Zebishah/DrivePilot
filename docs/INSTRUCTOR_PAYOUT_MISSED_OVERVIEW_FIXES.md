# Instructor Panel + Stripe Integration Fixes

## Scope of this update

This update covers three requested areas:

1. Include **missed lessons** in instructor payout flow.
2. Replace Overview card **Money Earned** with **Total Received**.
3. Enforce **3-day payout delay** before lessons move to payout processing.

## 1) Missed lessons now follow payout logic

### Problem

Only `completed` lessons were entering payout eligibility. `missed` lessons were not being marked as payout-pending, so they did not move into payout processing and were missing from payout tracking.

### What was changed

- Updated slot status handling so both `completed` and `missed` set:
  - `completionMarkedAt`
  - `payoutEligibleAt`
  - `payoutStatus = "pending"` (when payment is paid and instructor amount exists)

### Files updated

- `server/src/graphql/resolvers/studentBooking.resolver.js`
- `server/src/graphql/resolvers/AdminBookingType.resolver.js`

### Result

- `completed` lessons: counted for payout (unchanged).
- `missed` lessons: now counted for payout (fixed).
- Payout job can now pick up both once eligibility time is reached.

## 2) Overview card changed to Total Received

### Problem

The previous **Money Earned** card used a separate earnings value that could diverge from Stripe-linked transaction totals.

### What was changed

- Replaced card label from **Money Earned** to **Total Received**.
- Card value now comes from `getInstructorTransactionStats.totalReceived` (same source used in Transaction History).
- Added click behavior to redirect instructor to **Transaction History**.

### File updated

- `Frontend/src/components/InstructorComponent/InstructorAnalytics/InstructorAnalyticsDashboard.tsx`

### Result

- Overview now shows Stripe-linked total received value.
- Instructors can click the card to open `Transaction History`.

## 3) Payout delay logic set to 3 days

### Problem

Delay constants were previously set to 1 minute (testing setup), which made payouts appear immediate.

### What was changed

- Restored payout delay constant to 3 days:
  - `3 * 24 * 60 * 60 * 1000`
- Applied in both instructor and admin slot-status update flows.

### Files updated

- `server/src/graphql/resolvers/studentBooking.resolver.js`
- `server/src/graphql/resolvers/AdminBookingType.resolver.js`

### Clarification for client communication

For testing, payout timing had been temporarily reduced so behavior could be validated quickly. Business logic is now aligned with the required **3-day window** before payout processing.

## Additional quality update

- Updated payout transaction description to reflect missed lessons accurately:
  - completed lesson payout description
  - missed lesson payout description

File:

- `server/src/jobs/payoutJob.js`

## Final outcome

- Missed lessons are payout-eligible the same as completed lessons.
- Overview uses Total Received (Stripe-linked transaction metric).
- 3-day payout window is applied before payout processing.
