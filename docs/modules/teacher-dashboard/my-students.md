# Teacher Dashboard -> My Students (deep)

**Module:** `teacher-dashboard`  
**Feature:** `my-students`  
**Routes:** `/teacher-dashboard/my-students`, `/teacher-dashboard/studentProgress/:studentId`

This module lets instructors browse their students and drill into each student’s lesson/progress dashboard.

## Purpose

- Show students linked to the instructor.
- Filter/sort student list using backend-driven filters.
- Open a student progress detail page.
- Reuse student dashboard-style summary data for instructor visibility.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/pages/private/teacher-dashboard/MyStudentsTrack.tsx` | Students list page | Calls `GET_ALL_STUDENTS` with filter input; renders student cards and filter controls. |
| `Frontend/src/pages/private/teacher-dashboard/StudentProgress.tsx` | Student detail page | Uses `useStudentDashboard` to load the student progress/dashboard payload. |
| `Frontend/src/hooks/UseStudentDashboard.ts` | Student detail hook | Wraps the student dashboard query. |
| `Frontend/src/components/InstructorComponent/StudentsTracking/FiltersComponent.tsx` | Filter UI | Collects backend filter parameters. |
| `Frontend/src/components/InstructorComponent/StudentsTracking/StudentCard.tsx` | Student summary card | Links to student progress page. |
| `Frontend/src/graphql/Queries/StudentQueries.ts` | Student GraphQL | Defines `GET_ALL_STUDENTS` and `GET_STUDENT_DASHBOARD`. |

## Frontend GraphQL

### Students list

- `GET_ALL_STUDENTS`
  - Query field: `getAllStudents(filter: StudentFilter)`
  - Used by `MyStudentsTrack.tsx`
  - Backend filtering/sorting is applied server-side

### Student detail

- `GET_STUDENT_DASHBOARD`
  - Query field: `getStudentDashboardDetails(studentId: ID!)`
  - Used through `useStudentDashboard`
  - Provides student info, lesson stats, graph stats, completed bookings, and uncompleted bookings

## Backend schema

### TypeDefs

- Files:
  - `server/src/graphql/typeDefs/student.typeDefs.js`
  - `server/src/graphql/typeDefs/studentBooking.typeDefs.js`
- Relevant query fields:
  - `getAllStudents(filter: StudentFilter): [Student!]!`
  - `getStudentDashboardDetails(studentId: ID!): StudentDashboardDetails`
  - related supporting fields: `getStudentLessonHours`, `getStudentProgress`

### Resolvers

- Files:
  - `server/src/graphql/resolvers/student.resolver.js`
  - `server/src/graphql/resolvers/studentBooking.resolver.js`
- Relevant resolvers:
  - `Query.getAllStudents`
  - `Query.getStudentDashboardDetails`
  - related support: `getStudentLessonHours`, `getStudentProgress`

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/User.js` | Student profile data |
| `server/src/models/studentBooking.model.js` | Booking/lesson progress data |

## Data flow

1. Instructor opens `/teacher-dashboard/my-students`.
2. `MyStudentsTrack.tsx` sends `GET_ALL_STUDENTS(filter)`.
3. Backend returns students filtered/sorted according to the supplied filter.
4. Clicking a student opens `/teacher-dashboard/studentProgress/:studentId`.
5. `StudentProgress.tsx` uses `useStudentDashboard`, which calls `getStudentDashboardDetails(studentId)`.
6. Backend returns a dashboard-style payload that the teacher detail page renders as progress charts/tables/cards.

## Developer notes

- The list page treats filtering as backend-driven and does not re-filter the dataset in the client beyond simple memo passthrough.
- `TeacherLayout.tsx` also uses `GET_ALL_STUDENTS` separately to seed chat conversations for students with lesson history.
