# Admin Dashboard -> Document Management (deep)

**Module:** `admin-dashboard`  
**Feature:** `document-management`  
**Routes:** `/admin-dashboard/documentsManagement`, `/admin-dashboard/document-details/:instructorId/:documentType`

This module shows uploaded instructor documents, groups Swiss driving-license files, lets the admin change document status, and opens a dedicated detail view for each document type.

## Purpose

- Show all instructor documents in one admin table.
- Filter by instructor, search text, and document status.
- Open a detail page for a specific instructor/document type.
- Accept, reject, or reset document status.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/components/AdminComponents/InstructorDocumentsTable.tsx` | Main documents list screen used by the route | Calls `GET_ALL_INSTRUCTORS`, flattens `instructor.documents`, groups Swiss License front/back, filters in the client, navigates to detail page. |
| `Frontend/src/pages/private/admin-dashboard/DocumentsDetailPage.tsx` | Detail page for one instructor and one document type | Reuses `GET_ALL_INSTRUCTORS`, finds the target instructor and document set in memory, renders profile + document viewer + status control. |
| `Frontend/src/components/AdminComponents/StatusDropdown.tsx` | Status change control | Calls `UPDATE_DOCUMENT_STATUS`, refetches `GET_ALL_INSTRUCTORS`, supports collective update for grouped Swiss-license documents. |
| `Frontend/src/components/InstructorComponent/DocumentUpdate/DocumentUpdateModal.tsx` | Defines shared document GraphQL for admin/instructor tooling | Exports `UPDATE_DOCUMENT_STATUS`; also defines `GET_INSTRUCTOR_DOCUMENTS` and upload/update mutations used by broader document flows. |
| `Frontend/src/components/AdminComponents/DocumentSlider.tsx` | Media/document preview helper | Used inside the detail page to browse document assets. |
| `Frontend/src/graphql/Queries/InstructorProfiles.ts` | Shared instructor queries | Defines `GET_ALL_INSTRUCTORS`. |
| `Frontend/src/types/Instructor.ts` | TS models for instructor and document rows | Used by table/detail page. |

## Frontend GraphQL

### `GET_ALL_INSTRUCTORS`

- File: `Frontend/src/graphql/Queries/InstructorProfiles.ts`
- Query field: `allInstructors`
- Returns instructor profile basics plus `documents { _id, documentType, documentUrl, status, createdAt, reSubmitted }`
- Used by:
  - `InstructorDocumentsTable.tsx`
  - `DocumentsDetailPage.tsx`

### `UPDATE_DOCUMENT_STATUS`

- File: `Frontend/src/components/InstructorComponent/DocumentUpdate/DocumentUpdateModal.tsx`
- Mutation field: `updateDocumentStatus(documentId: ID!, status: String!)`
- Used by: `StatusDropdown.tsx`
- Refetch behavior: refetches `GET_ALL_INSTRUCTORS`

### `GET_INSTRUCTOR_DOCUMENTS`

- File: `Frontend/src/components/InstructorComponent/DocumentUpdate/DocumentUpdateModal.tsx`
- Query field: `getInstructorDocuments(instructorId: ID!)`
- Note: part of the same document module, but the current admin documents table/detail flow mainly uses `GET_ALL_INSTRUCTORS` and filters client-side instead of using this query directly.

## Backend schema

### TypeDefs

- File: `server/src/graphql/typeDefs.js`
- Relevant query fields:
  - `allInstructors: [Instructor!]!`
  - `getInstructorDocuments(instructorId: ID!): InstructorDocumentsResponse!`
- Relevant mutation fields:
  - `updateDocumentStatus(documentId: ID!, status: String!): InstructorDocument!`
  - `updateDocumentStatusStudent(studentId: ID!, documentType: String!, status: DocumentStatus!): Student`
- Relevant shared types:
  - `DocumentStatus`
  - `InstructorDocumentsResponse`
  - `InstructorDocument`

### Resolvers

- File: `server/src/graphql/resolvers.js`
- Relevant query resolvers:
  - `allInstructors`
    - Admin-only
    - Reads all instructors and returns profile fields plus `documents`
  - `getInstructorDocuments`
    - Returns one instructor’s documents by instructor id
- Relevant mutation resolvers:
  - `updateDocumentStatus`
    - Admin-only
    - Validates status against `pending | accepted | rejected`
    - Finds instructor by `documents._id`
    - If the document is `Swiss Driving License (Front)` or `Swiss Driving License (Back)`, updates both files together
    - Sends notification email through `notifyDocumentStatusParties`
  - `updateDocumentStatusStudent`
    - Updates one student document by `studentId + documentType`
    - Exists in backend, but this admin documents UI is centered on instructor documents

## Data flow

1. Admin opens `InstructorDocumentsTable.tsx`.
2. `GET_ALL_INSTRUCTORS` returns instructors and embedded document arrays.
3. Frontend flattens documents into row items, groups Swiss-license front/back as one logical record, and applies client-side filters.
4. Clicking a row navigates to `DocumentsDetailPage.tsx`.
5. Detail page loads the same query result, finds `instructorId` and `documentType`, and renders the target document set.
6. Status change uses `StatusDropdown.tsx` -> `UPDATE_DOCUMENT_STATUS`.
7. Backend updates the instructor document(s), may update both Swiss-license sides, sends email notification, and returns the updated document.
8. Frontend refetches `GET_ALL_INSTRUCTORS` so both the list and detail view stay current.

## Developer notes

- This module currently uses **instructor documents** as its primary data source. Student document status mutation exists in backend, but there is no dedicated student-documents admin screen wired to it here.
- The detail page does not call a dedicated detail query; it reuses `GET_ALL_INSTRUCTORS` and filters locally.
- Swiss driving license is intentionally treated as a grouped document in both frontend and backend.
