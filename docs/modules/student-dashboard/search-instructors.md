# Student Dashboard -> Search Instructors (deep)

**Module:** `student-dashboard`  
**Feature:** `search-instructors`  
**Routes:** `/student-dashboard/search`, `/student-dashboard/search/instructors/:id`

This feature covers student-side instructor discovery and the transition from browsing to booking. It includes the search/list page, filter controls, map/list views, and the instructor detail surface where slot/package selection begins.

## Purpose

- Let students browse instructors who are eligible for booking.
- Filter by geography, radius, transmission, gender, price, rating, and availability dates.
- Show instructor summary information and map context.
- Drill into a specific instructor profile and start the lesson booking/payment flow.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/pages/private/student-dashboard/searchInstructor.tsx` | Route entry for search | Thin wrapper for the instructor-discovery UI. |
| `Frontend/src/components/ProfessionalInstructor/InstructorInfo.tsx` | Main search/discovery implementation | Calls instructor public queries; manages filters, location, map/list rendering, and navigation to instructor detail. |
| `Frontend/src/components/FilterPopover.tsx` | Filter UI | Collects radius, address, rating, gender, transmission, price, and date filters. |
| `Frontend/src/components/AddressSearch.tsx` | Address search helper | Supports geocoded location input used by the filter flow. |
| `Frontend/src/pages/public/OurInstructor.tsx` | Instructor detail route entry | Mounts instructor detail surface from the student route. |
| `Frontend/src/components/InstructorComponent/PostSummary.tsx` | Instructor detail shell | Loads instructor profile, slots/packages, and review snippets. |
| `Frontend/src/components/InstructorComponent/Availability.tsx` | Availability picker | Lets students inspect/select slots before booking. |
| `Frontend/src/components/InstructorComponent/Summary.tsx` | Detail summary | Shows instructor info, pricing, and booking CTA context. |
| `Frontend/src/components/InstructorComponent/BulkPackageCard.tsx` | Package display | Shows bulk lesson/package options where available. |
| `Frontend/src/components/StudentComponents/InstructorReviews.tsx` | Student-facing reviews | Shows instructor review content on the detail page. |

## Frontend GraphQL

### Instructor discovery / public profile

- File: `Frontend/src/graphql/mutations/instructorPublic.ts`
- Operations used by this surface include:
  - `getNearbyInstructors(filter, offset, limit)`
  - `getInstructorPublicProfile(id)`
- Used by:
  - `InstructorInfo.tsx` for instructor search list
  - `PostSummary.tsx` / detail page for selected instructor data

### Reviews

- File: `Frontend/src/graphql/Queries/ReviewQueries.ts`
- Relevant operation:
  - `GET_INSTRUCTOR_REVIEWS`
- Used by:
  - `InstructorReviews.tsx`
  - detail page review display

### Student context helpers

- File: `Frontend/src/graphql/mutations/studentProfile.ts`
- Used for student profile/address context where discovery flow needs current student data.

## Backend schema

### TypeDefs

- File: `server/src/graphql/typeDefs/instructorPublic.typeDefs.js`
- Relevant query fields:
  - `getNearbyInstructors(filter, offset, limit)`
  - `getInstructorPublicProfile(id)`
- Related types:
  - instructor summary/detail shapes
  - availability info
  - tariff/package fields
- File: `server/src/graphql/typeDefs/ReviewTypes.js`
  - provides review types used by `getInstructorReviews`

### Resolvers

- File: `server/src/graphql/resolvers/instructorPublic.resolver.js`
- Relevant resolvers:
  - `Query.getNearbyInstructors`
    - Applies geographic and non-geographic filters.
    - Reads tariff, availability, profile-completion, and verification state.
  - `Query.getInstructorPublicProfile`
    - Returns a single instructor’s full public profile, tariff, and availability context.
- File: `server/src/graphql/resolvers/Review.resolver.js`
  - `Query.getInstructorReviews`
    - Returns rating/review rows for display on the public/student detail page.

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/User.js` | Instructor profile/discovery source |
| `server/src/models/teacherTariff.model.js` | Lesson price and package data |
| `server/src/models/teacherAvailability.model.js` | Instructor availability and bookable slots |
| `server/src/models/Reviews.js` | Student-to-instructor review data |

## Data flow

1. Student opens `/student-dashboard/search`.
2. Search page obtains coordinates/address context and filter selections.
3. `getNearbyInstructors` returns filtered instructor cards.
4. Student clicks into an instructor, navigating to `/student-dashboard/search/instructors/:id`.
5. Detail route loads public instructor profile, availability, pricing/packages, and instructor reviews.
6. Student selects lesson slots/package and continues into the booking/checkout flow owned by the booked-lessons module.

## Developer notes

- Discovery is filter/geolocation based, not a full-text directory search.
- Booking readiness depends on instructor Stripe/payment readiness on the backend; the detail page surfaces this by disabling or gating booking actions.
- `searchInstructor.tsx` is mainly a route shell; most behavior lives inside `InstructorInfo.tsx`.
