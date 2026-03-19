# Module: Teacher Dashboard

**Module ID:** `teacher-dashboard`  
**Area:** Instructor-only dashboard for analytics, profile/settings, Stripe onboarding, student management, booking operations, chat, feedback, and transactions.

## How to identify this module

- Every file inside `docs/modules/teacher-dashboard/` belongs to the **Teacher Dashboard** module.
- The file name tells you the exact feature being documented.

## Deep docs in this module

| Doc | Feature | Route / Surface | Contents |
|---|---|---|---|
| [overview-analytics.md](./overview-analytics.md) | Overview analytics | `/teacher-dashboard/overview` | Instructor analytics cards, map, availability overview, related query/resolver flow. |
| [profile-setting.md](./profile-setting.md) | Profile setting shell | `/teacher-dashboard/settings` | Settings route, profile header, edit-profile flow, tabs wiring, shared query. |
| [profile-documents.md](./profile-documents.md) | Documents tab | Settings tab | Document cards, upload/update flow, document status and S3 upload integration. |
| [profile-price-management.md](./profile-price-management.md) | Price management / tariff | Settings tab | Lesson fee, discounts, bulk packages, tariff queries/mutations and schema. |
| [profile-availability-calendar.md](./profile-availability-calendar.md) | Availability & calendar | Settings tab | Availability calendar, add/delete slot flow, Stripe readiness gating. |
| [profile-ratings-scores.md](./profile-ratings-scores.md) | Ratings & scores | Settings tab | Instructor reviews, rating-related queries and review types/resolvers. |
| [profile-payment-management.md](./profile-payment-management.md) | Stripe onboarding / payment management | Settings tab + `/payment/*` | Stripe setup states, onboarding actions, profile Stripe status, hidden history branch. |
| [help-support.md](./help-support.md) | Help & support | `/teacher-dashboard/help-support` | FAQ viewer and contact form flow. |
| [feedback.md](./feedback.md) | Feedback by lesson | `/teacher-dashboard/feedback`, `/teacher-dashboard/feedbackForm/:bookingId/:lessonId/:studentId` | Completed-lessons feedback queue, lesson feedback CRUD, student-hours effects. |
| [my-students.md](./my-students.md) | My students | `/teacher-dashboard/my-students`, `/teacher-dashboard/studentProgress/:studentId` | Student list filters, progress drill-down, dashboard query/hook flow. |
| [booking-management.md](./booking-management.md) | Booking management | `/teacher-dashboard/bookingManagement` | Instructor booking list, slot status updates, notifications, booking/admin query crossover. |
| [messages-chat.md](./messages-chat.md) | Messages / chat | `/teacher-dashboard/chat` | Teacher chat layout, Redux state, socket + GraphQL messaging integration. |
| [transaction-history.md](./transaction-history.md) | Transaction history | `/teacher-dashboard/transaction-history` | Instructor transaction stats, filters, pagination, transaction resolver flow. |

## Shared teacher shell

- Layout: `Frontend/src/layouts/TeacherLayout.tsx`
- Route wrapper: `Frontend/src/routes/TeacherRoutes.tsx`
- Route declarations: `Frontend/src/routes/index.tsx`
- Auth guard: `TeacherPrivateRoute`
- Shared context: `Frontend/src/context/AuthContext.tsx`

## Notes

- Most settings subfeatures are **tab-based**, not route-based, so they live under the same `/teacher-dashboard/settings` route.
- Stripe return screens are under `/payment/refresh` and `/payment/complete`, but they belong functionally to teacher payment management.
