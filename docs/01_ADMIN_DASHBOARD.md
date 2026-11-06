# Phase 1: Admin Dashboard – Complete Documentation

This document describes **everything** that happens in the Admin Dashboard: routes, layout, each screen, which frontend components and GraphQL operations are used, and which backend resolvers and types are involved. Use it to onboard new developers or to trace a feature from UI to database.

---

## 1. Purpose and entry point

- **Purpose:** Admins manage the platform: view analytics, manage signup links, instructors, students, bookings, documents, transactions, refund requests, and (for super admins) FAQ/contact details.
- **Entry:** User signs in with an account that has `role: "Admin"`. After sign-in, the app redirects to `/admin-dashboard/overview`.
- **Protection:** All `/admin-dashboard/*` routes are wrapped in `AdminPrivateRoute`, which checks auth and role; unauthenticated or non-admin users are redirected (e.g. to sign-in or overview).

---

## 2. Layout and routing

### 2.1 How the admin area is mounted

- **Route definition:** `Frontend/src/routes/index.tsx`
  - Path: `/admin-dashboard`
  - Element: `AdminRoutes` (which wraps children in `AdminLayout` and `AdminPrivateRoute`).
- **Layout:** `Frontend/src/layouts/AdminLayout.tsx`
  - Renders: sidebar (`Sidebar`), top bar (`Navbar`), and `children` (the current page).
  - Sidebar menu items (overview, admin access, documents, instructor/student/booking management, transactions, refund requests, help & support for super admin) are defined in `AdminLayout`.
  - Uses `useBookingNotifications` and `initSocket` for real-time booking notification badge on "Booking Management".
- **Route guard:** `Frontend/src/routes/AdminRoutes.tsx` uses `AdminPrivateRoute` from `Frontend/src/components/PrivateRoute` (or equivalent) to ensure only authenticated admins can see the dashboard.

### 2.2 Sidebar menu (from AdminLayout)

| Menu item             | Path                                |
|----------------------|-------------------------------------|
| Overview              | `/admin-dashboard/overview`         |
| Admin Access          | `/admin-dashboard/admin-access`     |
| Documents             | `/admin-dashboard/documentsManagement` |
| Instructor Management | `/admin-dashboard/InstructorManagement` |
| Booking Management    | `/admin-dashboard/bookingManagement`   |
| Student Management    | `/admin-dashboard/StudentManagement`   |
| Payment management    | `/admin-dashboard/transactions`      |
| Refund requests       | `/admin-dashboard/refund-requests`   |
| Help & Support         | `/admin-dashboard/help-support` (super admin only) |
| Logout                | `/logout` (handled in layout)        |

---

## 3. Screen-by-screen breakdown

For each screen we list: **route**, **component(s)**, **what it does**, **GraphQL operations**, **backend (resolvers / typeDefs)**, and **main files**.

---

### 3.1 Overview (Analytics)

- **Route:** `/admin-dashboard/overview`
- **Component:** `AnalyticsDashboard` is the default export of `Frontend/src/pages/private/admin-dashboard/adminOverview.tsx`. The same file also exports `AdminOverview`; the router uses `AnalyticsDashboard` for this route.
- **What it does:** Shows admin analytics: overall stats (registrations, lessons booked, reviews, attendance), and graphs (active users, revenue per instructor, bookings per instructor, total earnings, conversion rates). Supports filters (date range, instructor).
- **Frontend – GraphQL:**
  - `GET_ADMIN_ANALYTICS` (with variable `filter: AnalyticsFilterInput`) – used by the main analytics view.
  - `GET_ALL_INSTRUCTORS` – used for instructor filter dropdown (id, firstName, lastName).
- **Frontend files:**
  - `Frontend/src/pages/private/admin-dashboard/adminOverview.tsx`
  - `Frontend/src/graphql/Queries/AdminContact.ts` (defines `GET_ADMIN_ANALYTICS`, `GET_ALL_INSTRUCTORS`)
  - `Frontend/src/types/AdminContact.ts` (types for analytics and filter)
- **Backend:**
  - **Resolvers:** `server/src/graphql/resolvers/AdminAnalytics.resolver.js` – `getAdminAnalytics`, `getAllInstructors` (the analytics `getAllInstructors` here may be the same as or merged with the one in main resolvers; the typeDefs live in AdminOverallAnalyticsTypes).
  - **TypeDefs:** `server/src/graphql/typeDefs/AdminOverallAnalyticsTypes.js` – `AnalyticsFilterInput`, `AdminAnalytics`, `OverallStats`, `GraphData`, and related types; `Query.getAdminAnalytics(filter)`, `Query.getAllInstructors`.
- **Data flow:** User selects filter → frontend sends `GET_ADMIN_ANALYTICS` with `filter` → backend computes date range and optional instructor filter, aggregates from `User`, `studentBookingModel`, `Review`, `Visitor` → returns stats and graph data → UI renders charts (e.g. ApexCharts) and summary cards.

---

### 3.2 Admin Access (Signup links)

- **Route:** `/admin-dashboard/admin-access`
- **Component:** `AdminAccess` in `Frontend/src/pages/private/admin-dashboard/AdminAccess.tsx`.
- **What it does:** Lists all signup links; create new link (firstName, lastName, email, agreement); copy link; delete link.
- **Frontend – GraphQL:**
  - Query: `GET_ALL_SIGNUP_LINKS` – returns id, firstName, lastName, email, token, signupDate, pending, signupLink.
  - Mutations: `CREATE_SIGNUP_LINK` (firstName, lastName, email), `DELETE_SIGNUP_LINK` (id).
- **Frontend files:**
  - `Frontend/src/pages/private/admin-dashboard/AdminAccess.tsx`
  - `Frontend/src/graphql/mutations/auth.ts` (defines `GET_ALL_SIGNUP_LINKS`, `CREATE_SIGNUP_LINK`, `DELETE_SIGNUP_LINK`; note the create mutation may be named `CREATE_SIGNUP_LINK` or similar and call `createSignUpLink` on the backend).
- **Backend:**
  - **Resolvers:** `server/src/graphql/SignupLink/SignupLinkResolver.js` – `getAllSignupLinks`, `createSignUpLink`, `deleteSignUpLink`.
  - **TypeDefs:** `server/src/graphql/SignupLink/SignupLinkTypedef.js` – `SignupLink` type, `Query.getAllSignupLinks`, `Mutation.createSignUpLink`, `Mutation.deleteSignUpLink`.
- **Data flow:** Page load → `GET_ALL_SIGNUP_LINKS` → list of links. Create form submit → `CREATE_SIGNUP_LINK` → new link appears after refetch. Delete → `DELETE_SIGNUP_LINK` → list refetches.

---

### 3.3 Documents management

- **Route:** `/admin-dashboard/documentsManagement`
- **Component:** `InstructorDocumentsTable` from `Frontend/src/components/AdminComponents/InstructorDocumentsTable.tsx`.
- **What it does:** Table of all instructors and their documents (e.g. Swiss Driving License, other doc types). Supports search and filters (status, instructor). Clicking a row navigates to document details.
- **Detail route:** `/admin-dashboard/document-details/:instructorId/:documentType`
- **Detail component:** `DocumentDetailsPage` in `Frontend/src/pages/private/admin-dashboard/DocumentsDetailPage.tsx` – shows one instructor’s documents of a given type; uses `GET_ALL_INSTRUCTORS` and then finds the instructor and document set on the client (or a dedicated query if added).
- **Frontend – GraphQL:**
  - `GET_ALL_INSTRUCTORS` from `Frontend/src/graphql/Queries/InstructorProfiles.ts` – query name `GetAllInstructors`, field `allInstructors` with `documents` (documentType, documentUrl, status, etc.). Used by `InstructorDocumentsTable`. Documents detail page may use the same or a single-instructor query.
- **Frontend files:**
  - `Frontend/src/components/AdminComponents/InstructorDocumentsTable.tsx`
  - `Frontend/src/pages/private/admin-dashboard/DocumentsDetailPage.tsx`
  - `Frontend/src/graphql/Queries/InstructorProfiles.ts`
  - `Frontend/src/types/Instructor.ts` (e.g. `FlattenedDocument`)
- **Backend:**
  - **Resolvers:** `allInstructors` is implemented in `server/src/graphql/resolvers.js` (main resolvers), returning instructors with their `documents` from the Instructor model.
  - **TypeDefs:** Instructor type with `documents` is in the main `server/src/graphql/typeDefs.js` (or merged from a module). Document status updates may use a separate mutation (e.g. update document status) if present in the UI.
- **Data flow:** Load table → `allInstructors` with documents → frontend flattens to one row per document (or per document group for Swiss License) and applies search/filters. Navigate to detail → same or single-instructor data → show document list and status; any status change would call the corresponding mutation.

---

### 3.4 Instructor management

- **Route:** `/admin-dashboard/InstructorManagement`
- **Component:** `InstructorManagement` in `Frontend/src/pages/private/admin-dashboard/InstructorManagement.tsx`. Uses `FilterPopover`, `InstructorCard`, `InstructorDetailModal`, `DeleteConfirmationModal` from `Frontend/src/components/AdminComponents/`.
- **What it does:** Lists all instructors with details (card view). Filter by gender, verification, experience, date range. Select instructors and delete (bulk). Open detail modal per instructor.
- **Frontend – GraphQL:**
  - Query: `GET_ALL_INSTRUCTORS_DETAILS` – field `allInstructorsWithDetails` (full instructor profile + lessonPrice, studentCount, reviewRating, documents, etc.).
  - Mutation: `DELETE_INSTRUCTORS` (variable `instructorIds: [ID!]!`).
- **Frontend files:**
  - `Frontend/src/pages/private/admin-dashboard/InstructorManagement.tsx`
  - `Frontend/src/graphql/Queries/InstructorProfiles.ts` (`GET_ALL_INSTRUCTORS_DETAILS`, `DELETE_INSTRUCTORS`)
  - `Frontend/src/types/Instructor.ts`
  - `Frontend/src/components/AdminComponents/FilterPopOver.tsx`, `InstructorCard.tsx`, `InstructorDetailModal.tsx`, `DeleteConfirmation.tsx`
- **Backend:**
  - **Resolvers:** In `server/src/graphql/resolvers.js`: `allInstructorsWithDetails`, `deleteInstructors` (or similar name).
  - **TypeDefs:** In main `server/src/graphql/typeDefs.js`: `InstructorWithDetails` (or equivalent), `Query.allInstructorsWithDetails`, `Mutation.deleteInstructors`.
- **Data flow:** Load → `allInstructorsWithDetails` → display cards; filters applied in frontend. Delete → `deleteInstructors(instructorIds)` → refetch or update cache.

---

### 3.5 Booking management

- **Route:** `/admin-dashboard/bookingManagement`
- **Component:** `StudentBookingTable` from `Frontend/src/components/AdminComponents/StudentBookingTable.tsx` (not from the page file that exports the same name in `admin-dashboard`; the router imports the component from `AdminComponents`).
- **What it does:** Table of all student bookings (all slots across all bookings). Admin can change slot status (e.g. available, booked, completed, refund, cancelled, missed) and cancel a booking. Badge on sidebar shows count of new/unseen bookings when using socket notifications.
- **Frontend – GraphQL:**
  - Query: `GET_ALL_STUDENT_BOOKINGS` – returns all bookings with student, instructor, slots (id, date, startTime, endTime, status, etc.), totalAmount, finalAmount, paymentMethod, status.
  - Mutations: `UPDATE_BOOKING_STATUS` (update a slot’s status), `CANCEL_BOOKING_ADMIN` (cancel a booking/slot as admin).
- **Frontend files:**
  - `Frontend/src/components/AdminComponents/StudentBookingTable.tsx`
  - `Frontend/src/graphql/Queries/AdminBookingShowcase.ts` (`GET_ALL_STUDENT_BOOKINGS`)
  - `Frontend/src/graphql/mutations/AdminBookingsShowcase.ts` (`UPDATE_BOOKING_STATUS`, `CANCEL_BOOKING_ADMIN`)
  - `Frontend/src/types/AdminBookingShowcase.ts`
- **Backend:**
  - **Resolvers:** `server/src/graphql/resolvers/AdminBookingType.resolver.js` – `getAllStudentBookings`, and mutations for updating slot status and cancelling booking (names aligned with schema).
  - **TypeDefs:** `server/src/graphql/typeDefs/AdminBookingType.js` – `StudentBookingAdmin`, `BookingSlotAdmin`, slot status enum, `Query.getAllStudentBookings`, and the admin booking mutations.
- **Data flow:** Load → `getAllStudentBookings` → table of bookings/slots. Change status → `updateBookingStatus` (or equivalent) with bookingId/slotId/status. Cancel → `cancelBookingAdmin` (or equivalent). Refetch or cache update after mutations.

---

### 3.6 Student management

- **Route:** `/admin-dashboard/StudentManagement`
- **Component:** `StudentManagement` in `Frontend/src/pages/private/admin-dashboard/StudentManagement.tsx`. Uses `StudentFilterPopover`, `StudentCard`, `StudentDetailModal`, `StudentDeleteConfirmationModal`.
- **What it does:** Lists all students with lesson stats. Filter by verification, lesson count, location. Select students and delete (bulk). Open detail modal per student.
- **Frontend – GraphQL:**
  - Query: `GET_ALL_STUDENTS_ADMIN` – field `allStudentsWithLessonStats` (student list with lesson-related stats).
  - Mutation: `DELETE_STUDENTS` (variable `studentIds: [ID!]!` or similar).
- **Frontend files:**
  - `Frontend/src/pages/private/admin-dashboard/StudentManagement.tsx`
  - `Frontend/src/graphql/Queries/StudentQueries.ts` (`GET_ALL_STUDENTS_ADMIN`, `DELETE_STUDENTS`)
  - `Frontend/src/types/Student.ts`
  - `Frontend/src/components/AdminComponents/StudentFilterPopover.tsx`, `StudentCard.tsx`, `StudentDetailModel.tsx`, `StudentDeleteConfirmationModal.tsx`
- **Backend:**
  - **Resolvers:** In `server/src/graphql/resolvers.js` (or a student resolver file): `allStudentsWithLessonStats`, `deleteStudents`.
  - **TypeDefs:** In main typeDefs: `Query.allStudentsWithLessonStats`, `Mutation.deleteStudents`.
- **Data flow:** Load → `allStudentsWithLessonStats` → cards; filters in frontend. Delete → `deleteStudents(studentIds)` → refetch.

---

### 3.7 Payment management (Transactions)

- **Route:** `/admin-dashboard/transactions`
- **Component:** `AdminTransactionsPage` in `Frontend/src/pages/private/admin-dashboard/AdminTransactionsPage.tsx`.
- **What it does:** Lists all transactions with pagination. Filter by “party” (All / Admin / Instructor / Student) and by type (All / Payments / Refunds / Payouts / Reversals / Adjustments). Shows stats (e.g. total amounts). Can open commission settings (view/edit platform commission). Table columns include ref number, date, lesson slot (date/time), type, description, amount, status; “View” opens a details modal.
- **Frontend – GraphQL:**
  - Queries: `GET_ADMIN_TRANSACTIONS_WITH_PARTIES` (or the paginated `GET_ADMIN_TRANSACTIONS` with limit/offset and filter), `GET_ADMIN_TRANSACTIONS_COUNT`, `GET_ADMIN_TRANSACTION_STATS`. Optionally `GET_PLATFORM_COMMISSION_SETTINGS`.
  - Mutation: `UPDATE_PLATFORM_COMMISSION_SETTINGS` (when editing commission).
- **Frontend files:**
  - `Frontend/src/pages/private/admin-dashboard/AdminTransactionsPage.tsx`
  - `Frontend/src/graphql/Queries/transactionQueries.ts`
- **Backend:**
  - **Resolvers:** `server/src/graphql/resolvers/transaction.resolver.js` – `getAdminTransactions`, `getAdminTransactionCount`, `getAdminTransactionStats`, and commission-related queries/mutations if they live here or in another resolver.
  - **TypeDefs:** `server/src/graphql/typeDefs/transaction.typeDefs.js` – Transaction type, filters, `Query.getAdminTransactions(limit, offset, filter)`, `Query.getAdminTransactionCount(filter)`, `Query.getAdminTransactionStats`, and platform commission types/mutations.
- **Data flow:** Load → fetch transactions (paginated) + count + stats with current filter. Changing tab (party/type) or page → new variables → refetch. Commission form → `UPDATE_PLATFORM_COMMISSION_SETTINGS` mutation.

---

### 3.8 Refund requests

- **Route:** `/admin-dashboard/refund-requests`
- **Component:** `AdminRefundRequestsPage` in `Frontend/src/pages/private/admin-dashboard/AdminRefundRequestsPage.tsx`.
- **What it does:** Lists refund requests with tabs for status (All / Pending / Approved / Rejected). Table shows request details (student, instructor, slot, amount, status, etc.). For pending requests, admin can Approve or Reject (with optional reason). Disabling both buttons while one request is being processed avoids race conditions.
- **Frontend – GraphQL:**
  - Query: `GET_REFUND_REQUESTS` (variable `status: RefundRequestStatus` optional).
  - Mutations: `APPROVE_REFUND_REQUEST` (id), `REJECT_REFUND_REQUEST` (id, optional rejectionReason).
- **Frontend files:**
  - `Frontend/src/pages/private/admin-dashboard/AdminRefundRequestsPage.tsx`
  - `Frontend/src/graphql/mutations/refundRequest.ts` (`GET_REFUND_REQUESTS`, `APPROVE_REFUND_REQUEST`, `REJECT_REFUND_REQUEST`)
- **Backend:**
  - **Resolvers:** `server/src/graphql/resolvers/refundRequest.resolver.js` – `getRefundRequests`, `approveRefundRequest`, `rejectRefundRequest`. Business rules (e.g. no refund if lesson past or completed/missed) are enforced in these resolvers.
  - **TypeDefs:** `server/src/graphql/typeDefs/refundRequest.typeDefs.js` – `RefundRequest` type, `RefundRequestStatus` enum, `Query.getRefundRequests(status)`, `Mutation.approveRefundRequest`, `Mutation.rejectRefundRequest`.
- **Data flow:** Load → `getRefundRequests(status)` (or no status for “all”). Tab change → refetch with new status. Approve/Reject → mutation → refetch list.

---

### 3.9 Help & Support (Super admin only)

- **Route:** `/admin-dashboard/help-support`
- **Component:** Wrapped in `SuperAdminRoute`; the actual content is `QuestionsAnswers` from `Frontend/src/pages/private/admin-dashboard/HelpSupport.tsx`. It contains two tabs: **FAQ** (FaqTab) and **Contact Details** (ContactDetails).
- **What it does:**
  - **FAQ tab:** List of FAQs for the admin; add/edit/delete FAQs. Uses `FaqTab` → `FaqForm`, `FaqList`; `FaqList` uses `GET_FAQS_BY_ADMIN`; create/update/delete use the FAQ mutations.
  - **Contact details tab:** Manage support contact (e.g. email). Uses `GET_MY_CONTACT_DETAIL` and `CREATE_CONTACT_DETAIL` / `UPDATE_CONTACT_DETAIL`.
- **Frontend – GraphQL:**
  - FAQ: `GET_FAQS_BY_ADMIN` (adminId), and FAQ create/update/delete mutations (from `Frontend/src/graphql/Queries/Faqs.ts` and related mutation files).
  - Contact: `GET_MY_CONTACT_DETAIL`, `CREATE_CONTACT_DETAIL`, `UPDATE_CONTACT_DETAIL` from `Frontend/src/graphql/Queries/AdminContact.ts` and `Frontend/src/graphql/mutations/AdminContact.ts` (or equivalent).
- **Frontend files:**
  - `Frontend/src/pages/private/admin-dashboard/HelpSupport.tsx`
  - `Frontend/src/components/AdminComponents/FaqTab.tsx`, `FaqForm.tsx`, `FaqList.tsx`
  - `Frontend/src/components/AdminComponents/ContactDetails.tsx`
  - `Frontend/src/graphql/Queries/Faqs.ts`, `Frontend/src/graphql/Queries/AdminContact.ts`, and AdminContact mutations
- **Backend:**
  - **Resolvers:** FAQ: `server/src/graphql/resolvers/Faqs.resolver.js` (e.g. getFaqsByAdmin, createFaq, updateFaq, deleteFaq). Contact: `server/src/graphql/resolvers/ContactDetail.resolver.js` – `getMyContactDetail`, `getAllContactDetails`; create/update in same or Contact service.
  - **TypeDefs:** FAQ types in `server/src/graphql/typeDefs/Faq'sTypes.js` (or similar). Contact in `server/src/graphql/typeDefs/AdminContactTypes.js`.
- **Data flow:** FAQ: load list by admin → add/edit/delete via mutations → refetch. Contact: load current detail → create or update → refetch.

---

## 4. “Where is it?” quick reference

| Feature              | Route                          | Main frontend file(s)                                              | Main GraphQL (frontend)                    | Backend resolver / typeDefs |
|----------------------|--------------------------------|--------------------------------------------------------------------|--------------------------------------------|-----------------------------|
| Overview / Analytics | `/admin-dashboard/overview`    | `adminOverview.tsx`                                               | `AdminContact.ts`: GET_ADMIN_ANALYTICS, GET_ALL_INSTRUCTORS | AdminAnalytics.resolver, AdminOverallAnalyticsTypes |
| Admin Access         | `/admin-dashboard/admin-access`| `AdminAccess.tsx`                                                 | `auth.ts`: GET_ALL_SIGNUP_LINKS, CREATE/DELETE signup link | SignupLinkResolver, SignupLinkTypedef |
| Documents            | `/admin-dashboard/documentsManagement` | `InstructorDocumentsTable.tsx`, `DocumentsDetailPage.tsx`   | `InstructorProfiles.ts`: GET_ALL_INSTRUCTORS (allInstructors) | resolvers.js (allInstructors), typeDefs.js |
| Instructor management| `/admin-dashboard/InstructorManagement` | `InstructorManagement.tsx` + AdminComponents (Filter, Card, Modals) | `InstructorProfiles.ts`: GET_ALL_INSTRUCTORS_DETAILS, DELETE_INSTRUCTORS | resolvers.js: allInstructorsWithDetails, deleteInstructors |
| Booking management   | `/admin-dashboard/bookingManagement`    | `StudentBookingTable.tsx` (in AdminComponents)                    | `AdminBookingShowcase.ts`, `AdminBookingsShowcase` mutations | AdminBookingType.resolver, AdminBookingType typeDefs |
| Student management   | `/admin-dashboard/StudentManagement`   | `StudentManagement.tsx` + AdminComponents                         | `StudentQueries.ts`: GET_ALL_STUDENTS_ADMIN, DELETE_STUDENTS | resolvers.js: allStudentsWithLessonStats, deleteStudents |
| Transactions         | `/admin-dashboard/transactions` | `AdminTransactionsPage.tsx`                                       | `transactionQueries.ts`: GET_ADMIN_*, GET_PLATFORM_COMMISSION_*, UPDATE_* | transaction.resolver, transaction.typeDefs |
| Refund requests      | `/admin-dashboard/refund-requests`      | `AdminRefundRequestsPage.tsx`                                     | `refundRequest.ts`: GET_REFUND_REQUESTS, APPROVE/REJECT       | refundRequest.resolver, refundRequest.typeDefs |
| Help & Support       | `/admin-dashboard/help-support` | `HelpSupport.tsx`, FaqTab, ContactDetails                         | Faqs.ts, AdminContact.ts + mutations        | Faqs.resolver, ContactDetail.resolver, Faq'sTypes, AdminContactTypes |

---

## 5. Shared pieces

- **Auth:** Admin dashboard relies on the same auth context as the rest of the app (e.g. `useAuth()` in `AdminLayout`). Token is sent with every GraphQL request; backend resolvers check `user` and often require `user.role === 'Admin'` (or similar).
- **Socket:** Booking notification count and badge use `useBookingNotifications` and `initSocket` in `AdminLayout`; backend likely emits events when new bookings are created so the admin sees an updated count without refreshing.
- **Private route:** `AdminPrivateRoute` (used in `AdminRoutes`) ensures only logged-in admins can access any child route; otherwise redirect to sign-in or a default page.

---

This completes Phase 1 (Admin Dashboard). For Student Dashboard, Instructor Dashboard, Authentication, and Payments/Stripe, see the other phase documents in this folder (when added) and the [DEVELOPER_INDEX.md](./DEVELOPER_INDEX.md).
