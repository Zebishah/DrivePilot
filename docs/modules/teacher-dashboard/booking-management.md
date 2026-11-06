# Teacher Dashboard -> Booking Management (deep)

**Module:** `teacher-dashboard`  
**Feature:** `booking-management`  
**Route:** `/teacher-dashboard/bookingManagement`

This module lets instructors inspect their bookings and update slot status directly from the teacher dashboard.

## Purpose

- Show all bookings belonging to the instructor.
- Open booking details modal with student/instructor/slot/payment context.
- Update slot status for the instructor’s lessons.
- Keep sidebar booking badge state in sync.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/components/InstructorComponent/StudentBookingWInst.tsx` | Main booking-management screen | Calls `GET_INSTRUCTOR_BOOKINGS_BY_ID` and `UPDATE_SLOT_STATUS`; contains confirmation modal, status dropdown, and detail modal. |
| `Frontend/src/graphql/Queries/AdminBookingShowcase.ts` | Instructor booking query source | Defines `GET_INSTRUCTOR_BOOKINGS_BY_ID`. |
| `Frontend/src/graphql/mutations/studentBooking.ts` | Slot-status mutation source | Defines `UPDATE_SLOT_STATUS`. |
| `Frontend/src/layouts/TeacherLayout.tsx` | Sidebar badge integration | Clears unseen booking count when this route is visited. |
| `Frontend/src/utils/useBookingNotification.ts` | Notification hook | Drives unseen booking count and socket registration. |

## Frontend GraphQL

### `GET_INSTRUCTOR_BOOKINGS_BY_ID`

- File: `Frontend/src/graphql/Queries/AdminBookingShowcase.ts`
- Query field: `getInstructorBookingsById(instructorId: ID!)`
- Used by: `StudentBookingWInst.tsx`

### `UPDATE_SLOT_STATUS`

- File: `Frontend/src/graphql/mutations/studentBooking.ts`
- Mutation field: `updateSlotStatus(...)`
- Used by: `StudentBookingWInst.tsx`
- Responsible for teacher-side status updates

## Backend schema

### TypeDefs

- Files:
  - `server/src/graphql/typeDefs/AdminBookingType.js`
  - `server/src/graphql/typeDefs/studentBooking.typeDefs.js`
- Relevant fields:
  - `getInstructorBookingsById(instructorId: ID!): [StudentBookingAdmin!]!`
  - `getInstructorBookings`
  - `updateSlotStatus`
  - `updateBookingStatus`
  - `cancelBookingSlot`

### Resolvers

- Files:
  - `server/src/graphql/resolvers/AdminBookingType.resolver.js`
  - `server/src/graphql/resolvers/studentBooking.resolver.js`
- Relevant resolvers:
  - `Query.getInstructorBookingsById`
    - used by this teacher screen for fetching bookings
  - `Mutation.updateSlotStatus`
    - teacher-side slot-status mutation
  - related teacher booking mutations:
    - `updateBookingStatus`
    - `cancelBookingSlot`

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/studentBooking.model.js` | Primary booking source |
| `server/src/models/teacherAvailability.model.js` | Synced when slot state changes |
| `server/src/utils/SendOtpEmail.js` | Booking-status notifications |
| `server/src/socket/index.js` | New-booking notifications and badge-related events |

## Data flow

1. Teacher opens booking management.
2. Screen reads current instructor id from auth context.
3. `GET_INSTRUCTOR_BOOKINGS_BY_ID` returns bookings for that instructor.
4. Changing slot status opens confirmation and sends `UPDATE_SLOT_STATUS`.
5. Backend updates the booking slot and related availability/notification state.
6. `TeacherLayout.tsx` clears unseen booking count when this page is active.

## Developer notes

- The fetch query comes from the admin-booking schema (`getInstructorBookingsById`), while the update mutation comes from the instructor/student-booking schema (`updateSlotStatus`).
- This cross-module usage is real in the current codebase and is worth preserving in docs because it is not obvious from filenames alone.
