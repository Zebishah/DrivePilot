# DSP Marketplace Deployment

This guide describes the deployment shape prepared in the
`portfolio-hardening` branch. Replace angle-bracket placeholders in the
hosting consoles only. No credential belongs in this repository.

The application is intentionally deployed as two Node processes:

| Component | Provider | Root | Start command | HTTP |
| --- | --- | --- | --- | --- |
| Frontend | Vercel | `Frontend` | `pnpm run build` | Static SPA |
| API | Render Web Service | `server` | `pnpm run start:api` | Yes |
| Worker | Render Background Worker | `server` | `pnpm run start:worker` | No |

The worker is required for durable Stripe inbox processing, reconciliation,
T-48 charging, payouts, reminders, cleanup, and the Elastic Email outbox. Render's
free service types do not include background workers, so a persistent
worker-capable paid service/plan is required for the complete deployment.
See [Render background workers](https://render.com/docs/background-workers)
and [Render free deployment limitations](https://render.com/docs/free).

## Package manager and branch

- Repository: `Zebishah/dsp-marketplace`
- Branch: `portfolio-hardening`
- Package manager: pnpm `10.33.0`
- Node.js: 22
- Canonical lockfiles: `Frontend/pnpm-lock.yaml` and `server/pnpm-lock.yaml`
- Install command: `pnpm install --frozen-lockfile`

The npm lockfiles remain as historical compatibility files. Vercel, Render,
and CI must use pnpm and the pnpm lockfiles so installs are deterministic.

## 1. Vercel frontend

Create a Vercel project from the repository and select branch
`portfolio-hardening`.

- Root Directory: `Frontend`
- Framework preset: Vite (or Other)
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm run build`
- Output directory: `dist`
- Node.js: 22

`Frontend/vercel.json` provides the minimal SPA fallback so direct refreshes
of student, instructor, admin, payment, and auth routes resolve to
`index.html`. Static assets retain their normal Vercel handling.

Set these public variables in Vercel. They are bundled into browser assets;
they must never contain backend secrets:

```text
VITE_API_URL=https://<render-api-service>.onrender.com
VITE_APP_BACKEND_URL=https://<render-api-service>.onrender.com/graphql
VITE_APP_AUTH_URL=https://<render-api-service>.onrender.com/
VITE_APP_ENCRYPTION_KEY=<stable-client-compatible-key>
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_<test-publishable-key>
VITE_SLOT_TIMEZONE=Europe/Zurich
```

`VITE_APP_AUTH_URL` needs its trailing slash because the current auth links
append `auth/google` and `auth/facebook`. Socket.IO also uses this URL. The
currently present `VITE_APP_BACKEND_WS_URL` is not read by application code.

Never add `STRIPE_SECRET_KEY`, `JWT_SECRET`, `MONGODB_URI`, `REDIS_URL`,
`ELASTIC_EMAIL_API_KEY`, `GEMINI_API_KEY`, `AWS_SECRET_ACCESS_KEY`, or
`GOOGLE_CLIENT_SECRET` to Vercel.

## 2. Render API web service

Create a Render **Web Service** from the same repository and branch.

- Root Directory: `server`
- Runtime: Node
- Build command: `corepack enable && pnpm install --frozen-lockfile`
- Start command: `pnpm run start:api`
- Health check path: `/health`
- Readiness path for manual verification: `/ready`

The API command explicitly sets `RUN_API=true` and `RUN_WORKER=false`. It
binds the Render-provided `PORT` through Node's HTTP server and exposes:

- `GET /health`: process liveness
- `GET /ready`: MongoDB and Apollo/API initialization readiness
- `POST /webhooks/stripe`: Stripe raw-body webhook ingress
- `POST /graphql`: Apollo GraphQL API
- `POST /api/v1/assistant/chat`: authenticated assistant API
- `/auth/google` and `/auth/google/callback`
- `/auth/facebook` and `/auth/facebook/callback`
- Socket.IO on the API origin

### Manual demo-user seed

`pnpm run seed:demo-users` is a manual maintenance command. It connects to
MongoDB, creates the configured demo Admin, Instructor, and Student only when
their exact email addresses do not already exist, and then closes the
connection. It must never be added to API or worker startup commands and must
not run automatically during deployment. Demo credentials belong only in the
hosting environment or a local untracked `.env`; never commit them to the
repository.

### API production environment

Required by the current production startup validation:

```text
NODE_ENV=production
MONGODB_URI=<MongoDB-Atlas-URI>
JWT_SECRET=<random-secret-at-least-32-characters>
FRONTEND_URL=https://<vercel-project>.vercel.app
STRIPE_SECRET_KEY=sk_test_<test-secret>
STRIPE_WEBHOOK_SECRET=whsec_<test-webhook-signing-secret>
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
AWS_ACCESS_KEY_ID=<s3-access-key-id>
AWS_SECRET_ACCESS_KEY=<s3-secret-access-key>
AWS_REGION=<s3-region>
BUCKET_NAME=<private-bucket-name>
SLOT_TIMEZONE=Europe/Zurich
RUN_API=true
RUN_WORKER=false
```

Required when the corresponding optional integration is enabled:

```text
EMAIL_ENABLED=true
EMAIL_PROVIDER=elasticemail
ELASTIC_EMAIL_API_KEY=<elastic-email-api-key>
EMAIL_FROM=DSP Marketplace <sender@verified-domain.example>
EMAIL_MODE=test
EMAIL_TEST_RECIPIENT=<test-recipient>
EMAIL_REQUEST_TIMEOUT_MS=10000

AI_ENABLED=true
AI_MODE=live
AI_PROVIDER=gemini
GEMINI_API_KEY=<gemini-api-key>
GEMINI_MODEL=gemini-3.1-flash-lite
```

When `EMAIL_MODE=production`, omit `EMAIL_TEST_RECIPIENT` only after Elastic
Email has a verified sending domain. Until then, `EMAIL_MODE=test` routes the
provider call to `EMAIL_TEST_RECIPIENT` and must not send to arbitrary users.

Optional API cache settings:

```text
CACHE_ENABLED=true
REDIS_URL=rediss://default:<password>@<upstash-endpoint>:6379
CACHE_KEY_PREFIX=dsp
CACHE_SCHEMA_VERSION=v1
CACHE_DEFAULT_TTL_SECONDS=300
```

If Redis is unavailable, the current client falls back to MongoDB-backed
behavior; Redis is not the booking, financial, outbox, or job authority.

The worker tuning variables in `server/.env.example` are optional for the API
and should be set on the worker. The API must not receive `RUN_WORKER=true`.

## 3. Render worker

Create a Render **Background Worker**, not a Web Service, from the same
repository and branch.

- Root Directory: `server`
- Runtime: Node
- Build command: `corepack enable && pnpm install --frozen-lockfile`
- Start command: `pnpm run start:worker`
- Health URL: none; background workers do not receive HTTP traffic

The worker command explicitly sets `RUN_API=false` and `RUN_WORKER=true`. The
existing process starts the Mongo connection, optional Redis cache, and the
MongoDB-lease-based scheduler. It does not bind the API, GraphQL, webhook
HTTP endpoint, or Socket.IO.

### Worker environment

Required:

```text
NODE_ENV=production
MONGODB_URI=<MongoDB-Atlas-URI>
STRIPE_SECRET_KEY=sk_test_<test-secret>
FRONTEND_URL=https://<vercel-project>.vercel.app
SLOT_TIMEZONE=Europe/Zurich
RUN_API=false
RUN_WORKER=true
EMAIL_ENABLED=true
EMAIL_PROVIDER=elasticemail
ELASTIC_EMAIL_API_KEY=<elastic-email-api-key>
EMAIL_FROM=DSP Marketplace <sender@verified-domain.example>
EMAIL_MODE=test
EMAIL_TEST_RECIPIENT=<test-recipient>
```

The worker does not need Google OAuth, Facebook OAuth, JWT, S3 credentials,
`STRIPE_WEBHOOK_SECRET`, or Gemini credentials for its current job paths.
Set `AI_ENABLED=false` on the worker to make that intent explicit. Add Redis
settings if the optional shared cache is desired. Add the job, webhook
processor, reconciliation, and outbox tuning values from
`server/.env.example` when non-default timing is required.

The scheduler uses `JobExecution` and MongoDB leases. It is safe to run one
worker service with multiple process instances, but one instance is the
appropriate starting deployment for financial jobs. A crash leaves leases to
expire and allows recovery; graceful shutdown stops timers and waits within
the configured shutdown bound.

## 4. MongoDB Atlas

1. Create a database user with access only to the DSP database.
2. Use the Atlas `mongodb+srv://` URI in `MONGODB_URI`.
3. Set the database name explicitly in the URI if it is not the default.
4. Keep TLS enabled; the driver supports the Atlas SRV URI.
5. Configure Atlas Network Access for Render's outbound network according to
   the current Render networking option. For a portfolio deployment where
   fixed outbound IPs are unavailable, use the narrowest Atlas setting that
   permits the service and understand that `0.0.0.0/0` is a last-resort
   exposure requiring strong database credentials and monitoring.
6. Verify `/ready` after deployment; it is only ready after MongoDB and the
   API initialization complete.

Do not run automatic index deletion or duplicate cleanup during deployment.
Mongoose models define the Phase 7/9 indexes, but index inspection and the
manual money backfill remain explicit operator actions.

## 5. Upstash Redis

Use the existing Upstash Redis endpoint with its TLS `rediss://` URL. Put the
URL only in Render environment variables. `CACHE_ENABLED=true` enables the
optional read cache; Redis remains cache-only and is not a queue, lock
authority, ledger, outbox, or booking source of truth.

Safe verification is an opt-in `PING` from a controlled operator shell. Do
not print the URL or credentials. API startup does not fail when Redis is
temporarily unavailable.

## 6. Elastic Email

The application uses the Elastic Email v4 HTTPS API through the durable MongoDB outbox;
SMTP is not used or reintroduced.

- `EMAIL_PROVIDER=elasticemail`
- `EMAIL_ENABLED=true`
- `ELASTIC_EMAIL_API_KEY` is stored only in Render and must have the `SendHttp` access level
- `EMAIL_MODE=test` sends only to `EMAIL_TEST_RECIPIENT`
- `EMAIL_FROM` must match an allowed Elastic Email sender

Use a verified sender/domain before switching to `EMAIL_MODE=production`. The worker
is the process that delivers the outbox; the API enqueues events.

### Elastic Email environment placement

When the API runs on Render and the worker runs on Northflank, configure the
server-side email variables on both services because startup validation covers
the process environment:

- Render API: `EMAIL_PROVIDER`, `EMAIL_ENABLED`, `EMAIL_MODE`, `ELASTIC_EMAIL_API_KEY`, `EMAIL_FROM`, and `EMAIL_TEST_RECIPIENT` in test mode. Keep `RUN_API=true` and `RUN_WORKER=false`.
- Northflank worker: the same email variables, with `RUN_API=false` and `RUN_WORKER=true`. This is the only process that calls Elastic Email; it also needs the MongoDB URI and the worker’s normal job configuration.
- Vercel: never add `ELASTIC_EMAIL_API_KEY` or any other server-side email secret. Vercel receives only the public `VITE_*` frontend variables.

The Render API and Northflank worker must use the same MongoDB database so the
API’s outbox events are visible to the worker. Do not put SMTP credentials or
an Elastic Email key in frontend build variables.

## 7. AWS S3

Use the existing private bucket with Block Public Access enabled and ACLs
disabled. The IAM principal should be scoped to the one bucket and only the
operations actually needed by the current code:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:PutObject"],
    "Resource": "arn:aws:s3:::<private-bucket-name>/*"
  }]
}
```

The current GraphQL upload resolver validates file type/size, authorizes the
target, sanitizes the object key, and returns a presigned `PUT` URL. It also
returns a canonical bucket-style `fileUrl`. GraphQL document fields now
translate that stored URL into a short-lived signed `GET` URL for authorized
document queries and refund attachments. Keep the bucket private; do not turn
it public to hide this limitation.

For browser upload, configure S3 CORS with only the actual origins and
methods:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:5173",
      "https://<vercel-project>.vercel.app"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 300
  }
]
```

Do not add `DELETE` unless browser-side signed deletion is implemented.

## 8. Stripe TEST MODE

Use only `sk_test_...` and `pk_test_...` keys. The startup guard rejects a
non-test secret key when `NODE_ENV=production`.

Create one Stripe test-mode webhook endpoint:

```text
https://<render-api-service>.onrender.com/webhooks/stripe
```

The route is mounted before JSON parsing, verifies the raw body signature,
stores a durable `StripeWebhookEvent`, and returns the receipt response. The
worker processes the durable inbox. Subscribe only to events handled by the
current code:

```text
account.updated
account.application.deauthorized
charge.dispute.created
charge.dispute.closed
payout.failed
payout.paid
checkout.session.completed
payment_intent.succeeded
payment_intent.payment_failed
payment_intent.requires_action
setup_intent.succeeded
charge.refunded
charge.succeeded (connected-account events)
refund.created
refund.updated
transfer.reversed
```

Do not perform live payments, refunds, reversals, payouts, or destructive
provider tests during deployment verification.

### Stripe Connect URLs

The current Connect account-link implementation derives these from
`FRONTEND_URL`:

```text
Refresh URL: https://<vercel-project>.vercel.app/payment/refresh
Return URL:  https://<vercel-project>.vercel.app/payment/complete
```

The current implementation uses Express connected accounts and does not read
`STRIPE_CLIENT_ID`. No Connect OAuth client ID is required by this code path.

## 9. Google OAuth

In Google Cloud Console configure:

```text
Authorized JavaScript origin:
https://<vercel-project>.vercel.app

Authorized redirect URI:
https://<render-api-service>.onrender.com/auth/google/callback
```

The backend callback signs the user payload with `JWT_SECRET` and redirects
to:

```text
https://<vercel-project>.vercel.app/auth/auth-success?token=<encoded-token>
```

Facebook routes remain in the codebase but are optional; configure their
credentials and provider console separately only if they are enabled.

## 10. CORS and Socket.IO

Production backend CORS allows the exact `FRONTEND_URL` origin and does not
allow `*`. Development additionally allows `http://localhost:5173`. Cookies
and credentialed requests remain enabled.

The browser's Socket.IO URL is `VITE_APP_AUTH_URL`, pointing to the Render
API origin. Render must permit WebSocket upgrades for the API service; the
client retains polling fallback. The backend uses the same exact origin list
for Socket.IO and verifies JWTs before connection and booking-room access.

The API sets `trust proxy` to one Render proxy hop for rate limiting and
request handling. Do not replace this with unrestricted proxy trust.

## 11. Health, readiness, and shutdown

```bash
curl --fail --silent https://<render-api-service>.onrender.com/health
curl --fail --silent https://<render-api-service>.onrender.com/ready
```

`/health` means the API process is serving. `/ready` requires an open MongoDB
connection and completed Apollo initialization. Redis is intentionally not a
readiness dependency.

On `SIGTERM` or `SIGINT`, the API stops new HTTP work, stops Apollo, closes
HTTP/Socket.IO, disconnects MongoDB, and closes Redis. The worker stops the
scheduler, waits up to `JOB_SHUTDOWN_TIMEOUT_MS` for active jobs, then closes
MongoDB/Redis. MongoDB leases provide crash recovery; no duplicate scheduler
should be started in the API service.

## 12. CI

`.github/workflows/portfolio-hardening-ci.yml` runs on pushes and pull
requests targeting `portfolio-hardening`.

- Backend: frozen pnpm install, full tests, financial suite, GraphQL
  composition, and JavaScript syntax checks.
- Frontend: frozen pnpm install, existing utility tests, strict type-check,
  and production build.

The workflow requires no Stripe, Elastic Email, AWS, Gemini, Google, Redis, or
MongoDB secrets. It does not run real external-provider operations.

The syntax gate intentionally excludes the unreferenced
`server/src/utils/GetRequiredSlotsLesson.js`, which contains ESM `export`
syntax inside the CommonJS server package. It is existing dead structural
debt and is not part of the deployment runtime.

The known full frontend lint baseline remains 283 errors and 19 warnings.
Lint is intentionally not made a deployment gate until the legacy debt is
addressed in a separate phase.

The read-only `pnpm audit --prod` check on 2026-09-13 reported 1 critical,
21 high, 29 moderate, and 1 low advisory for the frontend, plus 8 high, 15
moderate, and 3 low advisories for the backend. The findings include
transitive/runtime issues in Socket.IO, Axios, Mongoose, `ws`, and other
packages, as well as unpatched major-version constraints in Apollo Server,
AWS SDK v2, Quill, and Swiper. No dependency upgrade or `audit fix` was run;
these advisories must be triaged before claiming production readiness.

## 13. Manual money/index operations

Money backfill is never part of Render startup. Run it only after a backup,
review, and explicit operator approval from the server root:

```bash
node src/scripts/backfillMoneyMinor.js
node src/scripts/backfillMoneyMinor.js --apply
```

The first command is the dry-run/default inspection path; the second applies
changes. Do not auto-delete historical duplicates or indexes.

## 14. Opt-in provider diagnostics

These checks are intentionally manual and must be run from a controlled shell
with the relevant environment loaded. They are not CI or startup actions.

- MongoDB: connect with the configured URI, issue a `ping`, then disconnect.
- Redis: issue `PING` against the Upstash TLS endpoint, then close the client.
- S3: use a uniquely prefixed small test object, `PutObject`, `GetObject`, and
  `DeleteObject` only when explicitly authorized.
- Elastic Email: send exactly one message to `EMAIL_TEST_RECIPIENT` with
  `EMAIL_MODE=test`.
- Gemini: issue one bounded prompt using configured timeouts and limits.
- Stripe: retrieve the test account or another read-only test-mode resource.
- Google OAuth: complete a manual browser login with a dedicated test user.

Never include provider credentials in command output or issue a real payment,
refund, payout, or transfer reversal as a diagnostic.

## 15. Exact deployment order

1. Confirm the branch and clean worktree.
2. Create/configure MongoDB Atlas and verify the database user/network policy.
3. Configure the private S3 bucket, IAM policy, and CORS.
4. Configure Upstash Redis and Elastic Email test mode.
5. Create the Render API service and set API variables.
6. Deploy the API and verify `/health` and `/ready`.
7. Create the Render background worker on a worker-capable plan and set the
   worker variables.
8. Deploy the worker and confirm startup/scheduler logs and `JobExecution`
   updates.
9. Create the Vercel project and set public frontend variables.
10. Deploy the frontend and verify direct route refreshes/lazy chunks.
11. Add the production frontend origin and callback URLs to Google Cloud,
    Stripe, and S3 CORS.
12. Run the smoke-test sequence below with Stripe test data only.

## 16. Post-deployment smoke test

1. Open the Vercel home page and refresh a student, instructor, admin,
   payment, and auth route directly.
2. Check `/health` and `/ready`.
3. Sign in with a test account and complete Google OAuth with a test user.
4. Verify Redis-backed reads and then verify the app still functions with
   Redis unavailable.
5. Verify an authorized S3 upload and open the returned document from an
   authorized document screen; confirm the private bucket denies unsigned
   object URLs.
6. Verify one assistant response and one bounded fallback scenario.
7. Send one Elastic Email test-mode message to the test recipient.
8. Create a Stripe test-mode booking/payment, confirm the webhook receipt,
   and verify the worker processes the durable event.
9. Confirm worker logs show scheduler initialization and inspect
   `JobExecution` records.

Deployment is complete only after the operator has performed these console
and provider steps. Preparing this repository does not deploy services or
create external resources.
