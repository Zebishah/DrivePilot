# Stripe T-48 3DS and Awaiting Payment Flow - Implementation Handover

Date: 2026-05-06

## Objective

Provide a complete and reliable post-T48 payment recovery flow, including:
- clear student/instructor UI when payment is pending,
- repeat reminders during the 24-hour grace window,
- correct 3DS completion flow,
- automatic cancellation after deadline,
- and a smooth success experience after 3DS (no false error screen).

---

## Business Flow (Easy Summary)

1. Student books lesson in advance (>48h before start).
2. At T-48, platform attempts off-session charge.
3. If charge needs 3DS or fails:
   - slot moves to `requires_action` or `payment_failed`,
   - UI shows `Awaiting Payment`,
   - student sees `Complete Checkout` action,
   - reminder sequence starts (24h grace window).
4. Student completes 3DS later via complete-payment page.
5. If payment succeeds -> slot becomes paid and lesson continues.
6. If still unpaid after 24h from first reminder -> slot is auto-cancelled and released.

---

## What Was Implemented

### 1) Slot-level reminder/deadline tracking

Updated slot schema in `server/src/models/studentBooking.model.js` with:
- `paymentReminderStartedAt`
- `paymentReminderDeadlineAt`
- `paymentReminder1SentAt`
- `paymentReminder2SentAt`
- `paymentReminder3SentAt`

Purpose: persist exact reminder timeline and avoid duplicate reminder behavior.

### 2) Follow-up reminder job for T-48 failures

Added `server/src/jobs/t48PaymentReminderJob.js`.

It handles:
- reminder #2 at ~12 hours,
- reminder #3 at ~18 hours,
- auto-cancel at 24 hours,
- slot release back into instructor availability,
- booking status normalization (`cancelled` / `semi_cancelled`).

### 3) First reminder unified with T-48 charge path

Updated `server/src/jobs/t48ChargeJob.js` to use shared reminder sender:
- first reminder sent for `requires_action`,
- first reminder sent for `payment_failed`,
- first reminder initializes 24-hour deadline fields.

### 4) Scheduler integration

Updated `server/src/index.js`:
- periodic `runT48PaymentReminderJob()` (every 10 minutes),
- initial run on startup.

---

## UI Behavior Implemented

### Student side

Files:
- `Frontend/src/components/BookingList.tsx`
- `Frontend/src/pages/private/student-dashboard/bookingDetails.tsx`

Behavior:
- slot shown as `Awaiting Payment` when payment status is `requires_action` or `payment_failed`,
- inline row message with deadline:
  - "Please complete your payment before [deadline]. Otherwise, your lesson will be automatically cancelled.",
- `Complete Checkout` action in list,
- same payment warning visible in booking details.

### Instructor side

File:
- `Frontend/src/components/InstructorComponent/StudentBookingWInst.tsx`

Behavior:
- instructor sees `Awaiting Payment` badge,
- inline explanatory row:
  - student payment not completed + deadline + auto-cancel note,
- status dropdown is effectively blocked for awaiting-payment slots (to prevent invalid lesson-state updates).

---

## 3DS Completion Flow (Technical Sequence)

Core files:
- `Frontend/src/pages/private/student-dashboard/CompletePaymentPage.tsx`
- `server/src/graphql/resolvers/studentBooking.resolver.js`
- `server/src/routes/stripeWebhook.routes.js`
- `server/src/graphql/typeDefs/studentBooking.typeDefs.js`

Sequence:
1. Student opens `/student-dashboard/complete-payment?bookingId=...&slotId=...`.
2. Frontend calls `getT48ClientSecret`.
3. Backend validates booking/slot ownership and eligibility.
4. Backend returns client secret for actionable PaymentIntent (or creates a fresh PI if needed).
5. Frontend uses Stripe.js (`retrievePaymentIntent`, `confirmCardPayment`) and redirects for 3DS when needed.
6. After bank verification, payment can finalize through webhook and/or completion mutation.
7. Frontend shows success and routes user back to booked lessons.

---

## Root Cause of the "Already Paid / Does Not Require Payment" Error

Observed issue:
- student completed 3DS successfully,
- but on return, screen showed error:
  - "This slot does not require payment completion..."

Actual cause:
- post-3DS race timing between:
  - frontend re-check call (`getT48ClientSecret`),
  - and backend/webhook marking slot as paid.
- old backend behavior treated "already paid now" as hard error instead of success-compatible state.

This created poor UX even when payment had actually succeeded.

---

## Fix for Post-3DS UX Race (Implemented)

### Backend change

File:
- `server/src/graphql/resolvers/studentBooking.resolver.js`

In `getT48ClientSecret`:
- if slot is already `paid` -> return `null` (not error),
- if stored PI status is already `succeeded` -> return `null`,
- if DB state drift exists but PI still needs action -> self-heal slot to `requires_action` and continue.

### GraphQL contract adjustment

File:
- `server/src/graphql/typeDefs/studentBooking.typeDefs.js`

Changed:
- `getT48ClientSecret(...): String!` -> `String`

Reason:
- endpoint can now intentionally return `null` to mean "payment already completed".

### Frontend handling

File:
- `Frontend/src/pages/private/student-dashboard/CompletePaymentPage.tsx`

Changed:
- when `getT48ClientSecret` returns `null`, frontend treats it as success path,
- shows green success alert instead of red error.

Result:
- post-3DS redirect now feels smooth and correct for users.

---

## Status/State Rules Now

- Awaiting payment UI appears only for slot payment states:
  - `requires_action`
  - `payment_failed`
- Payment completion is blocked if:
  - lesson marked `completed` or `missed`,
  - lesson end time already passed.
- Already-paid return from 3DS is treated as success-compatible state, not failure.

---

## Files Changed for This End-to-End Flow

Backend:
- `server/src/models/studentBooking.model.js`
- `server/src/jobs/t48ChargeJob.js`
- `server/src/jobs/t48PaymentReminderJob.js`
- `server/src/index.js`
- `server/src/graphql/resolvers/studentBooking.resolver.js`
- `server/src/graphql/typeDefs/studentBooking.typeDefs.js`
- `server/src/routes/stripeWebhook.routes.js` (supporting slot payment finalization consistency)

Frontend:
- `Frontend/src/components/BookingList.tsx`
- `Frontend/src/pages/private/student-dashboard/bookingDetails.tsx`
- `Frontend/src/components/InstructorComponent/StudentBookingWInst.tsx`
- `Frontend/src/pages/private/student-dashboard/CompletePaymentPage.tsx`

Docs/tests:
- `server/src/jobs/t48PaymentReminderJob.test.js`
- `docs/STRIPE_T48_FOLLOWUP_EMAILS_IMPLEMENTATION.md`

---

## Outcome

The system now provides:
- clear pending-payment visibility for both student and instructor,
- deterministic reminder and deadline behavior,
- safe automatic cancellation after grace window,
- robust and user-friendly 3DS completion experience,
- removal of false-negative error after successful 3DS return.

