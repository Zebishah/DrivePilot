# Teacher Dashboard -> Overview Analytics (deep)

**Module:** `teacher-dashboard`  
**Feature:** `overview-analytics`  
**Route:** `/teacher-dashboard/overview`

This screen is the instructor’s analytics dashboard. It shows platform-facing instructor stats such as cumulative students, active bookings, money earned, attendance/cancellation rates, average lessons per student, the most recently trained student, a calendar summary, and a map.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/components/InstructorComponent/InstructorAnalytics/InstructorAnalyticsDashboard.tsx` | Main overview screen | Defines inline `GET_INSTRUCTOR_ANALYTICS`; uses `useAuth` for `user.id`; renders stats cards, last student, overview availability, and map. |
| `Frontend/src/components/InstructorComponent/InstructorAnalytics/StatsCard.tsx` | Reusable metric card | Pure UI for top stat blocks. |
| `Frontend/src/components/InstructorComponent/InstructorAnalytics/LastTrainedStudent.tsx` | Recent-student summary card | Displays last booking student info and lesson metadata. |
| `Frontend/src/components/InstructorComponent/InstructorAnalytics/AvailabilityCalendar.tsx` | Overview calendar widget | Uses teacher availability GraphQL to show availability distribution inside overview. |
| `Frontend/src/components/InstructorComponent/InstructorAnalytics/InstructorMap.tsx` | Map display | Uses instructor address from analytics payload. |
| `Frontend/src/components/InstructorComponent/InstructorAnalytics/ProgressMetric.tsx` | Percentage/stat cards | Used for attendance, cancellation, and average-lessons metrics. |
| `Frontend/src/components/InstructorComponent/common/LoadingSpinner.tsx` | Loading state | Used while analytics query is in flight. |

## Frontend GraphQL

### `GET_INSTRUCTOR_ANALYTICS`

- File: `Frontend/src/components/InstructorComponent/InstructorAnalytics/InstructorAnalyticsDashboard.tsx`
- Query field: `getInstructorAnalytics(instructorId: ID!)`
- Variables:
  - `instructorId` from `useAuth().user.id`
- Requested fields:
  - `totalStudents`
  - `activeBookings`
  - `totalEarnings`
  - `averageLessonsPerStudent`
  - `cancellationRate`
  - `attendanceRate`
  - `lastBooking { ... }`
  - `instructor { firstName, lastName, email, address }`

### Availability summary dependency

- File: `Frontend/src/components/InstructorComponent/InstructorAnalytics/AvailabilityCalendar.tsx`
- Uses:
  - `GET_TEACHER_AVAILABILITY`
  - `ADD_AVAILABILITY_SLOT`
  - `DELETE_AVAILABILITY_SLOT`
- This file is part of the overview surface but reuses the main availability module backend.

## Backend schema

### TypeDefs

- File: `server/src/graphql/typeDefs/instructorPublic.typeDefs.js`
- Relevant query field:
  - `getInstructorAnalytics(instructorId: ID!): InstructorAnalytics!`
- Relevant types:
  - `InstructorAnalytics`
  - `StudentBookingNew`
  - `SlotNew`
  - `UserNew`

### Resolvers

- File: `server/src/graphql/resolvers/instructorPublic.resolver.js`
- Relevant resolver:
  - `Query.getInstructorAnalytics`
    - Builds instructor-facing dashboard metrics
    - Uses `studentBookingModel` as the main source for bookings/slots
    - Uses `User`/instructor data for instructor metadata
    - Returns last booking/student summary data used by the UI

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/studentBooking.model.js` | Source of booking/slot metrics |
| `server/src/models/User.js` | Source of instructor profile/address data |
| `server/src/graphql/typeDefs/availability.js` | Supports the overview availability sub-widget |
| `server/src/graphql/resolvers/availability.resolver.js` | Supplies calendar slot summaries used by overview calendar |

## Data flow

1. Instructor opens `/teacher-dashboard/overview`.
2. `InstructorAnalyticsDashboard.tsx` reads the current instructor id from `AuthContext`.
3. It calls `getInstructorAnalytics(instructorId)`.
4. Backend aggregates booking and student data into one `InstructorAnalytics` payload.
5. Frontend renders:
   - top stat cards
   - last trained student
   - availability summary widget
   - instructor map
   - attendance/cancellation progress metrics

## Developer notes

- `InstructorAnalyticsDashboard.tsx` defines its GraphQL query inline instead of importing it from a shared query file.
- The card labeled “Licensed Students” currently derives its value with a frontend assumption (`studentsCount * 0.8` style logic), not a dedicated backend field.
- `Frontend/src/pages/private/teacher-dashboard/teacher0verview.tsx` appears legacy/unwired; the live route points to `InstructorAnalyticsDashboard`.
