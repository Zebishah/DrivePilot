# Teacher Dashboard -> Feedback (deep)

**Module:** `teacher-dashboard`  
**Feature:** `feedback`  
**Routes:** `/teacher-dashboard/feedback`, `/teacher-dashboard/feedbackForm/:bookingId/:lessonId/:studentId`

This module lets instructors give lesson-based feedback to students after completed lessons.

## Purpose

- Show completed lessons that are eligible for instructor feedback.
- Open a feedback form per completed lesson slot.
- Create, update, or delete lesson feedback.
- Track slot-level feedback status and student lesson-hours adjustments.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/pages/private/teacher-dashboard/CompleteBookings.tsx` | Feedback queue page | Calls `GET_COMPLETED_STUDENT_BOOKINGS`; lists completed lesson slots and links into feedback form route. |
| `Frontend/src/pages/private/teacher-dashboard/FeedBackForm.tsx` | Feedback form page | Uses `useFeedback` hook and lesson/student route params. |
| `Frontend/src/hooks/UseFeedBack.ts` | Main feedback hook | Wraps lesson-feedback queries and mutations. |
| `Frontend/src/graphql/Queries/LessonFeedback.ts` | Lesson feedback GraphQL | Defines `GET_FEEDBACK_BY_LESSON_ID`, `CREATE_FEEDBACK`, `UPDATE_FEEDBACK`, `DELETE_FEEDBACK`, `GET_STUDENT_LESSON_HOURS`. |
| `Frontend/src/graphql/mutations/studentBooking.ts` | Booking query source | Defines `GET_COMPLETED_STUDENT_BOOKINGS`. |

## Frontend GraphQL

### Feedback queue

- `GET_COMPLETED_STUDENT_BOOKINGS`
  - Used by `CompleteBookings.tsx`
  - Returns completed bookings/slots for instructor feedback workflow

### Feedback form flow

- `GET_FEEDBACK_BY_LESSON_ID`
- `CREATE_FEEDBACK`
- `UPDATE_FEEDBACK`
- `DELETE_FEEDBACK`
- `GET_STUDENT_LESSON_HOURS`

These are wrapped by `useFeedback` and consumed by `FeedBackForm.tsx`.

## Backend schema

### TypeDefs

- File: `server/src/graphql/typeDefs/LessonFeedbackTypes.js`
- Relevant query fields:
  - `getFeedbackByLessonId`
  - `getAllFeedbacks`
- Relevant mutation fields:
  - `createFeedback`
  - `updateFeedback`
  - `deleteFeedback`

### Resolvers

- File: `server/src/graphql/resolvers/LessonFeedBack.resolver.js`
- Relevant resolvers:
  - `Query.getFeedbackByLessonId`
  - `Mutation.createFeedback`
  - `Mutation.updateFeedback`
  - `Mutation.deleteFeedback`

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/LessonFeedBack.js` | Stores lesson feedback entries |
| `server/src/models/studentBooking.model.js` | Tracks slot-level `feedBackStatus` |
| `server/src/models/User.js` | Stores student lesson-hours values adjusted by feedback logic |

## Data flow

1. Instructor opens `/teacher-dashboard/feedback`.
2. `CompleteBookings.tsx` loads completed bookings using `GET_COMPLETED_STUDENT_BOOKINGS`.
3. Each completed slot links to `/teacher-dashboard/feedbackForm/:bookingId/:lessonId/:studentId`.
4. `FeedBackForm.tsx` reads params and uses `useFeedback`.
5. Hook loads any existing feedback and student lesson-hours context.
6. Create/update/delete actions call the lesson-feedback mutations.
7. Backend stores feedback, updates related slot feedback state, and can adjust student lesson-hours values.

## Developer notes

- The “Feedback From Students” section on the queue page is currently placeholder/coming-soon content, so the live logic is focused on instructors giving feedback to students.
- This module is tightly linked to completed lesson slots rather than being a standalone feedback system.
