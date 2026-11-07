# Manual Stripe Refund Sync - Implementation Handover

Date: 2026-05-06

## Objective

Ensure that when a refund is done manually in Stripe, Drive Pilot:
- syncs the refund into platform records
- updates the correct lesson slot status
- avoids incorrect slot updates
- keeps Admin/Student/Instructor views consistent

---

## Initial Problem

Manual Stripe refund webhooks were arriving, but refund-to-slot mapping was failing or sometimes incorrect.

Observed webhook payloads (Connect/manual flow) often looked like:
- `refund.id` -> `pyr_...`
- `refund.charge` -> `py_...`
- `refund.payment_intent` -> `null`
- `charge.payment_intent` -> `null`

Because Drive Pilot originally matched mostly via `paymentIntentId (pi_...)`, mapping either failed or required heuristics. Heuristic mapping could select the wrong slot when multiple slots had similar amounts/times.

---

## Root Cause

The identifiers Stripe returns in this manual Connect refund flow (`py_...`, `pyr_...`) were not consistently stored on slots for exact matching.

We had:
- slot/booking `paymentIntentId` (`pi_...`) in many flows
- sometimes `transferId` (`tr_...`)

But we needed to persist and use the **same ID family returned by manual refund webhooks**, especially `refund.charge` (`py_...`).

---

## What Was Implemented

### 1) Slot-level Stripe identifier model upgrade

Updated slot schema in `server/src/models/studentBooking.model.js`:
- `paymentIntentId` (existing)
- `connectChargeId` (new) -> stores connected-account charge/payment id (`py_...`)
- `transferId` (new) -> stores Stripe transfer id (`tr_...`)

### 2) Save identifiers at payment time (new bookings)

Updated booking payment flows in `server/src/graphql/resolvers/studentBooking.resolver.js`:
- Save `paymentIntentId` per slot
- Save `transferId` per slot
- Save `connectChargeId` per slot

This ensures each paid slot has Stripe IDs needed for deterministic refund mapping.

### 3) Correct charge-id derivation for Connect flow

Updated `getChargeIdFromPaymentIntent()` in `server/src/services/stripeService.js`:
- Prefer `transfer.destination_payment` (`py_...`) for destination charges (matches manual refund webhook payload)
- Fallback to platform `charge.id` (`ch_...`) only if destination payment is unavailable

### 4) Webhook matching logic tightened

Updated `server/src/routes/stripeWebhook.routes.js` refund sync logic to use strict mapping order:

1. `refund.charge` (`py_...`) -> exact match on `slot.connectChargeId`
2. Else `payment_intent` (`pi_...`) -> exact match on `slot.paymentIntentId`
3. Else unresolved -> no slot status mutation

### 5) Safety against wrong slot updates

If slot mapping is ambiguous or unresolved:
- do not mark any slot as refunded
- record refund at booking level with explicit "slot mapping ambiguous" description

This prevents corrupt status updates.

### 6) Connect charge enrichment

Added connect `charge.succeeded` handling to map/set `connectChargeId` onto slot for future exact matching in manual refunds.

### 7) Debug observability

Added structured webhook debug logs:
- `refund.created`
- `charge.refunded`
- mapping trace and resolved source

This made root cause visible and helped validate final behavior.

---

## Final Matching Guarantee (for new bookings)

For bookings created/paid after this implementation:
- Drive Pilot stores Stripe identifiers needed for exact correlation
- manual refund sync uses exact ID matching first
- wrong slot mutation due to heuristic guessing is avoided

If Stripe event does not contain resolvable exact identifiers, Drive Pilot safely skips slot mutation and records the refund without forcing incorrect status.

---

## Verification Playbook

1. Create a new paid booking (post-fix).
2. Confirm slot has:
   - `paymentIntentId`
   - `connectChargeId` (`py_...`)
   - `transferId` (`tr_...`)
3. Do manual refund in Stripe.
4. Check backend logs for:
   - webhook debug payload
   - successful mapping line:
     - `Refund synced successfully: booking=... slot=...`
5. Confirm UI updates:
   - Student cancelled list -> `Refunded`
   - Instructor cancelled list -> `Refunded`
   - Admin booking management -> `Refunded`
6. Confirm refund transaction entry exists.

---

## Notes on Legacy Bookings

Older bookings created before this implementation may not have all new slot identifiers.  
For those records, exact manual refund-to-slot mapping can be limited by Stripe payload data availability.

Policy used:
- Prefer safe skip over wrong slot mutation.
- Record refund transaction even when slot mapping is unresolved.

---

## Outcome Summary

Manual Stripe refund sync has been stabilized with ID-based mapping for new bookings:
- stronger slot-level linkage
- reduced mismatch risk
- explicit safety behavior for ambiguous cases
- full traceability via logs

