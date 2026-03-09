# DSP documentation – structure and how to find module docs

This file explains **how docs are organized** so you always know **which module a doc belongs to** and where to find deep (file-by-file, query-by-query) documentation.

---

## Doc layout

```
docs/
├── README.md                    ← You are here: structure + "which module is this"
├── DEVELOPER_INDEX.md           ← Entry point: repo overview + links to all docs
│
├── 01_ADMIN_DASHBOARD.md        ← Top-level phase docs (overview of whole area)
├── 02_STUDENT_DASHBOARD.md      (planned)
├── ...
│
├── modules/                     ← DEEP module docs (each file, query, mutation, typeDef)
│   ├── README.md                ← Index: list of all modules and their docs
│   ├── admin-dashboard/         ← Module: Admin Dashboard
│   │   ├── README.md            ← What this module is + list of sub-module docs
│   │   ├── overview-analytics.md
│   │   ├── admin-access.md
│   │   ├── documents.md
│   │   └── ...
│   ├── student-dashboard/
│   ├── teacher-dashboard/
│   ├── auth/
│   └── payments/
│
├── BUSINESS_RULES_*.md          ← Other reference docs (Stripe, handover, etc.)
└── ...
```

---

## How to know “which module doc is this?”

- **Folder name = area/module**
  - `modules/admin-dashboard/` → **Admin Dashboard**
  - `modules/student-dashboard/` → **Student Dashboard**
  - `modules/teacher-dashboard/` → **Instructor/Teacher Dashboard**
  - `modules/auth/` → **Authentication**
  - `modules/payments/` → **Payments & Stripe**
  - etc.

- **File name = feature or sub-module**
  - `overview-analytics.md` → Admin Overview / Analytics screen
  - `admin-access.md` → Admin Access (signup links)
  - `signin.md` → Sign-in flow
  - `checkout.md` → Checkout / payment flow

- **Full path = unique module doc**
  - `modules/admin-dashboard/overview-analytics.md` = **Admin Dashboard → Overview/Analytics**
  - `modules/auth/signin.md` = **Auth → Sign-in**

So: **folder = module**, **file = feature inside that module**. Every doc’s path tells you exactly which module it is.

---

## Two levels of documentation

| Level | Where | What it covers |
|-------|--------|-----------------|
| **Top-level (phase)** | `docs/01_ADMIN_DASHBOARD.md`, etc. | High-level: routes, screens, main components, main GraphQL and backend. Good for “what exists” and navigation. |
| **Deep (module)** | `docs/modules/<module>/<feature>.md` | Detail: **every** code file, **every** query/mutation/typeDef, resolvers, frontend–API integration. Good for “how does this exact feature work?” |

Use **phase docs** to get the big picture; use **module docs** when you need to touch or understand a specific feature in depth (e.g. “Admin Overview Analytics” or “Signup links”).

---

## Quick links

- **Start here:** [DEVELOPER_INDEX.md](./DEVELOPER_INDEX.md)
- **All deep module docs:** [modules/README.md](./modules/README.md)
- **Admin dashboard deep docs:** [modules/admin-dashboard/README.md](./modules/admin-dashboard/README.md)
