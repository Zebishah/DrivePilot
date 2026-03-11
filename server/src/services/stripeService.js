/**
 * Stripe Express onboarding service for instructors.
 * Uses Stripe Connect with type: "express"; country CH.
 */
const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const FRONTEND_BASE =
  process.env.Frontend_URL ||
  process.env.FRONTEND_URL ||
  "http://localhost:5173";

/**
 * Create a Stripe Express connected account for an instructor.
 * @param {string} email - Instructor email
 * @returns {Promise<import('stripe').Stripe.Account>}
 */
async function createExpressAccount(email) {
  const account = await stripe.accounts.create({
    type: "express",
    country: "CH",
    email: String(email).toLowerCase(),
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
  return account;
}

/**
 * Configure a connected account to use manual payouts.
 * With manual payouts, funds stay in the instructor's Stripe balance until
 * we explicitly create a payout via the Payouts API.
 * @param {string} accountId - Stripe connected account ID
 * @returns {Promise<import('stripe').Stripe.Account>}
 */
async function setManualPayoutSchedule(accountId) {
  // For Accounts v1-style settings we can still use accounts.update with
  // settings.payouts.schedule.interval = 'manual'.
  return stripe.accounts.update(accountId, {
    settings: {
      payouts: {
        schedule: {
          interval: "manual",
        },
      },
    },
  });
}

/**
 * Create an account link for onboarding (or re-onboarding).
 * @param {string} accountId - Stripe connected account ID
 * @param {{ refreshPath?: string, returnPath?: string }} paths - Optional path overrides
 * @returns {Promise<{ url: string }>}
 */
async function createAccountLink(accountId, paths = {}) {
  const refreshPath = paths.refreshPath || "/payment/refresh";
  const returnPath = paths.returnPath || "/payment/complete";
  const refreshUrl = `${FRONTEND_BASE.replace(/\/$/, "")}${refreshPath.startsWith("/") ? refreshPath : `/${refreshPath}`}`;
  const returnUrl = `${FRONTEND_BASE.replace(/\/$/, "")}${returnPath.startsWith("/") ? returnPath : `/${returnPath}`}`;

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
  return { url: link.url };
}

/**
 * Create a one-time login link for the Express dashboard (so the connected account holder can view earnings, payouts, etc.).
 * @param {string} accountId - Stripe connected account ID (Express)
 * @returns {Promise<{ url: string }>}
 */
async function createLoginLink(accountId) {
  const link = await stripe.accounts.createLoginLink(accountId);
  return { url: link.url };
}

/**
 * Retrieve full account (optionally with requirements expanded).
 * @param {string} accountId
 * @returns {Promise<import('stripe').Stripe.Account>}
 */
async function retrieveAccount(accountId) {
  return stripe.accounts.retrieve(accountId);
}

/**
 * Map Stripe account object to our DB snapshot shape for stripeAccount and onboardingStatus.
 * Used by verifyStripeOnboarding and webhooks.
 */
function accountToStripeSnapshot(account) {
  const chargesEnabled = Boolean(account.charges_enabled);
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const detailsSubmitted = Boolean(account.details_submitted);
  const requirements = account.requirements || {};
  const capabilities = account.capabilities || {};

  const stripeAccountUpdate = {
    "stripeAccount.chargesEnabled": chargesEnabled,
    "stripeAccount.payoutsEnabled": payoutsEnabled,
    "stripeAccount.detailsSubmitted": detailsSubmitted,
    "stripeAccount.lastSyncedAt": new Date(),
    "stripeAccount.requirements.currentlyDue": requirements.currently_due || [],
    "stripeAccount.requirements.eventuallyDue":
      requirements.eventually_due || [],
    "stripeAccount.requirements.pastDue": requirements.past_due || [],
    "stripeAccount.requirements.disabledReason":
      requirements.disabled_reason || null,
    "stripeAccount.capabilities.cardPayments":
      capabilities.card_payments || capabilities.card_payments === false
        ? capabilities.card_payments
        : undefined,
    "stripeAccount.capabilities.transfers":
      capabilities.transfers || capabilities.transfers === false
        ? capabilities.transfers
        : undefined,
  };

  let onboardingStatus = "submitted";
  if (chargesEnabled && payoutsEnabled) {
    onboardingStatus = "verified";
  } else if (requirements.disabled_reason) {
    // Stripe has restricted/rejected the account — show this before "submitted" so we don't show "Under review" when Stripe says restricted
    onboardingStatus = "restricted";
  } else if (detailsSubmitted && !chargesEnabled) {
    onboardingStatus = "submitted";
  } else if (account.id && !detailsSubmitted) {
    onboardingStatus = "link_generated";
  }

  return {
    stripeAccountUpdate: Object.fromEntries(
      Object.entries(stripeAccountUpdate).filter(([, v]) => v !== undefined),
    ),
    onboardingStatus,
    isActive: chargesEnabled && payoutsEnabled,
  };
}

const DEFAULT_CURRENCY = "chf";
const CENTIMES_PER_UNIT = 100; // 1 CHF = 100 centimes for Stripe

/**
 * Get commission split for a given amount (in CHF). Uses instructor commission if set, else platform defaults.
 * @param {number} amountChf - Total amount in CHF
 * @param {{ commission?: { rate?: number, type?: string, fixedAmount?: number } }} instructor - Instructor doc
 * @param {{ defaultRate?: number, defaultType?: string, defaultFixedAmount?: number }} [platformSettings] - From Admin.platformCommission
 * @returns {{ dspCommission: number, instructorAmount: number }}
 */
function getCommissionSplit(amountChf, instructor, platformSettings = {}) {
  const defRate = platformSettings.defaultRate ?? 20;
  const defType = platformSettings.defaultType ?? "percentage";
  const defFixed = platformSettings.defaultFixedAmount ?? 0;

  // Use platform Commission Management (Admin.platformCommission) as source of truth.
  // So when admin sets 40% in Commission Management, admin gets 40%, instructor 60%.
  // Instructor commission is only used for explicit per-instructor overrides (fixed amount or custom rate).
  let dspCommission;
  const inc = instructor?.commission;
  if (inc?.type === "amount" || inc?.type === "fixed") {
    const fixed = Number(inc.fixedAmount ?? 0);
    dspCommission = Math.min(fixed, amountChf);
  } else if (defType === "amount") {
    dspCommission = Math.min(defFixed, amountChf);
  } else {
    const rate = defRate;
    dspCommission =
      Math.round(amountChf * (rate / 100) * CENTIMES_PER_UNIT) /
      CENTIMES_PER_UNIT;
  }
  const instructorAmount =
    Math.round((amountChf - dspCommission) * CENTIMES_PER_UNIT) /
    CENTIMES_PER_UNIT;
  return {
    dspCommission:
      Math.round(dspCommission * CENTIMES_PER_UNIT) / CENTIMES_PER_UNIT,
    instructorAmount,
  };
}

/**
 * Create and optionally confirm a PaymentIntent. Supports destination charge:
 * pass transferData to send instructor share (80%) to their connected account
 * immediately; platform keeps commission (20%).
 * @param {{
 *   amountCentimes: number,
 *   currency?: string,
 *   paymentMethodId: string,
 *   customerId?: string,
 *   metadata?: Record<string, string>,
 *   confirm?: boolean,
 *   offSession?: boolean,
 *   transferData?: { destinationAccountId: string, amountCentimes: number },
 *   idempotencyKey?: string,
 * }} opts
 * @returns {Promise<{ paymentIntentId: string, status: string, clientSecret?: string, requiresAction?: boolean }>}
 */
async function createPaymentIntentForBooking(opts) {
  const {
    amountCentimes,
    currency = DEFAULT_CURRENCY,
    paymentMethodId,
    customerId,
    metadata = {},
    confirm = true,
    offSession = false,
    transferData,
    idempotencyKey,
  } = opts;

  const returnUrl = `${FRONTEND_BASE.replace(/\/$/, "")}/student-dashboard/book?payment=complete`;

  // Ensure all values are primitives (Stripe throws "Unknown arguments ([object Object])" for class instances / ObjectIds)
  const params = {
    amount: Math.round(Number(amountCentimes)),
    currency: String(currency || DEFAULT_CURRENCY).toLowerCase(),
    payment_method:
      paymentMethodId != null ? String(paymentMethodId) : undefined,
    metadata: Object.fromEntries(
      Object.entries(metadata || {}).map(([k, v]) => [
        k,
        v != null ? String(v) : "",
      ]),
    ),
    capture_method: "automatic",
    automatic_payment_methods: { enabled: true },
  };
  if (offSession) {
    params.off_session = true;
    // Stripe requires confirm: true when using off_session on create.
    params.confirm = true;
  }
  if (customerId != null && customerId !== "") {
    params.customer = String(customerId);
  }
  if (
    transferData?.destinationAccountId &&
    transferData?.amountCentimes != null
  ) {
    params.transfer_data = {
      destination: String(transferData.destinationAccountId),
      amount: Math.round(Number(transferData.amountCentimes)),
    };
  }

  const paymentIntent = idempotencyKey
    ? await stripe.paymentIntents.create(params, {
        idempotencyKey: String(idempotencyKey).slice(0, 255),
      })
    : await stripe.paymentIntents.create(params);

  // When off_session we already passed confirm: true to create, so PI is already confirmed.
  if (offSession) {
    if (paymentIntent.status === "requires_action") {
      return {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret,
        requiresAction: true,
      };
    }
    return {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      clientSecret: paymentIntent.client_secret,
    };
  }

  if (confirm) {
    const confirmParams = {
      return_url: returnUrl,
    };
    const confirmed = await stripe.paymentIntents.confirm(
      paymentIntent.id,
      confirmParams,
    );
    if (confirmed.status === "requires_action") {
      return {
        paymentIntentId: confirmed.id,
        status: confirmed.status,
        clientSecret: confirmed.client_secret,
        requiresAction: true,
      };
    }
    return {
      paymentIntentId: confirmed.id,
      status: confirmed.status,
      clientSecret: confirmed.client_secret,
    };
  }

  return {
    paymentIntentId: paymentIntent.id,
    status: paymentIntent.status,
    clientSecret: paymentIntent.client_secret,
  };
}

/**
 * Transfer from platform balance to instructor connected account (for payout).
 * @param {{
 *   amountCentimes: number,
 *   currency?: string,
 *   destinationAccountId: string,
 *   metadata?: Record<string, string>,
 * }} opts
 */
async function createTransferToInstructor(opts) {
  const {
    amountCentimes,
    currency = DEFAULT_CURRENCY,
    destinationAccountId,
    metadata = {},
  } = opts;

  const transfer = await stripe.transfers.create({
    amount: Math.round(amountCentimes),
    currency: currency.toLowerCase(),
    destination: destinationAccountId,
    metadata: { ...metadata },
  });
  return { transferId: transfer.id };
}

/**
 * Create a manual payout from an instructor's Stripe balance to their
 * external bank account. Used when payouts.schedule.interval = 'manual'
 * on the connected account.
 * @param {{
 *   accountId: string,
 *   amountCentimes: number,
 *   currency?: string,
 *   metadata?: Record<string, string>,
 * }} opts
 * @returns {Promise<{ payoutId: string }>}
 */
async function createManualPayoutForInstructor(opts) {
  const {
    accountId,
    amountCentimes,
    currency = DEFAULT_CURRENCY,
    metadata = {},
  } = opts;

  const payout = await stripe.payouts.create(
    {
      amount: Math.round(amountCentimes),
      currency: currency.toLowerCase(),
      metadata: { ...metadata },
    },
    {
      stripeAccount: accountId,
    },
  );

  return { payoutId: payout.id };
}

/**
 * Refund a PaymentIntent (full or partial). Refund goes back to original payment method.
 * @param {{ paymentIntentId: string, amountCentimes?: number, reason?: string }} opts
 * - If amountCentimes omitted, full refund.
 */
async function createRefund(opts) {
  const { paymentIntentId, amountCentimes, reason } = opts;
  const refundParams = { payment_intent: paymentIntentId };
  if (amountCentimes != null) refundParams.amount = Math.round(amountCentimes);
  if (reason) refundParams.reason = reason;

  const refund = await stripe.refunds.create(refundParams);
  return { refundId: refund.id };
}

/**
 * Get the Transfer ID from a PaymentIntent (for destination charges).
 * Used to reverse the instructor's share when refunding.
 * @param {string} paymentIntentId
 * @returns {Promise<string|null>} Transfer ID or null if not a destination charge
 */
async function getTransferIdFromPaymentIntent(paymentIntentId) {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"],
  });
  const charge = pi.latest_charge;
  if (!charge || typeof charge === "string") return null;
  return charge.transfer || null;
}

/**
 * Create a partial transfer reversal (for refunds on destination charges).
 * Reverses the instructor's share so the platform does not cover it.
 * @param {{ transferId: string, amountCentimes: number, metadata?: Record<string, string> }} opts
 * @returns {Promise<{ reversalId: string }>}
 */
async function createTransferReversal(opts) {
  const { transferId, amountCentimes, metadata = {} } = opts;
  const reversal = await stripe.transfers.createReversal(transferId, {
    amount: Math.round(amountCentimes),
    metadata: { ...metadata },
  });
  return { reversalId: reversal.id };
}

/**
 * Retrieve a PaymentIntent (e.g. for webhooks or idempotency).
 */
async function retrievePaymentIntent(paymentIntentId) {
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * Confirm a PaymentIntent with return_url (for 3DS redirect). Used when the client will
 * complete authentication via redirect instead of in-page modal.
 * @param {string} paymentIntentId
 * @param {string} returnUrl - Where to send the customer after 3DS (e.g. complete-payment page with bookingId/slotId).
 * @returns {Promise<import('stripe').Stripe.PaymentIntent>}
 */
async function confirmPaymentIntent(paymentIntentId, returnUrl) {
  const confirmed = await stripe.paymentIntents.confirm(paymentIntentId, {
    return_url: returnUrl,
  });
  return confirmed;
}

/**
 * Create a Stripe Checkout Session for a lesson booking (redirect to Stripe's hosted page).
 * Uses destination charge in payment mode: platform keeps commission, rest goes to instructor.
 * In setup mode, only saves a payment method for later off-session charges (no immediate payment).
 * When mode is "setup", pass customerEmail so Stripe creates/uses a Customer and attaches the
 * payment method to it (required for off-session charges).
 * @param {{
 *   amountCentimes: number,
 *   currency?: string,
 *   destinationAccountId?: string,
 *   transferAmountCentimes?: number,
 *   metadata?: Record<string, string>,
 *   successPath?: string,
 *   cancelPath?: string,
 *   description?: string,
 *   mode?: "payment" | "setup",
 *   customerEmail?: string,
 *   customerId?: string,  // When set for setup mode, use this Stripe Customer (session.customer will be set).
 * }} opts
 * @returns {Promise<{ url: string, sessionId: string }>}
 */
async function createCheckoutSessionForBooking(opts) {
  const {
    amountCentimes,
    currency = DEFAULT_CURRENCY,
    destinationAccountId,
    transferAmountCentimes,
    metadata = {},
    successPath = "/student-dashboard/booking-details",
    cancelPath = "/student-dashboard/booking-details",
    description = "Lesson booking",
    mode = "payment",
    customerEmail,
    customerId,
  } = opts;

  const base = FRONTEND_BASE.replace(/\/$/, "");
  const checkoutParam = mode === "setup" ? "setup_success" : "success";
  const successUrl = `${base}${successPath.startsWith("/") ? successPath : `/${successPath}`}?checkout=${checkoutParam}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${base}${cancelPath.startsWith("/") ? cancelPath : `/${cancelPath}`}?checkout=cancelled`;

  let sessionParams;
  if (mode === "setup") {
    // Save card for later off-session charges. Use customerId if provided (we create Customer beforehand so session.customer is set).
    if (!customerId && (!customerEmail || !String(customerEmail).trim())) {
      throw new Error(
        "customerId or customerEmail is required when creating a Checkout Session in setup mode.",
      );
    }
    sessionParams = {
      mode: "setup",
      payment_method_types: ["card"],
      currency: currency.toLowerCase(),
      locale: "en",
      metadata: { ...metadata },
      setup_intent_data: {
        metadata: { ...metadata },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    };
    if (customerId) {
      sessionParams.customer = customerId;
    } else {
      sessionParams.customer_email = String(customerEmail).trim().toLowerCase();
    }
  } else {
    // Payment mode: single currency (CHF) only. Disable Adaptive Pricing so Stripe does not show customer's local currency (e.g. PKR).
    sessionParams = {
      mode: "payment",
      locale: "en",
      adaptive_pricing: { enabled: false },
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: Math.round(amountCentimes),
            product_data: {
              name: "Lesson booking",
              description: description || "Lesson booking",
              images: [],
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        metadata: { ...metadata },
        transfer_data: {
          destination: destinationAccountId,
          amount: Math.round(transferAmountCentimes),
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return { url: session.url, sessionId: session.id };
}

/**
 * Create a Stripe Customer (e.g. for deferred Checkout so session.customer is set).
 * @param {{ email: string }} opts
 * @returns {Promise<string>} Stripe Customer ID (cus_xxx)
 */
async function createCustomer(opts) {
  const customer = await stripe.customers.create({
    email: String(opts.email).trim().toLowerCase(),
  });
  return customer.id;
}

/**
 * Retrieve a Checkout Session (e.g. to complete booking after redirect).
 * Expands setup_intent and customer so we get full objects / IDs for deferred flow.
 */
async function retrieveCheckoutSession(sessionId) {
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent", "setup_intent", "customer"],
  });
}

/**
 * Retrieve a SetupIntent (e.g. to get customer when session doesn't have it).
 */
async function retrieveSetupIntent(setupIntentId) {
  return stripe.setupIntents.retrieve(setupIntentId, {
    expand: ["customer"],
  });
}

/**
 * Retrieve a PaymentMethod (e.g. to get customer id when session/setup_intent don't have it).
 */
async function retrievePaymentMethod(paymentMethodId) {
  return stripe.paymentMethods.retrieve(paymentMethodId);
}

module.exports = {
  stripe,
  createExpressAccount,
  setManualPayoutSchedule,
  createAccountLink,
  createLoginLink,
  retrieveAccount,
  accountToStripeSnapshot,
  FRONTEND_BASE,
  getCommissionSplit,
  createPaymentIntentForBooking,
  createCheckoutSessionForBooking,
  createCustomer,
  retrieveCheckoutSession,
  retrieveSetupIntent,
  retrievePaymentMethod,
  createTransferToInstructor,
  createManualPayoutForInstructor,
  createRefund,
  getTransferIdFromPaymentIntent,
  createTransferReversal,
  retrievePaymentIntent,
  confirmPaymentIntent,
  DEFAULT_CURRENCY,
  CENTIMES_PER_UNIT,
};
