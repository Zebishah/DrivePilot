# How to test manual payout in Stripe (real payout, not DB-only)

To see a **real** payout in Stripe (Connect account → instructor's bank), the Connect account needs money in **"Available to pay out"**, not just "Available soon".

## Quick test: use Stripe’s “immediately available” test card

Stripe has test cards that make funds **available immediately** (skip the usual 7-day / 3-day pending period) in test mode.

### Steps

1. **Create a new booking** (or use an existing one that isn’t paid yet).
2. **At Stripe Checkout**, when asked for card details, use:
   - **Card number:** `4000 0000 0000 0077`
   - **Expiry:** any future date (e.g. 12/34)
   - **CVC:** any 3 digits (e.g. 123)
   - **ZIP:** any

   This card is intended to make funds **immediately available** in test mode (bypasses pending).
3. **Complete the payment** so the instructor’s Connect account gets the destination transfer.
4. **Instructor marks the lesson as completed** (from Booking Management).
5. **Wait** for your payout delay (e.g. 1 minute if `PAYOUT_DELAY_MS` is set to 1 min in `studentBooking.resolver.js`).
6. **Trigger the payout job:**
   - As Admin, run in GraphQL Playground:
   ```graphql
   mutation { runPayoutJob { processed errors message } }
   ```
   - Or wait for the next scheduled run (e.g. every 1 min if `PAYOUT_JOB_INTERVAL_MS` is 1 min in `index.js`).
7. **Check Stripe:**
   - Open the **instructor’s Connect account** in Stripe Dashboard (Connect → Accounts → that instructor).
   - Go to **Balance** and confirm “Available to pay out” had enough and decreased.
   - Go to **Payouts** and you should see a payout to their test bank.

If the Connect account still shows **Available to pay out: 0** after step 3, the destination transfer may still be pending for that card in your environment. Then use the fallback below.

---

## Fallback: transfer from platform to Connect (available immediately)

Stripe: *“If transferring from [platform] available balance, funds become immediately available in the connected account.”*

So if the **platform** has **available** balance, a **transfer** to the Connect account will land as **available** there, and the next payout job can create a real payout.

### Steps

1. **Give the platform available balance (test mode)**  
   In Stripe Dashboard (your **platform** account, not the Connect account):
   - Use **Developers → API keys** and ensure you’re in **Test mode**.
   - One option: run a one-off **payment** to your platform (e.g. Payment Links or a test charge) using the test card **4000 0000 0000 0077** so the platform gets some **available** balance.

2. **Transfer from platform to the instructor’s Connect account**  
   You can do this via Stripe Dashboard or API:
   - **Dashboard:** Connect → [instructor account] → Balance → “Add funds” / “Transfer from platform” (if shown).
   - **API:** From your backend, call `stripe.transfers.create` with `destination: <instructor_stripe_account_id>` and the desired amount (in centimes), using your platform secret key (no `stripeAccount`). That moves money from platform **available** balance to the Connect account; it should appear as **available** there.

3. **Mark a lesson as completed** (so a slot has `payoutStatus: 'pending'`, `payoutEligibleAt` in the past, etc.) **or** ensure your payout job would pick up that Connect balance. Then run **`runPayoutJob`** as in step 6 above.

4. **Check** the Connect account’s **Payouts** tab again for the real payout.

---

## Summary

- **First try:** Pay for a booking with **4000 0000 0000 0077** → complete lesson → wait for delay → run **`runPayoutJob`** → check Connect **Payouts**.
- **If balance is still “Available soon”:** Get **available** balance on the **platform** (e.g. charge with 4000 0000 0000 0077), then **transfer** from platform to the Connect account, then run **`runPayoutJob`** and check **Payouts** again.

Only in **test mode** does 4000 0000 0000 0077 (and the transfer-from-available behaviour) apply; in production, real settlement times (e.g. 3 business days in CH) apply.
