# Stripe T-48 Follow-up Emails - Implementation Note

Date: 2026-05-06

## Goal

Fix missing payment reminder sequence after T-48 payment issues.

Required behavior:
- Email #1: immediately after T-48 payment fails or requires 3DS
- Email #2: about 12 hours later
- Email #3: about 18 hours after first email
- If still unpaid at 24 hours: cancel lesson slot and release slot back to instructor availability

## Root Cause

Only the first email existed in the T-48 flow.  
There was no persisted reminder timeline per slot, and no background job to send #2/#3 or enforce the 24h deadline.

## What Was Implemented

### 1) Slot-level reminder tracking fields

Updated `server/src/models/studentBooking.model.js` slot schema with:
- `paymentReminderStartedAt`
- `paymentReminderDeadlineAt`
- `paymentReminder1SentAt`
- `paymentReminder2SentAt`
- `paymentReminder3SentAt`

This stores reminder state directly on each slot, so reminders are deterministic and idempotent.

### 2) New T-48 follow-up reminder job

Added `server/src/jobs/t48PaymentReminderJob.js`.

This job:
- scans slots with `paymentStatus` in `requires_action` or `payment_failed`
- calculates milestones from reminder start:
  - +12h -> send reminder #2
  - +18h -> send reminder #3
  - +24h -> cancel slot + release availability
- prevents duplicate sends by checking `paymentReminder2SentAt` and `paymentReminder3SentAt`
- updates booking status (`cancelled` / `semi_cancelled`) consistently

### 3) First reminder flow unified

Updated `server/src/jobs/t48ChargeJob.js`:
- replaced old one-off "send immediate action email" helper
- now calls shared reminder sender from `t48PaymentReminderJob.js` with reminder number `1`
- first reminder now also initializes 24h deadline fields on slot
- first reminder is sent for both:
  - `requires_action`
  - `payment_failed` (including max retry exhaustion)

### 4) Scheduler wiring

Updated `server/src/index.js`:
- added `runT48PaymentReminderJob()` schedule every 10 minutes
- initial run on server startup

### 5) Minimal test coverage

Added `server/src/jobs/t48PaymentReminderJob.test.js`:
- verifies milestone calculation:
  - +12h
  - +18h
  - +24h

Also updated `server/package.json` with:
- `"test": "node --test"`

## Email Types Used

No new email template type was required.

The existing `sendBookingEmail` templates are reused:
- `payment_requires_action`
- `payment_failed`

This keeps design/wording consistent and avoids template duplication.

## Auto-cancel + Slot Release Logic

At 24h deadline (from first reminder):
- slot is marked cancelled
- slot `booked` becomes `false`
- cancellation metadata is set
- related instructor availability is updated:
  - slot removed from booked list
  - re-added (or marked) in available slots
- teacher availability status recalculated (`available` / `booked`)

## Verification Done

Executed:
- `node --test /home/miyabinagumo/Documents/GitHub/dsp/server/src/jobs/t48PaymentReminderJob.test.js`
- `node --check server/src/jobs/t48PaymentReminderJob.js`
- `node --check server/src/jobs/t48ChargeJob.js`
- `node --check server/src/index.js`

Result:
- test passed
- syntax checks passed
- no lint diagnostics on touched files

## Changed Files

- `server/src/models/studentBooking.model.js`
- `server/src/jobs/t48PaymentReminderJob.js` (new)
- `server/src/jobs/t48ChargeJob.js`
- `server/src/index.js`
- `server/src/jobs/t48PaymentReminderJob.test.js` (new)
- `server/package.json`

## Operational Notes

- Reminder timings are approximate to job interval (10-minute scheduler).
- Existing bookings that are already in `requires_action` / `payment_failed` can still be picked up if `startedAt`/fallback timestamp exists.
- For end-to-end testing, use Stripe test cards that force 3DS-required flow.
