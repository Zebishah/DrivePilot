# Student Dashboard -> Feedback & Rating (deep)

**Module:** `student-dashboard`  
**Feature:** `feedback-rating`  
**Routes:** `/student-dashboard/Feedback`, `/student-dashboard/review-form`, `/student-dashboard/review-display`

This feature is the student-to-instructor review and rating system. It lets students pick completed lessons, create a review for the instructor tied to a lesson/slot, view submitted content, and edit/delete that review later.

## Purpose

- Show completed lessons that are eligible for rating/review.
- Let students create, update, view, and delete instructor reviews per lesson slot.
- Keep instructor-facing ratings/reviews connected to actual completed lesson data.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/components/StudentComponents/ReviewTab/OnlyReviewsTab.tsx` | Main feedback/rating page | Entry surface for review-specific flow using the booking-slot system. |
| `Frontend/src/components/StudentComponents/ReviewTab/ReviewForm.tsx` | Create/edit review form | Sends create/update review mutations and captures rating + description. |
| `Frontend/src/components/StudentComponents/ReviewTab/ReviewDisplay.tsx` | Review detail page | Loads existing review data, shows success state, and supports edit/delete. |
| `Frontend/src/components/StudentComponents/ReviewTab/BookingSlotTable.tsx` | Shared slot table | Drives the “which lesson can be reviewed” UX. |
| `Frontend/src/components/StudentComponents/ReviewTab/RatingComponent.tsx` | Rating UI | Renders star/half-star controls and rating display. |
| `Frontend/src/components/StudentComponents/ReviewTab/AllBookingSlotPage.tsx` | Supporting route | Full list of review-eligible booking slots. |

## Frontend GraphQL

### Review list and slot lookup

- File: `Frontend/src/graphql/Queries/ReviewQueries.ts`
- Relevant queries:
  - `GET_ALL_STUDENT_BOOKING_SLOTS`
  - `GET_REVIEW_BY_LESSON_SLOT`
  - `GET_STUDENT_REVIEWS`
  - `GET_INSTRUCTOR_REVIEWS` (for display/consistency in shared components)

### Review mutations

- File: `Frontend/src/graphql/Queries/ReviewQueries.ts`
- Relevant mutations:
  - `CREATE_REVIEW`
  - `UPDATE_REVIEW`
  - `DELETE_REVIEW`

## Backend schema

### TypeDefs

- File: `server/src/graphql/typeDefs/ReviewTypes.js`
- Relevant fields:
  - slot query/read types
  - review create/update inputs
  - instructor/student review query outputs

### Resolvers

- File: `server/src/graphql/resolvers/Review.resolver.js`
- Relevant resolvers:
  - `Query.getAllStudentBookingSlots`
  - `Query.getReviewByLessonSlot`
  - `Query.getStudentReviews`
  - `Query.getInstructorReviews`
  - `Mutation.createReview`
  - `Mutation.updateReview`
  - `Mutation.deleteReview`

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/Reviews.js` | Primary review/rating store |
| `server/src/models/studentBooking.model.js` | Validates lesson-slot ownership/completion state |
| `server/src/models/User.js` | Instructor/student profile metadata attached to review payloads |

## Data flow

1. Student opens `/student-dashboard/Feedback`.
2. The page loads completed/reviewable booking slots.
3. Selecting a slot routes the student into `review-form` or existing `review-display`.
4. The form creates or updates a review tied to `lessonId` and `slotId`.
5. The display page can edit or delete the review.
6. Instructor-facing review surfaces later consume the same review documents.

## Developer notes

- The route path is capitalized as `/student-dashboard/Feedback` in the live route config.
- This feature is about **student-to-instructor ratings/reviews**.
- It is adjacent to, but distinct from, instructor-to-student lesson feedback (`LessonFeedBack` model), which is surfaced in overview/progress areas.
