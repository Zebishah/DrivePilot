# Drive Pilot Deployment

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
T-48 charging, payouts, reminders, cleanup, and the Resend outbox. Render's
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
`RESEND_API_KEY`, `GEMINI_API_KEY`, `AWS_SECRET_ACCESS_KEY`, or
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

- `GET /`: public JSON success response for uptime monitoring; `HEAD /` is also supported
- `GET /health`: process liveness
- `GET /ready`: MongoDB and Apollo/API initialization readiness
- `POST /webhooks/stripe`: Stripe raw-body webhook ingress
- `POST /graphql`: Apollo GraphQL API
- `POST /api/v1/assistant/chat`: authenticated assistant API
- `POST /api/v1/assistant/public/chat`: rate-limited guest product guide; no account access or tools. Uses live AI when configured, otherwise returns labeled product guidance.
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
STRIPE_CONNECT_WEBHOOK_ENABLED=true
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_<test-connect-webhook-signing-secret>
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
EMAIL_PROVIDER=resend
RESEND_API_KEY=<resend-api-key>
EMAIL_FROM_ADDRESS=<verified-sender-address>
EMAIL_FROM_NAME=Drive Pilot
EMAIL_REPLY_TO=<optional-reply-address>
EMAIL_MODE=test
EMAIL_TEST_RECIPIENT=<test-recipient>
EMAIL_REQUEST_TIMEOUT_MS=10000

AI_ENABLED=true
AI_MODE=live
AI_PROVIDER=gemini
GEMINI_API_KEY=<gemini-api-key>
GEMINI_MODEL=gemini-3.1-flash-lite
```

When `EMAIL_MODE=production`, omit `EMAIL_TEST_RECIPIENT` only after the
configured Resend sender has been intentionally verified and delivery has
been tested. Until then, `EMAIL_MODE=test` routes the provider call to
`EMAIL_TEST_RECIPIENT` and must not send to arbitrary users.

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
EMAIL_PROVIDER=resend
RESEND_API_KEY=<resend-api-key>
EMAIL_FROM_ADDRESS=<verified-sender-address>
EMAIL_FROM_NAME=Drive Pilot
EMAIL_REPLY_TO=<optional-reply-address>
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

1. Create a database user with access only to the Drive Pilot database.
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

## 6. Resend email delivery

The backend uses the Resend HTTPS API and the durable MongoDB email outbox.
SMTP is not used.

- Set `EMAIL_PROVIDER=resend` and `EMAIL_ENABLED=true`.
- Store `RESEND_API_KEY` only in Render / worker backend secrets.
- `EMAIL_MODE=test` sends all messages to `EMAIL_TEST_RECIPIENT`.
- Set `EMAIL_FROM_ADDRESS` to an authorized sender on a domain verified in Resend; `EMAIL_FROM_NAME` defaults to `Drive Pilot`.
- After verifying delivery and the domain, change to `EMAIL_MODE=production` to deliver to real users.

### Backend environment placement

Set the email variables on every process with `EMAIL_ENABLED=true`. The API enqueues events; the running worker delivers them. For a separate worker (for example on Northflank), configure the same Resend key, sender, mode, and test recipient. The API and worker must share the same MongoDB database.

- Render API: `RUN_API=true`, `RUN_WORKER=false`, and the Resend env variables if email is enabled.
- Worker: `RUN_API=false`, `RUN_WORKER=true`, and the same Resend env variables.
- Vercel: never expose `RESEND_API_KEY`; frontend only receives public `VITE_*` variables.

Resend's `Idempotency-Key` is derived from each durable outbox event ID, with a provider deduplication window of 24 hours. Keep the local outbox and retries. See [EMAIL_DELIVERY.md](EMAIL_DELIVERY.md).

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

Create a second test-mode destination for connected-account events:

```text
https://<render-api-service>.onrender.com/webhooks/stripe/connect
```

Store its signing secret as `STRIPE_CONNECT_WEBHOOK_SECRET`. The platform and
Connect routes verify independently, then write to the same durable webhook
inbox. The worker performs all business processing. Configure the Connect
destination for connected-account v1 snapshot events and Accounts v2 thin
events, including `v2.core.account.created`,
`v2.core.account.updated`, and
`v2.core.account[requirements].updated`.

The route is mounted before JSON parsing, verifies the raw body signature,
stores a durable `StripeWebhookEvent`, and returns the receipt response. The
worker processes the durable inbox. Subscribe only to events handled by the
current code:

```text
account.updated
account.application.deauthorized
v2.core.account.created
v2.core.account.updated
v2.core.account[configuration.recipient].updated
v2.core.account[requirements].updated
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

New instructor accounts use Stripe Accounts v2 with the recipient
configuration and Express Dashboard. The current destination-charge payment
flow is unchanged. Existing v1 Express accounts are detected from their
stored account version and continue using the v1-compatible lifecycle calls;
they are never recreated.

The Connect account-link implementation derives these from `FRONTEND_URL`:

```text
Refresh URL: https://<vercel-project>.vercel.app/payment/refresh
Return URL:  https://<vercel-project>.vercel.app/payment/complete
```

The current implementation uses Express connected accounts and does not read
`STRIPE_CLIENT_ID`. No Connect OAuth client ID is required by this code path.

Accounts v2 uses the v2 Account Links API for onboarding and the Balance
Settings API to set manual payouts. The Payouts API, destination charges,
transfers, refunds, and transfer reversals remain v1 APIs because Stripe
supports those endpoints for v2 account IDs and the existing financial
semantics are preserved. Express Dashboard login links continue using the
supported v1 login-link endpoint.

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

### UptimeRobot monitor

After deploying the API change, create an HTTP(s) monitor in UptimeRobot:

| Setting | Value |
| --- | --- |
| Friendly name | `Drive Pilot API` |
| URL | `https://<render-api-service>.onrender.com/` (the backend origin, not the frontend or `/graphql`) |
| HTTP method | `GET` if configurable; the default `HEAD` also works |
| Monitoring interval | 5 minutes |
| Request timeout | 60 seconds, to allow for cold starts |
| Up HTTP status codes | `200` if configurable |
| Authentication, request body, custom headers | None |
| Alerts | Select your verified alert contact |

The root returns HTTP 200 with:

```json
{"success":true,"status":"ok","message":"Drive Pilot API is running."}
```

It sets `Cache-Control: no-store`, requires no sign-in, and does not query
MongoDB, Redis, Stripe, or the AI provider. It checks whether the API is serving
requests. Use `/ready` for a separate monitor if database/API readiness matters.

The existing handover notes list `https://dsp-cloud.onrender.com` as a backend
origin. Use `https://dsp-cloud.onrender.com/` only if that is still your deployed
API; otherwise copy the current public URL from your Render web service.

[UptimeRobot's free plan](https://help.uptimerobot.com/en/articles/11604710-who-should-use-uptimerobot-s-free-plan)
supports five-minute checks. See its [monitor setup guide](https://help.uptimerobot.com/en/articles/11358364-how-to-create-your-first-monitor-on-uptimerobot-quick-setup-guide)
and [advanced settings](https://help.uptimerobot.com/en/articles/11360863-uptimerobot-advanced-settings-customize-your-monitor-configuration).
[Render Free](https://render.com/docs/free) services spin down after 15 minutes
without inbound traffic. Five-minute HTTP checks can keep requests arriving,
but they do not guarantee uninterrupted hosting: monthly free-instance hours
are shared across the workspace, and free services can restart. For an
always-running service without idle spin-down, use a paid Render instance.
Monitoring the API does not keep a separate worker running.

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

The workflow requires no Stripe, Resend, AWS, Gemini, Google, Redis, or
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
- Resend: send exactly one message to `EMAIL_TEST_RECIPIENT` with
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
4. Configure Upstash Redis and Resend test mode.
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
7. Send one Resend test-mode message to the test recipient.
8. Create a Stripe test-mode booking/payment, confirm the webhook receipt,
   and verify the worker processes the durable event.
9. Confirm worker logs show scheduler initialization and inspect
   `JobExecution` records.

Deployment is complete only after the operator has performed these console
and provider steps. Preparing this repository does not deploy services or
create external resources.
