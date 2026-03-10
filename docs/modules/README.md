# Deep module documentation – index

Each **module** is a folder. Each **doc** in that folder is one **feature or sub-module**, with deep detail: every code file, every GraphQL operation (query/mutation), every typeDef and resolver, and how the frontend integrates with the API.

---

## Module list (folder = module)

| Module folder | Area | README | Deep docs (features) |
|---------------|------|--------|------------------------|
| **admin-dashboard** | Admin Dashboard | [README](./admin-dashboard/README.md) | [overview-analytics](./admin-dashboard/overview-analytics.md), [admin-access](./admin-dashboard/admin-access.md), [document-management](./admin-dashboard/document-management.md), [instructor-management](./admin-dashboard/instructor-management.md), [booking-management](./admin-dashboard/booking-management.md), [student-management](./admin-dashboard/student-management.md), [payment-management](./admin-dashboard/payment-management.md), [refund-requests](./admin-dashboard/refund-requests.md), [help-support](./admin-dashboard/help-support.md) |
| **student-dashboard** | Student Dashboard | (planned) | overview, book-lesson, booking-details, payment-history, complete-payment, search, reviews, chat |
| **teacher-dashboard** | Instructor/Teacher Dashboard | [README](./teacher-dashboard/README.md) | [overview-analytics](./teacher-dashboard/overview-analytics.md), [profile-setting](./teacher-dashboard/profile-setting.md), [profile-documents](./teacher-dashboard/profile-documents.md), [profile-price-management](./teacher-dashboard/profile-price-management.md), [profile-availability-calendar](./teacher-dashboard/profile-availability-calendar.md), [profile-ratings-scores](./teacher-dashboard/profile-ratings-scores.md), [profile-payment-management](./teacher-dashboard/profile-payment-management.md), [help-support](./teacher-dashboard/help-support.md), [feedback](./teacher-dashboard/feedback.md), [my-students](./teacher-dashboard/my-students.md), [booking-management](./teacher-dashboard/booking-management.md), [messages-chat](./teacher-dashboard/messages-chat.md), [transaction-history](./teacher-dashboard/transaction-history.md) |
| **auth** | Authentication | (planned) | signin, signup, forgot-password, reset-password, otp, two-factor, signup-links, protected-routes |
| **payments** | Payments & Stripe | (planned) | checkout, t48-charge, refunds, payouts, webhooks, commission |

---

## What each deep doc contains

Every module doc (e.g. `overview-analytics.md`) follows the same structure so you can quickly find:

1. **Module ID** – e.g. `admin-dashboard / overview-analytics` (so you know which module it is).
2. **Purpose & route** – what the feature does, URL, entry component.
3. **Frontend**
   - Every file involved: path, role, what it exports/imports.
   - Which GraphQL operations it uses (query/mutation name, variables, fields).
   - Types and components used.
4. **GraphQL (frontend)**
   - Each operation: name, variables, requested fields, used in which file/component.
5. **Backend – TypeDefs**
   - File path.
   - Every type, enum, input, and Query/Mutation field with signature.
6. **Backend – Resolvers**
   - File path.
   - Every resolver: name, arguments, what it does, which models/services it uses.
7. **Data flow** – step-by-step from UI to DB and back.
8. **Quick reference** – table: file → role.

---

## Naming convention

- **Path:** `docs/modules/<module>/<feature>.md`
- **Module** = area (admin-dashboard, student-dashboard, auth, …).
- **Feature** = kebab-case name of the screen or flow (e.g. `overview-analytics`, `admin-access`, `signin`).

So you always know: **which module doc is this** = look at the folder and file name.
