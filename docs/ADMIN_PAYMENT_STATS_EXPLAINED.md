# Admin Payment Stats – What They Mean

This doc explains **what “gross receipt” is**, **what each stat** on the admin Payment Management page represents, and **how the numbers are built** from your transaction ledger.

---

## 1. What is “Gross receipt”?

**Gross receipt** = the **full amount** that a student paid for a lesson (or set of lessons) in a single payment.

- When a student pays **90 CHF** for one lesson, that **90 CHF** is one “gross receipt” for the platform.
- The platform does **not** keep all of it: part goes to the **instructor** (instructor share) and part stays with the **platform** (commission). “Gross” means “before splitting”; the **net** the platform keeps is the commission (e.g. 20% of 90 = 18 CHF).

So in your system:

- **“Platform gross receipt”** = one ledger line per successful payment, for the **full payment amount** (same as “what the customer paid”).
- **“Platform commission”** = a **separate** ledger line for the platform’s **share only** (e.g. 20% of that payment).

We use “gross receipt” in the **Total earned** stat so that number matches **Stripe’s “Gross volume”** (total amount paid by customers), and we **don’t** add “Platform commission” again (that would double-count).

---

## 2. What stats you show (summary)

On **Payment Management** you show five summary stats at the top:

| Stat label      | What it is                                                                 | How it’s calculated |
|-----------------|-----------------------------------------------------------------------------|----------------------|
| **Total earned**| Total **payment volume** (same idea as Stripe “Gross volume”)              | Sum of all **“Platform gross receipt”** transaction amounts (one per successful payment). |
| **Payments**    | Number of **payment events** (student paid for a lesson / booking)         | Count of transactions with `type === "payment"`.                                   |
| **Refunds**     | Number of **refund events** (admin approved a refund for a cancelled slot) | Count of transactions with `type === "refund"`.                                    |
| **Payouts**     | Number of **payout events** (money sent to instructor’s bank)             | Count of transactions with `type === "payout"`.                                    |
| **Transactions**| Total number of **all** ledger entries (payments, refunds, payouts, etc.)  | Count of all succeeded transactions.                                              |

So:

- **Total earned** = **money** (CHF): total of “gross receipt” lines → matches Stripe’s gross volume.
- **Payments / Refunds / Payouts** = **counts** (how many of each event).
- **Transactions** = **count** of every line in the ledger.

---

## 3. What “Total earned” is (and what it is not)

- **It is:** Total amount **received from students** for lessons (sum of each payment’s full amount).  
  That’s why we base it only on **“Platform gross receipt”** and not on commission.

- **It is not:**
  - The **platform’s profit** (profit = commission only).
  - **Net** after refunds (we don’t subtract refunds from this stat).
  - Instructor share (that money is transferred to instructors; we only “pass it through”).

So: **Total earned** = **Gross payment volume** (same concept as Stripe’s “Gross volume” 360 CHF in your example).

---

## 4. What’s in the ledger (transaction types and roles)

For every **payment** (student pays for a lesson), we create **several** transaction rows (roles = student, platform, instructor). That’s why **Transactions** (count) is higher than **Payments** (count).

### When a student pays 90 CHF (one lesson, 20% commission)

We create for example:

| Type    | Role      | Direction | Amount | Description (idea)                    |
|---------|-----------|-----------|--------|----------------------------------------|
| payment | student   | debit     | 90     | Student paid for lesson                |
| payment | platform  | credit    | 90     | **Platform gross receipt** (full 90)   |
| payment | instructor| credit    | 72     | Instructor share (80%)                |
| payment | platform  | credit    | 18     | **Platform commission** (20%)         |

- **Gross receipt** = the one **platform credit** line with “gross receipt” in the description (the 90).
- **Commission** = the other platform credit (the 18). We do **not** add this again into “Total earned”.

So:

- **Total earned** = sum of all “Platform gross receipt” amounts (e.g. 90 + 90 + … = 360).
- **Payments** = number of payment events (e.g. 14).
- **Transactions** = number of all lines (e.g. 14 × 4 + refund lines + payout lines + … = 21 or whatever you see).

---

## 5. Other transaction types (refunds, payouts)

- **Refund (admin approved)**  
  We create e.g. student **credit** (money back), instructor **debit** (reversal of their share), platform **debit** (commission reversed).  
  **Refunds** stat = count of `type === "refund"`.

- **Payout (to instructor’s bank)**  
  We create e.g. instructor **credit** (payout to bank).  
  **Payouts** stat = count of `type === "payout"`.

These don’t change **Total earned** in the current design; Total earned is only the sum of “Platform gross receipt” (gross volume).

---

## 6. Short glossary

- **Gross receipt** = Full payment amount received from the customer (one such ledger line per payment). Used for “Total earned” so it matches Stripe gross volume.
- **Commission** = Platform’s share of that payment (e.g. 20%). Stored as a separate “Platform commission” transaction; not added again into Total earned.
- **Total earned (admin)** = Sum of all “Platform gross receipt” amounts = **gross payment volume** (same idea as Stripe “Gross volume”).
- **Payments** = Number of successful payment events.
- **Refunds** = Number of refund events.
- **Payouts** = Number of payout events (money sent to instructor bank).
- **Transactions** = Total count of all ledger rows (payments + refunds + payouts + reversals, etc.).

If you want, we can add a second stat (e.g. “Platform commission” or “Net platform earnings”) that sums only commission and subtracts commission reversed on refunds.
