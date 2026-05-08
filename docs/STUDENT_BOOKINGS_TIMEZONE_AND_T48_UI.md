# Student Bookings — Timezone, T-48 UI, and Payment Column

Date: 2026-05-07

## Purpose

Document the changes made so that:

- T-48 charge timing in the **UI** matches the **backend** (business timezone for slot wall-clock).
- Students see a clear **per-slot payment** state (paid vs pending vs action required).
- **Due now** vs **pending** for deferred (`pending_payment`) slots is not wrong for users outside Switzerland.
- Optionally show **both** the viewer’s local time and **Switzerland (lesson) time** for the same T-48 moment.

---

## Background: How the Backend Interprets Lesson Times

Slot fields are stored as:

- `date`: `YYYY-MM-DD`
- `startTime` / `endTime`: `HH:mm` (or with seconds)

The server treats these as **wall-clock times in the business timezone**, not as “the student’s local time”.

Implementation: `server/src/utils/slotTimezone.js`

- Uses `moment-timezone`.
- Default timezone: `process.env.SLOT_TIMEZONE` or **`Europe/Zurich`**.
- T-48 charging in `server/src/jobs/t48ChargeJob.js` uses `getSlotStartTimestampUtc(...)` so charge eligibility is based on **that** interpretation.

---

## Problem We Fixed

The student **Booked lessons** table (`Frontend/src/components/BookingList.tsx`) previously computed T-48 using:

```ts
new Date(`${slot.date}T${slot.startTime}`)
```

In the browser, that parses the string in the **user’s local timezone**, not in `Europe/Zurich`.

**Effect:** For the same stored slot, a user in Pakistan could see **Due now (T-48)** while the server logs still said **not yet in T-48 window** — because the “lesson start” instant was misread by ~3 hours relative to Zurich.

The backend behavior was correct; the **payment column logic** was misleading for non-Swiss users.

---

## What We Changed (Frontend)

### 1) Parse slot start like the server (Zurich / business TZ)

In `BookingList.tsx`:

- Added **dayjs** with `utc` + `timezone` plugins.
- **`parseSlotStartUtcMs(slot)`** builds the lesson start instant with:

  - `dayjs.tz(\`${date} ${normalizedTime}\`, "YYYY-MM-DD HH:mm:ss", SLOT_BUSINESS_TIMEZONE)`

- **`SLOT_BUSINESS_TIMEZONE`** defaults to **`Europe/Zurich`**, overridable via:

  - `VITE_SLOT_TIMEZONE` in the Frontend env (should stay aligned with server `SLOT_TIMEZONE`).

### 2) Payment column: status + T-48 timing

- **`Pending (T-48)`** vs **`Due now (T-48)`** for `pending_payment` now uses **`parseSlotStartUtcMs`** and compares to `Date.now()` the same way conceptually as the job (48h before lesson start in business TZ).

### 3) Dual “T-48 at” lines

For `pending_payment` slots, we show **two** captions for the **same** UTC moment:

1. **Your local time** — `toLocaleString` without `timeZone` (browser default).
2. **Switzerland / lesson time** — same instant formatted with `timeZone: Europe/Zurich` (via `SLOT_BUSINESS_TIMEZONE`).

So:

- Pakistan users see local + Swiss.
- Users in Switzerland typically see the same clock on both lines (or aligned with DST rules); both still describe one charge instant.

### 4) T-48 job interval (dev / ops note)

In `server/src/index.js`, **`T48_JOB_INTERVAL_MS`** was reduced from **5 minutes** to **1 minute** so T-48 attempts are polled more frequently in development/testing.

**Production note:** Restore a longer interval (e.g. 5 minutes) if you want less API load from polling.

---

## Files Touched

| Area | File |
|------|------|
| Student list UI | `Frontend/src/components/BookingList.tsx` |
| Server T-48 schedule | `server/src/index.js` |
| Backend source of truth (unchanged semantics, referenced) | `server/src/utils/slotTimezone.js`, `server/src/jobs/t48ChargeJob.js` |

---

## Configuration Checklist

1. **Server:** `SLOT_TIMEZONE` in server `.env` (optional; default `Europe/Zurich`).
2. **Frontend:** `VITE_SLOT_TIMEZONE` in `Frontend/.env` (optional; should match server if set).

If either side drifts from the other, UI labels could disagree with charging behavior even though charge logic follows the server.

---

## Verification (Quick)

1. Pick a `pending_payment` slot; note `date` and `startTime` as **lesson time in Switzerland**.
2. Compare `[T48ChargeJob]` log line `chargeTime ...` with:
   - **Switzerland / lesson time** line in the Payment column (should describe the same policy).
   - **Your local time** line (same instant, viewer’s TZ).
3. Ensure **Due now** only appears after `chargeTime <= now` in logs (within the next job tick).

---

## Summary

- **Backend:** Lesson wall-clock → business TZ (`Europe/Zurich` by default) → UTC for T-48 math.
- **Frontend (fixed):** Same business TZ parsing for pending/due badges; dual display for clarity.
- **Optional env:** Keep `VITE_SLOT_TIMEZONE` and `SLOT_TIMEZONE` in sync.

This removes the Pakistan vs Zurich “wrong Due now” confusion while keeping Stripe T-48 behavior unchanged.
