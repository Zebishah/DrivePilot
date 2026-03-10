# Teacher Dashboard -> Profile Setting (deep)

**Module:** `teacher-dashboard`  
**Feature:** `profile-setting`  
**Route:** `/teacher-dashboard/settings`  
**Nested route:** `/teacher-dashboard/settings/edit-profile`

This is the instructor settings shell. It loads the teacher profile, renders the profile summary header, exposes the tabbed settings areas, and routes into the edit-profile page.

## Purpose

- Show core instructor profile data in one place.
- Provide access to tabbed subfeatures:
  - Documents
  - Price management
  - Availability & calendar
  - Ratings & scores
  - Payment management
- Route to a dedicated edit-profile page.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/pages/private/teacher-dashboard/profileSetting.tsx` | Main settings shell | Calls `GET_TEACHER_PROFILE`; owns local tab state and the edit-profile route handoff. |
| `Frontend/src/pages/private/teacher-dashboard/editProfile.tsx` | Profile edit page | Uses teacher profile query + update mutation + upload URL flow. |
| `Frontend/src/pages/private/teacher-dashboard/tabs/DocumentsTab.tsx` | Settings tab | Receives documents from the shell and delegates upload/update flow. |
| `Frontend/src/pages/private/teacher-dashboard/tabs/TariffTab.tsx` | Settings tab | Handles price/package settings. |
| `Frontend/src/pages/private/teacher-dashboard/tabs/AvailabilityTab.tsx` | Settings tab | Handles calendar availability. |
| `Frontend/src/pages/private/teacher-dashboard/tabs/RatingsTab.tsx` | Settings tab | Shows reviews/ratings. |
| `Frontend/src/pages/private/teacher-dashboard/tabs/PaymentTab.tsx` | Settings tab | Shows Stripe onboarding/payment setup state. |

## Frontend GraphQL

### `GET_TEACHER_PROFILE`

- Files:
  - `Frontend/src/pages/private/teacher-dashboard/profileSetting.tsx`
  - `Frontend/src/pages/private/teacher-dashboard/editProfile.tsx`
  - `Frontend/src/layouts/TeacherLayout.tsx`
  - `Frontend/src/pages/private/teacher-dashboard/tabs/PaymentTab.tsx`
- Source file: `Frontend/src/graphql/mutations/profile.ts`
- Query field: `teacherProfile`
- Used for:
  - header/profile summary in settings shell
  - Stripe onboarding state
  - edit-profile initial values
  - layout-level readiness checks

### Edit-profile operations

- `UPDATE_TEACHER_PROFILE`
  - file: `Frontend/src/graphql/mutations/profile.ts`
  - used by `editProfile.tsx`
- `GENERATE_UPLOAD_URL`
  - file: `Frontend/src/graphql/mutations/auth.ts`
  - used indirectly through `useFileUpload` in `editProfile.tsx`

## Backend schema

### TypeDefs

- File: `server/src/graphql/typeDefs.js`
- Relevant query:
  - `teacherProfile: InstructorProfile`
- Relevant mutation:
  - `updateTeacherProfile(input: UpdateInstructorProfileInput!): InstructorProfile`
- Relevant types:
  - `InstructorProfile`
  - `UpdateInstructorProfileInput`

### Resolvers

- Files:
  - `server/src/graphql/resolvers.js`
  - `server/src/graphql/resolvers/tariff.resolver.js`
- Relevant resolvers:
  - `Query.teacherProfile`
    - loads instructor profile
    - computes `reviewRating`, `reviewsCount`
    - exposes Stripe onboarding/account snapshots and financial status
  - `Mutation.updateTeacherProfile`
    - updates instructor profile fields
    - used by the edit-profile page

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/User.js` | Stores instructor profile data and Stripe state |
| `server/src/schemas/validation.js` | Validates instructor profile updates |
| `server/src/services/stripeService.js` | Supplies Stripe snapshot/account fields surfaced in profile |

## Data flow

1. Instructor opens `/teacher-dashboard/settings`.
2. `profileSetting.tsx` loads `teacherProfile`.
3. The page builds the profile header cards and document list from the response.
4. Tab state is local inside the settings shell, so changing tabs does not change the URL.
5. Clicking Edit Profile navigates to `/teacher-dashboard/settings/edit-profile`.
6. The settings shell renders `<Outlet />` when the nested edit-profile route is active.

## Developer notes

- Only `edit-profile` is route-driven; all other settings sections are tab-driven inside the same page.
- This doc covers the shell and shared profile query. Each tab has its own deeper doc in this folder.
