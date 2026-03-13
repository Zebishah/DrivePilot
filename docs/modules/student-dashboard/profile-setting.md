# Student Dashboard -> Profile Setting (deep)

**Module:** `student-dashboard`  
**Feature:** `profile-setting`  
**Routes:** `/student-dashboard/settings`, `/student-dashboard/settings/edit-profile`

This feature covers the student’s personal profile view/edit flow and the lesson-history/profile presentation embedded in the settings area.

## Purpose

- Show the student’s saved profile information in a dashboard-friendly view.
- Allow profile editing, image upload, address entry, and language preference selection.
- Surface lesson-history/profile context in the same settings area.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/pages/private/student-dashboard/profileSetting.tsx` | Main profile settings page | Loads student profile, renders profile summary, and hosts nested edit route via `Outlet`. |
| `Frontend/src/pages/private/student-dashboard/EditStudentProfile.tsx` | Edit profile form | Sends profile updates, image upload flow, address lookup, and validation UX. |
| `Frontend/src/pages/private/student-dashboard/StudentBookings.tsx` | Related lesson-history surface | Used from settings/profile flows to show booking history context. |
| `Frontend/src/hooks/useFileUpload.ts` | Upload helper | Handles upload URL + file upload flow for profile image/documents. |
| `Frontend/src/components/InstructorComponent/common/BackButton.tsx` | Shared back-navigation UI | Used in nested edit flow. |

## Frontend GraphQL

### Student profile queries/mutations

- File: `Frontend/src/graphql/mutations/studentProfile.ts`
- Relevant operations:
  - `GET_STUDENT_PROFILE`
  - `UPDATE_STUDENT_PROFILE`
- Used by:
  - `profileSetting.tsx`
  - `EditStudentProfile.tsx`

### Shared upload/profile helpers

- File: `Frontend/src/graphql/mutations/profile.ts`
- Used for upload URL generation and shared profile-related helpers where applicable.

## Backend schema

### TypeDefs

- File: `server/src/graphql/typeDefs.js`
  - Contains `studentProfile`, `setupStudentProfile`, `updateStudentProfile`, and shared user/profile shapes.
- File: `server/src/graphql/typeDefs/student.typeDefs.js`
  - Adds student-specific shapes used in profile and progress surfaces.

### Resolvers

- File: `server/src/graphql/resolvers.js`
  - `Query.studentProfile`
  - `Mutation.setupStudentProfile`
  - `Mutation.updateStudentProfile`
- File: `server/src/graphql/resolvers/student.resolver.js`
  - Student-centric read helpers that settings/history surfaces may reuse.

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/User.js` | Student profile persistence |
| `server/src/schemas/validation.js` | Validation for profile setup/update inputs |
| `server/src/config/awsConfig.js` | Upload/storage configuration used by image/document flows |

## Data flow

1. Student opens `/student-dashboard/settings`.
2. `GET_STUDENT_PROFILE` loads the current student record.
3. The page renders profile summary information and nested-route controls.
4. Student navigates to `/student-dashboard/settings/edit-profile`.
5. Edit page updates local form state, optionally uploads an image, and sends `UPDATE_STUDENT_PROFILE`.
6. On success, the student profile query is refetched and the settings page reflects the updated data.

## Developer notes

- Address entry uses external suggestion services from the frontend; the backend ultimately stores normalized profile fields on `User.Student`.
- Student payment-method state exists in the model, but this settings module does not expose full saved-card management as a standalone settings feature.
- Booking history shown from the settings area overlaps conceptually with the booked-lessons feature; use this doc for profile/edit wiring, not for payment/booking-state business rules.
