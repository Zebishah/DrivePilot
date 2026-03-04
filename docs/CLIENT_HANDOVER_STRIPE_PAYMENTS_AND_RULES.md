# DSP Platform — Payments, Payouts & Business Rules (Client Handover)

This document explains everything you need to know about how payments, payouts, refunds, and lesson status work on the platform. It is written for the client (Switzerland) and covers Stripe sandbox testing, edge cases we handle, and the rules enforced in code.

---

## 1. Currency and checkout

- **All prices and payments are in CHF (Swiss Francs).**
- Stripe Checkout is configured to show **only CHF** (no automatic conversion to the customer’s local currency). If you ever see another currency (e.g. PKR) on the Stripe payment page, disable **Adaptive Pricing** in Stripe Dashboard: **Settings → Adaptive Pricing** → turn off for Checkout.
- **Lesson times** (e.g. “3 PM–4 PM”) are interpreted in **Switzerland time** (Europe/Zurich). So “mark as completed” and “lesson ended” checks use Swiss time correctly for students and instructors in any country.

---

## 2. When does the instructor get paid? (Payout flow)

### Step 1: Lesson is marked completed

- The **instructor** (or admin) marks the lesson as **Completed** in the platform **after** the lesson end time. The system does **not** allow marking as completed before the slot end time (see [§6](#6-lesson-completed--missed-status)).
- For **paid** lessons, as soon as the lesson is marked completed, the slot becomes **eligible for payout** after a short delay (currently **1 minute** in the configuration; this can be increased to e.g. 3 days for production).

### Step 2: Payout job runs

- A **payout job** runs on the server every **3 minutes**. It finds all slots that:
  - are marked **completed**,
  - are **paid**,
  - have passed the “payout eligible” time,
  - and have not been paid out yet.
- For each such slot it creates a **manual payout** from the instructor’s Stripe Connect balance to their bank. Each lesson is paid out **only once** (no double payouts; the code prevents race conditions).

### Step 3: When does the money appear in Stripe / bank?

- **In Stripe (Connect account):** After a student pays, the instructor’s share appears in their Stripe Connect balance. It is first **“Available soon”** (pending).
- **When it becomes “Available to pay out” (Switzerland, CH):**
  - **First payout ever** for that instructor: Stripe’s **initial settlement** is typically **7 calendar days**. So the first time an instructor receives funds, they usually become available for payout **7–14 days** after the first successful payment.
  - **After the first payout:** **3 business days** (Mon–Fri, excluding holidays). So a Monday charge is typically available on Thursday.
- **When we actually send it to the bank:** As soon as the funds are “Available to pay out” in Stripe and our payout job has run (every 3 minutes), we create the payout to the instructor’s bank. The exact arrival time in the bank depends on Stripe and the bank (often 1–2 business days).

**Summary for the client:**  
“After the instructor marks the lesson completed, our system will send their share to their bank the next time the payout job runs (every 3 minutes), but only once Stripe has made those funds ‘available’ (first time: about 7 days; afterwards: about 3 business days).”

---

## 3. Stripe test cards (sandbox)

You are using a **Stripe sandbox (test)** account. No real money moves. Use **test API keys** and the test cards below in your app and in the Stripe Dashboard when testing.

### Successful payment (no 3DS)

| Brand            | Card number         | CVC          | Expiry                       |
| ---------------- | ------------------- | ------------ | ---------------------------- |
| Visa             | 4242 4242 4242 4242 | Any 3 digits | Any future date (e.g. 12/34) |
| Mastercard       | 5555 5555 5555 4444 | Any 3 digits | Any future date              |
| Switzerland (CH) | 4000 0075 6000 0009 | Any 3 digits | Any future date              |

Use these to test: **instant payment** at checkout, **deferred booking** (card saved, charge at T-48), and **successful T-48 charge** without 3DS.

### 3D Secure (3DS) – authentication required

These cards trigger the **3DS** flow (bank verification step). Use them to test:

- Checkout where the customer must complete 3DS before payment succeeds.
- **T-48 charge** that requires 3DS: the student will see the lesson in “Complete payment” / “Incomplete checkouts” and must complete 3DS to finish payment.

| Scenario                   | Card number         | Use case                                                                                               |
| -------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------ |
| 3DS required, succeeds     | 4000 0000 0000 3220 | Payment succeeds **after** customer completes 3DS.                                                     |
| 3DS required, always       | 4000 0027 6000 3184 | Always asks for 3DS (good for testing the full flow).                                                  |
| Authenticate unless set up | 4000 0025 0000 3155 | Requires 3DS for one-time/on-session; after “set up”, off-session (e.g. T-48) can succeed without 3DS. |

Use **any 3-digit CVC** and **any future expiry** (e.g. 12/34).

### Declined / failure (for error handling)

| Scenario                   | Card number         | Result                                                             |
| -------------------------- | ------------------- | ------------------------------------------------------------------ |
| Generic decline            | 4000 0000 0000 0002 | Card declined (generic).                                           |
| Insufficient funds         | 4000 0000 0000 9995 | Decline: insufficient funds.                                       |
| 3DS required, then decline | 4000 0084 0000 1629 | 3DS is required; after authentication, payment is declined.        |
| Insufficient funds (3DS)   | 4000 0082 6000 3178 | Requires 3DS; after authentication, declined (insufficient funds). |

**Important:**

- Do **not** use real card details in test mode.
- Full list: [Stripe Testing – Card numbers](https://docs.stripe.com/testing#cards) and [Test 3D Secure](https://docs.stripe.com/testing#regulatory-cards).

---

## 4. Payment flows (instant vs deferred) and how we show them

### Instant payment (lesson within 48 hours)

- Student books and pays **immediately** at Stripe Checkout.
- On success, the booking is **confirmed** and all slots are **paid**. No “complete payment” step later.

### Deferred payment (lesson more than 48 hours away)

- Student goes to Checkout in **setup** mode: only the **card is saved**, no charge yet.
- **48 hours before** each lesson, our system automatically charges the saved card (**T-48 charge**). If that charge **succeeds**, the slot is marked **paid** and the student sees nothing extra.
- If the charge **fails** (e.g. insufficient funds) or **requires 3DS**, the slot stays in a “payment incomplete” state and the student can complete it later (see below).

### Incomplete checkouts and “Complete payment”

- **Incomplete checkout (never finished Stripe):**  
  Student started checkout but closed the page or cancelled. The booking stays **pending**. On the **Book lesson** page we show an **“Incomplete checkouts”** section: the student can click **“Continue to checkout”** to finish payment for the **same** booking (same lesson, no new search).
  - They **cannot** complete this checkout if the **lesson date has already passed**.

- **T-48 charge failed or required 3DS:**  
  For **deferred** bookings, when we charge 48 hours before the lesson, the charge might:
  - **Require 3DS:** we mark the slot as `requires_action`. The student must complete 3DS (we show a “Complete payment” / 3DS flow in the app).
  - **Fail** (e.g. decline): we mark the slot as `payment_failed`. The student can **retry** via the same “Complete payment” flow (we create a new PaymentIntent or use the existing one where supported).

- **Where the student sees this:**
  - **Book lesson** page: list of **“Complete payment”** slots (lessons that need 3DS or retry), and **“Incomplete checkouts”** (pending bookings that never finished Checkout).
  - **Booking details** (for a specific booking): if that slot needs 3DS or retry, we show a **“Complete payment”** button and a short explanation.

- **When we no longer allow completion:**  
  The student **cannot** complete payment (and we hide or disable “Complete payment”) if:
  - The **lesson date/time has passed**, or
  - The instructor has already marked the lesson **Completed** or **Missed**.

So: incomplete checkouts and 3DS/failed T-48 are explicitly supported; we only block “complete payment” when the lesson is already in the past or finalized by the instructor.

---

## 5. Refunds: when they are allowed and when they are blocked

### Student requests a refund

- Refund can **only** be requested for a **cancelled** lesson (student or instructor cancelled the slot).
- We **block** a refund request if:
  - The **lesson date/time has already passed** (request must be made before the lesson time).
  - The lesson was **never paid** (e.g. deferred booking cancelled before T-48 charge).
  - The instructor has **already been paid out** for that slot (no refund after payout).
  - The slot is **already refunded** or a refund request is **pending/rejected**.

So: **request refund** only for **cancelled**, **paid**, **not yet paid-out** lessons, and **before** the lesson time.

### Admin approves or rejects a refund

- Admin can **approve** a refund request only if:
  - The slot is **not** already refunded.
  - The instructor has **not** already been paid out for that slot.
  - The slot status is **not** **completed** or **missed** (we block approve if the lesson was later marked completed or missed).
  - The **lesson date/time has not passed** (we block approve if the lesson is in the past).

- Admin can **reject** a request with an optional reason (e.g. “Payout already sent”).

We **do not** allow double refunds or refunds after the instructor has been paid out. All these checks are enforced in code and in the admin refund screen (e.g. both Approve and Reject are disabled while one action is in progress to avoid race conditions).

---

## 6. Lesson “Completed” and “Missed” status

### Who can mark a lesson completed or missed?

- The **instructor** (or admin) can set a slot to **Completed** or **Missed** from the booking/slot management UI.

### When can a lesson be marked “Completed”?

- **Only after the lesson end time.**  
  The system checks the **slot end time in Switzerland time** (Europe/Zurich). If the current time (in UTC) is **before** that slot end time, the platform **does not allow** marking the lesson as completed.  
  So instructors cannot mark a lesson completed before it has actually ended.

### What “Completed” and “Missed” imply

- **Completed:** The lesson took place. For **paid** slots, the slot becomes **eligible for payout** after the configured delay (e.g. 1 minute in current setup), then the next payout job run will send the instructor’s share to their bank (subject to Stripe’s “available” timing).
- **Missed:** The lesson did not take place (e.g. student no-show). No refund is issued for “missed” in the normal flow. We **block** refund request/approve for slots marked **missed** (and **completed**) as per [§5](#5-refunds-when-they-are-allowed-and-when-they-are-blocked).

---

## 7. Cancellation rules

- A lesson can be **cancelled** only if:
  - It is **not** already cancelled, and
  - Its status is **not** completed, missed, or refund, and
  - The **lesson date has not passed** (cancellation only before the scheduled date).

- If the student **cancels before** the T-48 charge (e.g. deferred booking, cancelled early), **no charge** is made for that slot and **no refund** is relevant (we do not show “Request refund” for unpaid slots).

---

## 8. Edge cases we handle (summary)

| Case                                       | What we do                                                                                                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Incomplete checkout**                    | Student can resume from “Incomplete checkouts” with “Continue to checkout” for the same booking; blocked if lesson date has passed.                       |
| **T-48 requires 3DS**                      | Slot marked `requires_action`; student sees “Complete payment” and can complete 3DS; blocked if lesson date passed or instructor marked completed/missed. |
| **T-48 charge failed**                     | Slot marked `payment_failed`; student can retry via “Complete payment”; same blocks as above.                                                             |
| **Mark completed before end time**         | Rejected: “Cannot mark this slot as completed before its end time.” (Switzerland timezone).                                                               |
| **Refund after payout**                    | Request/approve blocked: instructor already paid out.                                                                                                     |
| **Refund for missed/completed**            | Approve blocked: lesson was marked missed or completed.                                                                                                   |
| **Refund after lesson date passed**        | Request and approve blocked when lesson date/time has passed.                                                                                             |
| **Double payout**                          | Payout job uses an atomic “claim” so the same slot is never paid out twice.                                                                               |
| **Deferred booking cancelled before T-48** | No charge; no refund; T-48 job skips cancelled slots.                                                                                                     |
| **Currency on Checkout**                   | Only CHF; Adaptive Pricing disabled in code and can be turned off in Stripe Dashboard if needed.                                                          |

---

## 9. Stripe webhook (production)

- So that Stripe can send payment and account events to your server, configure the webhook in the Stripe Dashboard:
  - **Endpoint URL:** `https://dsp-cloud.onrender.com/webhooks/stripe`
  - Use the **signing secret** from that endpoint in your server environment as `STRIPE_WEBHOOK_SECRET`.
- Events we use: `checkout.session.completed`, `payment_intent.succeeded`, `account.updated`, `account.application.deauthorized`, `charge.dispute.created`, `charge.dispute.closed`, `payout.failed`, `payout.paid`.

---

## 10. Configuration summary (for your reference)

| Item                               | Value / behaviour                                             |
| ---------------------------------- | ------------------------------------------------------------- |
| **Currency**                       | CHF only (no multi-currency for customers).                   |
| **Slot timezone**                  | Europe/Zurich (Switzerland).                                  |
| **Payout delay after “completed”** | 1 minute (configurable; can be set to 3 days for production). |
| **Payout job interval**            | Every 3 minutes.                                              |
| **Stripe funds “available” (CH)**  | First payout: ~7 days; then ~3 business days.                 |
| **Webhook URL**                    | `https://dsp-cloud.onrender.com/webhooks/stripe`.             |

---

If you need to test a specific flow (e.g. 3DS, decline, refund after payout blocked), use the test cards in [§3](#3-stripe-test-cards-sandbox) and the rules above. For full technical details, see the internal docs (e.g. `BUSINESS_RULES_CANCEL_REFUND_PAYMENT_PAYOUT.md`, `BACKEND_STRIPE_AND_PAYMENT_GUIDE.md`).
