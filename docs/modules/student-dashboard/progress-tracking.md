# Student Dashboard -> Progress Tracking (deep)

**Module:** `student-dashboard`  
**Feature:** `progress-tracking`  
**Routes:** `/student-dashboard/reviews`, `/student-dashboard/allBookingSlots`

This feature is the student learning-progress dashboard. It combines completed-hours metrics, remaining-hours metrics, days-since-last-lesson style indicators, and a slot table that links students into feedback/rating actions.

## Purpose

- Show learning progress and lesson-hour state.
- Show booking slots in a review-ready format.
- Help students understand which completed lessons are still awaiting feedback/rating actions.
- Provide drill-down routes to review all booking slots and feedback forms.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/components/StudentComponents/ReviewTab/Dashboard.tsx` | Main progress page | Loads hours progress + booking-slot data and renders cards/charts/table. |
| `Frontend/src/components/StudentComponents/ReviewTab/StudentHourPercentage.tsx` | Progress stat card | Visualises completed/remaining hour states. |
| `Frontend/src/components/StudentComponents/ReviewTab/BookingSlotTable.tsx` | Slot table | Lists lesson slots, status, feedback state, and action buttons. |
| `Frontend/src/components/StudentComponents/ReviewTab/AllBookingSlotPage.tsx` | Expanded slot listing | Provides full list view of booking slots. |
| `Frontend/src/components/StudentComponents/ReviewTab/ProgressChart.tsx` | Chart helper | Present in codebase but partially dormant/commented in live page composition. |
| `Frontend/src/hooks/ReviewSystem.ts` | Review-system state hook | Coordinates booking-slot and review routing behavior. |
| `Frontend/src/hooks/UseReview.ts` | Review data helper | Shared review-fetch/update helpers. |
| `Frontend/src/hooks/UseStudentHourProgress.ts` | Hours-progress hook | Wraps hours progress query and formatting. |

## Frontend GraphQL

### `GET_STUDENT_HOURS_PROGRESS`

- File: `Frontend/src/graphql/Queries/ReviewQueries.ts`
- Query field: `getStudentHoursProgress(studentId: ID!)`
- Returns:
  - `totalRequiredHours`
  - `completedHours`
  - `remainingHours`
  - `studentInfo`
  - `bookingsBreakdown`
- Used by: top progress cards.

### `GET_ALL_STUDENT_BOOKING_SLOTS`

- File: `Frontend/src/graphql/Queries/ReviewQueries.ts`
- Query field: `getAllStudentBookingSlots`
- Used by: booking-slot table and “View all” page.

### Related read helpers

- File: `Frontend/src/graphql/Queries/StudentDashboard.ts`
- `GET_STUDENT_DASHBOARD_STATS` overlaps conceptually with this module but is primarily owned by the overview page.

## Backend schema

### TypeDefs

- File: `server/src/graphql/typeDefs/student.typeDefs.js`
  - relevant progress/hour fields
- File: `server/src/graphql/typeDefs/ReviewTypes.js`
  - booking-slot and review-related shapes used by this feature

### Resolvers

- File: `server/src/graphql/resolvers/student.resolver.js`
  - `Query.getStudentProgress`
  - `Query.getStudentLessonHours`
  - `Query.getStudentHoursProgress`
- File: `server/src/graphql/resolvers/Review.resolver.js`
  - `Query.getAllStudentBookingSlots`
- File: `server/src/graphql/resolvers/studentDashboard.resolver.js`
  - dashboard stats overlap used in some progress summaries

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/User.js` | Stores student hour-related fields such as `lessonHoursLeft` |
| `server/src/models/studentBooking.model.js` | Source for completed vs pending slots/bookings |
| `server/src/models/Reviews.js` | Helps determine reviewed vs unreviewed lesson state |

## Data flow

1. Student opens `/student-dashboard/reviews`.
2. The page loads student hour progress and booking-slot review data.
3. Cards show completed and remaining hours plus supporting status values.
4. Slot table shows lesson entries and whether they are reviewable.
5. Student can refresh the dataset or move into all-slot/review routes for specific lessons.

## Developer notes

- This module is named “reviews” in the route but behaves as a progress dashboard, not just a ratings page.
- Progress calculations are partly booking-derived and partly based on student profile hour fields (`lessonHoursLeft`), so debugging “remaining hours” often requires checking both bookings and profile state.
- Some chart code exists but is not fully surfaced in the current page layout.
