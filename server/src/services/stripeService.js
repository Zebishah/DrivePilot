/**
 * Stripe Connect lifecycle service for instructors.
 *
 * New accounts use Accounts v2 with the recipient configuration because Drive Pilot
 * uses indirect destination charges. Existing Accounts v1 continue through
 * the v1 compatibility paths until they are explicitly migrated.
 */
const Stripe = require("stripe");
const {
  DEFAULT_CURRENCY: MONEY_CURRENCY,
  toMinorUnits,
  fromMinorUnits,
  calculateCommission,
  assertValidMoney,
} = require("../utils/money");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Stripe redirects must use the same protocol as the running frontend.
 * Vite's local server is HTTP by default, so an HTTPS localhost value causes
 * ERR_SSL_PROTOCOL_ERROR in the browser after Checkout succeeds.
 */
function resolveFrontendBaseUrl(
  configuredUrl =
    process.env.Frontend_URL || process.env.FRONTEND_URL || "http://localhost:5173",
  nodeEnv = process.env.NODE_ENV,
) {
  const baseUrl = String(configuredUrl).trim();
  const isLocalhostHttps = /^https:\/\/localhost(?::\d+)?(?:\/|$)/i.test(baseUrl);
  const isProduction = String(nodeEnv || "").toLowerCase() === "production";

  if (isLocalhostHttps && !isProduction) {
    return baseUrl.replace(/^https:/i, "http:");
  }

  return baseUrl;
}

const FRONTEND_BASE = resolveFrontendBaseUrl();

function normalizeAccountVersion(accountVersion) {
  return accountVersion === "v2" ? "v2" : "v1";
}

function buildV2ConnectedAccountParams(email) {
  return {
    contact_email: String(email).trim().toLowerCase(),
    dashboard: "express",
    identity: { country: "ch" },
    defaults: {
      currency: DEFAULT_CURRENCY,
      responsibilities: {
        fees_collector: "application",
        losses_collector: "application",
      },
    },
    // Drive Pilot uses destination charges without on_behalf_of, so the instructor
    // is a recipient rather than the merchant of record.
    configuration: {
      recipient: {
        capabilities: {
          stripe_balance: {
            stripe_transfers: { requested: true },
          },
        },
      },
    },
    include: ["configuration.recipient", "identity", "requirements"],
  };
}

/**
 * Create a connected account. New accounts use Accounts v2; the v1 branch is
 * retained for explicit compatibility callers and historical records.
 * @param {string} email - Instructor email
 * @param {{ accountVersion?: "v1"|"v2", idempotencyKey?: string, stripeClient?: object }} [options]
 * @returns {Promise<import('stripe').Stripe.Account>}
 */
async function createConnectedAccount(email, options = {}) {
  const accountVersion = normalizeAccountVersion(options.accountVersion || "v2");
  const stripeClient = options.stripeClient || stripe;
  const requestOptions = options.idempotencyKey
    ? { idempotencyKey: String(options.idempotencyKey).slice(0, 255) }
    : undefined;

  if (accountVersion === "v2") {
    return stripeClient.v2.core.accounts.create(
      buildV2ConnectedAccountParams(email),
      requestOptions,
    );
  }

  return stripeClient.accounts.create(
    {
      type: "express",
      country: "CH",
      email: String(email).toLowerCase(),
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    },
    requestOptions,
  );
}

// Kept as a compatibility export for code outside the current resolver.
const createExpressAccount = createConnectedAccount;

/**
 * Configure a connected account to use manual payouts.
 * With manual payouts, funds stay in the instructor's Stripe balance until
 * we explicitly create a payout via the Payouts API.
 * @param {string} accountId - Stripe connected account ID
 * @param {{ accountVersion?: "v1"|"v2", stripeClient?: object }} [options]
 * @returns {Promise<import('stripe').Stripe.Account>}
 */
async function setManualPayoutSchedule(accountId, options = {}) {
  const accountVersion = normalizeAccountVersion(options.accountVersion);
  const stripeClient = options.stripeClient || stripe;
  if (accountVersion === "v2") {
    return stripeClient.balanceSettings.update(
      {
        payments: {
          payouts: {
            schedule: { interval: "manual" },
          },
        },
      },
      { stripeAccount: accountId },
    );
  }

  // Existing v1 Accounts continue using their supported settings endpoint.
  return stripeClient.accounts.update(accountId, {
    settings: { payouts: { schedule: { interval: "manual" } } },
  });
}

/**
 * Create an account link for onboarding (or re-onboarding).
 * @param {string} accountId - Stripe connected account ID
 * @param {{ refreshPath?: string, returnPath?: string, accountVersion?: "v1"|"v2", stripeClient?: object }} paths - Optional path overrides
 * @returns {Promise<{ url: string }>}
 */
async function createAccountLink(accountId, paths = {}) {
  const refreshPath = paths.refreshPath || "/payment/refresh";
  const returnPath = paths.returnPath || "/payment/complete";
  const refreshUrl = `${FRONTEND_BASE.replace(/\/$/, "")}${refreshPath.startsWith("/") ? refreshPath : `/${refreshPath}`}`;
  const returnUrl = `${FRONTEND_BASE.replace(/\/$/, "")}${returnPath.startsWith("/") ? returnPath : `/${returnPath}`}`;

  const stripeClient = paths.stripeClient || stripe;
  const accountVersion = normalizeAccountVersion(paths.accountVersion);
  const link = accountVersion === "v2"
    ? await stripeClient.v2.core.accountLinks.create({
        account: accountId,
        use_case: {
          type: "account_onboarding",
          account_onboarding: {
            configurations: ["recipient"],
            refresh_url: refreshUrl,
            return_url: returnUrl,
          },
        },
      })
    : await stripeClient.accountLinks.create({
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
async function retrieveAccount(accountId, options = {}) {
  const accountVersion = normalizeAccountVersion(options.accountVersion);
  const stripeClient = options.stripeClient || stripe;
  if (accountVersion === "v2") {
    return stripeClient.v2.core.accounts.retrieve(accountId, {
      include: ["configuration.recipient", "identity", "requirements"],
    });
  }
  return stripeClient.accounts.retrieve(accountId);
}

/**
 * Map Stripe account object to our DB snapshot shape for stripeAccount and onboardingStatus.
 * Used by verifyStripeOnboarding and webhooks.
 */
function accountToStripeSnapshot(account) {
  if (account?.object === "v2.core.account") {
    return accountV2ToStripeSnapshot(account);
  }

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

function requirementReferences(account, status) {
  const entries = account?.requirements?.entries;
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((entry) => entry?.minimum_deadline?.status === status)
    .map((entry) => entry.reference?.path || entry.description)
    .filter(Boolean);
}

/**
 * Normalize v2 requirements and recipient capability state into the local
 * snapshot. The v1-looking booleans are intentionally not populated here:
 * v2 uses recipient transfer/payout capabilities instead of charges_enabled
 * and the old transfers capability.
 */
function accountV2ToStripeSnapshot(account) {
  const recipient = account.configuration?.recipient;
  const stripeBalance = recipient?.capabilities?.stripe_balance || {};
  const transfersStatus = stripeBalance.stripe_transfers?.status || null;
  const payoutsStatus = stripeBalance.payouts?.status || null;
  const currentlyDue = requirementReferences(account, "currently_due");
  const eventuallyDue = requirementReferences(account, "eventually_due");
  const pastDue = requirementReferences(account, "past_due");
  const isRestricted = [transfersStatus, payoutsStatus].some((status) =>
    ["restricted", "unsupported"].includes(status),
  ) || pastDue.length > 0;
  const isActive = transfersStatus === "active" && payoutsStatus === "active";
  const hasIdentity = Boolean(account.identity);

  let onboardingStatus = "submitted";
  if (isActive) onboardingStatus = "verified";
  else if (isRestricted) onboardingStatus = "restricted";
  else if (!hasIdentity || currentlyDue.length > 0) onboardingStatus = "link_generated";

  const stripeAccountUpdate = {
    "stripeAccount.accountVersion": "v2",
    "stripeAccount.recipientTransfersStatus": transfersStatus,
    "stripeAccount.recipientPayoutsStatus": payoutsStatus,
    "stripeAccount.detailsSubmitted": hasIdentity && currentlyDue.length === 0,
    "stripeAccount.lastSyncedAt": new Date(),
    "stripeAccount.requirements.currentlyDue": currentlyDue,
    "stripeAccount.requirements.eventuallyDue": eventuallyDue,
    "stripeAccount.requirements.pastDue": pastDue,
    "stripeAccount.requirements.disabledReason": null,
    "stripeAccount.capabilities.transfers": transfersStatus,
  };

  return {
    stripeAccountUpdate,
    onboardingStatus,
    isActive,
    accountVersion: "v2",
    recipientTransfersStatus: transfersStatus,
    recipientPayoutsStatus: payoutsStatus,
  };
}

function shouldCreateConnectedAccount(instructor) {
  return !instructor?.stripeAccount?.accountId;
}

const DEFAULT_CURRENCY = MONEY_CURRENCY.toLowerCase();
const CENTIMES_PER_UNIT = 100; // 1 CHF = 100 centimes for Stripe

/**
 * Get commission split for a given amount (in CHF). Per-instructor override (instructorRate) wins; then platform defaultInstructorRate or defaultRate.
 * @param {number} amountChf - Total amount in CHF
 * @param {{ commission?: { instructorRate?: number, type?: string, fixedAmount?: number } }} instructor - Instructor doc
 * @param {{ defaultRate?: number, defaultInstructorRate?: number, defaultType?: string, defaultFixedAmount?: number }} [platformSettings] - From Admin.platformCommission
 * @returns {{ dspCommission: number, instructorAmount: number }}
 */
function getCommissionSplit(amountChf, instructor, platformSettings = {}) {
  const split = getCommissionSplitMinor(
    toMinorUnits(amountChf, MONEY_CURRENCY),
    instructor,
    platformSettings,
  );
  return {
    dspCommission: Number(fromMinorUnits(split.commissionMinor, MONEY_CURRENCY)),
    instructorAmount: Number(fromMinorUnits(split.instructorAmountMinor, MONEY_CURRENCY)),
  };
}

function getCommissionSplitMinor(amountMinor, instructor, platformSettings = {}) {
  return calculateCommission(amountMinor, instructor, platformSettings, MONEY_CURRENCY);
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
    amount: assertValidMoney(Number(amountCentimes), currency),
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
      amount: assertValidMoney(Number(transferData.amountCentimes), currency),
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
    idempotencyKey,
  } = opts;

  const transfer = await stripe.transfers.create({
    amount: assertValidMoney(Number(amountCentimes), currency),
    currency: currency.toLowerCase(),
    destination: destinationAccountId,
    metadata: { ...metadata },
  }, idempotencyKey ? { idempotencyKey: String(idempotencyKey).slice(0, 255) } : undefined);
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
    idempotencyKey,
  } = opts;

  const payout = await stripe.payouts.create(
    {
      amount: assertValidMoney(Number(amountCentimes), currency),
      currency: currency.toLowerCase(),
      metadata: { ...metadata },
    },
    {
      stripeAccount: accountId,
      ...(idempotencyKey
        ? { idempotencyKey: String(idempotencyKey).slice(0, 255) }
        : {}),
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
  const { paymentIntentId, amountCentimes, reason, idempotencyKey } = opts;
  const refundParams = { payment_intent: paymentIntentId };
  if (amountCentimes != null) refundParams.amount = assertValidMoney(Number(amountCentimes), DEFAULT_CURRENCY);
  if (reason) refundParams.reason = reason;

  const refund = await stripe.refunds.create(
    refundParams,
    idempotencyKey
      ? { idempotencyKey: String(idempotencyKey).slice(0, 255) }
      : undefined,
  );
  return { refundId: refund.id, status: refund.status };
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
 * Get charge/payment ID used for refund reconciliation from a PaymentIntent.
 * - For destination charges, prefer connected-account payment/charge id (`py_...`)
 *   via transfer.destination_payment (matches manual refund webhook payload).
 * - Fallback to platform charge id (`ch_...`) when destination payment is unavailable.
 * @param {string} paymentIntentId
 * @returns {Promise<string|null>} Charge ID or null
 */
async function getChargeIdFromPaymentIntent(paymentIntentId) {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"],
  });
  const charge = pi.latest_charge;
  if (!charge) return null;
  if (typeof charge === "string") return charge;

  // For destination charges Stripe webhook on connected account often returns `py_...`
  // as charge identifier. Resolve it from transfer.destination_payment when present.
  if (charge.transfer) {
    try {
      const transfer = await stripe.transfers.retrieve(String(charge.transfer), {
        expand: ["destination_payment"],
      });
      const destinationPayment = transfer?.destination_payment;
      if (typeof destinationPayment === "string" && destinationPayment) {
        return destinationPayment;
      }
      if (
        destinationPayment &&
        typeof destinationPayment === "object" &&
        destinationPayment.id
      ) {
        return destinationPayment.id;
      }
    } catch (_) {
      // Fallback below if transfer lookup fails
    }
  }

  return charge.id || null;
}

/**
 * Create a partial transfer reversal (for refunds on destination charges).
 * Reverses the instructor's share so the platform does not cover it.
 * @param {{ transferId: string, amountCentimes: number, metadata?: Record<string, string> }} opts
 * @returns {Promise<{ reversalId: string }>}
 */
async function createTransferReversal(opts) {
  const { transferId, amountCentimes, metadata = {}, idempotencyKey } = opts;
  const reversal = await stripe.transfers.createReversal(
    transferId,
    {
      amount: assertValidMoney(Number(amountCentimes), DEFAULT_CURRENCY),
      metadata: { ...metadata },
    },
    idempotencyKey
      ? { idempotencyKey: String(idempotencyKey).slice(0, 255) }
      : undefined,
  );
  return { reversalId: reversal.id };
}

/**
 * Retrieve a PaymentIntent (e.g. for webhooks or idempotency).
 */
async function retrievePaymentIntent(paymentIntentId) {
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

async function retrieveRefund(refundId) {
  return stripe.refunds.retrieve(refundId);
}

async function retrieveTransfer(transferId) {
  return stripe.transfers.retrieve(transferId);
}

async function retrievePayout(payoutId, accountId) {
  return stripe.payouts.retrieve(payoutId, { stripeAccount: accountId });
}

async function retrieveTransferReversal(transferId, reversalId) {
  if (reversalId) {
    return stripe.transfers.retrieveReversal(transferId, reversalId);
  }
  const reversals = await stripe.transfers.listReversals(transferId, { limit: 100 });
  return reversals.data?.find((item) => item.metadata?.operationId) || null;
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
 *   idempotencyKey?: string,
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
    idempotencyKey,
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
            unit_amount: assertValidMoney(Number(amountCentimes), currency),
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
          amount: assertValidMoney(Number(transferAmountCentimes), currency),
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    };
  }

  const session = await stripe.checkout.sessions.create(
    sessionParams,
    idempotencyKey
      ? { idempotencyKey: String(idempotencyKey).slice(0, 255) }
      : undefined,
  );

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
  resolveFrontendBaseUrl,
  normalizeAccountVersion,
  buildV2ConnectedAccountParams,
  createConnectedAccount,
  createExpressAccount,
  shouldCreateConnectedAccount,
  setManualPayoutSchedule,
  createAccountLink,
  createLoginLink,
  retrieveAccount,
  accountToStripeSnapshot,
  accountV2ToStripeSnapshot,
  FRONTEND_BASE,
  getCommissionSplit,
  getCommissionSplitMinor,
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
  getChargeIdFromPaymentIntent,
  createTransferReversal,
  retrievePaymentIntent,
  retrieveRefund,
  retrieveTransfer,
  retrievePayout,
  retrieveTransferReversal,
  confirmPaymentIntent,
  DEFAULT_CURRENCY,
  CENTIMES_PER_UNIT,
};
