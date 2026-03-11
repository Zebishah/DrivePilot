# Admin Dashboard -> Instructor Management (deep)

**Module:** `admin-dashboard`  
**Feature:** `instructor-management`  
**Route:** `/admin-dashboard/InstructorManagement`

This module lets admins view instructor cards, filter them, inspect full details, and bulk-delete selected instructors.

## Purpose

- Show all instructors with enriched admin-facing metrics.
- Filter by gender, verification, experience, and created-at date range.
- Open a detail modal for one instructor.
- Toggle delete mode and bulk-delete selected instructors.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/pages/private/admin-dashboard/InstructorManagement.tsx` | Main route page | Calls `GET_ALL_INSTRUCTORS_DETAILS` and `DELETE_INSTRUCTORS`; owns filter state, selection state, detail modal state, and delete confirmation flow. |
| `Frontend/src/components/AdminComponents/FilterPopOver.tsx` | Filter UI | Collects filter input and passes it back to the page. |
| `Frontend/src/components/AdminComponents/InstructorCard.tsx` | Instructor list card | Displays instructor summary and selection controls. |
| `Frontend/src/components/AdminComponents/InstructorDetailModal.tsx` | Detail modal | Shows expanded instructor information to the admin. |
| `Frontend/src/components/AdminComponents/DeleteConfirmation.tsx` | Delete confirmation dialog | Used before bulk-delete. |
| `Frontend/src/graphql/Queries/InstructorProfiles.ts` | GraphQL operations | Defines `GET_ALL_INSTRUCTORS_DETAILS` and `DELETE_INSTRUCTORS`. |
| `Frontend/src/types/Instructor.ts` | TS interfaces | Defines instructor payload and filter types used by the page. |

## Frontend GraphQL

### `GET_ALL_INSTRUCTORS_DETAILS`

- File: `Frontend/src/graphql/Queries/InstructorProfiles.ts`
- Query field: `allInstructorsWithDetails`
- Returns:
  - profile fields
  - verification fields
  - documents
  - derived fields such as `lessonPrice`, `studentCount`, `reviewRating`, `reviewsCount`
- Used by: `InstructorManagement.tsx`

### `DELETE_INSTRUCTORS`

- File: `Frontend/src/graphql/Queries/InstructorProfiles.ts`
- Mutation field: `deleteInstructors(instructorIds: [ID!]!)`
- Used by: `InstructorManagement.tsx`

## Backend schema

### TypeDefs

- File: `server/src/graphql/typeDefs.js`
- Relevant query field:
  - `allInstructorsWithDetails: [InstructorWithDetails!]`
- Relevant mutation field:
  - `deleteInstructors(instructorIds: [ID!]!): DeleteInstructorsResponse!`
- Relevant types:
  - `InstructorWithDetails`
  - `DeleteInstructorsResponse`

### Resolvers

- File: `server/src/graphql/resolvers.js`
- Relevant query resolver:
  - `allInstructorsWithDetails`
    - Admin-only
    - Reads all instructors
    - Enriches each instructor with:
      - tariff data from `TeacherTariff`
      - booking-derived student count from `studentBookingModel`
      - review average and review count from `Review`
- Relevant mutation resolver:
  - `deleteInstructors`
    - Admin-only
    - Deletes instructors with `Instructor.deleteMany({ _id: { $in: instructorIds } })`
    - Returns `{ success, message }`

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/User` | Source of `Instructor` documents |
| `server/src/models/teacherTariff.model.js` | Used to derive `lessonPrice` |
| `server/src/models/studentBooking.model.js` | Used to derive `studentCount` |
| `server/src/models/Reviews.js` | Used to derive `reviewRating` and `reviewsCount` |

## Data flow

1. Admin opens `InstructorManagement.tsx`.
2. `GET_ALL_INSTRUCTORS_DETAILS` loads enriched instructor records.
3. Frontend applies filters with `useMemo`; filtering is client-side after fetch.
4. Admin can open `InstructorDetailModal` for one instructor.
5. In delete mode, selected ids are stored locally.
6. Confirm delete -> `DELETE_INSTRUCTORS`.
7. Backend deletes matching instructors and frontend refetches the list.

## Developer notes

- Filters are handled in the frontend, not passed to GraphQL.
- The enriched query is intentionally heavier than `allInstructors`; it is the admin-facing query for management screens.
- The page uses `notifyOnNetworkStatusChange` so refetch states can be surfaced cleanly.
