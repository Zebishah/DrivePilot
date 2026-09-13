# Application Architecture

This document records the Phase 12 structural baseline. The refactor is
organizational only: GraphQL contracts, REST routes, payment behavior,
authorization, persistence, and external integrations remain unchanged.

## Repository boundaries

```text
dsp-marketplace/
├── Frontend/
│   └── src/
│       ├── routes/                 route composition and lazy entry points
│       ├── layouts/                authenticated role shells
│       ├── features/               feature-owned UI and feature APIs
│       │   ├── assistant/
│       │   ├── chat/
│       │   └── feedback/
│       ├── components/             transitional shared and legacy UI
│       ├── pages/                  transitional route/page modules
│       ├── graphql/                transitional shared GraphQL documents
│       ├── hooks/                  transitional shared hooks
│       ├── store/                  application state
│       ├── context/                React context providers
│       ├── themes/                 styling/theme configuration
│       ├── types/                  shared TypeScript types
│       └── utils/                  shared client utilities
└── server/
    └── src/
        ├── modules/assistant/      assistant route, service, provider, tools, tests
        ├── graphql/                schema composition, type definitions, resolvers
        ├── models/                 Mongoose models
        ├── services/               transitional cross-feature services
        ├── jobs/                   background job implementations
        ├── routes/                 remaining REST routes
        ├── middleware/             request/auth middleware
        ├── socket/                 realtime transport
        ├── config/                 application and integration configuration
        └── utils/                  cross-cutting utilities
```

## Feature ownership

### Frontend

- `features/chat/components` owns `ChatList`, `ChatWindow`, and
  `MessageItem`. `features/chat/api/chat.queries.ts` owns chat GraphQL
  documents. `ChatWindow` remains loaded through the existing route-level
  lazy boundary.
- `features/feedback/components` owns the feedback table, status/actions,
  form controls, review UI, and rich-text editor. `features/feedback/pages`
  owns `FeedbackForm`.
- `features/assistant/components` owns `AssistantPanel`, which is consumed
  by the role layouts.

New code for one of these features should be placed beside its page, UI,
hooks, and API documents. Existing global hooks, types, contexts, and
utilities may be imported until they are deliberately migrated.

### Backend

The assistant is the first backend feature module. Its route is mounted from
`src/index.js`, while its implementation files and tests are colocated in
`src/modules/assistant`. The GraphQL schema, models, jobs, and remaining
services retain their current global locations during this incremental phase;
moving those boundaries safely requires separate behavior-preserving passes.

## Naming and import rules

- Use feature names in lowercase directory names (`chat`, `feedback`,
  `assistant`).
- Use PascalCase for React component files and components (`FeedbackTable`,
  `RichTextEditor`).
- Use descriptive lowercase names for feature API modules
  (`chat.queries.ts`).
- Prefer imports from the owning feature for feature-internal dependencies.
- Keep cross-cutting code in the existing global locations until it has more
  than one stable consumer and a clear shared contract.
- Do not add barrel files merely to shorten imports; explicit imports make
  ownership and dependency direction visible.

## Transitional architecture

The repository still contains legacy pages/components and multiple styling
systems. Phase 12 intentionally does not perform a wholesale UI-library
rewrite, broad visual redesign, resolver decomposition, or lint cleanup.
Those changes should follow tests and ownership boundaries rather than be
mixed into a structural move.

Loading, error, and empty-state primitives already exist in shared/common
areas and should be reused when a touched screen can adopt them without
changing behavior. A frontend component-test framework is not introduced in
this phase; component coverage remains a later Phase 13/14 decision.

## Safe migration order for future work

1. Add characterization/integration tests around a feature boundary.
2. Move one page or service with its imports and tests.
3. Keep public route and GraphQL names stable.
4. Run type-check, build, targeted tests, and the relevant backend suites.
5. Remove an old location only after repository-wide search proves it is
   unused.
