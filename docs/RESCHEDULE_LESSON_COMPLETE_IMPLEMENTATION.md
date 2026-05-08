# Reschedule Lesson - Complete Implementation Handover

Date: 2026-05-06

## Objective

Implement a real reschedule flow (not cancel+rebook), with:
- strict authorization and data integrity,
- atomic old-slot release + new-slot reservation,
- consistent payment-state protections,
- and updated UI for selecting and confirming a new slot.

Additionally align reschedule timing behavior with cancellation-style rules (date-based policy).

---

## Scope Delivered

Implemented:
1. GraphQL contract for rescheduling.
2. Backend mutation with transaction-based slot move.
3. Eligibility and safety guards (status/payment/conflict checks).
4. Student UI flow to pick and confirm a new slot.
5. UX improvements in reschedule modal.
6. Updated timing rule to match cancellation-style behavior.

---

## API Contract

Files:
- `server/src/graphql/typeDefs/studentBooking.typeDefs.js`
- `Frontend/src/graphql/mutations/studentBooking.ts`

Added:
- `RescheduleBookingSlotInput`
  - `bookingId`
  - `slotId`
  - `newDate`
  - `newStartTime`
  - `newEndTime`
- Mutation:
  - `rescheduleBookingSlot(input: RescheduleBookingSlotInput!): StudentBooking!`

Frontend mutation was added to call this endpoint from booking details.

---

## Backend Logic (Core Behavior)

File:
- `server/src/graphql/resolvers/studentBooking.resolver.js`

### Authorization

Only booking owner (student) or admin can reschedule:
- owner check against `booking.studentId`
- admin bypass allowed

### Slot eligibility checks

Reschedule is rejected if current slot status is final/non-movable:
- `completed`
- `missed`
- `refund`
- `cancelled`

Reschedule is rejected if slot is payment-blocked:
- `requires_action`
- `payment_failed`

Reason: lessons awaiting payment resolution should not be moved until payment state is resolved.

### Timing checks (updated policy)

Current implemented policy:
- old lesson date must not be in the past,
- new slot date must not be in the past.

This replaced strict old 48-hour gating for reschedule and aligns with cancellation-style date-based behavior requested in this iteration.

### Slot validity checks

- cannot reschedule to same exact slot,
- cannot reschedule to a slot that is no longer available,
- cannot overlap another active booking of same student.

### Atomic transaction

Using MongoDB session/transaction:
1. remove old slot from instructor booked list,
2. add old slot back to instructor available list,
3. reserve new target available slot (`booked=true`, `status=booked`),
4. ensure new day availability booking list contains booking-slot reference,
5. update booking slot date/time fields,
6. clear stale cancellation metadata on moved slot,
7. save all documents,
8. commit transaction.

If any step fails:
- transaction is aborted,
- no partial state is persisted.

### Notifications

After successful commit:
- sends `booking_status_updated` email notification.

---

## Frontend Flow (Student)

File:
- `Frontend/src/pages/private/student-dashboard/bookingDetails.tsx`

### UI behavior

- User clicks `Reschedule`.
- Dialog opens with available instructor slots.
- User selects one slot.
- User confirms.
- Mutation `rescheduleBookingSlot` is called.
- On success:
  - success toast shown,
  - dialog closes,
  - user navigates back to booked lessons list.

### Available slot filtering

From instructor public availability:
- keep only slots with `status === "available"` and `booked !== true`,
- keep only slots in future (start datetime > now),
- exclude currently selected slot itself.

### Client-side guards

- block opening/confirming if booking/slot ids are missing,
- require explicit slot selection before confirm,
- handle stale slot selection with clear error if slot got taken.

---

## Reschedule Modal UX Improvements

File:
- `Frontend/src/pages/private/student-dashboard/bookingDetails.tsx`

Improvements applied:
- cleaner modal shell and spacing,
- clearer hierarchy and subtitle,
- slot count chip (`X available`),
- scrollable slot list container,
- stronger visual selected state with badge,
- action footer with better spacing,
- confirm button disabled until slot is selected.

Goal: reduce confusion and prevent accidental submit.

---

## Important Consistency Protections

Implemented protections to keep booking/payment logic safe:

- pending payment lessons (`requires_action` / `payment_failed`) cannot be rescheduled,
- final lesson statuses cannot be rescheduled,
- cross-booking overlap blocked for same student,
- instructor availability and booking slot move as a single atomic unit.

This prevents cases where:
- old slot is released but new slot is not reserved,
- slot appears free in one panel but booked in another,
- student ends up double-booked.

---

## Files Changed for Reschedule Feature

Backend:
- `server/src/graphql/typeDefs/studentBooking.typeDefs.js`
- `server/src/graphql/resolvers/studentBooking.resolver.js`

Frontend:
- `Frontend/src/graphql/mutations/studentBooking.ts`
- `Frontend/src/pages/private/student-dashboard/bookingDetails.tsx`

Supporting type/query surface updates done in same delivery wave:
- `Frontend/src/types/Bookings.ts`
- `Frontend/src/types/Student.ts`
- `Frontend/src/graphql/Queries/AdminBookingShowcase.ts`

---

## Final Behavior (What manager/client should expect)

- Reschedule is now a direct slot move (not a cancellation workaround).
- User chooses a new available slot from dialog and confirms.
- System safely updates both booking and instructor availability in one transaction.
- Date-based policy is applied (no reschedule to past dates; no action on already-past lessons).
- Pending-payment lessons remain protected from reschedule until payment is resolved.
- UI experience is cleaner and less error-prone.

