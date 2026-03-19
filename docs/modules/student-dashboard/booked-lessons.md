# Student Dashboard -> Booked Lessons (deep)

**Module:** `student-dashboard`  
**Feature:** `booked-lessons`  
**Routes:** `/student-dashboard/book`, `/student-dashboard/booking-details`, `/student-dashboard/complete-payment`

This feature owns the student’s active booking lifecycle: viewing booked lessons, tab-based status filtering, resuming abandoned checkout, completing later T-48/3DS payments, viewing booking details, cancelling a lesson, and requesting a refund.

## Purpose

- Show all student bookings grouped into practical dashboard tabs.
- Expose payment state clearly (`paid`, `pending_payment`, `requires_action`, `payment_failed`, refunded/cancelled cases).
- Let students resume checkout or complete Stripe-auth steps later.
- Provide detail view, cancel actions, and refund-request entry points.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/pages/private/student-dashboard/bookLesson.tsx` | Main booked-lessons page | Loads student bookings, groups them into dashboard tabs, handles resume-checkout and delayed-payment CTAs. |
| `Frontend/src/components/BookingList.tsx` | Booking card/list renderer | Renders tabs, booking cards, payment status chips, action buttons, and summary labels. |
| `Frontend/src/pages/private/student-dashboard/bookingDetails.tsx` | Booking detail screen | Handles returned Stripe state, specific slot actions, cancel/refund UI, and detailed booking display. |
| `Frontend/src/pages/private/student-dashboard/CompletePaymentPage.tsx` | Stripe.js payment completion screen | Completes T-48/3DS later-payment flows using a client secret. |
| `Frontend/src/components/StudentComponents/GetSlotDurationInHours.ts` | Slot duration helper | Used to convert slots into duration/hour displays. |
| `Frontend/src/components/InstructorComponent/common/BackButton.tsx` | Shared navigation helper | Used on nested detail flows. |

## Frontend GraphQL

### Booking creation / checkout continuation

- File: `Frontend/src/graphql/mutations/studentBooking.ts`
- Relevant operations:
  - `CREATE_BOOKING_CHECKOUT_SESSION`
  - `CREATE_CHECKOUT_SESSION_FOR_PENDING_BOOKING`
  - `COMPLETE_BOOKING_FROM_CHECKOUT`
  - `COMPLETE_DEFERRED_BOOKING_FROM_CHECKOUT`
  - `COMPLETE_BOOKING_AFTER_PAYMENT`
- Used by:
  - booking creation return paths
  - abandoned checkout resumption
  - Stripe redirect return handling

### Booked lessons listing and payment completion

- File: `Frontend/src/graphql/mutations/studentBooking.ts`
- Relevant operations:
  - `GET_STUDENT_BOOKINGS`
  - `GET_T48_CLIENT_SECRET`
  - `COMPLETE_T48_SLOT_PAYMENT`
  - `CANCEL_BOOKING`
- Used by:
  - `bookLesson.tsx`
  - `bookingDetails.tsx`
  - `CompletePaymentPage.tsx`

### Refund entry points

- Files:
  - `Frontend/src/graphql/mutations/studentBooking.ts`
  - `Frontend/src/graphql/mutations/refundRequest.ts`
- Relevant operations:
  - `REQUEST_REFUND`
  - `GET_MY_REFUND_REQUESTS`
- Used by:
  - booked lesson actions
  - booking detail and payment/refund visibility states

## Backend schema

### TypeDefs

- File: `server/src/graphql/typeDefs/studentBooking.typeDefs.js`
- Relevant query/mutation fields:
  - `getStudentBookings`
  - `createBooking`
  - `createBookingCheckoutSession`
  - `createCheckoutSessionForPendingBooking`
  - `completeBookingFromCheckout`
  - `completeDeferredBookingFromCheckout`
  - `completeBookingAfterPayment`
  - `getT48ClientSecret`
  - `completeT48SlotPayment`
  - `cancelBookingSlot`
  - `updateSlotStatus`
- File: `server/src/graphql/typeDefs/refundRequest.typeDefs.js`
  - `requestRefund`
  - `getMyRefundRequests`

### Resolvers

- File: `server/src/graphql/resolvers/studentBooking.resolver.js`
- Key responsibilities:
  - build booking documents and reserve availability
  - choose instant vs deferred checkout
  - store slot-level payment state (`paymentStatus`, `chargeAmount`, `dspCommission`, `instructorAmount`)
  - complete Stripe return flows
  - create/confirm T-48 later-payment flows
  - cancel booking slots with rule checks
- File: `server/src/graphql/resolvers/refundRequest.resolver.js`
  - `Mutation.requestRefund`
    - Creates a refund request for a cancelled, unpaid-out slot.

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/studentBooking.model.js` | Primary booking and slot state store |
| `server/src/models/teacherAvailability.model.js` | Source of availability reservation/release sync |
| `server/src/models/teacherTariff.model.js` | Price/package input to booking amount calculation |
| `server/src/models/refundRequest.model.js` | Refund request queue state |
| `server/src/services/stripeService.js` | Checkout sessions, payment intents, T-48 payment completion, refund helpers |
| `server/src/services/transactionService.js` | Creates financial transaction rows tied to bookings |
| `server/src/jobs/pendingBookingCleanupJob.js` | Cleans abandoned pending bookings |
| `server/src/jobs/t48ChargeJob.js` | Charges deferred bookings at T-48 |
| `server/src/jobs/payoutJob.js` | Pays instructors after completed paid lessons |
| `server/src/routes/stripeWebhook.routes.js` | Handles Stripe event-driven booking/payment transitions |

## Data flow

1. Student opens `/student-dashboard/book`.
2. `GET_STUDENT_BOOKINGS` returns bookings with slot-level payment and status data.
3. UI groups bookings into:
   - upcoming / active
   - abandoned checkout
   - cancelled
   - refund
   - completed-like surfaces
4. If a booking is abandoned, the student can call `createCheckoutSessionForPendingBooking` to resume checkout.
5. If a T-48 payment required authentication, the student is routed to `CompletePaymentPage`:
   - request client secret
   - complete Stripe confirmation
   - call `completeT48SlotPayment`
6. If a booking/slot is cancelled, `requestRefund` can create a pending refund request when refund rules are satisfied.
7. Backend keeps booking slots, availability slots, payment status, refund state, and transaction ledger in sync.

## Developer notes

- This module owns the most complex student-side business rules.
- Slot-level fields (`paymentStatus`, `dspCommission`, `instructorAmount`, `refundAmount`, `payoutStatus`) are critical; many downstream flows depend on them instead of recalculating history later.
- Booking details and complete-payment routes are functionally part of this module, even though they are separate route files.
