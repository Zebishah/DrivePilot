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

module.exports = {
  stripe,
  createExpressAccount,
  createAccountLink,
  retrieveAccount,
  accountToStripeSnapshot,
  FRONTEND_BASE,
};
