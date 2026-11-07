# Drive Pilot Platform — Response to “Stripe Integration Review” (Clarifications + What’s Fixed)

Hi team,

Thank you for the detailed review. Below is a point-by-point response to each item in your document, including what we have corrected, what is expected behavior in Stripe, and how to validate the system end-to-end.

---

## PART 1 — STRIPE ISSUES

## 1) Instructor revenue display in the Drive Pilot dashboard

### What was happening

The instructor overview was showing **gross** revenue (full amount paid by the student) for “Money earned”.

### What we changed

We updated the instructor analytics calculation so “Money earned” reflects the **instructor’s net earnings after Drive Pilot commission** (i.e., the instructor share), matching the instructor’s transaction history.

### How to validate

- **Instructor Dashboard → Overview (“Money earned”)** should now match:
- **Instructor Dashboard → Transaction History → Total received**

> Net earnings are derived from the stored split amounts (`instructorAmount`) per slot where available. For older/legacy records without that split field, the system falls back to a best-effort gross-per-slot calculation.

---

## 2) “Absence of commission data” in the Stripe test environment

### Key truth (important)

Stripe does **not** show a separate “Drive Pilot commission” transaction type or a dedicated “commission configuration” section for your platform.

In Stripe you will typically see:

- **Payments (gross)**: the full lesson price paid by the student.
- **Transfers to the instructor (net share)**: the instructor’s portion (after Drive Pilot commission) sent to the instructor’s Connect account.

The “commission” is the **difference** between the gross amount collected and the amount transferred to the instructor. Stripe does not label the retained difference as “commission”.

### Where commission is configured (source of truth)

Commission is configured in the **Drive Pilot Admin Dashboard**, not in Stripe:

- **Admin Dashboard → Payment Management → Commission Management**
  - You can set commission type (percentage or fixed amount) and the commission value.

### Where to verify commission (recommended)

Use the Drive Pilot dashboards:

- **Admin Dashboard → Payment Management → Transactions**
  - You can verify platform gross receipts and platform commission entries per booking/slot.
- **Instructor Dashboard → Transaction History**
  - Instructors see **net amounts only** (their share after commission).
- **Student Dashboard → Payment History**
  - Students see what they paid (gross).

### Stripe-side verification (what to look for)

In Stripe Dashboard (test mode):

- **Payments**: confirm the student payment exists (gross amount).
- **Connect → Accounts → select the instructor**: confirm the connected account exists and receives funds/transfer activity.
- If you compare gross Payments vs Transfers to that instructor, the difference is the platform commission retained by Drive Pilot.

We also created a dedicated guide with a checklist:

- `docs/COMMISSION_AND_STRIPE_GUIDE.md`

---

## 3) Instructor access to their Stripe dashboard

### What was happening

Instructors could connect Stripe (onboarding), but there was no option in Drive Pilot to open the instructor’s Stripe dashboard.

### What we changed

We added a secure “Open Stripe Dashboard” option for instructors to access their **Stripe Express dashboard**.

### What “Stripe dashboard” means in this context

Instructors use **Stripe Connect (Express)**. Their Stripe interface is the **Stripe Express dashboard** for their connected account.

### Where instructors can access Stripe now

- **Instructor Settings → Payment Management**: button **“Open Stripe Dashboard”**
- **Instructor Dashboard → Transaction History**: button **“Open Stripe Dashboard”**

This allows instructors to:

- view earnings and balances
- check payouts
- monitor transactions related to lessons

> Security note: the Stripe Express dashboard link is a short-lived, one-time link generated on demand. This is expected behavior per Stripe.

---

## 4) Stripe test environment not displaying transaction data

### What’s expected in Stripe test mode

Stripe test mode should still show activity when you process payments through the Drive Pilot app, including:

- Payments created by Checkout / PaymentIntents
- Connected accounts (Express) under Connect
- Transfers to connected accounts (when created)

### Most common reasons you “see nothing” in Stripe

Please verify the following before concluding the system is not connected:

- **Correct Stripe account**: you are logged into the correct Stripe workspace (the platform account used by Drive Pilot).
- **Correct mode**: Stripe Dashboard is in **Test mode**, not Live (toggle in Stripe).
- **Correct API keys in Render**:
  - Backend uses `sk_test_...` in test mode
  - Webhook secret corresponds to the test-mode webhook endpoint (Dashboard endpoint secret, not Stripe CLI secret)
- **Correct webhook endpoint (test mode)**:
  - Stripe Dashboard → Developers → Webhooks
  - Endpoint should point to your Render backend URL (e.g. `/webhooks/stripe`)
  - Events should show delivery attempts and 2xx responses from the server

### How to validate quickly

1. Make a new booking and complete payment with a test card.
2. In Stripe Dashboard (Test mode) check **Payments** → the payment should appear immediately.
3. In Drive Pilot Admin Dashboard check **Payment Management → Transactions** → records should appear immediately.

If after this you still see no Stripe activity, it almost always means the environment is pointing to a different Stripe account/keys than the Dashboard you are checking.

---

## 5) Payment redirection during student checkout (why student goes to Stripe)

### Why the student is redirected

The student is redirected to **Stripe Checkout**, which is Stripe’s secure hosted payment page. We do this so Stripe can:

- securely collect card details (PCI compliant)
- confirm payment
- handle bank authentication flows (3D Secure / SCA) when required

### The student does NOT create a Stripe account

This redirection is **not** about creating or configuring a Stripe account. It is simply a Stripe-hosted payment page (like a normal e-commerce checkout).

### What happens during that step

1. Drive Pilot creates a **Stripe Checkout Session** for the lesson.
2. The student is redirected to Stripe Checkout to pay.
3. After payment, Stripe redirects back to Drive Pilot (success/cancel URL).
4. Drive Pilot updates booking/payment status based on Stripe’s result.

### Is this part of 3DS authentication?

**Sometimes, yes.**

- If the card/bank requires **3D Secure (SCA)**, Stripe Checkout shows an authentication step during the payment flow.
- If 3DS is not required, the student pays normally and returns to Drive Pilot.

---

## 6) Pending response to Jacques’ video (WhatsApp)

We confirm the behavior shown (redirect to Stripe during checkout) is expected when using **Stripe Checkout**, and 3DS can appear inside that flow depending on the card/bank.

If you want us to respond line-by-line to the exact timestamps in Jacques’ video, please share:

- the timestamps you want explained, or
- a short summary of what looks wrong.

We will then map each point to the exact implemented flow (instant payment vs deferred/T‑48 vs 3DS-required cases).

---

## PART 2 — PENDING TASKS PREVENTING PROPER PLATFORM TESTING

### What we can confirm

A correct completed/partial/pending matrix requires auditing against the actual ClickUp task list and the deployed environment, because the outcome depends on the exact task definitions and the reference environment.

### What we need from you

Please share either:

- export/screenshots of both ClickUp sections, or
- the ClickUp links + access permissions,
  and confirm which environment is the reference for the audit (Render demo vs local vs staging).

### What we will deliver

For each task in both sections we will provide:

- **Status**: Completed / Partially completed / Pending
- **Where it is implemented** (frontend pages + GraphQL + backend resolver/services)
- **How to test it**
- **If partial/pending**: what remains and an estimate

---

## Additional note — T‑48 timing (Render vs local)

### Root cause

Previously, parts of the code used default JavaScript date parsing for slot start times. On Render the server timezone is typically **UTC**, which can shift the computed “T‑48” moment relative to Switzerland time.

### Fix applied

We updated the T‑48 charge timing calculations and related checkout logic to interpret slot times in `SLOT_TIMEZONE` (e.g. `Europe/Zurich`) explicitly, so it behaves consistently regardless of server location or tester location.

### Expected behavior after fix

T‑48 charging should occur at the correct “48 hours before lesson start” moment in Switzerland time, with only small delay possible due to the job interval (e.g., up to a few minutes depending on configuration).

---

## Recommended next validation steps (fast)

1. **Commission validation**
   - Set commission in Admin → Payment Management → Commission Management (e.g. 40%).
   - Make a test payment.
   - Verify Admin Transactions shows platform commission; Instructor Transactions show net.
2. **Stripe visibility validation**
   - Confirm Stripe Dashboard is in **Test mode** and you are viewing the same Stripe account used by the backend keys.
   - Check Stripe **Payments** after a booking payment.
   - Check the instructor’s Connect account exists under **Connect → Accounts**.
3. **Instructor Stripe dashboard access**
   - Instructor → Payment Management → “Open Stripe Dashboard”.
   - Confirm Stripe Express dashboard opens and shows connected-account financial data.

Thank you again — once we have the ClickUp task list access/export, we will provide the detailed implementation-status matrix requested in Part 2.
