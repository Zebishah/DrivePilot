# Business Rules: Cancel, Refund, Complete Checkout, 3DS Payment & Payout

This document describes the business rules and implementation for:

- **Cancel lesson**: when cancellation is allowed and when it is blocked.
- **Refund**: when a student can request a refund and when admin can approve it.
- **Complete checkout / incomplete checkouts**: when a student can complete payment for a pending or T-48 booking.
- **3DS / failed payment**: when a student can complete 3DS or retry a failed payment for a slot.
- **Payout**: ensuring no double payout for the same lesson (race-condition safety).

All of these rules were verified and implemented so that the system behaves consistently and safely.

---

## 1. Cancel Lesson

### Rule

- A lesson can **only** be cancelled if:
  - The slot is **not** already cancelled, and
  - The slot status is **not** completed, missed, or refund, and
  - The lesson date has **not** passed (cancellation only before the booking/slot date).

### Implementation

| Layer    | Location                                                                        | What was done                                                                                                                                                                                                                                                                                  |
| -------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend  | `server/src/graphql/resolvers/studentBooking.resolver.js` → `cancelBookingSlot` | After checking `status !== "cancelled"`, added a check: if `slot.status` is `"completed"`, `"missed"`, or `"refund"`, throw `UserInputError` with message _"Cannot cancel: lesson is already completed, missed, or refunded."_ Existing check for slot date in the past is unchanged.          |
| Frontend | `Frontend/src/pages/private/student-dashboard/bookingDetails.tsx`               | Introduced `cannotCancel`: `true` when `isLessonPast` **or** current slot status is `completed` / `missed` / `refund`. Cancel and Reschedule buttons are disabled when `cannotCancel`. Tooltips explain: _"You can't cancel/reschedule: lesson is past or already completed/missed/refunded."_ |

---

## 2. Refund (Request & Approve)

### Rules

- **Request refund (student)**
  - Only for **cancelled** lessons.
  - **Not** allowed if the lesson date has already passed.
  - (Existing: not allowed if already paid out, already refunded, or no payment.)

- **Approve refund (admin)**
  - **Not** allowed if the lesson date has passed.
  - **Not** allowed if the slot has been marked **completed** or **missed** (data integrity).

### Implementation

| Layer    | Location                                                                          | What was done                                                                                                                                                                                                                         |
| -------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend  | `server/src/graphql/resolvers/refundRequest.resolver.js` → `requestRefund`        | Already enforced: only cancelled slots, and `slotEnd <= new Date()` blocks with _"Refund cannot be requested for lessons that have already passed."_ No change.                                                                       |
| Backend  | `server/src/graphql/resolvers/refundRequest.resolver.js` → `approveRefundRequest` | **New:** Before performing refund, (1) if `slot.status` is `"completed"` or `"missed"`, mark request rejected and throw. (2) If `slotEnd <= new Date()`, mark request rejected and throw. Rejection reasons stored for admin/student. |
| Frontend | `Frontend/src/pages/private/student-dashboard/bookingDetails.tsx`                 | "Request refund" button disabled when `isSlotLessonPast` is true. Tooltip: _"Refund cannot be requested after the lesson date has passed."_                                                                                           |

---

## 3. Complete Checkout (Incomplete Checkouts)

### Rules

- **Pending booking (never finished checkout)**
  - Student must **not** be able to complete checkout (create session / confirm payment) if the **lesson date has passed** (e.g. earliest slot start or any slot end in the past).

- **T-48 / booked lesson with incomplete payment (3DS or failed)**
  - Student must **not** be able to complete payment for a slot if:
    - The **lesson date has passed**, or
    - The instructor has marked the lesson **completed** or **missed**.

### Implementation

| Layer    | Location                                                                | What was done                                                                                                                                                                                                                                                                                                              |
| -------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend  | `studentBooking.resolver.js` → `createCheckoutSessionForPendingBooking` | After computing `earliestSlotStart`, if `earliestSlotStart <= now`, throw _"Cannot complete checkout: lesson date has passed."_                                                                                                                                                                                            |
| Backend  | `studentBooking.resolver.js` → `completeBookingFromCheckout`            | Before confirming payment, compute slot end times. If any slot’s end time is in the past, throw _"Cannot complete checkout: lesson date has passed."_                                                                                                                                                                      |
| Backend  | `studentBooking.resolver.js` → `getT48ClientSecret`                     | After ensuring slot needs payment (`requires_action` / `payment_failed`), added: (1) if `slot.status === "completed" \|\| "missed"` throw; (2) if `slotEnd <= new Date()` throw. Messages: _"Cannot complete payment: this lesson was marked completed or missed."_ / _"Cannot complete payment: lesson date has passed."_ |
| Backend  | `studentBooking.resolver.js` → `completeT48SlotPayment`                 | After resolving slot from PaymentIntent metadata, added same checks: block if slot is completed/missed or if lesson end time has passed.                                                                                                                                                                                   |
| Frontend | `Frontend/src/pages/private/student-dashboard/bookLesson.tsx`           | Already filters T-48 “complete payment” list by `status === "booked" \|\| "confirmed"` and `slotEnd > now - 1hr`, so completed/missed and past slots are not shown. No change.                                                                                                                                             |
| Frontend | `Frontend/src/pages/private/student-dashboard/bookingDetails.tsx`       | "Complete payment" (3DS/retry) shown only when `canCompletePayment`: slot needs payment **and** `!isSlotLessonPast` **and** slot status is not completed/missed. If slot needs payment but cannot complete, an info message is shown instead of the button.                                                                |

---

## 4. 3DS / Failed Payment Completion

Same rules as **§3** for T-48: no completing 3DS or retry after lesson date has passed or lesson is marked completed/missed. Implemented in:

- **Backend:** `getT48ClientSecret`, `completeT48SlotPayment` (see table in §3).
- **Frontend:** `bookingDetails` — `canCompletePayment` and the info message when payment is no longer allowed (see §3).

---

## 5. Payout: No Double Payout (Race Condition)

### Rule

- A lesson that has already been paid out must **not** be paid out again. Concurrent runs of the payout job must not result in two payouts for the same slot.

### Implementation

| Layer   | Location                                    | What was done                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend | `server/src/models/studentBooking.model.js` | Extended `payoutStatus` enum with `"processing"` (in addition to `not_applicable`, `pending`, `completed`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Backend | `server/src/jobs/payoutJob.js`              | For each slot eligible for payout (`payoutStatus === "pending"`, `payoutEligibleAt <= now`, etc.): (1) **Atomic claim:** `updateOne` with filter `slots._id`, `slots.payoutStatus === "pending"`, `slots.payoutEligibleAt <= now`, and set `slots.$.payoutStatus = "processing"`. (2) Only if `modifiedCount === 1`, call Stripe `createManualPayoutForInstructor`, then set `payoutStatus = "completed"` and `payoutId`. (3) On Stripe failure (except test insufficient-funds), set slot back to `"pending"` so a later run can retry. This ensures only one process can “claim” a slot and perform the payout. |

---

## 6. Frontend Helpers (bookingDetails)

The following derived values were added or used in `bookingDetails.tsx` to support the above UI behavior:

| Variable             | Meaning                                                                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `isLessonPast`       | Last slot of `selectedAvailability` (by end time) has passed. Used for multi-slot / current booking view.                                                                                                                |
| `isSlotLessonPast`   | The **current** slot’s lesson end time has passed. Based on `currentSlot.date` and `currentSlot.endTime` / `startTime`.                                                                                                  |
| `cannotCancel`       | `isLessonPast` **or** current slot status is `completed` / `missed` / `refund`. Disables Cancel and Reschedule.                                                                                                          |
| `canCompletePayment` | Slot needs payment (`requires_action` / `payment_failed`) **and** `!isSlotLessonPast` **and** slot status is not `completed` or `missed`. Controls visibility of "Complete payment" and the “no longer payable” message. |

`currentSlot` is either the `slot` from location state (single-slot view from booked lessons) or the matching slot in `selectedAvailability`.

---

## 7. File Reference

| File                                                              | Changes                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/src/graphql/resolvers/studentBooking.resolver.js`         | Cancel: block completed/missed/refund. Checkout: block if lesson date passed in `createCheckoutSessionForPendingBooking` and `completeBookingFromCheckout`. T-48: block in `getT48ClientSecret` and `completeT48SlotPayment` if lesson past or completed/missed. |
| `server/src/graphql/resolvers/refundRequest.resolver.js`          | `approveRefundRequest`: reject if slot completed/missed or lesson date passed.                                                                                                                                                                                   |
| `server/src/models/studentBooking.model.js`                       | `payoutStatus` enum: added `"processing"`.                                                                                                                                                                                                                       |
| `server/src/jobs/payoutJob.js`                                    | Atomic claim (pending → processing) before Stripe payout; reset to pending on non–test failure.                                                                                                                                                                  |
| `Frontend/src/pages/private/student-dashboard/bookingDetails.tsx` | `isLessonPast`, `isSlotLessonPast`, `cannotCancel`, `canCompletePayment`; disable Cancel/Reschedule and Request refund when appropriate; show "Complete payment" only when allowed, else info message; tooltips.                                                 |

---

_Last updated: March 2025_
