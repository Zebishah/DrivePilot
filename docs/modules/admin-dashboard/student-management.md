# Admin Dashboard -> Student Management (deep)

**Module:** `admin-dashboard`  
**Feature:** `student-management`  
**Route:** `/admin-dashboard/StudentManagement`

This module lets admins browse students, filter them by admin-facing attributes, inspect details, and bulk-delete selected students.

## Purpose

- Show all students with lesson-summary metadata.
- Filter by verification state, lesson count, location, and created-at range.
- Open a student detail modal.
- Bulk-delete selected students.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/pages/private/admin-dashboard/StudentManagement.tsx` | Main route page | Calls `GET_ALL_STUDENTS_ADMIN` and `DELETE_STUDENTS`; manages filters, selection, delete mode, and detail modal state. |
| `Frontend/src/components/AdminComponents/StudentFilterPopover.tsx` | Filter UI | Returns admin filter choices back to the page. |
| `Frontend/src/components/AdminComponents/StudentCard.tsx` | Student card/list item | Displays summary data and selection control. |
| `Frontend/src/components/AdminComponents/StudentDetailModel.tsx` | Detail modal | Shows expanded student information. |
| `Frontend/src/components/AdminComponents/StudentDeleteConfirmationModal.tsx` | Delete confirmation dialog | Used for bulk delete confirmation. |
| `Frontend/src/graphql/Queries/StudentQueries.ts` | GraphQL operations | Defines `GET_ALL_STUDENTS_ADMIN` and `DELETE_STUDENTS`. |
| `Frontend/src/types/Student.ts` | TS interfaces | Defines `StudentDetail` and `StudentFilterOptions`. |

## Frontend GraphQL

### `GET_ALL_STUDENTS_ADMIN`

- File: `Frontend/src/graphql/Queries/StudentQueries.ts`
- Query field: `allStudentsWithLessonStats`
- Returns:
  - student profile basics
  - documents
  - verification state
  - derived fields such as `remainingHours`, `lastLesson`, `totalLessons`, `bookedLessons`, `cancelledLessons`
- Used by: `StudentManagement.tsx`

### `DELETE_STUDENTS`

- File: `Frontend/src/graphql/Queries/StudentQueries.ts`
- Mutation field: `deleteStudents(studentIds: [ID!]!)`
- Used by: `StudentManagement.tsx`

## Backend schema

### TypeDefs

- File: `server/src/graphql/typeDefs.js`
- Relevant query field:
  - `allStudentsWithLessonStats: [StudentWithLessonStats!]`
- Relevant mutation field:
  - `deleteStudents(studentIds: [ID!]!): DeleteStudentsResponse!`
- Relevant types:
  - `StudentWithLessonStats`
  - `DeleteStudentsResponse`

### Resolvers

- File: `server/src/graphql/resolvers.js`
- Relevant query resolver:
  - `allStudentsWithLessonStats`
    - Admin-only
    - Loads all students
    - Loads each student’s bookings from `studentBookingModel`
    - Derives:
      - `totalLessons`
      - `bookedLessons`
      - `cancelledLessons`
      - `lastLesson`
      - `remainingHours`
- Relevant mutation resolver:
  - `deleteStudents`
    - Admin-only
    - Deletes students with `Student.deleteMany({ _id: { $in: studentIds } })`
    - Returns `{ success, message }`

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/User` | Source of `Student` documents |
| `server/src/models/studentBooking.model.js` | Used to derive lesson counts and last lesson |

## Data flow

1. Admin opens `StudentManagement.tsx`.
2. `GET_ALL_STUDENTS_ADMIN` loads student records enriched with lesson stats.
3. Frontend derives unique location options and applies client-side filters with `useMemo`.
4. Admin opens `StudentDetailModal` for one student or enters delete mode.
5. Confirm delete -> `DELETE_STUDENTS`.
6. Backend deletes the selected students and frontend refetches.

## Developer notes

- Filters are all client-side after the initial GraphQL fetch.
- The query is purposely admin-specific and broader than the smaller student-facing queries elsewhere in the app.
- `fetchPolicy: "network-only"` is used here to avoid stale admin data on mount.
