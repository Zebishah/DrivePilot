# Admin Dashboard -> Booking Management (deep)

**Module:** `admin-dashboard`  
**Feature:** `booking-management`  
**Route:** `/admin-dashboard/bookingManagement`

This module shows all bookings across the platform and lets the admin inspect booking details, update slot status, and cancel bookings.

## Purpose

- Show all student bookings with student, instructor, payment, and slot details.
- Let admins update a slot to `available`, `booked`, `completed`, `refund`, `cancelled`, or `missed`.
- Let admins cancel a booking slot from the dashboard.
- Keep instructor availability and booking notifications in sync.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/components/AdminComponents/StudentBookingTable.tsx` | Main admin booking screen | Calls `GET_ALL_STUDENT_BOOKINGS`, `UPDATE_BOOKING_STATUS`, and `CANCEL_BOOKING_ADMIN`; contains local `StatusDropdown` and `ViewDetailsModal` helpers. |
| `Frontend/src/graphql/Queries/AdminBookingShowcase.ts` | Booking queries | Defines `GET_ALL_STUDENT_BOOKINGS` and `GET_INSTRUCTOR_BOOKINGS_BY_ID`. |
| `Frontend/src/graphql/mutations/AdminBookingsShowcase.ts` | Booking mutations | Defines `UPDATE_BOOKING_STATUS` and `CANCEL_BOOKING_ADMIN`. |
| `Frontend/src/types/AdminBookingShowcase.ts` | TS booking contracts | Shared booking input/output typing for the page. |
| `Frontend/src/layouts/AdminLayout.tsx` | Shared admin layout behavior | Uses `useBookingNotifications` and `initSocket`; shows unseen booking badge on this menu item and clears it when this route is opened. |

## Frontend GraphQL

### `GET_ALL_STUDENT_BOOKINGS`

- File: `Frontend/src/graphql/Queries/AdminBookingShowcase.ts`
- Query field: `getAllStudentBookings`
- Returns student, instructor, slot list, payment method, booking status, timestamps
- Used by: `StudentBookingTable.tsx`

### `UPDATE_BOOKING_STATUS`

- File: `Frontend/src/graphql/mutations/AdminBookingsShowcase.ts`
- Mutation field: `updateBookingStatusAdmin(input: UpdateBookingStatusInputAdmin!)`
- Input: `bookingId`, `slotId`, `status`
- Used by: status change actions in `StudentBookingTable.tsx`

### `CANCEL_BOOKING_ADMIN`

- File: `Frontend/src/graphql/mutations/AdminBookingsShowcase.ts`
- Mutation field: `cancelBookingAdmin(input: CancelBookingAdminInputAdmin!)`
- Input: `bookingId`, `slotId`, `studentId`, optional `reason`
- Used by: cancel action in `StudentBookingTable.tsx`

## Backend schema

### TypeDefs

- File: `server/src/graphql/typeDefs/AdminBookingType.js`
- Main types:
  - `StudentBookingAdmin`
  - `BookingSlotAdmin`
  - `StudentAdmin`
  - `InstructorAdmin`
  - `PaymentMethodAdmin`
- Enums:
  - `SlotStatusAdmin`
  - `BookingStatusAdmin`
  - `FeedbackStatusAdmin`
- Query fields:
  - `getAllStudentBookings`
  - `getInstructorBookingsById(instructorId: ID!)`
- Mutation fields:
  - `updateBookingStatusAdmin(input: UpdateBookingStatusInputAdmin!)`
  - `cancelBookingAdmin(input: CancelBookingAdminInputAdmin!)`

### Resolvers

- File: `server/src/graphql/resolvers/AdminBookingType.resolver.js`
- Query resolvers:
  - `getAllStudentBookings`
    - Loads all bookings
    - Populates `studentId` and `instructorId`
    - Sorts by `createdAt` descending
  - `getInstructorBookingsById`
    - Same shape, filtered by instructor
- Mutation resolvers:
  - `updateBookingStatusAdmin`
    - Validates status
    - Loads target booking and slot
    - Prevents early completion in production by checking slot end time with `getSlotEndTimestampUtc`
    - Updates slot status/booked flags
    - Sets `completionMarkedAt`, `payoutEligibleAt`, and `payoutStatus` when status becomes `completed`
    - Recomputes booking-level status
    - Syncs the mirrored slot inside `teacherAvailabilityModel`
    - Sends notification emails through `notifyBookingParties`
  - `cancelBookingAdmin`
    - Cancels the slot from the admin side
    - Updates booking and availability records
    - Returns updated booking payload

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/studentBooking.model.js` | Primary booking source |
| `server/src/models/teacherAvailability.model.js` | Keeps availability slots aligned with booking status |
| `server/src/utils/slotTimezone.js` | Prevents premature completion based on business timezone |
| `server/src/utils/SendOtpEmail.js` | Sends booking-related notifications |

## Data flow

1. Admin opens booking management.
2. `GET_ALL_STUDENT_BOOKINGS` loads all bookings with populated student/instructor data.
3. Frontend renders rows/cards and opens a detail modal when requested.
4. Changing a slot status calls `UPDATE_BOOKING_STATUS`.
5. Backend updates the slot, booking aggregate status, payout-related fields, and mirrored instructor availability slot.
6. Cancel action calls `CANCEL_BOOKING_ADMIN` and backend applies cancellation changes.
7. Shared admin layout clears the unseen booking count when this route is visited.

## Developer notes

- `StudentBookingTable.tsx` is the live route component; there is another similarly named admin page file in the repo, but the router points to the component under `AdminComponents`.
- Status changes affect more than the booking document: availability, payout readiness, and notification emails are all part of this module.
