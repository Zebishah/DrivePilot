# Student Dashboard -> Overview Analytics (deep)

**Module:** `student-dashboard`  
**Feature:** `overview-analytics`  
**Route:** `/student-dashboard/overview`

This screen is the student home dashboard. It summarizes the student’s learning state through stat cards, shows recent/weekly lesson entries, and surfaces notes/feedback left by instructors.

## Purpose

- Show high-level student metrics: total lessons, current bookings, total instructors, remaining hours, and related booking counts.
- Show lesson history in a compact dashboard format so the student can quickly understand what is booked/completed/in progress.
- Surface instructor feedback/notes in a modal-style interaction without forcing the student into the dedicated feedback/rating pages.
- Provide a shortcut CTA to instructor discovery via “Find Instructor”.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/pages/private/student-dashboard/studentOverview.tsx` | Main overview page | Calls dashboard stats, lesson list, and feedback queries; composes stat cards, table-like lesson list, CTA, and feedback modal flow. |
| `Frontend/src/components/StudentComponents/StudentDashboard/LoadingCard.tsx` | Loading placeholder card | Used while dashboard stat blocks are loading. |
| `Frontend/src/components/StudentComponents/StudentDashboard/CircularProgressDashboard.tsx` | Circular progress card UI | Used for dashboard metric visualisation where applicable. |
| `Frontend/src/components/StudentComponents/StudentDashboard/FeedBackModal.tsx` | Feedback detail modal | Renders instructor note/feedback details selected from the overview. |
| `Frontend/src/context/AuthContext.tsx` | Auth state | Supplies current student id for query variables. |

## Frontend GraphQL

### `GET_STUDENT_DASHBOARD_STATS`

- File: `Frontend/src/graphql/Queries/StudentDashboard.ts`
- Query field: `getStudentDashboardStats(studentId: ID!)`
- Returns:
  - `totalLessons`
  - `bookedLessons`
  - `cancelledLessons`
  - `semiCancelledLessons`
  - `currentBookings`
  - `totalInstructors`
  - `remainingHours`
- Used by: `studentOverview.tsx` stat cards.

### `GET_STUDENT_LESSONS`

- File: `Frontend/src/graphql/Queries/StudentDashboard.ts`
- Query field: `getStudentLesson(studentId: ID!)`
- Returns lesson rows with:
  - `lessonId`
  - `instructorId`
  - `instructorName`
  - `date`
  - `startTime`
  - `endTime`
  - `slotStatus`
  - `isCompleted`
  - `isReviewed`
- Used by: the weekly lessons/history section.

### `GET_STUDENT_FEEDBACKS`

- File: `Frontend/src/graphql/Queries/StudentDashboard.ts`
- Query field: `getStudentFeedbacks(studentId: ID!)`
- Returns instructor feedback metadata and message content.
- Used by: instructor-notes area and `FeedBackModal`.

## Backend schema

### TypeDefs

- File: `server/src/graphql/typeDefs/studentDashboard.js`
- Relevant query fields:
  - `getStudentDashboardStats(studentId: ID!): StudentDashboardStats`
  - `getStudentLesson(studentId: ID!): [StudentLesson!]!`
  - `getStudentFeedbacks(studentId: ID!): [LessonFeedback!]!`
- Related types:
  - dashboard stats shape
  - lesson summary shape
  - feedback objects reused from lesson-feedback area

### Resolvers

- File: `server/src/graphql/resolvers/studentDashboard.resolver.js`
- Relevant resolvers:
  - `Query.getStudentDashboardStats`
    - Aggregates lesson counts and current booking-related numbers for a student.
  - `Query.getStudentLesson`
    - Reads booking/slot data and returns lesson-level rows for the dashboard lesson list.
  - `Query.getStudentFeedbacks`
    - Returns instructor-written feedback connected to the student.

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/studentBooking.model.js` | Main booking + slot source for lesson counts and lesson list rows |
| `server/src/models/User.js` | Student identity and remaining-hours related fields |
| `server/src/models/LessonFeedBack.js` | Instructor-to-student lesson feedback records |

## Data flow

1. Student opens `/student-dashboard/overview`.
2. `studentOverview.tsx` reads the current student id from `AuthContext`.
3. The page sends three independent GraphQL queries:
   - stats
   - lessons
   - feedbacks
4. The backend resolver layer reads bookings, student fields, and lesson feedback documents.
5. The page renders top-level summary cards and lesson entries.
6. If the student opens an instructor note, the feedback modal renders the selected feedback document returned from `getStudentFeedbacks`.

## Developer notes

- This page is read-heavy and intentionally uses separate queries instead of one large payload, which lets the UI show partial success/error states.
- The weekly/lesson-history section is shaped from booking slot data, not from a separate analytics table.
- Feedback shown here is read-only; creation/edit flows live in the feedback/rating module docs.
