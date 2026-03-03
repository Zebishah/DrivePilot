# Backend Stripe & Payment Code – Where It Lives & What It Does

This document lists **every backend file** that contains Stripe or payment-related code and explains **what each part does** in plain terms.

---

## Quick map: where is Stripe/payment code?

| Location                                                    | Purpose                                                                                       |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **server/src/services/stripeService.js**                    | All direct Stripe API calls (accounts, Checkout, PaymentIntents, refunds, transfers, payouts) |
| **server/src/routes/stripeWebhook.routes.js**               | Stripe webhooks (checkout.session.completed, payment_intent.succeeded, account.updated, etc.) |
| **server/src/jobs/t48ChargeJob.js**                         | T-48 job: charges students 48h before lesson using saved card (off-session)                   |
| **server/src/jobs/payoutJob.js**                            | Payout job: sends instructor share from Stripe balance to their bank                          |
| **server/src/graphql/resolvers/studentBooking.resolver.js** | Booking + Checkout: creates sessions, completes booking after payment, T-48 complete payment  |
| **server/src/graphql/resolvers/refundRequest.resolver.js**  | Refunds: calls Stripe refund + transfer reversal when admin approves                          |
| **server/src/graphql/resolvers.js**                         | Instructor Stripe Connect: create account, account link, verify onboarding, manual payout     |
| **server/src/graphql/utils/instructorPaymentReady.js**      | Helper: is instructor allowed to receive payments (Stripe verified)?                          |
| **server/src/services/transactionService.js**               | Creates transaction records (stores stripePaymentIntentId, stripeRefundId, etc.)              |
| **server/src/graphql/resolvers/transaction.resolver.js**    | Platform commission settings (payoutMethods includes "Stripe")                                |
| **server/src/index.js**                                     | Mounts Stripe webhook route at `/webhooks/stripe` with raw body                               |
| **server/src/models/transaction.model.js**                  | Transaction schema with Stripe IDs (stripePaymentIntentId, stripeRefundId, etc.)              |
| **server/src/models/studentBooking.model.js**               | Booking/slot fields: stripePaymentIntentId, stripeCustomerId, paymentStatus, etc.             |

---

## 1. `server/src/services/stripeService.js`

**What it is:** The single place that talks to Stripe’s API. No other file calls `stripe.*` directly; they all use functions from here.

**What it does (function by function):**

- **`createExpressAccount(email)`**  
  Creates a Stripe Connect **Express** account for an instructor (country CH, card_payments + transfers). Used when an instructor starts “Connect with Stripe”.

- **`setManualPayoutSchedule(accountId)`**  
  Sets the connected account to **manual** payouts. Money stays in the instructor’s Stripe balance until your app creates a payout (via Payouts API).

- **`createAccountLink(accountId, paths)`**  
  Creates a Stripe **account link** for onboarding. The instructor is redirected to Stripe to complete identity/bank details. `refreshPath` and `returnPath` are your frontend URLs (e.g. `/payment/refresh`, `/payment/complete`).

- **`retrieveAccount(accountId)`**  
  Fetches the full Stripe account (e.g. to check `charges_enabled`, `payouts_enabled`, requirements).

- **`accountToStripeSnapshot(account)`**  
  Converts Stripe’s account object into the shape you save in DB: `stripeAccount.*`, `onboardingStatus`, `isActive`. Used after onboarding and in webhooks.

- **`getCommissionSplit(amountChf, instructor, platformSettings)`**  
  Splits the lesson amount into platform commission and instructor share (percentage or fixed). Returns `{ dspCommission, instructorAmount }` in CHF.

- **`createPaymentIntentForBooking(opts)`**  
  Creates (and optionally confirms) a **PaymentIntent**. Used for:
  - **Instant payment** (card on file): confirm immediately, optional 3DS.
  - **T-48 off-session**: `offSession: true`, charges saved card later.
    Supports **destination charge**: part of the amount goes to the instructor’s connected account (`transferData`).

- **`createCheckoutSessionForBooking(opts)`**  
  Creates a Stripe **Checkout Session** for a booking:
  - **mode: "payment"** → student pays now; one PaymentIntent for the full amount; destination charge to instructor.
  - **mode: "setup"** → only saves the card (SetupIntent); no charge; used when lesson is >48h away (deferred payment).

- **`createCustomer(opts)`**  
  Creates a Stripe **Customer** (by email). Used in deferred flow so the Checkout Session has a `customer` and you can charge the saved payment method later.

- **`retrieveCheckoutSession(sessionId)`**  
  Loads a Checkout Session with `payment_intent`, `setup_intent`, `customer` expanded. Used when the student returns from Stripe to complete the booking.

- **`retrieveSetupIntent(setupIntentId)`** / **`retrievePaymentMethod(paymentMethodId)`**  
  Used by webhook and “complete deferred booking” to get customer ID and payment method after setup.

- **`createTransferToInstructor(opts)`**  
  Transfers money from **platform** Stripe balance to instructor’s **connected account** (for destination charges the transfer is created by Stripe; this is for other flows if you use separate charges + transfer).

- **`createManualPayoutForInstructor(opts)`**  
  Creates a **Payout** from the instructor’s Stripe balance to their bank. Used by the payout job because you use manual payouts.

- **`createRefund(opts)`**  
  Refunds a PaymentIntent (full or partial). Money goes back to the student’s card.

- **`getTransferIdFromPaymentIntent(paymentIntentId)`**  
  For a destination charge, gets the **Transfer** ID from the PaymentIntent’s latest charge. Needed to reverse the instructor’s share when you refund.

- **`createTransferReversal(opts)`**  
  Reverses part (or all) of a transfer. Used on refund: first refund to student, then reverse the instructor’s share so the platform doesn’t eat the cost.

- **`retrievePaymentIntent(paymentIntentId)`**  
  Loads a PaymentIntent (e.g. to check status after 3DS or in webhook).

- **`confirmPaymentIntent(paymentIntentId, returnUrl)`**  
  Confirms a PaymentIntent with a `return_url` (for 3DS redirect). Used when the student completes payment on the “complete payment” page.

Constants: **`DEFAULT_CURRENCY`** (`"chf"`), **`CENTIMES_PER_UNIT`** (100 for CHF), **`FRONTEND_BASE`** (used in success/cancel URLs).

---

## 2. `server/src/routes/stripeWebhook.routes.js`

**What it is:** HTTP endpoint that receives **Stripe webhooks**. Must be mounted with **raw body** (see `index.js`) so signature verification works.

**Route:** `POST /webhooks/stripe` (mount path from `index.js`).

**What it does:**

- Verifies **`Stripe-Signature`** with `STRIPE_WEBHOOK_SECRET` and parses the event.
- Deduplicates by **event id** (in-memory set) so the same event isn’t processed twice.
- **Platform events** (no `account` = your platform):
  - **`checkout.session.completed`**  
    If mode is **setup** (deferred flow): finds booking by `metadata.bookingId`, gets `stripeCustomerId` and payment method from session/setup_intent, saves them on the booking and sets slots to `pending_payment`. So even if the user never hits your success URL, the booking is “card saved” and T-48 can charge later.
  - **`payment_intent.succeeded`**
    - **Legacy:** booking with `stripePaymentIntentId === pi.id` → already handled, respond OK.
    - **T-48 per-slot:** find booking by `slots.paymentIntentId === pi.id`. Mark that slot paid, set charge amounts and commission, create **transactions** (student debit, platform receipt, instructor share, commission), and if all slots are paid set booking to `confirmed` and `stripePaymentIntentId`. Handles 3DS completion when the student finishes on Stripe’s page.
- **Connect account events** (event has `account` = instructor’s connected account):
  - **`account.updated`** → refresh instructor’s Stripe snapshot and `onboardingStatus` / `isActive`.
  - **`account.application.deauthorized`** → mark account as disconnected / disabled.
  - **`charge.dispute.created`** / **`charge.dispute.closed`** → set flags on instructor (e.g. `hasDisputes`).
  - **`payout.failed`** / **`payout.paid`** → update instructor financial status (e.g. payouts blocked).

All handlers are defensive (try/catch, null checks) and respond `200 OK` so Stripe doesn’t retry unnecessarily.

---

## 3. `server/src/jobs/t48ChargeJob.js`

**What it is:** A **scheduled job** that runs periodically (e.g. every few minutes). It finds slots that are **within 48 hours** of the lesson and still **pending_payment**, then charges the student’s saved card (off-session).

**What it does step by step:**

- Query: bookings that have at least one slot with `paymentStatus: "pending_payment"` and a saved `paymentMethod.paymentMethodId`.
- For each such booking, get instructor (for Stripe account and commission).
- For each slot with `pending_payment`:
  - Compute **slot start** and **charge time** = slot start − 48h. If now < charge time, skip (not yet in window).
  - If booking has no **`stripeCustomerId`**, mark slot **payment_failed** (can’t charge off-session) and continue.
  - Call **`createPaymentIntentForBooking`** with:
    - `offSession: true`, saved `paymentMethodId` and `stripeCustomerId`
    - `transferData` = instructor’s share to their connected account
    - **idempotency key** = `t48-{bookingId}-{slotId}` so the same slot isn’t charged twice.
- **If `requiresAction`** (3DS): update slot to `requires_action`, store `paymentIntentId`, send “payment requires action” email. Student must complete payment on your “complete payment” page.
- **If status !== "succeeded"**: mark slot **payment_failed**.
- **If succeeded**: update slot to **paid**, set `paymentIntentId`, `chargedAt`, `chargeAmount`, `dspCommission`, `instructorAmount`, create **transactions** (student debit, platform receipt, instructor share, commission). If all slots are paid, set booking to **confirmed** and store `stripePaymentIntentId`.
- **On error “requires authentication”**: treat as 3DS; set slot to `requires_action`, store PI id, send email; no retries.
- **Other errors**: retry up to **T48_MAX_RETRIES** (2 = 3 attempts); then mark **payment_failed**.

So: **T-48 charge** = charge one slot at a time when it enters the 48h window, with idempotency and retries.

---

## 4. `server/src/jobs/payoutJob.js`

**What it is:** A **scheduled job** that pays out instructors: moves money from their **Stripe Connect balance** to their **bank** (manual payout).

**What it does:**

- Find slots with `payoutStatus: "pending"`, `payoutEligibleAt <= now`, `paymentStatus: "paid"`, `instructorAmount > 0`.
- For each, get instructor’s **Stripe connected account**.
- Call **`createManualPayoutForInstructor`** with `accountId`, amount in centimes, metadata (bookingId, slotId).
- On success: set slot `payoutStatus: "completed"`, `payoutId`, `payoutDate`, and create a **transaction** (type `payout`, role instructor, with `stripePayoutId`).
- In **non-production**, if Stripe returns “insufficient funds”, still mark slot completed and create a simulated payout transaction so tests don’t block.

So: **payout** = per-slot manual payout from instructor Stripe balance to bank, plus transaction record.

---

## 5. `server/src/graphql/resolvers/studentBooking.resolver.js`

**What it is:** GraphQL resolvers for **student bookings**. This is where “create booking”, “redirect to Stripe”, and “complete after payment” are decided.

**Stripe/payment-related parts:**

- **`isInstructorPaymentReady(instructor)`**  
  Used before creating a paid booking: instructor must be payment-ready (profile complete, Stripe verified). So only instructors who finished Stripe onboarding can receive paid bookings.

- **`createStudentBooking` (instant card payment)**  
  If payment method is card and instructor is payment-ready:
  - Computes commission split, then calls **`createPaymentIntentForBooking`** with `confirm: true` and `transferData` to instructor.
  - If **`requiresAction`** (3DS): returns `requiresAction: true`, `clientSecret`, `paymentIntentId` so the frontend can complete 3DS; booking is not saved yet.
  - If **succeeded**: saves booking with `stripePaymentIntentId`, all slots **paid**, and creates **transactions** (student, platform, instructor, commission).
  - If not succeeded and not requires_action: throws.

- **`createBookingCheckoutSession`**  
  Used when the student will pay on **Stripe Checkout** (redirect):
  - Creates booking in DB with status **pending** and slots **pending_payment** (or similar).
  - If lesson is **>48h** away: **deferred** → create Stripe **Customer**, then **Checkout in setup mode** (save card only). Success URL has `?checkout=setup_success&session_id=...`.
  - If lesson is **≤48h**: **instant** → **Checkout in payment mode** (one payment for full amount, destination charge). Success URL has `?checkout=success&session_id=...`.
  - Returns **`url`** (redirect to Stripe) and **bookingId**.

- **`createCheckoutSessionForPendingBooking`**  
  For **pending** bookings (e.g. student abandoned checkout or wants to resume): same 48h rule, creates either setup or payment Checkout Session, returns URL. Used for “Continue to checkout” on an existing pending booking.

- **`completeBookingFromCheckout`**  
  When student returns from Stripe with **payment** mode and session **paid**: loads session, gets `bookingId` from metadata, updates booking to **confirmed**, sets all slots to **paid** and fills `stripePaymentIntentId`, charge amounts, commission. Idempotent (if webhook already updated, matchedCount 0 and we just return current booking).

- **`completeDeferredBookingFromCheckout`**  
  When student returns from Stripe with **setup** mode: loads session and setup_intent, gets **stripeCustomerId** and **payment method id**, saves on booking, sets slots to **pending_payment**. Booking stays **pending** until T-48 job charges (or instant flow is not used for that booking).

- **`getClientSecretForT48SlotPayment`**  
  For a slot that needs 3DS (e.g. T-48 returned `requires_action`): creates a **new** PaymentIntent for that slot (or reuses existing) with `confirm: false`, then **confirms** with `return_url` to your complete-payment page. Returns **clientSecret** so the frontend can either complete in-page or redirect to bank.

- **`completeT48SlotPayment`**  
  After student completed 3DS: receives **paymentIntentId**, loads PI from Stripe, checks status **succeeded**. Finds booking/slot from metadata, marks slot **paid**, fills charge/commission, creates **transactions** (same shape as T-48 job and webhook). Returns updated booking.

- **`completeBookingAfterPayment`**  
  Legacy/instant flow: after payment (e.g. 3DS) completed with a **paymentIntentId** that has booking metadata. Verifies PI succeeded and student id, then creates/updates booking with slots paid and creates transactions.

So: this file **orchestrates** when to use Checkout vs on-site card, instant vs deferred, and how to finalize booking and transactions after payment.

---

## 6. `server/src/graphql/resolvers/refundRequest.resolver.js`

**What it is:** Handles **refund requests**: student requests refund for a cancelled slot; admin approves or rejects. On approve, Stripe is called.

**Stripe/payment-related parts:**

- **`requestRefund`**  
  Validates that the slot is cancelled, **paid** (via `paymentStatus === "paid"` or presence of `stripePaymentIntentId`/`paymentIntentId` and `chargeAmount`), not already refunded, and no payout yet. Determines **paymentIntentId** = `booking.stripePaymentIntentId` (instant) or **slot.paymentIntentId** (T-48). Creates **RefundRequest** (pending). No Stripe call yet.

- **`approveRefundRequest`**  
  When admin approves:
  1. Load booking and slot; re-check not already refunded and no payout.
  2. **Transfer reversal:** get **Transfer** id from PaymentIntent via **`getTransferIdFromPaymentIntent`**; if present and slot has `instructorAmount`, call **`createTransferReversal`** for the instructor’s share so the platform doesn’t lose money.
  3. **Refund:** **`createRefund`** with `paymentIntentId` and slot’s `chargeAmount` (in centimes). Partial refund for that slot.
  4. Update slot: `status: "refund"`, `paymentStatus: "refunded"`, `refundedAt`, etc.
  5. Create **transactions**: student credit (refund), instructor debit (reversal), platform debit (commission reversal). Save **stripeRefundId** on RefundRequest.
  6. Update availability slot status to refund.

So: **refunds** = Stripe refund to card + transfer reversal for instructor share + transaction records.

---

## 7. `server/src/graphql/resolvers.js` (Instructor Stripe Connect)

**What it is:** Root GraphQL resolvers. Stripe-related mutations live here for **instructor** Connect onboarding and verification.

**Stripe-related mutations:**

- **`createStripeAccount`**  
  If instructor already has **accountId**: set manual payout schedule, create **account link**, return **onboardingUrl**. If not: **createExpressAccount**, **setManualPayoutSchedule**, save **accountId** and **accountCreatedAt** on instructor, create **account link**, return **onboardingUrl**. Frontend redirects instructor to Stripe.

- **`setInstructorPayoutToManual`** (Admin)  
  Calls **setManualPayoutSchedule** for the given instructor’s connected account.

- **`verifyStripeOnboarding`**  
  Instructor clicks “I’ve completed onboarding”. Backend **retrieves** the Stripe account, runs **accountToStripeSnapshot**, updates instructor’s **stripeAccount** and **onboardingStatus** / **isActive**, returns charges_enabled / payouts_enabled.

- **`regenerateStripeLink`**  
  If instructor didn’t finish onboarding: create a new **account link** and return **onboardingUrl**.

So: **Connect onboarding** = create Express account, manual payout, account links, and verify status.

---

## 8. `server/src/graphql/utils/instructorPaymentReady.js`

**What it is:** Small helper used by booking resolvers and frontend (via GraphQL) to decide if an instructor can receive paid bookings.

**What it does:**  
Returns true only if instructor has **isProfileComplete**, **isActive**, and **onboardingStatus === "verified"**. So Stripe must be fully verified (and account active) before they appear as “payment ready”.

---

## 9. `server/src/services/transactionService.js`

**What it is:** Service to create **transaction** documents in the DB.

**What it does:**  
**`createTransaction(opts)`** creates one transaction. `opts` include type, role, direction, amount, currency, status, bookingId, slotId, studentId, instructorId, and **Stripe fields**: **stripePaymentIntentId**, **stripeRefundId**, **stripePayoutId**, etc. Used by:

- studentBooking resolver (after instant payment),
- stripeWebhook (payment_intent.succeeded),
- t48ChargeJob,
- payoutJob,
- refundRequest resolver.

So: **all** payment/refund/payout events that touch Stripe also create a transaction record with the relevant Stripe ids.

---

## 10. `server/src/graphql/resolvers/transaction.resolver.js`

**What it is:** GraphQL resolvers for **transactions** and **platform commission** (admin).

**Stripe-related part:**  
**Platform commission** settings include **payoutMethods** (default `["Stripe"]`). No direct Stripe API calls here; it just stores that the platform uses Stripe for payouts.

---

## 11. `server/src/index.js`

**What it is:** App entry point.

**Stripe-related part:**  
Mounts the Stripe webhook **before** any JSON body parser:

```js
app.use(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhookRoutes,
);
```

So **POST /webhooks/stripe** gets the raw body, which is required for **Stripe-Signature** verification.

---

## 12. `server/src/models/transaction.model.js`

**What it is:** Mongoose schema for **transactions**.

**Stripe-related fields:**

- **stripePaymentIntentId**
- **stripeChargeId**
- **stripeTransferId**
- **stripePayoutId**
- **stripeRefundId**
- **stripeTransferReversalId**

Used by **transactionService** and all code that logs payments, refunds, and payouts.

---

## 13. `server/src/models/studentBooking.model.js`

**What it is:** Mongoose schema for **StudentBooking** and embedded **slots**.

**Stripe/payment-related fields (conceptually):**

- **stripePaymentIntentId** (booking-level for instant multi-slot payment)
- **stripeCustomerId** (for deferred/T-48 charging)
- **paymentMethod** (paymentMethodId, cardLast4, etc.)
- **slots[].paymentStatus** (pending_payment, paid, requires_action, payment_failed, refunded)
- **slots[].paymentIntentId** (T-48 per-slot PI)
- **slots[].chargeAmount**, **instructorAmount**, **dspCommission**
- **slots[].chargedAt**, **refundedAt**, **payoutStatus**, **payoutId**, etc.

So the **booking and slot** models are where Stripe state (who paid, which PI, refund/payout) is stored.

---

## End-to-end flow summary

1. **Instructor:** Connect with Stripe → **resolvers.js** (createExpressAccount, createAccountLink). After onboarding, **verifyStripeOnboarding** updates status. **instructorPaymentReady** then allows paid bookings.
2. **Student books (instant, card on file):** **studentBooking.resolver** creates PaymentIntent with **stripeService**, confirms; on success saves booking + transactions. If 3DS, returns clientSecret; later **completeBookingAfterPayment** or **completeT48SlotPayment** finalizes.
3. **Student books (redirect):** **studentBooking.resolver** creates **pending** booking, then Checkout Session (payment or setup) via **stripeService**. Student pays or saves card on Stripe. **Webhook** (checkout.session.completed) for setup saves customer/payment method; **completeBookingFromCheckout** / **completeDeferredBookingFromCheckout** finalize when student returns.
4. **T-48:** **t48ChargeJob** charges each slot 48h before lesson using **createPaymentIntentForBooking** (off-session). If 3DS, slot set to requires_action; student uses **getClientSecretForT48SlotPayment** + **completeT48SlotPayment** to finish. **Webhook** payment_intent.succeeded also marks slot paid and creates transactions.
5. **Refunds:** **refundRequest.resolver** approves → **createTransferReversal** (instructor share) + **createRefund** (student), then transactions.
6. **Payouts:** **payoutJob** calls **createManualPayoutForInstructor** per eligible slot and records **transaction** with **stripePayoutId**.

All Stripe API calls go through **stripeService.js**; all payment/refund/payout history goes through **transactionService** and **transaction.model** with Stripe IDs.

---

## Payout availability (for your client / instructors)

**Question:** When a student pays by card, the instructor’s share appears in their Stripe Connect account. When does it move from “Available soon” to “Available for payout”?

**Short answer (Switzerland, CH):**

- Yes: card payments first show as **pending** in the instructor’s connected account (Stripe Dashboard often labels this as **“Available soon”**).
- Those funds become **available for payout** (can be sent to the instructor’s bank) after Stripe’s **settlement** period.
- For **Switzerland (CH)** ([Stripe docs – Balances and settlement time](https://docs.stripe.com/payments/balances)):
  - **Default (after the first payout):** **3 business days** (Mon–Fri, excluding holidays). So a Monday charge is typically available on Thursday.
  - **First payout ever:** Stripe uses a longer initial period. For CH, **initial settlement** is **7 calendar days**. The first payout is usually scheduled **7–14 days** after the first successful payment (can be longer depending on risk/country).

**What to tell the client:**

- “When a student pays by card, the instructor’s share appears in their Stripe account under **‘Available soon’**. It becomes **available for payout** (so we can pay it to their bank) after **3 business days** in Switzerland. For brand‑new instructors, the very first payout can take **7–14 days**.”
- Optional: “Exact timing can vary by account and risk; instructors can see the exact date in their Stripe Dashboard.”

**Source:** [Stripe – Balances and settlement time](https://docs.stripe.com/payments/balances) (table “Country and settlement timing”: Switzerland – Initial 7 calendar days, Default 3 business days). [Connect account balances](https://docs.stripe.com/connect/account-balances): connected accounts have the same pending → available flow; destination‑charge funds hit the connected account’s pending balance and then become available per that account’s country (CH = above).
