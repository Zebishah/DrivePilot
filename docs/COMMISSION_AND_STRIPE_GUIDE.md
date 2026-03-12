# Commission and Stripe: Where It’s Configured and How to Verify

This document explains where DSP commission is configured, how to see commission data in the DSP dashboard, and what appears (and what does not) in the Stripe test environment. It is written for the client and for anyone validating the payment system.

---

## 1. Where commission is configured

**Commission is configured only in the DSP platform, not in Stripe.**

- **Location:** **DSP Admin Dashboard → Payment Management → Commission Management** (tab within the Payment Management page).
- **What you can set:**
  - **Commission type:** Percentage or fixed amount.
  - **Commission value:** For percentage, the platform’s share (e.g. 40 means the admin gets 40%, the instructor gets 60%). For fixed amount, the platform’s share per lesson in CHF.
  - **Default instructor share (%):** The percentage the instructor gets by default (e.g. 80 = instructor 80%, admin 20%). This is the **platform-wide default** applied to every instructor who does **not** have a custom commission set.

**Per-instructor override**

- **Location:** **DSP Admin Dashboard → Instructor Management** → open an instructor (detail modal).
- **Commission override** section: You can set an **Instructor share (%)** for that instructor only (e.g. 60% → instructor gets 60%, admin gets 40%). If you leave it empty or click **“Use platform default”**, that instructor uses the **Default instructor share (%)** from Commission Management instead.

So: if an instructor has a custom commission set, that value is used; otherwise the platform default (Default instructor share or the legacy commission value) applies. The same logic is used for instant payments at checkout, deferred (T-48) charges, and payouts. Commission is **not** configurable per transaction in the Stripe Dashboard; Stripe only sees the full payment and the transfer we send to the instructor’s Connect account.

---

## 2. How to verify commission in the DSP dashboard

### Admin

- **Payment Management → Transactions**
  - Use the **party** tabs (Admin / Instructor / Student) and the **type** tabs (Payments, Refunds, Payouts, etc.) to filter.
  - **Admin / Platform view:** Look for transactions with description like **“Platform commission for booked slot”** or **“Platform gross receipt …”**. The former is the commission (platform’s share); the latter is the full amount received before the split.
  - **Commission Management** tab (same page): Shows the current default rate/type and value. Changing them and saving updates the commission applied to **new** payments.

### Instructor

- **Instructor Dashboard → Transaction History** (and Profile → Payment Management transaction list)
  - Instructors see only their **net** earnings (their share after commission). Each “payment” line is the amount they receive per lesson/slot. Commission is not shown as a separate line for instructors; it is already deducted.

### Student

- **Student Dashboard → Payment History**
  - Students see what they **paid** (the full lesson price in CHF). They do not see commission or instructor share.

---

## 3. Why the Stripe test environment doesn’t show “commission”

Stripe does not have a built-in concept of “platform commission” as a separate transaction type. Our flow is:

1. **Student pays** → Stripe records a **Payment** (full amount) on the **platform** account.
2. **We then transfer** the instructor’s share to the instructor’s **Stripe Connect** (Express) account.
3. **What remains** on the platform account is the commission. We do not send that to Stripe as a separate “commission” transaction; we simply keep it on the platform balance.

So in Stripe you will see:

- **Payments** – The full (gross) amount of each charge.
- **Connect → Accounts → [Instructor] → Transfers** – The amount we sent to each instructor (their net share).

There is **no** Stripe section labeled “Commission”. The commission is the difference between what we received (Payments) and what we transferred (Transfers), and it is fully visible and manageable in the **DSP Admin Dashboard** (Payment Management → Transactions and Commission Management).

**In test mode:** The same logic applies. Use test cards and the DSP admin transaction list and Commission Management to verify that changing the commission rate/type in the admin panel correctly affects new payments and that admin/instructor transaction amounts match the configured split.

---

Truth / what to tell the client
Stripe Dashboard will NOT show a separate “DSP commission” line item. Stripe records:

the full payment (gross) on the platform Stripe account, and
(if you use Connect transfers) the transfer to the instructor’s connected account. The difference is effectively the platform’s commission, but Stripe does not label it as “commission” or show a dedicated “commission transaction”.
Where they can actually verify commission is in the DSP Admin Dashboard, not Stripe:

Admin → Payment Management → Commission Management: shows the configured default commission (rate/type).
Admin → Payment Management → Transactions: shows platform-side transactions (gross receipt and commission entries) so they can confirm amounts per booking/slot.
Suggested client answer (copy/paste)
In Stripe, you won’t see a separate “DSP commission” transaction. Stripe only shows the gross payment and (for Connect) the transfer to the instructor account. Stripe doesn’t label the retained amount as “commission”.
To verify commission, please use the DSP Admin Dashboard → Payment Management:

Commission Management shows the configured commission rate/type.
Transactions shows the platform’s gross receipts and commission amounts per lesson/slot.

## 4. Summary: where to configure and verify

| What you want to do                                         | Where                                                                                           |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Configure commission** (rate, type, default instructor %) | DSP Admin Dashboard → Payment Management → **Commission Management** tab                        |
| **Set per-instructor commission override**                  | DSP Admin Dashboard → **Instructor Management** → open instructor → **Commission override**     |
| **See platform commission and gross receipts**              | DSP Admin Dashboard → Payment Management → **Transactions** (filter by Admin/Platform and type) |
| **See instructor net earnings**                             | Instructor Dashboard → **Transaction History** (and Payment tab transaction list)               |
| **See what the student paid**                               | Student Dashboard → **Payment History**                                                         |
| **See gross payments in Stripe**                            | Stripe Dashboard → **Payments**                                                                 |
| **See what was sent to instructors**                        | Stripe Dashboard → **Connect → Accounts** → select instructor → **Transfers**                   |
| **See “commission” in Stripe**                              | Not available; commission = (Payments − Transfers), managed in DSP Admin                        |

---

## 5. Quick checklist for validating commission

1. Set a known commission in **Admin → Payment Management → Commission Management** (e.g. 40%).
2. As a student, pay for a lesson (test card, e.g. 4242 4242 4242 4242).
3. In **Admin → Payment Management → Transactions**, confirm:
   - A “Platform gross receipt” (or similar) for the full amount.
   - A “Platform commission” (or similar) for the platform’s share (e.g. 40% of the amount).
4. In **Instructor Dashboard → Transaction History**, confirm the instructor sees only their net share (e.g. 60% of the lesson price).
5. In **Stripe Dashboard**, confirm the Payment appears for the full amount and that a Transfer to the instructor’s Connect account matches the instructor’s net share.

This confirms that commission is configured in the DSP admin panel, applied correctly in the app, and visible in the DSP dashboards; Stripe shows payments and transfers, and the difference is the commission we keep on the platform.
