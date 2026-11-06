# Teacher Dashboard -> Profile Availability & Calendar (deep)

**Module:** `teacher-dashboard`  
**Feature:** `profile-availability-calendar`  
**Surface:** Availability & Calendar tab inside `/teacher-dashboard/settings`

This tab is where instructors publish and manage available lesson slots.

## Purpose

- Display availability by day and slot count.
- Add future availability slots.
- Delete availability slots.
- Prevent slot publishing until Stripe onboarding is verified and active.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/pages/private/teacher-dashboard/tabs/AvailabilityTab.tsx` | Main availability UI | Uses MUI calendars and time pickers; calls availability GraphQL and checks teacher Stripe readiness. |
| `Frontend/src/components/InstructorComponent/InstructorAnalytics/AvailabilityCalendar.tsx` | Overview reuse | Shows availability summary from the same backend module on the overview page. |
| `Frontend/src/graphql/mutations/availability.ts` | Availability GraphQL | Defines query and mutations used by the tab. |
| `Frontend/src/graphql/mutations/profile.ts` | Teacher profile query | Provides Stripe onboarding status used to gate slot creation. |

## Frontend GraphQL

### Availability operations

- `GET_TEACHER_AVAILABILITY`
  - Query field: `teacherAvailability(month: String!)`
  - Used by:
    - `AvailabilityTab.tsx`
    - overview calendar component
- `ADD_AVAILABILITY_SLOT`
  - Mutation field: `addAvailabilitySlot(input: TeacherAvailabilityInput!)`
  - Used by `AvailabilityTab.tsx`
- `DELETE_AVAILABILITY_SLOT`
  - Mutation field: `deleteAvailabilitySlot(id: ID!)`
  - Used by `AvailabilityTab.tsx`

### Stripe readiness dependency

- `GET_TEACHER_PROFILE`
  - Used in `AvailabilityTab.tsx`
  - Checks `onboardingStatus` and `isActive`
  - Prevents adding slots when payments are not ready

## Backend schema

### TypeDefs

- File: `server/src/graphql/typeDefs/availability.js`
- Relevant query:
  - `teacherAvailability(month: String!): [TeacherAvailability!]!`
- Relevant mutations:
  - `addAvailabilitySlot`
  - `deleteAvailabilitySlot`

### Resolvers

- File: `server/src/graphql/resolvers/availability.resolver.js`
- Relevant resolvers:
  - `Query.teacherAvailability`
  - `Mutation.addAvailabilitySlot`
  - `Mutation.deleteAvailabilitySlot`

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/teacherAvailability.model.js` | Stores availability dates and slots |
| `server/src/graphql/utils/instructorPaymentReady.js` | Shared payment-readiness gating logic |
| `server/src/models/User.js` | Source of onboarding and active-payment state |

## Data flow

1. Instructor opens Availability tab.
2. Tab loads `teacherAvailability(month)` for the currently viewed month.
3. Tab also loads `teacherProfile` to compute `isPaymentReady`.
4. If Stripe is not ready, Add Slot actions are blocked with a toast.
5. Adding a slot calls `addAvailabilitySlot`.
6. Deleting a slot calls `deleteAvailabilitySlot`.
7. Both mutations refetch availability so the calendar badges and slot list remain current.

## Developer notes

- This module is used both in the settings tab and in the overview dashboard summary widget.
- The UI blocks past dates and invalid time ranges before the mutation is sent.
