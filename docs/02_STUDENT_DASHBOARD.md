# Phase 2: Student Dashboard – Complete Documentation

This document describes the **Student Dashboard** end-to-end: routes, layout, each major screen, the frontend files involved, the GraphQL operations used, and the backend resolvers/models behind them. Use it as the high-level map of the student area, then open the deep module docs under `docs/modules/student-dashboard/` for file-by-file detail.

---

## 1. Purpose and entry point

- **Purpose:** The Student Dashboard is the student’s main workspace for discovering instructors, booking lessons, completing payments, tracking booked lessons, managing profile data, viewing payment history, tracking lesson progress, leaving reviews, and chatting with instructors.
- **Entry:** User signs in with an account that has `role: "Student"`. After sign-in, the app redirects into the student dashboard routes.
- **Protection:** All `/student-dashboard/*` routes are wrapped in `StudentPrivateRoute`, which ensures the user is authenticated and has the student role.

---

## 2. Layout and routing

### 2.1 How the student area is mounted

- **Route definition:** `Frontend/src/routes/index.tsx`
  - Base path: `/student-dashboard`
  - Wrapper element: `StudentRoutes`
- **Route wrapper:** `Frontend/src/routes/StudentRoutes.tsx`
  - Applies student-only route protection and layout composition.
- **Layout:** `Frontend/src/layouts/StudentLayout.tsx`
  - Renders sidebar, top navigation, and the active student page.
  - Integrates booking/chat badge behavior through shared hooks and Redux/socket state.
- **Shared shell pieces:**
  - `Frontend/src/components/common/SideBar.tsx`
  - `Frontend/src/components/common/DashNavBar.tsx`
  - `Frontend/src/utils/useBookingNotification.ts`
  - `Frontend/src/hooks/useSockets.ts`
  - `Frontend/src/utils/socket.ts`
  - `Frontend/src/store/slices/chatSlice.ts`

### 2.2 Student routes

| Screen | Path |
|---|---|
| Overview | `/student-dashboard/overview` |
| Settings | `/student-dashboard/settings` |
| Edit profile | `/student-dashboard/settings/edit-profile` |
| Booked lessons | `/student-dashboard/book` |
| Search instructors | `/student-dashboard/search` |
| Instructor detail | `/student-dashboard/search/instructors/:id` |
| Booking details | `/student-dashboard/booking-details` |
| Complete payment | `/student-dashboard/complete-payment` |
| Help & support | `/student-dashboard/help-support` |
| Payment history | `/student-dashboard/payment-history` |
| Progress tracking | `/student-dashboard/reviews` |
| Feedback & rating | `/student-dashboard/Feedback` |
| Review form | `/student-dashboard/review-form` |
| Review display | `/student-dashboard/review-display` |
| All booking slots | `/student-dashboard/allBookingSlots` |
| Chat | `/student-dashboard/chat` |

---

## 3. Screen-by-screen breakdown

Each section below lists the **route**, **main frontend files**, **what the screen does**, **GraphQL operations**, and **backend modules** involved.

---

### 3.1 Overview

- **Route:** `/student-dashboard/overview`
- **Primary page:** `Frontend/src/pages/private/student-dashboard/studentOverview.tsx`
- **What it does:** Shows top-level student stats, a lesson list/history block, and notes/feedback from instructors. Provides a CTA to search for instructors.
- **Frontend files:**
  - `Frontend/src/pages/private/student-dashboard/studentOverview.tsx`
  - `Frontend/src/components/StudentComponents/StudentDashboard/LoadingCard.tsx`
  - `Frontend/src/components/StudentComponents/StudentDashboard/CircularProgressDashboard.tsx`
  - `Frontend/src/components/StudentComponents/StudentDashboard/FeedBackModal.tsx`
- **Frontend GraphQL:**
  - `GET_STUDENT_DASHBOARD_STATS`
  - `GET_STUDENT_LESSONS`
  - `GET_STUDENT_FEEDBACKS`
  - File: `Frontend/src/graphql/Queries/StudentDashboard.ts`
- **Backend:**
  - TypeDefs: `server/src/graphql/typeDefs/studentDashboard.js`
  - Resolvers: `server/src/graphql/resolvers/studentDashboard.resolver.js`
  - Models: `server/src/models/studentBooking.model.js`, `server/src/models/User.js`, `server/src/models/LessonFeedBack.js`
- **Deep doc:** `docs/modules/student-dashboard/overview-analytics.md`

---

### 3.2 Search Instructors

- **Routes:** `/student-dashboard/search`, `/student-dashboard/search/instructors/:id`
- **Primary pages/components:**
  - `Frontend/src/pages/private/student-dashboard/searchInstructor.tsx`
  - `Frontend/src/components/ProfessionalInstructor/InstructorInfo.tsx`
  - `Frontend/src/pages/public/OurInstructor.tsx`
  - `Frontend/src/components/InstructorComponent/PostSummary.tsx`
- **What it does:** Lets the student browse/filter instructors, see location/map context, open a specific instructor, inspect availability/packages/reviews, and start booking.
- **Frontend files:**
  - `Frontend/src/components/FilterPopover.tsx`
  - `Frontend/src/components/AddressSearch.tsx`
  - `Frontend/src/components/InstructorComponent/Availability.tsx`
  - `Frontend/src/components/InstructorComponent/Summary.tsx`
  - `Frontend/src/components/InstructorComponent/BulkPackageCard.tsx`
  - `Frontend/src/components/StudentComponents/InstructorReviews.tsx`
- **Frontend GraphQL:**
  - Instructor public/discovery queries from `Frontend/src/graphql/mutations/instructorPublic.ts`
  - Review queries from `Frontend/src/graphql/Queries/ReviewQueries.ts`
- **Backend:**
  - TypeDefs: `server/src/graphql/typeDefs/instructorPublic.typeDefs.js`, `server/src/graphql/typeDefs/ReviewTypes.js`
  - Resolvers: `server/src/graphql/resolvers/instructorPublic.resolver.js`, `server/src/graphql/resolvers/Review.resolver.js`
  - Models: `server/src/models/User.js`, `server/src/models/teacherTariff.model.js`, `server/src/models/teacherAvailability.model.js`, `server/src/models/Reviews.js`
- **Deep doc:** `docs/modules/student-dashboard/search-instructors.md`

---

### 3.3 Booked Lessons

- **Routes:** `/student-dashboard/book`, `/student-dashboard/booking-details`, `/student-dashboard/complete-payment`
- **Primary files:**
  - `Frontend/src/pages/private/student-dashboard/bookLesson.tsx`
  - `Frontend/src/pages/private/student-dashboard/bookingDetails.tsx`
  - `Frontend/src/pages/private/student-dashboard/CompletePaymentPage.tsx`
  - `Frontend/src/components/BookingList.tsx`
- **What it does:** Shows booked lessons with tab-based filtering, abandoned checkout recovery, later payment/T-48/3DS completion, booking details, cancellation, and refund request actions.
- **Frontend GraphQL:**
  - `GET_STUDENT_BOOKINGS`
  - `CREATE_BOOKING_CHECKOUT_SESSION`
  - `CREATE_CHECKOUT_SESSION_FOR_PENDING_BOOKING`
  - `COMPLETE_BOOKING_FROM_CHECKOUT`
  - `COMPLETE_DEFERRED_BOOKING_FROM_CHECKOUT`
  - `COMPLETE_BOOKING_AFTER_PAYMENT`
  - `GET_T48_CLIENT_SECRET`
  - `COMPLETE_T48_SLOT_PAYMENT`
  - `CANCEL_BOOKING`
  - `REQUEST_REFUND`
  - Files:
    - `Frontend/src/graphql/mutations/studentBooking.ts`
    - `Frontend/src/graphql/mutations/refundRequest.ts`
- **Backend:**
  - TypeDefs: `server/src/graphql/typeDefs/studentBooking.typeDefs.js`, `server/src/graphql/typeDefs/refundRequest.typeDefs.js`
  - Resolvers: `server/src/graphql/resolvers/studentBooking.resolver.js`, `server/src/graphql/resolvers/refundRequest.resolver.js`
  - Services/jobs/routes:
    - `server/src/services/stripeService.js`
    - `server/src/services/transactionService.js`
    - `server/src/jobs/pendingBookingCleanupJob.js`
    - `server/src/jobs/t48ChargeJob.js`
    - `server/src/jobs/payoutJob.js`
    - `server/src/routes/stripeWebhook.routes.js`
- **Deep doc:** `docs/modules/student-dashboard/booked-lessons.md`

---

### 3.4 Profile Setting

- **Routes:** `/student-dashboard/settings`, `/student-dashboard/settings/edit-profile`
- **Primary files:**
  - `Frontend/src/pages/private/student-dashboard/profileSetting.tsx`
  - `Frontend/src/pages/private/student-dashboard/EditStudentProfile.tsx`
- **What it does:** Shows student profile info, profile image, language/address/personal details, and supports profile editing with upload/address suggestion flows.
- **Frontend GraphQL:**
  - `GET_STUDENT_PROFILE`
  - `UPDATE_STUDENT_PROFILE`
  - File: `Frontend/src/graphql/mutations/studentProfile.ts`
- **Backend:**
  - TypeDefs: `server/src/graphql/typeDefs.js`, `server/src/graphql/typeDefs/student.typeDefs.js`
  - Resolvers: `server/src/graphql/resolvers.js`, `server/src/graphql/resolvers/student.resolver.js`
  - Validation: `server/src/schemas/validation.js`
  - Model: `server/src/models/User.js`
- **Deep doc:** `docs/modules/student-dashboard/profile-setting.md`

---

### 3.5 Help & Support

- **Route:** `/student-dashboard/help-support`
- **Primary page:** `Frontend/src/pages/private/teacher-dashboard/HelpSuportPage.tsx` (shared with teacher-side support UI)
- **What it does:** Shows FAQs and a contact form for support inquiries.
- **Frontend files:**
  - `Frontend/src/components/InstructorComponent/Help&Support/TabPanel.tsx`
  - `Frontend/src/components/InstructorComponent/Help&Support/FaqList.tsx`
  - `Frontend/src/components/InstructorComponent/Help&Support/ContactSection.tsx`
  - `Frontend/src/components/InstructorComponent/Help&Support/ContactForm.tsx`
  - `Frontend/src/hooks/UseFaqs's.ts`
- **Frontend GraphQL:**
  - `GET_ALL_FAQS` from `Frontend/src/graphql/Queries/Faqs.ts`
  - `SEND_CONTACT_EMAIL` from `Frontend/src/graphql/mutations/AdminContact.ts`
- **Backend:**
  - TypeDefs: `server/src/graphql/typeDefs/Faq'sTypes.js`, `server/src/graphql/typeDefs/AdminContactTypes.js`
  - Resolvers: `server/src/graphql/resolvers/Faqs.resolver.js`, `server/src/graphql/resolvers/ContactDetail.resolver.js`
  - Models/services: `FAQ's`, `AdminContact`, FAQ/contact service files
- **Deep doc:** `docs/modules/student-dashboard/help-support.md`

---

### 3.6 Payment History

- **Route:** `/student-dashboard/payment-history`
- **Primary page:** `Frontend/src/pages/private/student-dashboard/StudentPaymentHistoryPage.tsx`
- **What it does:** Shows payment/refund ledger rows, summary cards, tab filters, pagination, and transaction details.
- **Frontend GraphQL:**
  - `GET_STUDENT_TRANSACTIONS`
  - `GET_STUDENT_TRANSACTIONS_COUNT`
  - `GET_STUDENT_TRANSACTION_STATS`
  - File: `Frontend/src/graphql/Queries/transactionQueries.ts`
- **Backend:**
  - TypeDefs: `server/src/graphql/typeDefs/transaction.typeDefs.js`, `server/src/graphql/typeDefs/refundRequest.typeDefs.js`
  - Resolvers: `server/src/graphql/resolvers/transaction.resolver.js`, `server/src/graphql/resolvers/refundRequest.resolver.js`
  - Models: `transaction.model.js`, `refundRequest.model.js`, `studentBooking.model.js`
- **Deep doc:** `docs/modules/student-dashboard/payment-history.md`

---

### 3.7 Progress Tracking

- **Routes:** `/student-dashboard/reviews`, `/student-dashboard/allBookingSlots`
- **Primary page/component:** `Frontend/src/components/StudentComponents/ReviewTab/Dashboard.tsx`
- **What it does:** Shows completed/remaining lesson hours, days since last lesson, and a booking-slot table that connects to review/feedback actions.
- **Frontend files:**
  - `Frontend/src/components/StudentComponents/ReviewTab/StudentHourPercentage.tsx`
  - `Frontend/src/components/StudentComponents/ReviewTab/BookingSlotTable.tsx`
  - `Frontend/src/components/StudentComponents/ReviewTab/AllBookingSlotPage.tsx`
  - `Frontend/src/hooks/ReviewSystem.ts`
  - `Frontend/src/hooks/UseReview.ts`
  - `Frontend/src/hooks/UseStudentHourProgress.ts`
- **Frontend GraphQL:**
  - `GET_STUDENT_HOURS_PROGRESS`
  - `GET_ALL_STUDENT_BOOKING_SLOTS`
  - File: `Frontend/src/graphql/Queries/ReviewQueries.ts`
- **Backend:**
  - TypeDefs: `server/src/graphql/typeDefs/student.typeDefs.js`, `server/src/graphql/typeDefs/ReviewTypes.js`
  - Resolvers: `server/src/graphql/resolvers/student.resolver.js`, `server/src/graphql/resolvers/Review.resolver.js`, `server/src/graphql/resolvers/studentDashboard.resolver.js`
  - Models: `User.js`, `studentBooking.model.js`, `Reviews.js`
- **Deep doc:** `docs/modules/student-dashboard/progress-tracking.md`

---

### 3.8 Feedback & Rating

- **Routes:** `/student-dashboard/Feedback`, `/student-dashboard/review-form`, `/student-dashboard/review-display`
- **Primary files:**
  - `Frontend/src/components/StudentComponents/ReviewTab/OnlyReviewsTab.tsx`
  - `Frontend/src/components/StudentComponents/ReviewTab/ReviewForm.tsx`
  - `Frontend/src/components/StudentComponents/ReviewTab/ReviewDisplay.tsx`
- **What it does:** Lets students leave ratings/reviews for instructors per lesson slot, view existing reviews, edit them, or delete them.
- **Frontend GraphQL:**
  - `GET_ALL_STUDENT_BOOKING_SLOTS`
  - `GET_REVIEW_BY_LESSON_SLOT`
  - `GET_STUDENT_REVIEWS`
  - `CREATE_REVIEW`
  - `UPDATE_REVIEW`
  - `DELETE_REVIEW`
  - File: `Frontend/src/graphql/Queries/ReviewQueries.ts`
- **Backend:**
  - TypeDefs: `server/src/graphql/typeDefs/ReviewTypes.js`
  - Resolvers: `server/src/graphql/resolvers/Review.resolver.js`
  - Models: `server/src/models/Reviews.js`, `server/src/models/studentBooking.model.js`, `server/src/models/User.js`
- **Deep doc:** `docs/modules/student-dashboard/feedback-rating.md`

---

### 3.9 Messages / Chat

- **Route:** `/student-dashboard/chat`
- **Primary page:** `Frontend/src/pages/private/student-dashboard/chat/index.tsx`
- **What it does:** Lets students message instructors with message history, real-time updates, unread handling, typing behavior, and shared chat UI.
- **Frontend files:**
  - `Frontend/src/components/Chat/ChatList.tsx`
  - `Frontend/src/components/Chat/ChatWindow.tsx`
  - `Frontend/src/components/Chat/MessageItem.tsx`
  - `Frontend/src/store/slices/chatSlice.ts`
  - `Frontend/src/utils/socket.ts`
- **Frontend GraphQL:**
  - `GET_MESSAGES`
  - `SEND_MESSAGE`
  - `NEW_MESSAGE_SUBSCRIPTION`
  - File: `Frontend/src/graphql/Queries/Chat.ts`
- **Backend:**
  - TypeDefs: `server/src/graphql/typeDefs/chat.typeDefs.js`
  - Resolvers: `server/src/graphql/resolvers/chat.resolvers.js`
  - Real-time transport: `server/src/socket/index.js`
  - Models: `Message.js`, `Conversation.js`, booking-derived instructor relationship data
- **Deep doc:** `docs/modules/student-dashboard/messages-chat.md`

---

## 4. Shared backend modules used across the student dashboard

These backend modules are reused by multiple student pages:

| Backend file | Why it matters |
|---|---|
| `server/src/graphql/resolvers/studentBooking.resolver.js` | Central booking/payment/cancel/T-48 logic |
| `server/src/graphql/resolvers/transaction.resolver.js` | Student payment history and transaction stats |
| `server/src/graphql/resolvers/refundRequest.resolver.js` | Refund request creation and approval/rejection rules |
| `server/src/services/stripeService.js` | Checkout, PaymentIntent, refunds, transfers, payouts, commission split |
| `server/src/jobs/t48ChargeJob.js` | Deferred booking charge job |
| `server/src/routes/stripeWebhook.routes.js` | Stripe event completion and later-payment transitions |
| `server/src/models/studentBooking.model.js` | Main booking record used almost everywhere on the student side |
| `server/src/models/User.js` | Student/instructor profile data, hour tracking, payment-related fields |

---

## 5. Deep module docs

If you need file-by-file detail for one student feature, open the deep docs:

- `docs/modules/student-dashboard/README.md`
- `docs/modules/student-dashboard/overview-analytics.md`
- `docs/modules/student-dashboard/search-instructors.md`
- `docs/modules/student-dashboard/booked-lessons.md`
- `docs/modules/student-dashboard/profile-setting.md`
- `docs/modules/student-dashboard/help-support.md`
- `docs/modules/student-dashboard/payment-history.md`
- `docs/modules/student-dashboard/progress-tracking.md`
- `docs/modules/student-dashboard/feedback-rating.md`
- `docs/modules/student-dashboard/messages-chat.md`

---

## 6. Quick developer notes

- The student dashboard mixes route-based screens with shared component systems reused by teacher/public flows; when changing those shared files, check other dashboards too.
- Booking and payment logic is the most business-rule-heavy area; when debugging student issues, start with `studentBooking.resolver.js`, `refundRequest.resolver.js`, Stripe services/jobs, and the student booking/payment UI.
- Progress tracking and feedback/rating are related but not identical:
  - progress tracking = lesson hour/status visibility
  - feedback/rating = student reviews for instructors
- The top-level student phase doc is the high-level map; the deep module docs are the detailed implementation reference.
