# Complete Local Testing Checklist – Handover to Client

Use this document to test **every flow and edge case** on localhost before handing over to the client. Tick each item as you complete it.

---

## Prerequisites (do once)

- [ ] **Environment**
  - [ ] `server/.env` has `STRIPE_SECRET_KEY=sk_test_...` and `STRIPE_WEBHOOK_SECRET=whsec_...`
  - [ ] `Frontend/.env` has `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...`
  - [ ] MongoDB running; server and frontend start without errors

- [ ] **Stripe CLI for webhooks**
  - [ ] Stripe CLI installed (`stripe --version`)
  - [ ] Logged in: `stripe login`
  - [ ] In a **separate terminal**: `stripe listen --forward-to http://localhost:4000/webhooks/stripe`
  - [ ] Copy the `whsec_...` into `server/.env` as `STRIPE_WEBHOOK_SECRET`, restart server
  - [ ] Keep `stripe listen` running for the whole test session

- [ ] **Test users**
  - [ ] At least one **Admin**, one **Instructor**, one **Student** (with email) that you can log in as

---

## Stripe test cards (reference)

| Scenario                                  | Card number         | Expiry                  | CVC          |
| ----------------------------------------- | ------------------- | ----------------------- | ------------ |
| Success                                   | 4242 4242 4242 4242 | Any future (e.g. 12/34) | Any 3 digits |
| 3DS required (succeeds after auth)        | 4000 0000 0000 3220 | Any future              | Any 3 digits |
| Declined (generic)                        | 4000 0000 0000 0002 | Any future              | Any 3 digits |
| Insufficient funds                        | 4000 0000 0000 9995 | Any future              | Any 3 digits |
| Funds available immediately (payout test) | 4000 0000 0000 0077 | Any future              | Any 3 digits |

Use these **only** in Stripe Checkout / payment forms (test mode). Do not use real cards.

---

## 1. Instructor – Stripe Connect & payment readiness

### 1.A – Happy path

| #   | Test                         | Steps                                                                                                            | Expected                                                                            | ✓   |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --- |
| 1.1 | Start Stripe onboarding      | As **Instructor**, go to **Settings → Payment Management**. Click “Connect with Stripe” / “Start payment setup”. | Redirected to Stripe; complete identity/bank (use test data). Return to app.        |     |
| 1.2 | Return URL & verify          | After completing onboarding on Stripe, you are redirected to `/payment/complete`. Page calls **Verify**.         | Status shows “verified” / “Payments enabled” when Stripe has activated the account. |     |
| 1.3 | Payment-ready blocks booking | As **Student**, find an instructor who has **not** completed Stripe. Try to book.                                | Error or “Not available for payment” / “Complete Stripe setup”.                     |     |
| 1.4 | Payment-ready allows booking | As **Student**, book with an instructor who **has** completed Stripe.                                            | Can proceed to checkout (instant or setup).                                         |     |

### 1.B – Instructor onboarding edge cases

| #    | Test                                     | Steps                                                                                                                                                                                                                   | Expected                                                                                                                                                                                          | ✓   |
| ---- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| 1.5  | Incomplete onboarding – “Continue setup” | As **Instructor**, start onboarding (get Stripe link) then **close the tab** without submitting. Go back to **Settings → Payment Management**.                                                                          | Status “Setup in progress”. Button **“Continue setup”** (or similar) is shown.                                                                                                                    |     |
| 1.6  | Continue setup opens Stripe again        | Click **“Continue setup”**.                                                                                                                                                                                             | New Stripe onboarding URL opens; you can complete or add details.                                                                                                                                 |     |
| 1.7  | Stripe restricted/rejected – we show it  | When Stripe **restricts** or **rejects** the account (e.g. more info needed, verification failed), our app gets this via **Verify** or webhook `account.updated`. Instructor goes to **Settings → Payment Management**. | Status shows **“Action required”** / **“Stripe: Action required”**. Message like “Stripe needs additional information or has temporarily restricted your account. Resume onboarding to fix this.” |     |
| 1.8  | Fix now – open Stripe again after reject | With status **restricted** (or **disabled**), click **“Fix now in Stripe”** / **“Resume onboarding”**.                                                                                                                  | A **new Stripe onboarding link** opens; instructor can fix details and resubmit. (Backend allows a new link when account is not yet verified.)                                                    |     |
| 1.9  | After return from Stripe (complete page) | Complete onboarding on Stripe; land on **/payment/complete**. Page runs **Verify**. If status is **restricted**, page shows “Action required in Stripe” and button **“Fix now in Stripe”**.                             | Clicking **“Fix now in Stripe”** opens a new Stripe link so they can fix and try again.                                                                                                           |     |
| 1.10 | Regenerate link (optional)               | As **Instructor**, before finishing onboarding (status “Setup in progress”), use **“Continue setup”**. Or, if shown, any “Regenerate onboarding link” action.                                                           | New Stripe onboarding URL works and you can complete from there. (Test 1.6 covers this.)                                                                                                          |     |

**Note:** When Stripe rejects or restricts onboarding, we **do** show that to the user (restricted/disabled state and message) and we **do** allow them to try again: **“Fix now in Stripe”** / **“Continue setup”** calls the backend to get a new Stripe account link so they can complete or correct onboarding.

---

## 2. Student – Instant payment (lesson ≤48h away)

| #   | Test                  | Steps                                                                                                                          | Expected                                                                                                                                                                                                               | ✓   |
| --- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| 2.1 | Instant checkout      | Create **instructor availability** for a time **within 48 hours** from now. As **Student**, book that slot and go to checkout. | Server log: `INSTANT (payment now)`. Redirect to Stripe **Checkout** with **payment** (not setup).                                                                                                                     |     |
| 2.2 | Pay with success card | On Stripe Checkout use **4242 4242 4242 4242**. Complete payment.                                                              | Redirect back with `?checkout=success&session_id=...`. Booking confirmed; all slots **paid**. No T-48 charge for this booking.                                                                                         |     |
| 2.3 | Pay with 3DS card     | Book again (instant). On Checkout use **4000 0000 0000 3220**. Complete 3DS step on Stripe’s page.                             | After 3DS, redirect back; booking confirmed; slots paid.                                                                                                                                                               |     |
| 2.4 | Declined card         | Book again (instant). On Checkout use **4000 0000 0000 0002**.                                                                 | Stripe shows error on same page; user can try another card or click Back. If they click Back they hit cancel_url (same as 2.5). Booking stays pending; toast “Payment was cancelled” and link to Book lesson to retry. |     |
| 2.5 | Cancel checkout       | Start instant checkout; on Stripe page click “Back” or cancel.                                                                 | Redirect to `.../booking-details?checkout=cancelled`. Toast “Payment was cancelled”; if state was lost (redirect), page shows message + “Go to Book lesson” to retry. Booking stays pending.                           |     |

---

## 3. Student – Deferred payment (lesson >48h away) + T-48 charge

| #   | Test                                        | Steps                                                                                                                                                                                                                                                                                | Expected                                                                                                                                                                  | ✓   |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| 3.1 | Deferred checkout (setup only)              | Create availability for a time **more than 48 hours** from now. As **Student**, book and go to checkout.                                                                                                                                                                             | Server log: `DEFERRED (setup mode, charge at T-48)`. Stripe Checkout in **setup** mode – **no charge**, only save card.                                                   |     |
| 3.2 | Save card and return                        | Complete Stripe setup (e.g. 4242 4242 4242 4242).                                                                                                                                                                                                                                    | Redirect with `?checkout=setup_success&session_id=...`. Booking confirmed; slots **pending_payment**.                                                                     |     |
| 3.3 | T-48 job charges (quick test)               | **Optional:** In `server/src/jobs/t48ChargeJob.js` temporarily set `FORTY_EIGHT_HOURS_MS = 2 * 60 * 1000` (2 min). Create a deferred booking for a lesson that starts in **>2 min**. Wait 2+ min; wait for next T-48 job run (every 5 min by default, or trigger if you have a way). | Server log: `[T48ChargeJob] Charging slot ... for booking ...` then `payment succeeded` and `Done. charged=1`. Slot becomes **paid**. **Revert** the constant after test. |     |
| 3.4 | T-48 with 3DS                               | With same short window, use a **3DS card** (4000 0000 0000 3220) when saving card in setup. When T-48 runs, it will get `requires_action`.                                                                                                                                           | Slot set to **requires_action**; email “Action required: complete payment”. In **Booked lessons**, “Complete payment” appears for that slot.                              |     |
| 3.5 | Complete T-48 3DS payment                   | Click “Complete payment” for a slot in **requires_action**. Complete 3DS in the flow.                                                                                                                                                                                                | Slot moves to **paid**; booking confirmed when all slots paid.                                                                                                            |     |
| 3.6 | T-48 declined card                          | Use **4000 0000 0000 0002** when saving card (setup). When T-48 runs.                                                                                                                                                                                                                | Slot set to **payment_failed** (after retries). No charge.                                                                                                                |     |
| 3.7 | Webhook completes deferred without frontend | Start deferred checkout; complete setup on Stripe; **close browser before** your app’s success page loads.                                                                                                                                                                           | Webhook `checkout.session.completed` should still save `stripeCustomerId` and payment method on booking. Next T-48 run can charge (verify with 3.3-style test).           |     |

---

## 4. Lesson status & payout eligibility

| #   | Test                        | Steps                                                                                                                                              | Expected                                                                                                                                               | ✓   |
| --- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --- |
| 4.1 | Mark lesson completed       | As **Instructor** (or Admin), open the booking and mark a **paid** slot as **Completed**.                                                          | Slot `lessonStatus` = completed; for paid slots, `payoutStatus` becomes **pending** and `payoutEligibleAt` set (e.g. now + 1 min in your config).      |     |
| 4.2 | Mark lesson cancelled       | As **Student** or **Instructor**, cancel one slot of a booking.                                                                                    | Slot status **cancelled**; booking becomes semi_cancelled or cancelled if all cancelled. Availability freed.                                           |     |
| 4.3 | Mark lesson missed          | As **Instructor**, mark a slot as **Missed** (if UI exists).                                                                                       | Slot status **missed**; no refund; availability/booking state consistent.                                                                              |     |
| 4.4 | Payout job runs             | After marking a paid slot **completed**, wait for payout delay (e.g. 1 min). Wait for payout job (e.g. every 1 min in index.js). Check server log. | `[PayoutJob] Done. processed=1`. Slot `payoutStatus` = **completed**; `payoutId` set. Transaction with type **payout** and **stripePayoutId** created. |     |
| 4.5 | Refund blocked after payout | If a slot already has `payoutId`, request refund for that slot.                                                                                    | Refund request rejected or message “instructor already paid out”.                                                                                      |     |

---

## 5. Refunds (student request → admin approve/reject)

| #   | Test                    | Steps                                                                                              | Expected                                                                                                                                                                                                                       | ✓   |
| --- | ----------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- |
| 5.1 | Request refund (valid)  | **Cancel** a paid slot first. As **Student**, request refund for that slot.                        | Refund request created with status **pending**. Visible in Admin Refund Requests.                                                                                                                                              |     |
| 5.2 | Admin approve refund    | As **Admin**, open **Refund Requests**, approve the request.                                       | Stripe: (1) transfer reversal (instructor share), (2) refund to student. Slot `paymentStatus` = **refunded**; RefundRequest status **approved**; transactions: student credit, instructor debit, platform commission reversal. |     |
| 5.3 | Admin reject refund     | As **Student**, create another refund request. As **Admin**, **reject** it (optional: add reason). | RefundRequest status **rejected**; no Stripe refund/reversal; slot unchanged.                                                                                                                                                  |     |
| 5.4 | No refund before cancel | As **Student**, try to request refund for a slot that is **not** cancelled.                        | Error: “Refund can only be requested for a cancelled lesson”.                                                                                                                                                                  |     |
| 5.5 | No double refund        | After approving a refund, try to request refund again for same slot (or approve again).            | Error or “already refunded”.                                                                                                                                                                                                   |     |

---

## 6. Admin – Payment & payout visibility

| #   | Test                 | Steps                                                                        | Expected                                                                                                        | ✓   |
| --- | -------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --- |
| 6.1 | Transactions list    | As **Admin**, open **Payments / Transactions** (or Admin Transactions page). | List of transactions: payments, payouts, refunds, transfer_reversals with amount, type, role, date, Stripe IDs. |     |
| 6.2 | Transaction stats    | On same page, check summary/cards (total payments, payouts, etc.).           | Stats match data (or zero if none).                                                                             |     |
| 6.3 | Filters              | Use filters (date range, type, role) if available.                           | List updates correctly.                                                                                         |     |
| 6.4 | Refund requests list | As **Admin**, open **Refund Requests**.                                      | Pending / approved / rejected list; can approve or reject.                                                      |     |

---

## 7. Edge cases & cleanup

| #   | Test                                     | Steps                                                                                                                                                                                                                                   | Expected                                                                                                       | ✓   |
| --- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --- |
| 7.1 | Abandoned checkout cleanup               | Create a **pending** booking (deferred or instant), go to Stripe Checkout, **close tab** without completing. Leave booking **pending** and without `stripeCustomerId` for **>30 minutes**. Wait for pending cleanup job (every 30 min). | Server log: `[PendingBookingCleanupJob] Done: cleaned=1`. Booking and slots **cancelled**; availability freed. |     |
| 7.2 | Resume pending booking                   | Create pending booking (deferred); leave without completing. Later, as **Student**, open “Booked lessons” / dashboard and find “Abandoned” or “Continue to checkout” for that booking. Click to resume.                                 | Redirect to Stripe again (setup or payment); after completing, booking is confirmed.                           |     |
| 7.3 | Complete payment link (T-48 3DS)         | For a slot in **requires_action**, open the “Complete payment” link (from email or dashboard) in a **new tab**.                                                                                                                         | Page loads with correct booking/slot; after completing 3DS, slot becomes paid.                                 |     |
| 7.4 | Instructor without Stripe cannot be paid | Use an instructor who has no Stripe account. As **Student**, try to book.                                                                                                                                                               | Error or “not available for payment”.                                                                          |     |
| 7.5 | Multiple slots one booking               | Book **multiple slots** in one booking (instant). Pay once.                                                                                                                                                                             | One charge; all slots **paid**; single PaymentIntent on booking.                                               |     |
| 7.6 | Multiple slots one booking (deferred)    | Book multiple slots in one booking (deferred). After T-48, each slot charged in turn.                                                                                                                                                   | Each slot gets its own charge when its T-48 time comes; per-slot PaymentIntent; all slots eventually paid.     |     |

---

## 8. Server logs to watch

While testing, keep an eye on the **server console**:

- `[createBookingCheckoutSession]` → DEFERRED vs INSTANT
- `[T48ChargeJob]` → Tick, Charging slot..., payment succeeded / requires_action / payment_failed, Done. charged=...
- `[PayoutJob]` → Tick, Done. processed=...
- `[PendingBookingCleanupJob]` → Done: cleaned=...
- `[Stripe Webhook]` → checkout.session.completed, payment_intent.succeeded

---

## 9. Quick reference – what to test per flow

| Flow            | Cards to use                                                             | What to verify                                                                          |
| --------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Instant payment | 4242…, 4000…3220 (3DS), 4000…0002 (decline)                              | Redirect, booking confirmed, slots paid, transactions                                   |
| Deferred + T-48 | 4242… for setup; then T-48 charges 4242… or 3220 (3DS) or 0002 (fail)    | Setup only; T-48 charges; requires_action + complete payment; payment_failed            |
| Refund          | After cancel slot → request → approve                                    | Reversal + refund in Stripe; slot refunded; transactions                                |
| Payout          | 4000…0077 (immediate availability) or wait; mark completed; wait for job | Payout job creates payout; slot payoutStatus completed; transaction with stripePayoutId |

---

## 10. Sign-off checklist (before handover)

- [ ] All items in sections 1–7 tested and ticked where applicable
- [ ] No critical errors in server logs during normal flows
- [ ] Stripe Dashboard (test mode): payments, Connect account balances, payouts look correct
- [ ] Env and Stripe keys documented for client (test vs live)
- [ ] Webhook URL for production documented (Dashboard endpoint + secret)
- [ ] Any temporary changes (e.g. T-48 window, payout delay) reverted to production-ready values

---

## Optional: production deployment checklist (for client)

- [ ] Replace test Stripe keys with live keys in production env
- [ ] Create live webhook endpoint in Stripe Dashboard (HTTPS URL)
- [ ] Subscribe to: `checkout.session.completed`, `payment_intent.succeeded`, and Connect events (account.updated, etc.)
- [ ] Set `STRIPE_WEBHOOK_SECRET` to the **live** webhook signing secret
- [ ] Set payout delay and T-48 interval to production values (e.g. 3 days payout delay, 5–15 min T-48 job)
- [ ] Run through at least one full flow (booking → payment → complete lesson → payout) in live mode with a real card (small amount) if possible

---

**Document version:** 1.0  
**Use with:** Local testing only (test Stripe keys). Do not use real card data in test mode.
