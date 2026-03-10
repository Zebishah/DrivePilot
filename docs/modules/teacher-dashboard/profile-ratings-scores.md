# Teacher Dashboard -> Profile Ratings & Scores (deep)

**Module:** `teacher-dashboard`  
**Feature:** `profile-ratings-scores`  
**Surface:** Ratings & Scores tab inside `/teacher-dashboard/settings`

This tab shows the instructor’s reviews and rating details.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/pages/private/teacher-dashboard/tabs/RatingsTab.tsx` | Tab wrapper | Reads `user.id` from `useAuth` and renders `InstructorReviews`. |
| `Frontend/src/components/StudentComponents/InstructorReviews.tsx` | Main reviews UI | Loads and renders instructor reviews. |
| `Frontend/src/hooks/UseReview.ts` | Reusable review hook layer | Provides helpers like `useInstructorReviews` on top of review queries. |
| `Frontend/src/graphql/Queries/ReviewQueries.ts` | Review GraphQL | Defines `GET_INSTRUCTOR_REVIEWS` and related review operations. |

## Frontend GraphQL

### `GET_INSTRUCTOR_REVIEWS`

- Source:
  - inline inside `InstructorReviews.tsx`
  - also represented in `Frontend/src/graphql/Queries/ReviewQueries.ts`
- Query field: `getInstructorReviews(instructorId: ID!)`
- Used by: instructor reviews UI inside the Ratings tab

## Backend schema

### TypeDefs

- File: `server/src/graphql/typeDefs/ReviewTypes.js`
- Relevant query:
  - `getInstructorReviews(instructorId: ID!): [Review!]!`
- Also related:
  - `getStudentHoursProgress`
  - `getAllStudentBookingSlots`
  - `getReviewByLessonSlot`
  - review create/update/delete operations

### Resolvers

- File: `server/src/graphql/resolvers/Review.resolver.js`
- Relevant resolver:
  - `Query.getInstructorReviews`
- Related resolver:
  - `Query.getStudentHoursProgress`
    - part of the broader review ecosystem, though not clearly used by this specific tab

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/Reviews.js` | Stores review records |
| `server/src/models/studentBooking.model.js` | Links reviews to lesson slots |
| `server/src/models/User.js` | Supplies student/instructor context for reviews and profile-level rating summary |

## Data flow

1. Instructor opens Ratings tab.
2. `RatingsTab.tsx` gets the authenticated instructor id.
3. `InstructorReviews` loads `getInstructorReviews(instructorId)`.
4. Backend returns review entries for that instructor.
5. The component renders review cards, star ratings, and review detail UI.

## Developer notes

- The tab is thin; most of the real logic lives in shared review components originally used in student-facing UI.
- Teacher profile header rating summary in the settings shell comes separately from `teacherProfile.reviewRating` and `teacherProfile.reviewsCount`, not from this tab query.
