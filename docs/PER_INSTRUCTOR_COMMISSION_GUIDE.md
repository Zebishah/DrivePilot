# Per-Instructor Commission (Instructor Share %) — How It Works

This document explains the commission logic currently implemented in DSP: a **platform default instructor share (%)** plus an optional **per-instructor override**. It also explains where to configure it in the admin UI and how the split is applied across instant payments, deferred (T‑48) payments, and refunds.

---

## 1) Definitions (important)

- **Instructor share (%)**: the percentage of the lesson price that goes to the instructor.
- **Admin / Platform share (%)**: the remaining percentage kept by DSP (admin/platform commission).

For percentage splits:

\[
adminShare = 100 - instructorShare
\]

---

## 2) Platform default (applies to all instructors unless overridden)

### Where to set it

- **Admin Dashboard → Payment Management → Commission Management**

### What you edit

- **Default instructor share (%)** (editable)
  - Example: set **70** → instructors get **70%**, admin gets **30%**

### What you see (auto-calculated)

- **Admin commission (%)** (disabled, auto)
  - Example: if Default instructor share is **70**, admin commission shows **30**

### What is stored

- `Admin.platformCommission.defaultInstructorRate` = instructor default share (%)
- `Admin.platformCommission.defaultRate` = admin share (%), stored to keep backward compatibility (it is set to \(100 - defaultInstructorRate\) when saving)

---

## 3) Per-instructor override (custom for one instructor)

### Where to set it

- **Admin Dashboard → Instructor Management**
  - Open an instructor → **Commission override**

### What you can do

- Set **% to instructor** (0–100)
  - Example: set **60** → this instructor gets **60%**, admin gets **40%**
- Or click **Use platform default**
  - Clears the override so the platform default applies again

### What is stored

- `Instructor.commission.instructorRate` = instructor override share (%) (nullable)
  - If `null` → no override, platform default applies

---

## 4) Which rule is used (priority order)

When calculating the split for a lesson amount, the system uses this order:

1. **Per-instructor override** (`Instructor.commission.instructorRate`) if set
2. Else **platform default instructor share** (`Admin.platformCommission.defaultInstructorRate`) if set
3. Else **legacy platform default admin %** (`Admin.platformCommission.defaultRate`) is used, and instructor gets the remainder

This ensures:

- If you set a custom % for an instructor → it always wins for that instructor.
- If you do not set a custom % → the platform default applies.

---

## 5) Where the split is applied (all payment flows)

The split is applied in every payment path because the backend uses a single split function:

- `server/src/services/stripeService.js` → `getCommissionSplit(...)`

This is used in:

- **Instant payment (pay now)**
- **Deferred booking (save card)**
- **T‑48 automatic charge job**
- **T‑48 “requires action / 3DS” completion flow**
- **Stripe webhook flows**

So the per-instructor override affects both:

- **Instant bookings**
- **Deferred / T‑48 bookings**

---

## 6) Refund behavior (same split reversed)

When a refund is approved:

- The **student** receives a refund for the **full slot amount** (one refund).
- If the instructor share had already been transferred, the system creates a **transfer reversal** using:
  - `slot.instructorAmount` (the same instructor share that was applied at payment time)
- The platform commission is also reversed in the ledger using:
  - `slot.dspCommission` (the same commission applied at payment time)

This ensures the refund uses the **same split amounts** that were applied when the payment originally happened.

---

## 7) Quick examples

### Example A — platform default only

- Default instructor share: **70%**
- No instructor override set
- Lesson price: **90 CHF**

Result:

- Instructor: \(90 × 0.70 = 63\) CHF
- Admin/platform: \(90 × 0.30 = 27\) CHF

### Example B — per-instructor override

- Default instructor share: **70%**
- Instructor override: **60%**
- Lesson price: **90 CHF**

Result:

- Instructor: \(90 × 0.60 = 54\) CHF
- Admin/platform: \(90 × 0.40 = 36\) CHF

---

## 8) How to test quickly

1. Set **Default instructor share (%)** in Commission Management (e.g. 70).
2. For Instructor A set override to 60; for Instructor B leave empty.
3. Make a new paid booking with each instructor (same amount).\n4. Check Admin Transactions:\n - Instructor A should reflect 60/40 split.\n - Instructor B should reflect 70/30 split.\n5. Approve a refund for one cancelled slot and verify the refund and reversal entries are created.
