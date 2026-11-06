# Stripe Phase 2 – Files Changed & How the Code Works

This document lists **every file** that was changed for the Stripe T-48 / instant vs deferred payment flow and explains **what each file does** so you can follow the full flow in your codebase.

---

## High-level flow (what happens in the code)

1. **Student clicks “Pay” on booking** → Frontend calls `createBookingCheckoutSession`.
2. **Backend decides instant vs deferred** using the 48h rule → Creates either a **payment** or **setup** Stripe Checkout session.
3. **Student is redirected to Stripe** → Pays now (instant) or only saves card (deferred).
4. **Stripe redirects back** with `?checkout=success` or `?checkout=setup_success` and `session_id`.
5. **Frontend** calls either `completeBookingFromCheckout` (instant) or `completeDeferredBookingFromCheckout` (deferred).
6. **For deferred bookings**, a **scheduled job (T-48)** runs every 5 minutes and charges each slot when “lesson start − 48 hours” has passed.
7. **Emails** can be sent when T-48 charge needs 3DS (`payment_requires_action`) or fails (`payment_failed`).

---

## Multi-slot booking: how payment works (instant vs T-48)

When a student books **multiple slots at once** (e.g. 3 lessons), payment is handled as follows.

### Instant payment (pay now – gap ≤ 48h)

- **One charge for the whole booking**
  - One Stripe **Checkout Session** (mode `payment`) is created with the **total amount** (e.g. 3 × CHF 90 = CHF 270).
  - Stripe creates a single **PaymentIntent** for that session and charges the full amount once.
- **After payment**
  - Frontend calls `completeBookingFromCheckout(sessionId)`, which:
    - Sets `booking.stripePaymentIntentId` to that one PaymentIntent ID.
    - Marks **all slots** in the booking as `paymentStatus: "paid"` and sets per-slot `chargeAmount`, `dspCommission`, `instructorAmount`.
  - Slots do **not** get their own `paymentIntentId`; the booking has one `stripePaymentIntentId` for the entire payment.

So: **multiple slots → one payment, one PaymentIntent, all slots marked paid together.**

### Deferred payment (save card – gap > 48h, charge at T-48)

- **At checkout**
  - One Stripe **Checkout Session** (mode `setup`) is created. **No charge**; only the card is saved.
  - Webhook `checkout.session.completed` (or `completeDeferredBookingFromCheckout`) saves `stripeCustomerId` and `paymentMethod.paymentMethodId` on the booking.
  - **All slots** stay `paymentStatus: "pending_payment"`; none have `paymentIntentId` yet.
- **At T-48 (48 hours before each lesson)**
  - The **T-48 job** (`t48ChargeJob.js`) runs periodically. For each booking that has `pending_payment` slots and a saved payment method:
    - It loops over **each slot** whose start time is within the T-48 window (lesson start − 48h ≤ now).
    - For **each such slot** it creates **one PaymentIntent** with:
      - Amount = **per-slot amount** (e.g. totalAmount / numSlots).
      - Metadata: `bookingId`, `slotId`, `studentId`, `instructorId`.
      - Idempotency key: `t48-{bookingId}-{slotId}` (so the same slot is never charged twice).
    - It charges that PaymentIntent (off-session). If it **succeeds** → slot is updated to `paid` and `slots.$.paymentIntentId` is set. If **requires_action** (3DS) → slot is set to `requires_action` and the student must complete payment (e.g. “Complete payment” in dashboard). If it **fails** → slot is set to `payment_failed` (retries up to max, then stop).
  - Webhook **`payment_intent.succeeded`** finds the slot by `slots.paymentIntentId === pi.id` and marks that slot paid (idempotent).

So: **multiple slots → one card saved at checkout; then one PaymentIntent per slot at T-48, each charged when its lesson is within 48 hours.**

### Summary table

| Scenario              | When payment happens | PaymentIntents               | Where PI ID is stored              |
| --------------------- | -------------------- | ---------------------------- | ---------------------------------- |
| Instant (multi-slot)  | At checkout (one go) | 1 for full booking amount    | `booking.stripePaymentIntentId`    |
| Deferred (multi-slot) | T-48 per slot        | 1 per slot (per-slot amount) | `slot.paymentIntentId` (each slot) |

The “Complete payment” flow (for 3DS or retry after `payment_failed`) uses **per-slot** `getT48ClientSecret(bookingId, slotId)` and `completeT48SlotPayment(paymentIntentId)` because at T-48 each slot has its own PaymentIntent.

---

## Cancel one slot and refund (instant payment: one PI for 3 slots)

When the student paid once for 3 slots (one PaymentIntent), cancelling and refunding **one** slot works as follows.

### 1. Cancel the slot

- **Student or instructor:** `cancelBookingSlot(bookingId, slotId)` — marks that slot as `status: "cancelled"`, `booked: false`, sets `cancellationDate`. Other slots are unchanged. Booking status becomes `semi_cancelled` if some slots remain, or `cancelled` if all are cancelled.
- **Admin:** `cancelBookingAdmin` — same effect (slot cancelled, availability updated).

No refund happens yet; the student must request a refund (or admin approves it).

### 2. Refund that slot only (partial refund)

- **Student:** Calls `requestRefund(bookingId, slotId)`. Allowed only if the slot is **cancelled**, **paid**, and not already refunded/payout not yet done. Creates a **RefundRequest** (pending).
- **Admin:** When approving via `approveRefundRequest(id)` the code:
  1. Uses the **same** PaymentIntent as the whole booking: `booking.stripePaymentIntentId`.
  2. Refunds **only that slot’s amount**: `createRefund({ paymentIntentId, amountCentimes: slot.chargeAmount in centimes })`. Stripe supports **partial refunds** on a single PaymentIntent, so only that slot’s share (e.g. CHF 90) goes back to the student’s card.
  3. Reverses the **instructor’s share for that slot** from the original transfer: `getTransferIdFromPaymentIntent(booking.stripePaymentIntentId)` returns the one Transfer for the original charge; then `createTransferReversal({ transferId, amountCentimes: slot.instructorAmount in centimes })`. Stripe supports **partial transfer reversals**, so only that slot’s instructor share (e.g. CHF 72) is taken back from the instructor’s connected account.
  4. Marks the slot as `status: "refund"`, `paymentStatus: "refunded"`, sets `refundedAt`, and records transactions (student refund, instructor reversal, platform commission reversal).

So: **one PaymentIntent for 3 slots** → cancel one slot → **partial refund** (one slot’s `chargeAmount`) + **partial transfer reversal** (one slot’s `instructorAmount`). The other two slots stay paid; payout for them is unchanged.

### Requirements for this to work

- Each slot must have **per-slot amounts** set when the booking is completed: `chargeAmount`, `instructorAmount`, `dspCommission` (e.g. from `completeBookingFromCheckout` or instant `createBooking`). The refund flow uses `slot.chargeAmount` and `slot.instructorAmount` for the partial refund and reversal.
- Refund is blocked if the instructor has already been **paid out** for that slot (`slot.payoutId` set), because the transfer has already left the platform.

---

## 1. Server – Data model

### `server/src/models/studentBooking.model.js`

**Role:** Defines the booking and slot schema used by all resolvers and jobs.

**Changes for Phase 2:**

- **Slot schema**
  - **`paymentStatus`** enum extended: added `payment_failed` and `requires_action` (in addition to `pending_payment`, `paid`, `refunded`).
  - **`paymentIntentId`** (String): per-slot Stripe PaymentIntent ID, set when T-48 job charges that slot.
  - **`chargedAt`** (Date): when the T-48 charge succeeded for this slot.
- **Booking `paymentMethod`**
  - **`setupIntentId`** (String, optional): stored when the student completed Checkout in **setup** mode (deferred flow); links to the Stripe SetupIntent that saved the card.

**Why it matters:** Deferred bookings are stored with `paymentMethod.paymentMethodId` (and optionally `setupIntentId`). Slots stay `pending_payment` until the T-48 job charges them, then become `paid`, `requires_action`, or `payment_failed`. All of that is persisted in this model.

---

## 2. Server – Stripe API

### `server/src/services/stripeService.js`

**Role:** All direct Stripe API calls for bookings and payouts.

**Changes for Phase 2:**

- **`createPaymentIntentForBooking(opts)`**
  - New option **`offSession`** (default `false`).
  - When `offSession: true`: sets `off_session: true` on the PaymentIntent and does **not** send `return_url` on confirm. Used when the T-48 job charges in the background (no browser).
  - When `offSession: false`: same as before (e.g. in-page or redirect flows with 3DS return URL).

- **`createCheckoutSessionForBooking(opts)`**
  - New option **`mode`**: `"payment"` (default) or `"setup"`.
  - **`mode: "payment"`**: same as before – creates a Checkout Session that collects payment immediately (line items + `payment_intent_data` with `transfer_data` to instructor).
  - **`mode: "setup"`**: creates a Checkout Session that only **saves the card** (no charge): `mode: "setup"`, `payment_method_types: ["card"]`, `setup_intent_data.metadata`. Used for deferred bookings.
  - **Success URL:** For `mode === "setup"` the success URL uses `checkout=setup_success` so the frontend can call `completeDeferredBookingFromCheckout`. For `mode === "payment"` it uses `checkout=success`.

- **`retrieveCheckoutSession(sessionId)`**
  - Now expands both **`payment_intent`** and **`setup_intent`** so the resolver can read either the paid PaymentIntent (instant) or the succeeded SetupIntent (deferred) and its `payment_method`.

**Why it matters:** This is the only place that talks to Stripe for “create session” and “create/confirm PaymentIntent”. The 48h logic lives in the resolver; this file only implements “payment session” vs “setup session” and “on-session” vs “off-session” PaymentIntent.

---

## 3. Server – GraphQL API (resolvers & types)

### `server/src/graphql/resolvers/studentBooking.resolver.js`

**Role:** Implements booking mutations and queries. This is where the 48h rule and instant vs deferred behaviour live.

**Changes for Phase 2:**

- **`createBookingCheckoutSession`**
  - **48h rule:** Computes the **earliest** slot start (`slot.date` + `slot.startTime`) and compares it to “now”.
  - If `earliestSlotStart - now > 48 hours` → **deferred**: calls `createCheckoutSessionForBooking` with **`mode: "setup"`** and returns **`deferred: true`**.
  - If gap ≤ 48 hours → **instant**: calls with **`mode: "payment"`** and returns **`deferred: false`**.
  - **Console:** Logs one line per request: `[createBookingCheckoutSession] Earliest slot: ..., gap X.Xh → DEFERRED (...)` or `INSTANT (...)`.
  - Metadata passed to Stripe always includes `bookingId`, `studentId`, `instructorId`; for setup we still create the booking in DB with status `"pending"` and slots `paymentStatus: "pending_payment"` before redirecting.

- **`completeBookingFromCheckout(sessionId)`**
  - **Guard:** Now requires **`session.mode === "payment"`** and **`session.payment_status === "paid"`**. If the session was actually a setup session (deferred), this returns an error so the frontend must use the other mutation.

- **`completeDeferredBookingFromCheckout(sessionId)`** (new)
  - Loads the Checkout session with **`expand: ["setup_intent"]`** (via `retrieveCheckoutSession`).
  - Ensures **`session.mode === "setup"`** and **`session.setup_intent.status === "succeeded"`**.
  - Reads **`payment_method`** from the SetupIntent (the saved card).
  - Finds the booking by **`session.metadata.bookingId`**, checks the logged-in user is the student.
  - Updates the booking: **`status: "confirmed"`**, **`paymentMethod.paymentMethodId`** = that payment method, **`paymentMethod.setupIntentId`** = SetupIntent id. All slots stay **`paymentStatus: "pending_payment"`**.
  - Does **not** create any PaymentIntent or transactions; that happens later in the T-48 job.
  - Sends “booking created” emails and socket notification like the instant flow.

**Why it matters:** All “should we charge now or later?” and “finalise booking after Stripe” logic is here. The Stripe service only creates sessions and PaymentIntents; this file decides which session type to create and how to complete the booking after redirect.

### `server/src/graphql/typeDefs/studentBooking.typeDefs.js`

**Role:** GraphQL schema for bookings (types and mutations).

**Changes for Phase 2:**

- **`CreateBookingCheckoutPayload`**
  - New field: **`deferred: Boolean`** so the frontend can show different copy or handle redirects differently if needed.
- **Mutation**
  - **`completeDeferredBookingFromCheckout(sessionId:      String!): StudentBooking!`** – used after the student returns from Stripe when they only saved their card (deferred flow).

**Why it matters:** The API contract for “create checkout” and “complete deferred booking” is defined here; resolvers implement it.

---

## 4. Server – T-48 charge job

### `server/src/jobs/t48ChargeJob.js`

**Role:** Scheduled job that charges **per-slot** for deferred bookings when “lesson start − 48 hours” has passed. Uses the card saved at booking (SetupIntent) to create and confirm a PaymentIntent per slot.

**What it does (no other file contains this logic):**

- Runs on an interval (see `index.js`).
- Finds all bookings that have at least one slot with **`paymentStatus: "pending_payment"`** and a saved **`paymentMethod.paymentMethodId`**.
- For each such booking, loads instructor (for commission and Stripe Connect account).
- For each slot with **`paymentStatus === "pending_payment"`**:
  - Computes **slot start** = `new Date(slot.date + 'T' + slot.startTime)` and **charge time** = slot start − 48 hours.
  - If **charge time > now**, skips (not yet in T-48 window).
  - If **charge time ≤ now**: calls **`createPaymentIntentForBooking`** with:
    - amount = that slot’s share of the booking total,
    - **`paymentMethodId`** from the booking,
    - **`offSession: true`**,
    - **`transferData`** to instructor’s Connect account,
    - **metadata**: `bookingId`, `slotId`, `studentId`, `instructorId`.
- **If PaymentIntent status is `succeeded`:**
  - Updates the slot: `paymentStatus: "paid"`, `paymentIntentId`, `chargedAt`, `chargeAmount`, `dspCommission`, `instructorAmount`, `payoutStatus: "not_applicable"`.
  - Creates four transactions (student debit, platform receipt, instructor share, platform commission) for that slot.
- **If `requires_action` (3DS):**
  - Sets slot **`paymentStatus: "requires_action"`** and stores **`paymentIntentId`**.
  - (You can later send the “payment_requires_action” email from here or from a separate step.)
- **If payment fails or other status:**
  - Sets slot **`paymentStatus: "payment_failed"`**.
  - (You can send the “payment_failed” email from here.)

**Console logs added:**  
Tick at start, “no bookings” or “found N bookings”, per-slot “not yet in window” / “Charging slot…” / “payment succeeded” / “requires_action” / “payment_failed”, and a final “Done. charged=X, requires_action=Y, failed=Z”.

**Why it matters:** This is the only place that performs the actual “charge 48 hours before lesson” behaviour for deferred bookings. It uses the same commission split and transaction creation as the instant flow, but per slot and triggered by time.

---

## 5. Server – Job scheduling

### `server/src/index.js`

**Role:** App entry point; starts the server and schedules background jobs.

**Changes for Phase 2:**

- **Require:** `const { runT48ChargeJob } = require("./jobs/t48ChargeJob");`
- **Schedule T-48 job:**
  - **Interval:** `T48_JOB_INTERVAL_MS = 5 * 60 * 1000` (5 minutes). You can change this for production (e.g. 15–30 min).
  - **setInterval:** calls `runT48ChargeJob()` every 5 minutes and logs errors.
  - **Initial run:** `runT48ChargeJob()` once on startup.

**Why it matters:** Without this, the T-48 job would never run; deferred bookings would stay `pending_payment` forever.

---

## 6. Server – Payout job (logging only)

### `server/src/jobs/payoutJob.js`

**Role:** Existing job that pays out instructors (e.g. 3 days after lesson completion). **No change to payment/T-48 logic.**

**Changes for Phase 2:**

- **Console logs:**
  - At start: `[PayoutJob] Tick at <time> — checking for slots eligible for instructor payout`.
  - At end: `[PayoutJob] Done. processed=X, errors=Y`.

**Why it matters:** Lets you see in the server log that this cron is running; helps distinguish T-48 logs from payout logs.

---

## 7. Server – Emails (3DS and failure)

### `server/src/utils/SendOtpEmail.js`

**Role:** Sends transactional emails (booking created, cancelled, etc.). Used for notifications when T-48 charge needs 3DS or fails.

**Changes for Phase 2:**

- **`sendBookingEmail(recipients, bookingData, type)`**
  - New **`type`** values:
    - **`payment_requires_action`**: “Your lesson is in 48 hours; we need you to complete authentication for your payment.” (You can add a link to your “complete payment” page when you build it.)
    - **`payment_failed`**: “Payment for your lesson could not be completed. Please update your payment method or try again.”

**Note:** The **T-48 job** does not call these yet. When you want to notify students, call `sendBookingEmail` (or `notifyBookingParties`) from the T-48 job when a slot is set to `requires_action` or `payment_failed`, passing the right `type` and slot/booking data.

**Why it matters:** Central place for all booking-related email copy; Phase 2 adds the two new cases for 3DS and failure.

---

## 8. Server – Stripe webhook

### `server/src/routes/stripeWebhook.routes.js`

**Role:** Receives Stripe webhooks (e.g. `payment_intent.succeeded`). Used for idempotency or updating state when payment completes asynchronously (e.g. after 3DS).

**Changes for Phase 2:**

- **`payment_intent.succeeded` (platform, no Connect account):**
  - Still looks up booking by **`stripePaymentIntentId`** (legacy instant flow, one PI per booking).
  - Comment added: for **T-48 per-slot** flow, the job already updates the slot and creates transactions when the charge succeeds, so the webhook does not need to do extra work for those. If you later add a “complete payment” page for 3DS, you can either rely on the frontend calling a “confirm slot paid” mutation after success or handle `payment_intent.succeeded` here to set the slot to `paid` and create transactions (idempotent).

**Why it matters:** Keeps webhook behaviour clear and avoids double-processing; documents that T-48 success is primarily handled in the job.

---

## 9. Frontend – GraphQL mutations

### `Frontend/src/graphql/mutations/studentBooking.ts`

**Role:** GraphQL document definitions for booking mutations and queries used by the UI.

**Changes for Phase 2:**

- **`CREATE_BOOKING_CHECKOUT_SESSION`**
  - Selection set extended with **`deferred`** so the client can read whether this checkout is instant or deferred (e.g. for messaging or analytics).
- **`COMPLETE_DEFERRED_BOOKING_FROM_CHECKOUT`** (new)
  - Mutation: **`completeDeferredBookingFromCheckout(sessionId: $sessionId)`**.
  - Returns the same booking shape as the other completion mutation (`_id`, `status`, `slots`, `totalAmount`, `finalAmount`, `createdAt`, `updatedAt`).

**Why it matters:** The frontend can only call “complete deferred booking” and show the right success message if this mutation and the `deferred` field are defined and requested here.

---

## 10. Frontend – Booking details page (redirect handling)

### `Frontend/src/pages/private/student-dashboard/bookingDetails.tsx`

**Role:** Page where the student sees booking summary and clicks “Pay” (redirect to Stripe). Also the **redirect target** after Stripe Checkout (success or cancel).

**Changes for Phase 2:**

- **Imports:** Added **`COMPLETE_DEFERRED_BOOKING_FROM_CHECKOUT`**.
- **Mutation hook:** **`useMutation(COMPLETE_DEFERRED_BOOKING_FROM_CHECKOUT, ...)`** to call the new resolver when the user returns from a **setup** session.
- **URL handling (e.g. in `useEffect`):**
  - **`checkout=success` + `session_id`** → call **`completeBookingFromCheckout(sessionId)`** (instant payment). Toast: “Booking confirmed! Payment successful.”
  - **`checkout=setup_success` + `session_id`** → call **`completeDeferredBookingFromCheckout(sessionId)`** (deferred, card saved). Toast: “Card saved successfully. We will charge you 48 hours before each lesson.”
  - In both cases, then clear query params and navigate to the bookings list (or similar).

**Why it matters:** Stripe always redirects to the same path (e.g. `/student-dashboard/booking-details`); the **query param** (`checkout=success` vs `checkout=setup_success`) is what tells the app which mutation to call. The backend sets that param via the success URL in `stripeService.js` (see above).

---

## 11. Docs and testing

### `server/TESTING_T48.md`

**Role:** Short testing guide: what to look for in server logs, how to test deferred (T-48) vs instant (which dates to book), and how to test the T-48 job without waiting 48 hours (e.g. temporarily use 2 minutes).

### `docs/STRIPE_PHASE2_FILES_AND_FLOW.md` (this file)

**Role:** Single place that lists every file touched for Phase 2 Stripe and explains what each part does so you can trace the full flow in the code.

---

## Quick reference: which file does what

| What you want to understand / change                      | File(s) to look at                                                                                              |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| When we charge (48h rule, instant vs deferred)            | `studentBooking.resolver.js` → `createBookingCheckoutSession`                                                   |
| How we create “pay now” vs “save card” session            | `stripeService.js` → `createCheckoutSessionForBooking` (mode)                                                   |
| What we store per slot (payment status, PI id, chargedAt) | `studentBooking.model.js` (slot schema)                                                                         |
| What we store for “saved card” on booking                 | `studentBooking.model.js` (paymentMethod), `studentBooking.resolver.js` → `completeDeferredBookingFromCheckout` |
| When and how T-48 charges run                             | `t48ChargeJob.js`, `index.js` (schedule)                                                                        |
| How we charge in the background (off-session)             | `stripeService.js` → `createPaymentIntentForBooking(offSession: true)`                                          |
| What happens after Stripe redirect (instant)              | `studentBooking.resolver.js` → `completeBookingFromCheckout`                                                    |
| What happens after Stripe redirect (deferred)             | `studentBooking.resolver.js` → `completeDeferredBookingFromCheckout`                                            |
| How frontend chooses which completion to call             | `bookingDetails.tsx` (checkout=success vs setup_success)                                                        |
| Success URL for setup vs payment                          | `stripeService.js` (checkoutParam for success URL)                                                              |
| Emails for 3DS / payment failed                           | `SendOtpEmail.js` (payment_requires_action, payment_failed)                                                     |
| Webhook when payment succeeds                             | `stripeWebhook.routes.js` (payment_intent.succeeded)                                                            |

---

## End-to-end trace (deferred booking)

1. User clicks Pay → **bookingDetails.tsx** calls **createBookingCheckoutSession** (GraphQL).
2. **studentBooking.resolver.js** → **createBookingCheckoutSession**: computes earliest slot, gap > 48h → **isDeferred = true**.
3. Resolver calls **stripeService.createCheckoutSessionForBooking** with **mode: "setup"** and **metadata.bookingId**.
4. **stripeService** builds success URL with **checkout=setup_success** and creates Stripe Session (setup mode).
5. User is redirected to Stripe, saves card, redirected back to app with **?checkout=setup_success&session_id=...**.
6. **bookingDetails.tsx** sees **checkout=setup_success** → calls **completeDeferredBookingFromCheckout(sessionId)**.
7. **studentBooking.resolver.js** → **completeDeferredBookingFromCheckout**: loads session (with setup_intent), gets payment_method, finds booking by metadata.bookingId, sets **paymentMethod.paymentMethodId** and **status: "confirmed"**, slots stay **pending_payment**.
8. Every 5 minutes **index.js** runs **runT48ChargeJob**.
9. **t48ChargeJob.js**: finds bookings with **pending_payment** slots and **paymentMethod.paymentMethodId**. For each slot where **slotStart − 48h ≤ now**, calls **stripeService.createPaymentIntentForBooking(..., offSession: true)**. On success, updates slot to **paid** and creates transactions; on **requires_action** sets **requires_action** and stores **paymentIntentId**; on failure sets **payment_failed**.

That’s the full path through the code for a deferred (T-48) booking.
