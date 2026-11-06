# Admin Dashboard -> Admin Access (deep)

**Module:** `admin-dashboard`  
**Feature:** `admin-access`  
**Route:** `/admin-dashboard/admin-access`

This screen lets an admin create, view, copy, and delete admin signup links.

## Purpose

- Create invitation links for new admins.
- Persist each link with token, email, pending state, and created date.
- Email the signup link to the invited person.
- Remove old links from the list.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/pages/private/admin-dashboard/AdminAccess.tsx` | Route page and UI | Calls `GET_ALL_SIGNUP_LINKS`, `CREATE_SIGNUP_LINK`, `DELETE_SIGNUP_LINK`; manages local form state; uses `toast` and clipboard copy. |
| `Frontend/src/graphql/mutations/auth.ts` | GraphQL operations used by this screen | Defines `GET_ALL_SIGNUP_LINKS`, `CREATE_SIGNUP_LINK`, `DELETE_SIGNUP_LINK`. Also contains `UPDATE_SIGNUP_LINK_STATUS`, which belongs to the same module but is used by the signup/auth flow rather than this page. |

## Frontend GraphQL

### `GET_ALL_SIGNUP_LINKS`

- File: `Frontend/src/graphql/mutations/auth.ts`
- Query name: `GetAllSignupLinks`
- Returns: `id`, `firstName`, `lastName`, `email`, `token`, `signupDate`, `pending`, `signupLink`
- Used by: `AdminAccess.tsx` on page load

### `CREATE_SIGNUP_LINK`

- File: `Frontend/src/graphql/mutations/auth.ts`
- Variables: `firstName`, `lastName`, `email`
- Backend mutation: `createSignUpLink`
- Used by: `AdminAccess.tsx` submit handler
- On success: page refetches links and resets local form state

### `DELETE_SIGNUP_LINK`

- File: `Frontend/src/graphql/mutations/auth.ts`
- Variables: `id`
- Backend mutation: `deleteSignUpLink`
- Used by: `AdminAccess.tsx` delete action

## Backend schema

### TypeDefs

- File: `server/src/graphql/SignupLink/SignupLinkTypedef.js`
- Main types:
  - `SignupLink`
  - `SignupToken`
  - `DeleteResponse`
- Query fields:
  - `getAllSignupLinks: [SignupLink!]!`
  - `getSignupTokenDetails(token: String!): SignupToken`
- Mutation fields:
  - `createSignUpLink(firstName: String!, lastName: String!, email: String!): SignupLink!`
  - `deleteSignUpLink(id: ID!): DeleteResponse!`
  - `updateSignupLinkStatus(id: ID!, pending: Boolean!, email: String!): SignupLink!`

### Resolvers

- File: `server/src/graphql/SignupLink/SignupLinkResolver.js`
- Query resolvers:
  - `getAllSignupLinks`
    - Reads all signup link documents from `SignupToken`
    - Sorts newest first by `signupDate`
  - `getSignupTokenDetails`
    - Validates token exists and is still pending
- Mutation resolvers:
  - `createSignUpLink`
    - Rejects duplicate email in signup-link collection
    - Generates UUID token
    - Builds `${FRONTEND_URL}/signup/${token}`
    - Saves record in `SignupToken`
    - Sends email via `sendOtpEmail(..., "signupLinkCreation")`
  - `deleteSignUpLink`
    - Deletes one saved link by id
  - `updateSignupLinkStatus`
    - Marks link pending/non-pending
    - When pending becomes false, upgrades the matching user to `role = "Admin"`

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/SignupLink` | Stores the invitation token record |
| `server/src/models/User` | Used when activating an invited admin |
| `server/src/utils/SendOtpEmail.js` | Sends the signup-link email |

## Data flow

1. Admin opens `AdminAccess.tsx`.
2. `useQuery(GET_ALL_SIGNUP_LINKS)` loads all saved invite links.
3. Admin submits first name, last name, and email.
4. `CREATE_SIGNUP_LINK` calls `createSignUpLink`.
5. Backend creates token, saves the record, sends the email, and returns the created link.
6. Frontend refetches and shows the new row.
7. Delete action calls `DELETE_SIGNUP_LINK`; backend removes the record; frontend refetches.

## Developer notes

- The screen imports its query from `mutations/auth.ts`; the file is mixed-purpose and contains both queries and mutations.
- `updateSignupLinkStatus` is part of the same backend module, but it is not triggered from this admin page. It is used later in the signup/auth flow when the invited account completes onboarding.
