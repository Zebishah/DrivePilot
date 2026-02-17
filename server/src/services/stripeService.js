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
  } else if (detailsSubmitted && !chargesEnabled) {
    onboardingStatus = "submitted";
  } else if (requirements.disabled_reason) {
    onboardingStatus = "restricted";
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
 * Get commission split for a given amount (in CHF).
 * @param {number} amountChf - Total amount in CHF
 * @param {{ commission?: { rate?: number } }} instructor - Instructor doc with commission.rate (default 20%)
 * @returns {{ dspCommission: number, instructorAmount: number }}
 */
function getCommissionSplit(amountChf, instructor) {
  const rate = (instructor.commission && instructor.commission.rate) ?? 20;
  const dspCommission =
    Math.round(amountChf * (rate / 100) * CENTIMES_PER_UNIT) /
    CENTIMES_PER_UNIT;
  const instructorAmount =
    Math.round((amountChf - dspCommission) * CENTIMES_PER_UNIT) /
    CENTIMES_PER_UNIT;
  return { dspCommission, instructorAmount };
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
 *   transferData?: { destinationAccountId: string, amountCentimes: number },
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
    transferData,
  } = opts;

  const returnUrl = `${FRONTEND_BASE.replace(/\/$/, "")}/student-dashboard/book?payment=complete`;

  const params = {
    amount: Math.round(amountCentimes),
    currency: currency.toLowerCase(),
    payment_method: paymentMethodId,
    metadata: { ...metadata },
    capture_method: "automatic",
    automatic_payment_methods: { enabled: true },
  };
  if (customerId) params.customer = customerId;
  if (
    transferData?.destinationAccountId &&
    transferData?.amountCentimes != null
  ) {
    params.transfer_data = {
      destination: transferData.destinationAccountId,
      amount: Math.round(transferData.amountCentimes),
    };
  }

  const paymentIntent = await stripe.paymentIntents.create(params);

  if (confirm) {
    const confirmed = await stripe.paymentIntents.confirm(paymentIntent.id, {
      return_url: returnUrl,
    });
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
 * Retrieve a PaymentIntent (e.g. for webhooks or idempotency).
 */
async function retrievePaymentIntent(paymentIntentId) {
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

module.exports = {
  stripe,
  createExpressAccount,
  createAccountLink,
  retrieveAccount,
  accountToStripeSnapshot,
  FRONTEND_BASE,
  getCommissionSplit,
  createPaymentIntentForBooking,
  createTransferToInstructor,
  createRefund,
  retrievePaymentIntent,
  DEFAULT_CURRENCY,
  CENTIMES_PER_UNIT,
};
