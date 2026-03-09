# DSP Project – Developer Documentation Index

This folder contains documentation so a **new developer** can understand the whole codebase: what each area does, where the code lives, and how frontend and backend interact.

---

## How we document

- **No extra software** – everything is Markdown in the `docs/` folder. You can read it in any editor or render it with GitHub/GitLab, or with a static doc site (e.g. [Docsify](https://docsify.js.org/), [Docusaurus](https://docusaurus.io/)) if you want a searchable site later.
- **Two levels:** (1) **Top-level (phase) docs** – one doc per area (Admin, Student, Teacher, Auth, …): routes, screens, main components and GraphQL/backend. (2) **Deep (module) docs** – under `docs/modules/<module>/`: each feature has its own doc with **every** code file, **every** query/mutation/typeDef, **every** resolver, and frontend–API integration.
- **Which module doc is this?** – Folder name = module (e.g. `admin-dashboard`), file name = feature (e.g. `overview-analytics`). So `modules/admin-dashboard/overview-analytics.md` = Admin Dashboard → Overview/Analytics. See [README.md](./README.md) for the full structure.
- **Cross-references** – each doc points to concrete files and symbols (components, queries, mutations, resolvers) so you can jump straight into the code.

---

## Repository structure (high level)

```
dsp/
├── Frontend/                 # React (Vite) + TypeScript + MUI
│   ├── src/
│   │   ├── components/       # Reusable and role-specific components
│   │   ├── context/          # Auth etc.
│   │   ├── graphql/          # Queries, mutations, fragments
│   │   ├── layouts/          # Admin, Student, Teacher layouts
│   │   ├── pages/            # Route-level pages (public + private)
│   │   ├── routes/           # Route definitions and wrappers
│   │   └── ...
│   └── public/
├── server/                   # Node.js + Express + Apollo GraphQL
│   ├── src/
│   │   ├── graphql/
│   │   │   ├── typeDefs/      # Schema (types, queries, mutations)
│   │   │   ├── resolvers/    # Resolver implementations
│   │   │   └── ...
│   │   ├── models/           # Mongoose models
│   │   ├── routes/           # REST (e.g. Stripe webhook, auth callbacks)
│   │   ├── services/         # Stripe, email, etc.
│   │   ├── jobs/             # Cron (e.g. T-48 charge, payout)
│   │   └── ...
│   └── ...
└── docs/                     # This documentation
```

---

## Doc structure (where to find what)

- **Structure and “which module doc is this”:** [README.md](./README.md)
- **Deep module docs (every file, query, mutation, typeDef):** [modules/README.md](./modules/README.md)
- **Admin dashboard deep docs:** [modules/admin-dashboard/README.md](./modules/admin-dashboard/README.md)

---

## Top-level (phase) docs – overview of each area

| Phase | Document | Contents |
|-------|----------|----------|
| **1** | [01_ADMIN_DASHBOARD.md](./01_ADMIN_DASHBOARD.md) | Admin dashboard: layout, routes, every screen (Overview, Admin Access, Documents, Instructor/Student/Booking management, Transactions, Refund requests, Help & Support). Frontend components, GraphQL operations, backend resolvers and types. |
| **2** | *02_STUDENT_DASHBOARD.md* (planned) | Student dashboard: overview, book lesson, booking details, payment history, complete payment, search, reviews, chat. |
| **3** | *03_INSTRUCTOR_DASHBOARD.md* (planned) | Instructor (teacher) dashboard: overview, settings, booking management, transaction history, feedback, Stripe, chat. |
| **4** | *04_AUTHENTICATION.md* (planned) | Auth: sign in/up, forgot/reset password, OTP, 2FA, social (Google/Facebook), signup links, protected routes. |
| **5** | *05_PAYMENTS_AND_STRIPE.md* (planned) | Payments: checkout, T-48, refunds, payouts, webhooks, commission. (Can reuse/refine existing Stripe docs.) |
| **6** | *06_OTHER_MODULES.md* (planned) | Public pages, onboarding, messaging/chat, reviews, FAQs, etc. |

---

## Deep (module) docs – every file, query, mutation, typeDef

Each doc under `docs/modules/<module>/` covers **one feature** in depth: all frontend files (path, role, imports, which GraphQL), all GraphQL operations (name, variables, fields), all backend typeDefs (types, enums, inputs, Query/Mutation), all resolvers (name, args, logic, models), and data flow.

| Module | Folder | Deep docs available |
|--------|--------|-------------------|
| Admin Dashboard | [modules/admin-dashboard/](./modules/admin-dashboard/) | [overview-analytics](./modules/admin-dashboard/overview-analytics.md), [admin-access](./modules/admin-dashboard/admin-access.md), [document-management](./modules/admin-dashboard/document-management.md), [instructor-management](./modules/admin-dashboard/instructor-management.md), [booking-management](./modules/admin-dashboard/booking-management.md), [student-management](./modules/admin-dashboard/student-management.md), [payment-management](./modules/admin-dashboard/payment-management.md), [refund-requests](./modules/admin-dashboard/refund-requests.md), [help-support](./modules/admin-dashboard/help-support.md) |
| Student Dashboard | *modules/student-dashboard/* (planned) | — |
| Teacher Dashboard | *modules/teacher-dashboard/* (planned) | — |
| Auth | *modules/auth/* (planned) | — |
| Payments | *modules/payments/* (planned) | — |

---

## Other existing docs (reference)

- [BUSINESS_RULES_CANCEL_REFUND_PAYMENT_PAYOUT.md](./BUSINESS_RULES_CANCEL_REFUND_PAYMENT_PAYOUT.md) – Cancel/refund/payment/payout rules.
- [BACKEND_STRIPE_AND_PAYMENT_GUIDE.md](./BACKEND_STRIPE_AND_PAYMENT_GUIDE.md) – Backend Stripe integration.
- [CLIENT_HANDOVER_STRIPE_PAYMENTS_AND_RULES.md](./CLIENT_HANDOVER_STRIPE_PAYMENTS_AND_RULES.md) – Client-facing Stripe and rules summary.
- [STRIPE_GOING_LIVE_RENDER.md](./STRIPE_GOING_LIVE_RENDER.md) – Going live and Render.
- [TESTING_CHECKLIST_HANDOVER.md](./TESTING_CHECKLIST_HANDOVER.md) – Testing checklist.

---

## Quick start for a new developer

1. Read **README.md** to understand doc structure and how to know “which module doc is this” (folder = module, file = feature).
2. Use **DEVELOPER_INDEX.md** (this file) for the big picture and links to phase docs and module docs.
3. For a high-level map of an area (e.g. Admin), read the phase doc (e.g. **01_ADMIN_DASHBOARD.md**).
4. For deep detail on one feature (every file, every query/mutation/typeDef/resolver), go to **modules/** and open the right module folder and feature doc (e.g. **modules/admin-dashboard/overview-analytics.md**).
5. Use the “Where is it?” and “Quick reference” tables in phase and module docs to find files and symbols quickly.
