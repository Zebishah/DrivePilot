# Module: Admin Dashboard

**Module ID:** `admin-dashboard`  
**Area:** Admin-only dashboard (analytics, signup links, documents, instructors, students, bookings, transactions, refunds, help & support).

---

## How to find “which module doc is this”

- **Folder:** `docs/modules/admin-dashboard/` → every file in this folder is an **Admin Dashboard** module doc.
- **File name** = the feature or screen (e.g. `overview-analytics`, `admin-access`).

---

## Deep docs in this module

| Doc | Feature | Route | Contents |
|-----|---------|--------|----------|
| [overview-analytics.md](./overview-analytics.md) | Overview / Analytics | `/admin-dashboard/overview` | Every file, query, typeDef, resolver for the analytics screen. |
| [admin-access.md](./admin-access.md) | Admin Access (signup links) | `/admin-dashboard/admin-access` | Page, auth GraphQL, signup-link typeDefs/resolvers, invitation flow. |
| [document-management.md](./document-management.md) | Document management | `/admin-dashboard/documentsManagement` | Document table, detail page, status dropdown, document GraphQL, backend document status logic. |
| [instructor-management.md](./instructor-management.md) | Instructor management | `/admin-dashboard/InstructorManagement` | Enriched instructor query, filters, modals, delete flow, backend aggregation logic. |
| [booking-management.md](./booking-management.md) | Booking management | `/admin-dashboard/bookingManagement` | Booking query, admin booking mutations, slot status updates, availability sync, notifications. |
| [student-management.md](./student-management.md) | Student management | `/admin-dashboard/StudentManagement` | Student list, filters, delete flow, student stats query, backend enrichment logic. |
| [payment-management.md](./payment-management.md) | Payment / transactions | `/admin-dashboard/transactions` | Transaction table, stats, pagination, commission management, transaction resolver flow. |
| [refund-requests.md](./refund-requests.md) | Refund requests | `/admin-dashboard/refund-requests` | Admin refund queue, approve/reject flow, Stripe refund/reversal logic, transaction creation. |
| [help-support.md](./help-support.md) | Help & Support (FAQ, contact) | `/admin-dashboard/help-support` | FAQ CRUD, contact detail management, FAQ/contact typeDefs and resolvers. |

---

## Shared for Admin Dashboard

- **Layout:** `Frontend/src/layouts/AdminLayout.tsx` – sidebar, navbar, menu items, socket/booking badge.
- **Routes:** `Frontend/src/routes/index.tsx` (path `/admin-dashboard`), `AdminRoutes.tsx` with `AdminPrivateRoute`.
- **Auth:** All admin routes require authenticated user with `role: "Admin"`.
