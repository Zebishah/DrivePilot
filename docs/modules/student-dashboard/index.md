# Module: Student Dashboard

**Module ID:** `student-dashboard`  
**Area:** Student-only dashboard for overview stats, instructor discovery, booking/payment flows, profile management, help/support, progress tracking, ratings, and chat.

## How to identify this module

- Every file inside `docs/modules/student-dashboard/` belongs to the **Student Dashboard** module.
- The file name tells you the exact feature being documented.

## Deep docs in this module

| Doc | Feature | Route / Surface | Contents |
|---|---|---|---|
| [overview-analytics.md](./overview-analytics.md) | Overview analytics | `/student-dashboard/overview` | Student stats cards, weekly lessons table, instructor notes, and dashboard query flow. |
| [search-instructors.md](./search-instructors.md) | Search instructors | `/student-dashboard/search`, `/student-dashboard/search/instructors/:id` | Instructor discovery, filters, map/list, instructor detail, booking entry flow. |
| [booked-lessons.md](./booked-lessons.md) | Booked lessons and checkout recovery | `/student-dashboard/book`, `/student-dashboard/booking-details`, `/student-dashboard/complete-payment` | Booking tabs, checkout completion, T-48 payment completion, cancel/refund actions. |
| [profile-setting.md](./profile-setting.md) | Profile setting | `/student-dashboard/settings`, `/student-dashboard/settings/edit-profile` | Student profile view/edit flow, image upload, address suggestions, lesson history surface. |
| [help-support.md](./help-support.md) | Help & support | `/student-dashboard/help-support` | FAQ viewer and support contact form. |
| [payment-history.md](./payment-history.md) | Payment history | `/student-dashboard/payment-history` | Student transaction ledger, stats, filters, refund visibility, pagination. |
| [progress-tracking.md](./progress-tracking.md) | Progress tracking | `/student-dashboard/reviews`, `/student-dashboard/allBookingSlots`, related review routes | Progress cards, remaining hours, booking-slot table, lesson progress queries. |
| [feedback-rating.md](./feedback-rating.md) | Feedback & rating | `/student-dashboard/Feedback`, `/student-dashboard/review-form`, `/student-dashboard/review-display` | Student-to-instructor reviews and lesson-level feedback/rating flow. |
| [messages-chat.md](./messages-chat.md) | Messages / chat | `/student-dashboard/chat` | Student chat layout, conversation sourcing, GraphQL messaging, Socket.IO real-time behavior. |

## Shared student shell

- Layout: `Frontend/src/layouts/StudentLayout.tsx`
- Route wrapper: `Frontend/src/routes/StudentRoutes.tsx`
- Route declarations: `Frontend/src/routes/index.tsx`
- Auth guard: `StudentPrivateRoute`
- Shared context: `Frontend/src/context/AuthContext.tsx`
- Shared sidebar/top-nav: `Frontend/src/components/common/SideBar.tsx`, `Frontend/src/components/common/DashNavBar.tsx`
- Shared notifications/socket wiring: `Frontend/src/utils/useBookingNotification.ts`, `Frontend/src/hooks/useSockets.ts`, `Frontend/src/utils/socket.ts`

## Notes

- Several student flows span multiple routes but belong to one feature. Example: booked lessons also owns booking details, checkout return handling, and T-48 payment completion.
- Some student screens reuse shared or teacher-side components (for example help/support and parts of the review system). The deep docs call those out explicitly so developers know when a change affects more than one dashboard.
- The route `/student-dashboard/Feedback` is capitalized in the current implementation; the docs preserve that exact route because it is part of the live codebase.
