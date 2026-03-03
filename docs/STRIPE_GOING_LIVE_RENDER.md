# Going Live: Stripe Keys & Webhooks (Test vs Live)

When you deploy your project to **Render** (or any live host), you **must not** use the same Stripe setup as localhost. Here’s what works where and what to change.

---

## 1. Test (sandbox) vs Live – quick answer

| Item | Localhost (development) | Live (e.g. Render) |
|------|-------------------------|---------------------|
| **Stripe mode** | **Test mode** (sandbox) | **Live mode** |
| **Publishable key** | `pk_test_...` | `pk_live_...` |
| **Secret key** | `sk_test_...` | `sk_live_...` |
| **Webhook secret** | From **Stripe CLI** (`stripe listen`) | From **Stripe Dashboard** (webhook endpoint for your live URL) |
| **Webhook URL** | Stripe CLI forwards to `http://localhost:4000/webhooks/stripe` | Your live URL, e.g. `https://your-api.onrender.com/webhooks/stripe` |
| **Real money?** | No – test cards only | Yes – real charges |

**So:**
- **Test credentials (sandbox)** will “run” on Render (app won’t crash), but they only process **test** payments. No real money. Customers cannot pay with real cards.
- For **live** you must use **live** API keys and a **live** webhook endpoint. The **webhook secret from Stripe CLI will not work** for live; it is only for CLI-forwarded events to localhost.

---

## 2. What each key/secret is for

### Publishable key (frontend)

- **Test:** `pk_test_...` – from Stripe Dashboard → **Developers → API keys** (with “Test mode” toggled **on**).
- **Live:** `pk_live_...` – same place, with “Test mode” toggled **off**.
- **Where used:** Frontend (e.g. `VITE_STRIPE_PUBLISHABLE_KEY`). Used by Stripe.js / Checkout on the client. No real charges in test mode.

### Secret key (backend)

- **Test:** `sk_test_...` – from same API keys page (test mode on). **Never** put this in frontend or public repo.
- **Live:** `sk_live_...` – same page (test mode off).
- **Where used:** Backend only (`STRIPE_SECRET_KEY`). Used for creating Checkout sessions, PaymentIntents, Connect accounts, etc.

### Webhook signing secret

- **Localhost:** You run `stripe listen --forward-to http://localhost:4000/webhooks/stripe`. The CLI gives you a **temporary** secret like `whsec_...`. You put it in `STRIPE_WEBHOOK_SECRET`. This secret is **only** for events the CLI forwards to your local server. It **does not** work for events Stripe sends to a live URL.
- **Live:** You create a **Webhook endpoint** in Stripe Dashboard (see below) with your **live** URL. Stripe shows a **different** signing secret for that endpoint. You put **that** secret in `STRIPE_WEBHOOK_SECRET` on Render. The CLI secret must **not** be used in production.

---

## 3. Will test (sandbox) credentials “run” on Render?

**Yes, they will run** in the sense that:

- The server and frontend will start.
- Stripe API calls will succeed (in test mode).
- Checkout will open; **test cards** (e.g. 4242 4242 4242 4242) will work.

**But:**

- **No real money** is charged. Real cards will be declined or not accepted depending on how you’ve set things up.
- The **Stripe CLI webhook secret** is only valid for the CLI forwarding to localhost. Once you deploy to Render, Stripe sends webhooks **directly** to your live URL. Those events are signed with the **live endpoint’s** secret. If you keep using the CLI secret on Render, **webhook signature verification will fail** and events (e.g. `payment_intent.succeeded`, `checkout.session.completed`) will not be accepted by your app.

So for a **real** live site where customers pay with real cards:

1. Use **live** publishable and secret keys on Render.
2. Create a **live** webhook endpoint in Stripe and use **that** endpoint’s signing secret on Render.
3. Do **not** use the Stripe CLI webhook secret on Render.

---

## 4. What to do for live on Render

### Step 1: Get live API keys

1. Open [Stripe Dashboard](https://dashboard.stripe.com).
2. **Turn off “Test mode”** (toggle in the top right).
3. Go to **Developers → API keys**.
4. Copy:
   - **Publishable key** (`pk_live_...`)
   - **Secret key** (`sk_live_...`) – keep this secret; use only in backend env.

### Step 2: Create a live webhook endpoint

1. In Stripe Dashboard (still in **live** mode), go to **Developers → Webhooks**.
2. Click **Add endpoint**.
3. **Endpoint URL:** your live backend URL + `/webhooks/stripe`  
   Example: `https://your-backend.onrender.com/webhooks/stripe`  
   (Use the real URL Render gives your server.)
4. **Events to send:** either “Select events” and add at least:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `account.updated`
   - `account.application.deauthorized`
   - `charge.dispute.created`
   - `charge.dispute.closed`
   - `payout.failed`
   - `payout.paid`  
   Or choose “Receive all events” if you prefer.
5. Create the endpoint. Stripe will show **Signing secret** (`whsec_...`). Copy it.

### Step 3: Set environment variables on Render

In Render, set these for your **backend** service (e.g. Node server):

- `STRIPE_SECRET_KEY` = `sk_live_...` (from Step 1)
- `STRIPE_WEBHOOK_SECRET` = `whsec_...` (from Step 2 – **the one for the live endpoint**, not from Stripe CLI)

Also set any other env vars your app needs (e.g. `Frontend_URL` / `FRONTEND_URL` to your live frontend URL for Stripe redirects).

For your **frontend** (if it’s a separate service on Render):

- `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_live_...` (from Step 1)

Redeploy after changing env vars so they take effect.

### Step 4: Frontend URL for Stripe redirects

Your backend uses `FRONTEND_URL` (or `Frontend_URL`) when building Stripe Checkout success/cancel URLs and return URLs. On Render, set this to your **live** frontend URL (e.g. `https://your-app.onrender.com`) so after payment users are sent back to your live site.

---

## 5. Summary table

| Variable | Localhost (dev) | Live (Render) |
|----------|------------------|---------------|
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | From `stripe listen` (CLI) | From Dashboard webhook for `https://your-api.onrender.com/webhooks/stripe` |
| `VITE_STRIPE_PUBLISHABLE_KEY` (frontend) | `pk_test_...` | `pk_live_...` |
| `FRONTEND_URL` (backend) | `http://localhost:5173` (or your dev URL) | `https://your-app.onrender.com` |

---

## 6. Important points

1. **Stripe CLI webhook secret** is for **localhost only**. Do not use it as `STRIPE_WEBHOOK_SECRET` on Render.
2. **Test keys** work on Render but only for test payments. For real payments use **live** keys and a **live** webhook endpoint.
3. **One webhook endpoint per URL.** Your live endpoint has its own signing secret; that’s the one your live backend must use.
4. After changing keys or webhook secret, **restart/redeploy** the backend so it reads the new env.
5. Keep **live** secret keys and webhook secrets only in Render (or your host) env; never commit them to the repo.

Once you switch to live keys and the live webhook endpoint on Render, real payments will work and webhooks will verify correctly.
