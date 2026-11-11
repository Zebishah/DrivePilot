# Drive Pilot

**A driving lesson marketplace connecting students, instructors, and administrators.**

**[Live demo](https://drive-pilot-topaz.vercel.app/)** · [Portfolio](https://zohaib-haider-portfolio.vercel.app/)

Drive Pilot brings instructor discovery, lesson availability, bookings, payments, progress tracking, and communication into connected role-based workspaces. Students find and book instructors; instructors manage teaching and earnings; administrators oversee marketplace operations.

## Product capabilities

- Instructor discovery with profiles, reviews, location filters, prices in CHF, and availability.
- Student onboarding, lesson bookings, payment history, learning timelines, feedback, and refund requests.
- Instructor verification documents, availability, tariffs, students, lesson feedback, and payment management.
- Administrative analytics, user management, bookings, reviews, support, and financial records.
- Real-time messaging and notifications with Socket.IO.
- Stripe payments and Connect workflows, durable webhook processing, reconciliation, and email outbox delivery.
- Public product guidance and a read-only AI assistant grounded in authorized workspace information.
- Student, instructor, and administrator recruiter demos when demo accounts are explicitly configured.

## Technology

| Layer | Stack |
|---|---|
| Frontend | React 18, TypeScript, Vite, React Router, Redux Toolkit, Apollo Client |
| Interface | Tailwind CSS, MUI, Ant Design, Framer Motion, ApexCharts |
| Backend | Node.js, Express, Apollo Server, GraphQL, Zod |
| Data and messaging | MongoDB, Mongoose, Redis, Socket.IO |
| Integrations | Stripe / Stripe Connect, AWS S3, Google/Facebook OAuth, Resend email delivery |
| Verification | Node.js test runner, TypeScript, ESLint |

## Architecture

The React application uses GraphQL for marketplace data and REST endpoints for authentication, integrations, and AI assistance. MongoDB stores business records. Redis supplies optional caching; Socket.IO carries real-time messages. API and scheduled worker processes can run separately. Webhook records, financial operations, reconciliation, and email outbox processing support recoverable payment and notification workflows.

The AI assistant provides read-only guidance. Booking, payment, cancellation, and refund changes go through the platform's normal authorized workflows.

## Repository structure

| Path | Purpose |
|---|---|
| `Frontend/` | Public marketplace and student, instructor, and admin interfaces |
| `server/` | API, GraphQL resolvers, domain services, jobs, and tests |
| `docs/` | Architecture, modules, and operational documentation |

## Local setup

Use Node.js 22 and the pinned `pnpm@10.33.0`. Provide MongoDB and configure the integrations you want to exercise. Start from the repository root.

```bash
git clone https://github.com/Zebishah/DrivePilot.git
cd DrivePilot/server
cp .env.example .env
pnpm install --frozen-lockfile
```

The backend example targets hosted deployment. For local development set `NODE_ENV=development`, `PORT=4000`, `FRONTEND_URL=http://localhost:5173`, your `MONGODB_URI`, and a strong `JWT_SECRET`. Use Stripe test keys. Set `EMAIL_ENABLED=false` until a verified sender is configured. Set `EMAIL_FROM_NAME=Drive Pilot` when enabling email. Keep secrets in `server/.env`.

```bash
# From DrivePilot/server/
pnpm dev
```

In a second terminal:

```bash
# From the repository root
cd Frontend
cp .env.example .env
pnpm install --frozen-lockfile
```

Set `VITE_API_URL=http://localhost:4000`, `VITE_APP_BACKEND_URL=http://localhost:4000/graphql`, and `VITE_APP_AUTH_URL=http://localhost:4000/`. Configure the public cookie-obfuscation value and Stripe test publishable key from the example. Every `VITE_*` setting is public browser configuration.

```bash
# From DrivePilot/Frontend/
pnpm dev:frontend
```

The UI is available at `http://localhost:5173`, with GraphQL at `http://localhost:4000/graphql`. Configure worker processes and their schedules explicitly when exercising asynchronous payments or notifications; production supports `start:api` and `start:worker` separately.

## Verification

```bash
# From DrivePilot/server/
pnpm test
pnpm run test:financial

# From DrivePilot/Frontend/
pnpm run type-check
pnpm run build
```

The backend suite includes payment reliability, webhook durability, booking guards, cache behavior, authentication, and email delivery tests. External integrations require their own configured sandbox smoke checks.

## Deployment and configuration

Use [the backend environment template](server/.env.example), [frontend environment template](Frontend/.env.example), and [documentation](docs/README.md). Keep cloud credentials, private documents, provider keys, and demo passwords server-side. Use approved synthetic records for demonstrations.

The product name is **Drive Pilot**. Existing `dsp-*` CSS selectors, asset paths, and integration identifiers remain compatible with the existing implementation.
