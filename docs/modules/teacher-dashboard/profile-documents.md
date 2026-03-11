# Teacher Dashboard -> Profile Documents (deep)

**Module:** `teacher-dashboard`  
**Feature:** `profile-documents`  
**Surface:** Documents tab inside `/teacher-dashboard/settings`

This tab is where instructors view uploaded documents, refresh the list, preview files, upload more documents, and resubmit rejected documents.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/pages/private/teacher-dashboard/tabs/DocumentsTab.tsx` | Tab UI | Receives documents from `profileSetting.tsx`; opens preview modal and `InstructorDocumentUpdate`; supports resubmission for rejected docs. |
| `Frontend/src/components/InstructorComponent/DocumentUpdate/DocumentUpdateModal.tsx` | Main document upload/update engine | Defines `GET_INSTRUCTOR_DOCUMENTS`, `UPDATE_INSTRUCTOR_DOCUMENTS`, and `UPDATE_DOCUMENT_STATUS`; uses `useFileUpload`; handles special document categories. |
| `Frontend/src/hooks/useUploadURL.ts` | File-upload helper | Calls backend signed-upload URL flow before uploading files. |
| `Frontend/src/components/public/DocumentUploaderInstructor.tsx` | Upload UI helper | Used from document update modal. |
| `Frontend/src/pages/private/teacher-dashboard/profileSetting.tsx` | Parent shell | Supplies current documents and `refetch()` callback to the tab. |

## Frontend GraphQL

### Profile source

- `GET_TEACHER_PROFILE`
  - Used by `profileSetting.tsx`
  - Supplies current document list rendered in `DocumentsTab.tsx`

### Document update operations

- File: `Frontend/src/components/InstructorComponent/DocumentUpdate/DocumentUpdateModal.tsx`
- `GET_INSTRUCTOR_DOCUMENTS(instructorId: ID!)`
  - Loads document state directly when needed
- `UPDATE_INSTRUCTOR_DOCUMENTS(input: UpdateInstructorDocumentsInput!)`
  - Saves uploaded documents for the instructor
- `UPDATE_DOCUMENT_STATUS(documentId: ID!, status: String!)`
  - Shared mutation used in both admin and instructor tooling
  - In teacher flow it is mostly relevant when reused by admin-aware paths

### Upload support

- `GENERATE_UPLOAD_URL`
  - Used through `useFileUpload`
  - Backend returns S3 signed upload URL and file URL

## Backend schema

### TypeDefs

- File: `server/src/graphql/typeDefs.js`
- Relevant query:
  - `getInstructorDocuments(instructorId: ID!): InstructorDocumentsResponse!`
- Relevant mutations:
  - `updateInstructorDocuments(input: UpdateInstructorDocumentsInput!): InstructorDocumentsResponse!`
  - `updateDocumentStatus(documentId: ID!, status: String!): InstructorDocument!`
- Relevant types:
  - `InstructorDocumentsResponse`
  - `InstructorDocument`

### Resolvers

- File: `server/src/graphql/resolvers.js`
- Relevant resolvers:
  - `getInstructorDocuments`
    - returns current documents for an instructor
  - `updateInstructorDocuments`
    - persists uploaded documents
  - `updateDocumentStatus`
    - mainly admin-facing status change
    - also handles paired Swiss driving-license front/back behavior

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/User.js` | Instructor document storage |
| `server/src/utils/SendOtpEmail.js` | Sends document-status notification emails |
| `server/src/config/awsConfig` / signed-upload flow | Supports file uploads |

## Data flow

1. Settings shell loads `teacherProfile` and passes `teacherProfile.documents` into `DocumentsTab`.
2. Instructor previews an existing document or clicks Add More Documents.
3. `InstructorDocumentUpdate` collects files and categories.
4. `useFileUpload` requests upload URLs, uploads files, then sends document metadata via `updateInstructorDocuments`.
5. Parent settings shell refetches profile data so the tab reflects the new document list.
6. Rejected-document resubmission uses `preSelectedDocType` so the modal opens directly on the rejected document category.

## Developer notes

- Swiss driving license is treated specially and can represent front/back uploads together.
- This module reuses the same `DocumentUpdateModal` component for instructor and admin workflows.
