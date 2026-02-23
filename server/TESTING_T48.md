# Testing T-48 and instant vs deferred booking

## What to watch in the server console

- **`[createBookingCheckoutSession]`** — When a student starts checkout you’ll see either:
  - `DEFERRED (setup mode, charge at T-48)` — lesson start is **more than 48 hours** from now.
  - `INSTANT (payment now)` — lesson start is **48 hours or less** from now.

- **`[T48ChargeJob]`** — Every 5 minutes (see `index.js`):
  - `Tick at ...` — job ran.
  - `No bookings with pending_payment slots` — nothing to charge.
  - `Found N booking(s)...` — found deferred bookings with pending slots.
  - For each slot: either `not yet in T-48 window`, or `Charging slot...`, then `payment succeeded` / `requires_action` / `payment_failed`.
  - `Done. charged=X, requires_action=Y, failed=Z` — summary.

- **`[PayoutJob]`** — Instructor payout job (separate from T-48): `Tick at ...` and `Done. processed=X, errors=Y`.

---

## How to test DEFERRED (T-48) flow

**Goal:** Booking uses **setup** (card saved only), then the T-48 job charges 48 hours before the lesson.

1. **Pick a lesson date/time more than 48 hours from now.**  
   Example: today is Monday 10:00; choose **Wednesday 14:00** or later (e.g. Wednesday 15:00).

2. **Create availability** (as instructor) for that date/time if needed.

3. **As student, book that slot** via the normal flow (Confirm → redirect to Stripe Checkout).

4. **In server logs you should see:**
   - `[createBookingCheckoutSession] ... gap XX.Xh → DEFERRED (setup mode, charge at T-48)`.

5. **On Stripe Checkout** you only **save the card** (no charge). After success you’re redirected with `?checkout=setup_success&session_id=...` and the app calls `completeDeferredBookingFromCheckout`. Booking is confirmed, slots stay `pending_payment`.

6. **T-48 charge:** The job charges a slot when:
   - `slotStart - 48 hours <= now`.
   So for a lesson on **Wednesday 15:00**, the job will charge when **Monday 15:00** has passed (or your server’s current time is past that).

   **To test without waiting 48 hours:** temporarily change in `server/src/jobs/t48ChargeJob.js`:
   - `const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;`
   - to e.g. `const FORTY_EIGHT_HOURS_MS = 2 * 60 * 1000;` (2 minutes)
   then book a lesson that starts in **more than 2 minutes** from now. After 2 minutes the next job run should charge that slot. Revert the constant after testing.

7. **In server logs when the job runs:**
   - You should see `[T48ChargeJob] Charging slot ... for booking ...` and then either:
     - `payment succeeded` + `Done. charged=1, ...`, or
     - `requires_action` or `payment_failed` with the corresponding message.

---

## How to test INSTANT payment flow

**Goal:** Charge happens **at booking time** (current behaviour).

1. **Pick a lesson date/time within 48 hours from now.**  
   Example: today Monday 10:00 → choose **Monday 12:00** or **Tuesday 08:00** (within 48h).

2. **As student, book that slot.**

3. **In server logs you should see:**
   - `[createBookingCheckoutSession] ... gap X.Xh → INSTANT (payment now)`.

4. **On Stripe Checkout** you **pay immediately**. After success, redirect has `?checkout=success&session_id=...` and `completeBookingFromCheckout` runs. All slots are `paid`; no T-48 job is involved for this booking.

---

## Quick reference

| Lesson start vs now      | Checkout mode | When payment is taken        |
|--------------------------|---------------|------------------------------|
| More than 48 hours ahead | Setup (save card) | T-48 job, 48h before lesson |
| 48 hours or less ahead   | Payment       | At checkout (instant)        |
